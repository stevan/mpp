# Session 7: Method Calls

I'm continuing development on the **MPP (Modern Perl Parser)** project. This is a parser framework built using async generators with a streaming pipeline architecture.

## Current State (After Session 6)

The project is in `/Users/stevan/Projects/typescript/100-Opal/mpp/`

### ✅ Completed Features (144 tests passing)

**Complete Expression Parsing**:
- Literals (numbers, strings)
- Variables with sigils ($scalar, @array, %hash)
- Binary operators (20 precedence levels with correct associativity)
- **Unary operators** (`-`, `+`, `!`) - NEW IN SESSION 6!
- **Ternary operator** (`? :`) - NEW IN SESSION 6!
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

**Developer Tools**:
- **Interactive REPL** (`npm run repl`) - NEW IN SESSION 6!
- Comprehensive test suite (144 tests)
- Strict TDD methodology

### Parser Can Currently Handle

```perl
# Complete programs with expressions and data structures!
my $users = [
    +{ "name" => "Alice", "scores" => [95, 87, 92], "active" => 1 },
    +{ "name" => "Bob", "scores" => [88, 91, 85], "active" => 0 }
];

sub average_score($person) {
    my $scores = $person->{"scores"};
    my $sum = $scores->[0] + $scores->[1] + $scores->[2];
    return $sum / 3;
}

sub get_status($person) {
    return $person->{"active"} ? "active" : "inactive";
}

for my $i (0..1) {
    my $user = $users->[$i];
    my $name = $user->{"name"};
    my $avg = average_score($user);
    my $status = get_status($user);

    my $grade = $avg >= 90 ? "A" : $avg >= 80 ? "B" : "C";

    print($name);
    print($grade);
    print($status);
}
```

**Achievement**: Complete expression support! Parser handles unary (`-$x`), binary (`$a + $b`), and ternary (`$x ? $a : $b`) operators with correct precedence and associativity.

## What I Want to Build This Session

I want to add **method calls**, the foundation for object-oriented programming:

```perl
# Object method calls
$obj->method($arg);
$person->get_name();
$config->set("timeout", 30);

# Class method calls (static methods)
Point->new(x => 5, y => 10);
Math->sqrt(16);

# Chained method calls
$obj->method1()->method2()->method3();
$db->connect()->query("SELECT * FROM users")->fetch();

# Method calls with data structure access
my $name = $users->[0]->get_profile()->get_name();
$data->{"config"}->validate()->save();

# Method calls in expressions
my $result = $obj->calculate() * 2 + 10;
my $total = $cart->get_total() + $tax->calculate($cart);
```

This will enable:
- Object-oriented programming
- Method chaining patterns
- Foundation for class definitions (future session)
- Integration with existing data structure access

## Implementation Plan

### 1. AST Node Type

Add to `src/AST.ts`:

```typescript
export interface MethodCallNode extends ASTNode {
    type: 'MethodCall';
    object: ASTNode;      // $obj, ClassName (identifier), or any expression
    method: string;       // method name (identifier)
    arguments: ASTNode[]; // argument list (can be empty)
}
```

### 2. Test Cases to Write

In `tests/Parser.test.ts`:
- Simple method call: `$obj->method()`
- Method with arguments: `$obj->method($a, $b)`
- Method with no arguments: `$obj->get_value()`
- Class method call: `Class->new()`
- Chained method calls: `$obj->m1()->m2()->m3()`
- Method call on expression: `get_obj()->method()`
- Method after array access: `$array->[0]->method()`
- Method after hash access: `$hash{"key"}->method()`
- Complex chain: `$data->[0]->method()->{"key"}`
- Method in expression: `$obj->value() + 10`

### 3. Parser Implementation

In `src/Parser.ts`, modify `parsePostfixOperators()`:

The key is to detect when `->` is followed by an identifier and `(`, indicating a method call (not array/hash dereference).

```typescript
// Inside parsePostfixOperators() while loop:

// Dereference: -> followed by [ or {
else if ((lexeme.category === 'BINOP' || lexeme.category === 'OPERATOR')
         && lexeme.token.value === '->') {

    // Check what follows the ->
    if (pos + 1 >= lexemes.length) break;

    const next = lexemes[pos + 1];

    // Method call: -> followed by identifier and (
    if (next.category === 'IDENTIFIER') {
        // Check if followed by (
        if (pos + 2 < lexemes.length && lexemes[pos + 2].category === 'LPAREN') {
            const methodName = next.token.value;

            // Parse arguments (similar to function call parsing)
            // Build MethodCallNode
            // Update current and pos
            // Continue to allow chaining
        }
    }

    // Array/hash dereference: -> followed by [ or {
    else if (next.category === 'LBRACKET' || next.category === 'LBRACE') {
        // ... existing dereference code ...
    }
}
```

### 4. Key Challenges

**Challenge 1: Distinguishing Method Calls from Dereference**
- `$obj->[0]` is array dereference
- `$obj->{"key"}` is hash dereference
- `$obj->method()` is method call

**Solution**:
- Check the token after `->`
- If identifier followed by `(` → method call
- If `[` → array dereference
- If `{` → hash dereference

**Challenge 2: Class Method Calls**
```perl
Point->new(x => 5, y => 10);  # Point is an identifier, not a variable
```

**Solution**:
- When parsing `->`, the base can be:
  - A variable (`$obj`)
  - An identifier (`ClassName`)
  - Any expression (`get_obj()`)
- parsePostfixOperators already handles this - base is ASTNode

**Challenge 3: Method Chaining**
```perl
$obj->m1()->m2()->m3();
```

**Solution**: The while loop in parsePostfixOperators naturally handles this:
1. Parse `$obj->m1()` → MethodCallNode
2. Current = MethodCallNode
3. Continue loop, see `->m2()`
4. Parse with current as base → nested MethodCallNode
5. Repeat for `->m3()`

**Challenge 4: Mixing Methods and Access**
```perl
$users->[0]->get_name();
$obj->method()->{"result"}[0];
```

**Solution**: The postfix loop already handles array/hash access. Methods are just another postfix operator in the same loop.

**Challenge 5: Parsing Arguments**
Method arguments use the same syntax as function calls. Need to:
1. Find matching `)`
2. Split arguments by `,` at depth 0
3. Parse each argument expression
4. Reuse existing function call argument parsing logic

### 5. Integration Points

**With Existing Features**:
- **Data structure access** (Session 5): Methods integrate into same postfix chain
- **Function calls** (Session 2): Reuse argument parsing logic
- **Dereference operator** (Session 5): `->` already tokenized and handled

**Precedence**:
- Methods bind as postfix operators (highest precedence)
- Handled in `parsePostfixOperators()` after `parsePrimary()`
- Before binary operators in `precedenceClimb()`

## Development Approach

Please continue using **strict TDD**:
1. Write comprehensive tests first (15-20 tests)
2. Add `MethodCallNode` to AST
3. Import `MethodCallNode` in Parser
4. Extend `parsePostfixOperators()` logic
5. Reuse argument parsing from function calls
6. Run tests frequently
7. Use REPL to experiment
8. Keep tests high-level (not overly specific)
9. Maintain 100% type safety (no `any` types)

## Key Design Decisions (Don't Change)

- No barewords (method names require explicit `->` syntax)
- `+{ }` syntax for hash literals (blocks use bare `{ }`)
- No regex literals yet (deferred for later)
- Pure syntax-directed parsing (no symbol table feedback)
- Parentheses required for all method calls (even with no args)
- `$_` is a keyword

## Critical Lessons from Previous Sessions

### Session 5: Postfix Operator Chain Pattern
- **Lesson**: Postfix operators (array/hash access) handled in loop after primary
- **Application**: Methods fit into same pattern - just check for `->identifier(`

### Session 6: Operator Category Checking
- **Lesson**: Always check lexer categories (BINOP, UNOP, OPERATOR, etc.)
- **Application**: `->` is BINOP, need to check category when detecting it

### Session 6: Lookahead for Disambiguation
- **Lesson**: Check next token to disambiguate similar syntax
- **Application**: After `->`, check if next is identifier+`(` vs `[` or `{`

## Files to Reference

- `README.md` - Project documentation with REPL usage
- `DEVELOPMENT_LOG.md` - Sessions 1-6 notes, especially Session 5 postfix operators
- `NEXT_STEPS.md` - Updated plan for Session 7+
- `src/Parser.ts` - Current parser (~1500 lines)
  - See `parsePostfixOperators()` around line 741
  - See function call parsing for argument pattern
- `src/AST.ts` - AST node definitions (~142 lines)
- `tests/Parser.test.ts` - 144 unit tests
- `bin/repl.js` - Interactive REPL for experimentation

## Success Criteria for This Session

By the end:
- ✅ Can parse simple method calls: `$obj->method()`
- ✅ Can parse method calls with arguments: `$obj->method($a, $b)`
- ✅ Can parse class method calls: `Class->new()`
- ✅ Can parse chained method calls: `$obj->m1()->m2()->m3()`
- ✅ Can parse methods mixed with data access: `$arr->[0]->method()`
- ✅ Method calls work in expressions
- ✅ All existing tests still pass (no regressions)
- ✅ ~155-165 tests passing (144 + 11-21 new tests)

## After This Session

Once method calls are complete, natural next steps:
1. **Assignment to elements** (`$array[0] = 5;`) - Mutable data structures
2. **Range as expression** (`my @nums = (1..10);`) - Complete range operator
3. **String interpolation** (`"Hello, $name!"`) - Enhanced strings
4. **Class definitions** (`class Point { ... }`) - Full OOP (requires methods)

## Let's Get Started!

Please begin by:
1. Use the REPL to explore current `->` behavior with arrays/hashes
2. Write comprehensive tests for method calls in `tests/Parser.test.ts`
3. Add `MethodCallNode` to `src/AST.ts`
4. Import `MethodCallNode` in `src/Parser.ts`
5. Extend `parsePostfixOperators()` to detect `->identifier(`
6. Reuse argument parsing logic from function calls
7. Test with existing tests to ensure no regressions

Ready to add method calls and enable OOP! 🚀
