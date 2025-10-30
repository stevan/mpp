# Quick Wins Implementation Guide

## 1. Boolean Literals (true/false)

### Implementation Files and Changes:

#### Step 1: Update LanguageSpec.js
```javascript
// Add after line 52 in BUILTIN set:
export const KEYWORDS = {
    // ... existing code ...

    BUILTIN: new Set([
        'print', 'say',
        'spawn', 'send', 'recv', 'self', 'kill', 'alive',
        'defined', 'undef', 'exists', 'delete',
        // Add boolean literals
        'true', 'false'
    ]),

    // ... rest of code
```

#### Step 2: Update Lexer.js
Add special handling for boolean literals in the classify method:
```javascript
// In the classify method, add after checking for other keywords:
if (token.value === 'true' || token.value === 'false') {
    return { ...token, category: 'BOOLEAN' };
}
```

#### Step 3: Update Parser.js
In `parsePrimaryExpression` method, add handling for boolean literals:
```javascript
// Add after checking for other primary expressions (around line 1100):
if (lexeme.category === 'BOOLEAN') {
    this.currentIndex++;
    return {
        type: 'Boolean',
        value: lexeme.token.value === 'true'
    };
}
```

#### Test Case:
```perl
# File: corpus/input/basics/080-boolean-literals.mpp
my $is_valid = true;
my $is_done = false;

if ($is_valid == true) {
    print("valid");
}

if ($is_done != false) {
    print("done");
}
```

## 2. String Comparison Operators

### Current Status:
String comparison operators (`eq`, `ne`, `lt`, `gt`, `le`, `ge`) are ALREADY in LanguageSpec.js as WORD_OPERATOR keywords (line 57).

### Implementation Files and Changes:

#### Step 1: Verify Lexer.js Classification
Check that string comparison operators are properly classified:
```javascript
// In Lexer.js classify method, these should be handled as OPERATOR:
if (Lang.KEYWORDS.WORD_OPERATOR.has(token.value)) {
    return { ...token, category: 'OPERATOR' };
}
```

#### Step 2: Update Parser.js Binary Expression Handling
Ensure string comparison operators are in the precedence table:
```javascript
// In parseExpression method, these operators should work with existing binary operator logic
// They should have same precedence as numeric comparison operators
```

#### Test Case:
```perl
# File: corpus/input/basics/081-string-comparison.mpp
if ($name eq "alice") {
    print("found alice");
}

if ($status ne "error") {
    continue();
}

if ($a lt $b) {
    print("a comes first");
}

if ($x gt $y) {
    print("x comes after");
}

if ($min le $max) {
    print("in range");
}

if ($val ge $threshold) {
    print("above threshold");
}
```

## 3. Try/Catch Implementation (More Complex)

### Implementation Files and Changes:

#### Step 1: Parser.js - Add Try Statement Handling
In `parseStatement` method after line 247:
```javascript
if (TokenChecker.isControlKeyword(lexemes[0], 'try')) {
    return this.parseTryStatement(lexemes);
}
```

#### Step 2: Parser.js - Add parseTryStatement Method
```javascript
parseTryStatement(lexemes) {
    // Consume 'try' keyword
    let i = 1;

    // Parse try block
    if (i >= lexemes.length || lexemes[i].category !== 'LBRACE') {
        return ParseError.expected('{', lexemes[i]);
    }

    const tryBlock = this.parseBlock(lexemes, i);
    i = tryBlock.endIndex;

    const catchClauses = [];
    let finallyBlock = null;

    // Parse catch clauses
    while (i < lexemes.length &&
           TokenChecker.isControlKeyword(lexemes[i], 'catch')) {
        i++; // consume 'catch'

        let param = null;
        // Check for optional parameter
        if (i < lexemes.length && lexemes[i].category === 'LPAREN') {
            // Parse catch parameter
            const paramResult = this.parseCatchParameter(lexemes, i);
            param = paramResult.param;
            i = paramResult.endIndex;
        }

        // Parse catch block
        if (i >= lexemes.length || lexemes[i].category !== 'LBRACE') {
            return ParseError.expected('{', lexemes[i]);
        }

        const catchBlock = this.parseBlock(lexemes, i);
        i = catchBlock.endIndex;

        catchClauses.push({
            type: 'Catch',
            param,
            block: catchBlock.statements
        });
    }

    // Parse optional finally
    if (i < lexemes.length &&
        TokenChecker.isControlKeyword(lexemes[i], 'finally')) {
        i++; // consume 'finally'

        if (i >= lexemes.length || lexemes[i].category !== 'LBRACE') {
            return ParseError.expected('{', lexemes[i]);
        }

        const finallyResult = this.parseBlock(lexemes, i);
        finallyBlock = finallyResult.statements;
    }

    return {
        type: 'Try',
        tryBlock: tryBlock.statements,
        catchClauses,
        finallyBlock
    };
}
```

## 4. Defer Blocks Implementation

### Implementation Files and Changes:

#### Step 1: Add 'defer' to LanguageSpec.js
```javascript
// Add to CONTROL keywords:
CONTROL: new Set([
    'if', 'elsif', 'else', 'unless',
    // ... existing keywords ...
    'defer',  // Add this
    // ... rest
]),
```

#### Step 2: Parser.js - Add Defer Statement Handling
```javascript
// In parseStatement method:
if (TokenChecker.isControlKeyword(lexemes[0], 'defer')) {
    return this.parseDeferStatement(lexemes);
}

// Add new method:
parseDeferStatement(lexemes) {
    // Consume 'defer'
    let i = 1;

    // Expect block
    if (i >= lexemes.length || lexemes[i].category !== 'LBRACE') {
        return ParseError.expected('{', lexemes[i]);
    }

    const block = this.parseBlock(lexemes, i);

    return {
        type: 'Defer',
        block: block.statements
    };
}
```

## Testing Strategy

1. **Start with Boolean Literals** - Simplest change, minimal parser impact
2. **Then String Comparison** - May already work with existing operator handling
3. **Then Defer Blocks** - Simple block statement, similar to existing do blocks
4. **Finally Try/Catch** - Most complex, requires multiple block handling

## Verification Steps

After each implementation:
1. Run existing tests: `npm test`
2. Add new corpus test file
3. Generate snapshot: `node bin/update-snapshots.js`
4. Check for errors: `node bin/check-errors.js`
5. Verify AST output looks correct

## Common Pitfalls to Avoid

1. **Token Conflicts**: Make sure new keywords don't conflict with identifiers
2. **Precedence Issues**: Ensure operators have correct precedence
3. **Block Parsing**: Reuse existing block parsing logic where possible
4. **Error Recovery**: Add proper error messages for malformed syntax
5. **AST Consistency**: Keep AST node structure consistent with existing patterns