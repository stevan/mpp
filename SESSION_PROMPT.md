# Session Prompt: Session 4 - Data Structures

Use this prompt to start Session 4:

---

I'm continuing development on the **MPP (Modern Perl Parser)** project. This is a parser framework built using async generators with a streaming pipeline architecture.

## Current State (After Session 3)

The project is in `/Users/stevan/Projects/typescript/100-Opal/mpp/`

### ✅ Completed Features (74 tests passing)

**Core Expression Parsing**:
- Literals (numbers, strings)
- Variables with sigils ($scalar, @array, %hash)
- Binary operators (20 precedence levels with correct associativity)
- Parenthesized expressions
- Variable declarations (`my $x = 10;`)

**Complete Control Flow**:
- If/elsif/else chains with multiple branches
- Unless (prefix and postfix forms)
- While/until loops
- Foreach/for loops with ranges (`for my $i (1..10)`)
- Postfix conditionals (all statement types: `return 0 if $x`)
- Block statements for lexical scoping (`{ my $x = 5; }`)

**Complete Function Support**:
- ✅ Function definitions with parameters (`sub add($x, $y) { ... }`)
- ✅ Anonymous subs (`my $fn = sub ($x) { return $x * 2; };`)
- ✅ Default parameter values (`sub greet($name = "World") { ... }`)
- ✅ Function calls with arguments (`add(5, 10)`)
- ✅ Return statements (`return $x + $y;`)
- ✅ Recursive function calls

### Parser Can Currently Handle

```perl
# Complete, self-contained programs with recursion!
sub fibonacci($n) {
    return 0 if $n == 0;
    return 1 if $n == 1;
    return fibonacci($n - 1) + fibonacci($n - 2);
}

for my $i (1..10) {
    my $result = fibonacci($i);
    print($result);
}
```

**Achievement**: Basic language completeness! Parser handles complete programs with functions, control flow, and recursion.

## What I Want to Build This Session

I want to add **array and hash literals**, specifically:

```perl
# Array reference literals (anonymous arrays)
my $aref = [1, 2, 3, 4, 5];
my $nested = [1, [2, 3], 4];

# Hash reference literals (anonymous hashes)
my $href = +{ a => 1, b => 2 };  # + prefix required!
my $nested_hash = +{
    name => "Alice",
    age => 30,
    address => +{ city => "NYC", zip => 10001 }
};

# List literals (in assignment context)
my @array = (1, 2, 3, 4, 5);
my %hash = (a => 1, b => 2, c => 3);

# Mixed expressions
my $data = [1, 2, +{ key => "value" }, 4];
```

This will give the language real data structure support!

## Implementation Plan

### 1. AST Node Types Needed

Add to `src/AST.ts`:

```typescript
export interface ArrayLiteralNode extends ASTNode {
    type: 'ArrayLiteral';
    elements: ASTNode[];
}

export interface HashLiteralNode extends ASTNode {
    type: 'HashLiteral';
    pairs: Array<{ key: ASTNode; value: ASTNode }>;
}

export interface ListNode extends ASTNode {
    type: 'List';
    elements: ASTNode[];
}
```

### 2. Test Cases to Write

In `tests/Parser.test.ts`:
- Array reference literal: `[1, 2, 3]`
- Empty array: `[]`
- Nested arrays: `[1, [2, 3], 4]`
- Hash reference literal: `+{ a => 1, b => 2 }`
- Empty hash: `+{}`
- Nested hashes: `+{ x => +{ y => 1 } }`
- List in assignment: `my @a = (1, 2, 3);`
- Mixed data structures: `[1, +{ key => 2 }, 3]`
- Fat comma operator: `+{ key => "value" }`

### 3. Parser Implementation

In `src/Parser.ts`:

#### Parse Array Literals
- Detect `[` in `parsePrimary()`
- Find matching `]`
- Split contents by comma at depth 0
- Parse each element as expression
- Return `ArrayLiteralNode`

#### Parse Hash Literals
- Detect `+{` sequence in `parsePrimary()`
- Find matching `}`
- Split contents by comma at depth 0
- Parse key/value pairs (split by `=>` or implicit pairing)
- Return `HashLiteralNode`

#### Parse Lists
- Detect `(` in `parsePrimary()`
- Disambiguate from parenthesized expression:
  - If contains comma at depth 0 → List
  - Otherwise → Parenthesized expression
- Split by comma and parse elements
- Return `ListNode`

#### Handle Fat Comma (`=>`)
- Add `=>` as a special binary operator
- In hash context, treat as key-value separator
- Left side can be bareword (auto-quoted)

### 4. Key Challenges

**Challenge 1: Disambiguation**
- `(1)` → Parenthesized expression
- `(1, 2)` → List
- `{ }` → Block
- `+{ }` → Hash literal

**Solution**:
- Use `+` prefix for hash literals (explicit)
- Check for comma to distinguish list from parens
- Existing block detection works

**Challenge 2: Nested Structures**
```perl
my $complex = [
    1,
    +{ key => [2, 3] },
    4
];
```

**Solution**: Recursively call `parseExpression()` for each element

**Challenge 3: Fat Comma Context**
```perl
+{ key => "value", foo => 42 }
```

**Solution**: Parse `=>` as operator with special handling in hash context

## Development Approach

Please continue using **strict TDD**:
1. Write tests first for each feature
2. Add AST node types
3. Implement parsing logic
4. Run tests frequently
5. Keep tests high-level (not overly specific)
6. Maintain 100% type safety (no `any` types)

## Key Design Decisions (Don't Change)

- No barewords (functions require parens, strings require quotes)
- **`+{ }` syntax for hash literals** (blocks use bare `{ }`)
- No regex literals yet (deferred for later)
- No C-style for loops (using foreach with ranges instead)
- Parentheses required for all function calls
- `$_` is a keyword
- No HEREDOCs
- Pure syntax-directed parsing (no symbol table feedback)
- **Fat comma `=>` auto-quotes left side in hash context**

## Critical Lessons from Session 3

### Bug 1: Postfix Statement Context
- **Issue**: Postfix conditionals failed with return statements
- **Fix**: Use recursive `parseStatement()` instead of `parseExpression()`
- **Lesson**: Statement modifiers can apply to any statement type

### Bug 2: Multi-Statement Programs
- **Issue**: Sub definitions weren't yielded, blocking subsequent statements
- **Fix**: Added sub yielding in `run()` at closing brace
- **Lesson**: Block-based declarations need immediate yielding

### Bug 3: Depth Tracking
- **Issue**: Postfix detection triggered inside nested structures
- **Fix**: Track depth, only detect at depth 0
- **Lesson**: Always track depth for nested contexts

**Apply these lessons to data structure parsing!**

## Files to Reference

- `README.md` - Project documentation
- `DEVELOPMENT_LOG.md` - Session 3 notes with bug fixes
- `NEXT_STEPS.md` - Detailed plan for data structures
- `src/Parser.ts` - Current parser (~1000 lines)
- `src/AST.ts` - AST node definitions (~110 lines)
- `tests/Parser.test.ts` - 69 unit tests
- `tests/Examples.test.ts` - 5 integration tests

## Success Criteria for This Session

By the end:
- ✅ Can parse array literals `[1, 2, 3]`
- ✅ Can parse hash literals `+{ a => 1, b => 2 }`
- ✅ Can parse list literals `(1, 2, 3)`
- ✅ Can parse nested data structures
- ✅ Can parse fat comma operator `=>`
- ✅ ~80-85 tests passing
- ✅ All existing tests still pass

## After This Session

Once data structure literals are complete, the next step will be **array/hash access**:

```perl
# Session 5 preview
$array[0]           # Array element access
$hash{key}          # Hash value access
$aref->[0]          # Array reference dereference
$href->{key}        # Hash reference dereference
```

This will give complete data structure support!

## Let's Get Started!

Please begin by:
1. Adding `ArrayLiteralNode`, `HashLiteralNode`, and `ListNode` to AST.ts
2. Writing comprehensive tests for data structure literals
3. Implementing the parsing logic (start with arrays, simplest case)
4. Running tests to verify

Ready to add data structures! 🚀

---

**Optional Context Requests**:
- "Show me how function call argument parsing works" (similar pattern for elements)
- "Show me the precedence table" (to understand where => fits)
- "Let's review how blocks are detected" (for +{} disambiguation)
