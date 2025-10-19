# Session Prompt: Session 3 - Sub Definitions

Use this prompt to start Session 3:

---

I'm continuing development on the **MPP (Modern Perl Parser)** project. This is a parser framework built using async generators with a streaming pipeline architecture.

## Current State (After Session 2)

The project is in `/Users/stevan/Projects/typescript/100-Opal/mpp/`

### ✅ Completed Features (63 tests passing)

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
- Postfix conditionals (`say "x" if $y`, `$count++ while $running`)
- Block statements for lexical scoping (`{ my $x = 5; }`)

**Functions (Partial)**:
- ✅ Function calls with arguments (`add(5, 10)`)
- ✅ Return statements (`return $x + $y;`)
- 🔲 Function definitions (NOT YET IMPLEMENTED)

### Parser Can Currently Handle

```perl
# Complex control flow with function calls and returns
if ($x > 10) {
    for my $i (1..$x) {
        my $result = calculate($i, $x);
        return $result if $result > 100;
        process($result) unless $error;
    }
} elsif ($x > 0) {
    {
        my $temp = $x * 2;
        print($temp);
    }
}
```

## What I Want to Build This Session

I want to add **sub (function) definitions**, specifically:

```perl
# Named sub with parameters
sub add($x, $y) {
    return $x + $y;
}

# Sub with default parameters
sub greet($name = "World") {
    print("Hello, $name!");
}

# Anonymous sub
my $double = sub ($x) { return $x * 2 };

# Sub with no parameters
sub hello() {
    print("Hello, world!");
}
```

This will complete the function support (we already have calls and returns)!

## Implementation Plan

### 1. AST Node Types Needed

Add to `src/AST.ts`:

```typescript
export interface ParameterNode extends ASTNode {
    type: 'Parameter';
    variable: VariableNode;
    defaultValue?: ASTNode;
}

export interface SubNode extends ASTNode {
    type: 'Sub';
    name?: string;  // Optional for anonymous subs
    parameters: ParameterNode[];
    body: ASTNode[];
}
```

### 2. Test Cases to Write

In `tests/Parser.test.ts`:
- Named sub with parameters
- Named sub with no parameters
- Sub with default parameter values
- Anonymous sub (sub expression)
- Sub with return statement
- Sub calling another sub

### 3. Parser Implementation

In `src/Parser.ts`:
- Detect `sub` keyword in `parseStatement()` (for named subs)
- Detect `sub` keyword in `parsePrimary()` (for anonymous subs)
- Implement `parseSubDeclaration()`:
  - Parse optional name (identifier)
  - Parse parameter list `($param1, $param2 = default)`
  - Parse block body (reuse existing `parseBlock()` helper)
  - Return `SubNode`

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
- `+{ }` syntax for hash literals (blocks use bare `{ }`)
- No regex literals yet (deferred for later)
- No C-style for loops (using foreach with ranges instead)
- Parentheses required for all function calls
- `$_` is a keyword
- No HEREDOCs
- Pure syntax-directed parsing (no symbol table feedback)

## Files to Reference

- `README.md` - Project documentation
- `DEVELOPMENT_LOG.md` - Session 2 notes with all implementation details
- `NEXT_STEPS.md` - Detailed plan for sub definitions
- `src/Parser.ts` - Current parser (~850 lines)
- `src/AST.ts` - AST node definitions
- `tests/Parser.test.ts` - 63 existing tests

## Success Criteria for This Session

By the end:
- ✅ Can parse named subs with parameters
- ✅ Can parse anonymous subs
- ✅ Can parse default parameter values
- ✅ Can parse subs with return statements
- ✅ ~70-75 tests passing
- ✅ All existing tests still pass

## After This Session

Once sub definitions are complete, the parser will be able to handle complete, self-contained programs like:

```perl
sub fibonacci($n) {
    return 0 if $n == 0;
    return 1 if $n == 1;
    return fibonacci($n - 1) + fibonacci($n - 2);
}

for my $i (1..10) {
    print(fibonacci($i));
}
```

This represents **basic language completeness** - everything needed to write real programs!

## Let's Get Started!

Please begin by:
1. Adding `ParameterNode` and `SubNode` to AST.ts
2. Writing comprehensive tests for sub definitions
3. Implementing the parsing logic
4. Running tests to verify

Ready to complete function support! 🚀

---

**Optional Context Requests**:
- "Show me the current parseBlock() implementation first" (if you want to understand how to reuse it)
- "Show me how function calls are parsed" (for context on similar patterns)
- "Let's review the test structure" (to match existing test style)
