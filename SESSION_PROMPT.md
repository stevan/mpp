# Session Prompt: Session 6 - Unary Operators

Use this prompt to start Session 6:

---

I'm continuing development on the **MPP (Modern Perl Parser)** project. This is a parser framework built using async generators with a streaming pipeline architecture.

## Current State (After Session 5)

The project is in `/Users/stevan/Projects/typescript/100-Opal/mpp/`

### ✅ Completed Features (122 tests passing)

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
- Function definitions with parameters (`sub add($x, $y) { ... }`)
- Anonymous subs (`my $fn = sub ($x) { return $x * 2; };`)
- Default parameter values (`sub greet($name = "World") { ... }`)
- Function calls with arguments (`add(5, 10)`)
- Return statements (`return $x + $y;`)
- Recursive function calls

**Complete Data Structure Support**:
- Array literals: `[1, 2, 3]`
- Hash literals: `+{ "key" => "value" }`
- List literals: `(1, 2, 3)`
- Nested structures: `[1, +{ "x" => [2, 3] }]`
- Array access: `$array[0]`, `$aref->[0]`
- Hash access: `$hash{"key"}`, `$href->{"key"}`
- Chained access: `$data->[0]{"key"}[1]`
- Dereference operator: `->`

### Parser Can Currently Handle

```perl
# Complete programs with data structures and access!
my $users = [
    +{ "name" => "Alice", "scores" => [95, 87, 92] },
    +{ "name" => "Bob", "scores" => [88, 91, 85] }
];

sub average_score($person) {
    my $scores = $person->{"scores"};
    my $sum = $scores->[0] + $scores->[1] + $scores->[2];
    return $sum / 3;
}

my $first = $users->[0];
my $avg = average_score($first);
print($first->{"name"});
print($avg);
```

**Achievement**: Complete data structure support! Parser handles creation, nesting, and access at arbitrary depth.

## What I Want to Build This Session

I want to add **unary operators**, specifically:

```perl
# Unary minus (negation)
my $negative = -5;
my $opposite = -$x;
my $result = -($a + $b);

# Unary plus (explicit positive)
my $positive = +10;

# Logical not
my $inverted = !$flag;
my $result = !($x > 5);

# Low-precedence not
my $value = not $condition;

# In expressions
my $result = -$x + 10;
my $check = !$valid && $ready;
```

This will enable:
- Negative numbers and negation
- Boolean negation for conditionals
- Unary operators in complex expressions

## Implementation Plan

### 1. AST Node Type

The node type already exists in `src/AST.ts`:

```typescript
export interface UnaryOpNode extends ASTNode {
    type: 'UnaryOp';
    operator: string;
    operand: ASTNode;
}
```

Just need to import and use it!

### 2. Test Cases to Write

In `tests/Parser.test.ts`:
- Unary minus with literal: `-5`
- Unary minus with variable: `-$x`
- Unary minus with expression: `-($a + $b)`
- Unary plus: `+10`
- Logical not: `!$flag`
- Low-precedence not: `not $x`
- Unary in expression: `-$x + 10`
- Double negation: `!!$value`
- Multiple unary ops: `-+$x`
- Unary in complex expressions: `!$valid && $ready`

### 3. Parser Implementation

In `src/Parser.ts`:

#### Parse Unary Operators
Add unary operator handling at the start of `parsePrimary()`:

```typescript
// Check for unary operators
if (lexeme.category === 'BINOP' || lexeme.category === 'UNOP') {
    const op = lexeme.token.value;
    if (op === '-' || op === '+' || op === '!') {
        // Parse operand recursively
        const operandResult = this.parsePrimary(lexemes, pos + 1);
        if (operandResult) {
            const unaryOp: UnaryOpNode = {
                type: 'UnaryOp',
                operator: op,
                operand: operandResult.node
            };
            return {
                node: unaryOp,
                nextPos: operandResult.nextPos
            };
        }
    }
}

// Handle 'not' keyword
if (lexeme.category === 'CONTROL' && lexeme.token.value === 'not') {
    // Similar to above
}
```

#### Handle Precedence
- Unary `-`, `+`, `!` bind very tightly (precedence ~4)
- Handled in `parsePrimary()` means they bind before binary operators
- `not` is low-precedence - may need special handling

### 4. Key Challenges

**Challenge 1: Binary vs Unary Context**
- `-` can be binary (subtraction) or unary (negation)
- `+` can be binary (addition) or unary (positive)

**Solution**:
- In `parsePrimary()`, we're at the start of an expression
- So `-` and `+` here are always unary
- Binary operators are handled in `precedenceClimb()`

**Challenge 2: Hash Literal Conflict**
- `+{ }` is a hash literal
- `+` can also be unary plus

**Solution**:
- Check if `+` is followed by `{`
- If yes → hash literal (existing code handles this)
- If no → unary plus

**Challenge 3: Precedence**
```perl
my $x = -5 + 10;      # Should be: (-5) + 10
my $y = !$a && $b;    # Should be: (!$a) && $b
```

**Solution**: Unary operators bind tightly - handled in `parsePrimary()` before binary operator processing.

**Challenge 4: Multiple Unary Operators**
```perl
my $x = !!$flag;      # Double negation
my $y = -+$value;     # Minus of positive
```

**Solution**: Recursive call to `parsePrimary()` naturally handles this.

**Challenge 5: Low-Precedence `not`**
```perl
my $x = not $a && $b;  # Should be: not ($a && $b)
```

**Solution**: Start with high-precedence operators (`-`, `+`, `!`). Handle `not` separately or defer if complex.

## Development Approach

Please continue using **strict TDD**:
1. Write tests first for each operator type
2. Add parsing logic to `parsePrimary()`
3. Handle hash literal conflict for `+`
4. Run tests frequently
5. Keep tests high-level (not overly specific)
6. Maintain 100% type safety (no `any` types)

## Key Design Decisions (Don't Change)

- No barewords (functions require parens, strings require quotes)
- `+{ }` syntax for hash literals (blocks use bare `{ }`)
- No regex literals yet (deferred for later)
- Pure syntax-directed parsing (no symbol table feedback)
- Parentheses required for all function calls
- `$_` is a keyword

## Critical Lessons from Previous Sessions

### Session 4: Lexeme Category Matters
- **Lesson**: Always check what category the Lexer assigns (e.g., `+` is BINOP)
- **Application**: Check for both BINOP and UNOP when detecting unary operators

### Session 4: Disambiguation Patterns
- **Lesson**: Use lookahead to disambiguate similar syntax
- **Application**: Check if `+` is followed by `{` to distinguish unary from hash literal

### Session 5: Postfix Operator Binding
- **Lesson**: Postfix operators bind tightly after primary expressions
- **Application**: Unary operators bind tightly *before* primary expressions - also in `parsePrimary()`

## Files to Reference

- `README.md` - Project documentation
- `DEVELOPMENT_LOG.md` - Session 5 notes with postfix operator details
- `src/Parser.ts` - Current parser (~800 lines)
- `src/AST.ts` - AST node definitions (~137 lines)
- `tests/Parser.test.ts` - 90 unit tests
- `tests/DataStructures.test.ts` - 16 milestone tests
- `tests/Examples.test.ts` - 5 integration tests

## Success Criteria for This Session

By the end:
- ✅ Can parse unary minus: `-$x`, `-5`
- ✅ Can parse unary plus: `+10`
- ✅ Can parse logical not: `!$flag`
- ✅ Can parse low-precedence not: `not $x` (optional)
- ✅ Unary operators work in expressions
- ✅ Multiple unary operators chain correctly
- ✅ Hash literals still work (no regression)
- ✅ ~130-135 tests passing
- ✅ All existing tests still pass

## After This Session

Once unary operators are complete, natural next steps:
1. **Ternary operator** (`$x ? $y : $z`) - Conditional expressions
2. **Method calls** (`$obj->method($arg)`) - OOP support
3. **Range operator** (`1..10`) - As expression not just in foreach
4. **Assignment to elements** (`$array[0] = 5`) - Mutable data structures

## Precedence Table Reference

Current precedence levels (lower number = tighter binding):

| Level | Operators | Assoc | Notes |
|-------|-----------|-------|-------|
| 3 | `**` | RIGHT | Exponentiation |
| **4** | **`!`, `-`, `+` (unary)** | **RIGHT** | **To be added** |
| 6 | `*`, `/`, `%`, `x` | LEFT | Multiplicative |
| 7 | `+`, `-`, `.` | LEFT | Additive (binary) |
| 9 | `<`, `>`, `<=`, `>=` | LEFT | Comparison |
| 10 | `==`, `!=`, `<=>` | LEFT | Equality |
| 13 | `&&` | LEFT | Logical AND |
| 14 | `||`, `//` | LEFT | Logical OR |
| 17 | `=`, `+=`, etc. | RIGHT | Assignment |
| **20** | **`not`** | **LEFT** | **Low-precedence NOT** |
| 21 | `and`, `or`, `xor` | LEFT | Low-precedence logical |

## Let's Get Started!

Please begin by:
1. Writing comprehensive tests for unary operators in `tests/Parser.test.ts`
2. Adding unary operator detection in `parsePrimary()` (check for `-`, `+`, `!`)
3. Ensuring `+{` still works for hash literals (lookahead check)
4. Handling recursive operand parsing
5. Testing with existing tests to ensure no regressions

Ready to add unary operators! 🚀

---

**Optional Context Requests**:
- "Show me the current parsePrimary() implementation" (to see where to add unary logic)
- "Show me how hash literals are detected" (for the `+{` conflict)
- "Let's review postfix operators" (similar pattern for tight binding)
