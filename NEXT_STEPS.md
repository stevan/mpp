# Next Steps for MPP Development

## Current State (After Session 3)

**74 tests passing** - All green! ✅

### Fully Implemented Features

✅ **Core Expression Parsing**
- Literals (numbers, strings)
- Variables with sigils ($scalar, @array, %hash)
- Binary operators (20 precedence levels with correct associativity)
- Parenthesized expressions
- Variable declarations (`my $x = 10;`)

✅ **Control Flow (COMPLETE!)**
- If/elsif/else chains with multiple branches
- Unless (prefix and postfix forms)
- While/until loops
- Foreach/for loops with ranges (`for my $i (1..10)`)
- Postfix conditionals (all statement types: `return 0 if $x`)
- Block statements for lexical scoping

✅ **Functions (COMPLETE!)**
- Function definitions with parameters (`sub add($x, $y) { ... }`)
- Anonymous subs (`my $fn = sub { ... };`)
- Default parameter values (`sub greet($name = "World") { ... }`)
- Function calls with arguments (`add(5, 10)`)
- Return statements (`return $x + $y;`)
- Recursive function calls

### Parser Capabilities

```perl
# The parser can now handle complete, self-contained programs:
sub fibonacci($n) {
    return 0 if $n == 0;
    return 1 if $n == 1;
    return fibonacci($n - 1) + fibonacci($n - 2);
}

sub factorial($n, $acc = 1) {
    return $acc if $n <= 1;
    return factorial($n - 1, $n * $acc);
}

for my $i (1..10) {
    my $fib = fibonacci($i);
    my $fact = factorial($i);
    print("fib($i) = $fib, fact($i) = $fact");
}
```

## ✅ Completed in Session 3: Sub Declarations

**COMPLETE!** Sub definitions with signatures now fully working:

```perl
sub add($x, $y) {
    return $x + $y;
}

sub greet($name = "World") {
    print("Hello, $name!");
}

# Anonymous sub
my $double = sub ($x) { return $x * 2 };
```

**Implementation Summary**:
- ✅ Added `SubNode` and `ParameterNode` to AST.ts
- ✅ 6 unit tests in Parser.test.ts
- ✅ 5 integration tests in Examples.test.ts (complete programs)
- ✅ Implemented `parseSubDeclaration()` and `parseParameter()`
- ✅ Anonymous sub support in `parsePrimary()`
- ✅ 74 tests passing (was 63, +11 new tests)

**Critical Bugs Fixed**:
1. **Postfix conditionals with return statements**: Changed from `parseExpression()` to recursive `parseStatement()` call so `return 0 if $x` works correctly
2. **Multi-statement programs**: Added sub definition yielding in `run()` method at closing brace
3. **Postfix depth tracking**: Only detect postfix conditionals at depth 0, not inside nested structures

**Result**: Parser now handles complete, self-contained, recursive programs! Basic language completeness achieved! 🎉

## Next Phase: Data Structures

### Priority 1: Array and Hash Literals ⭐

```perl
# Array literals
my @array = (1, 2, 3, 4, 5);
my $aref = [1, 2, 3];  # Anonymous array

# Hash literals
my %hash = (a => 1, b => 2);
my $href = +{ a => 1, b => 2 };  # Anonymous hash (+ prefix required!)
```

**AST Nodes Needed**:
```typescript
interface ArrayLiteralNode extends ASTNode {
    type: 'ArrayLiteral';
    elements: ASTNode[];
}

interface HashLiteralNode extends ASTNode {
    type: 'HashLiteral';
    pairs: { key: ASTNode; value: ASTNode }[];
}

interface ListNode extends ASTNode {
    type: 'List';
    elements: ASTNode[];
}
```

**Implementation Tasks**:
1. Parse `[...]` as array reference literals
2. Parse `+{...}` as hash reference literals
3. Parse `(...)` as list or parenthesized expression (context-dependent)
4. Handle `=>` fat comma operator
5. Tests for nested structures

**Estimated time**: 2-3 hours

**Note**: The `+{ }` syntax is crucial - it disambiguates hash literals from blocks!

### Priority 2: Array/Hash Access

```perl
# Indexing
$array[0]           # Array element
$hash{key}          # Hash value
@array[0..2]        # Array slice
@hash{qw(a b)}      # Hash slice

# Dereferencing
$aref->[0]          # Array ref element
$href->{key}        # Hash ref value
$aref->[1]->[2]     # Nested access
```

**AST Nodes Needed**:
```typescript
interface IndexNode extends ASTNode {
    type: 'Index';
    object: ASTNode;
    index: ASTNode;
    sigil: string;  // $ @ % for context
}

interface DerefNode extends ASTNode {
    type: 'Deref';
    object: ASTNode;
    accessor: ASTNode;  // IndexNode or similar
}
```

**Implementation Tasks**:
1. Parse `[...]` after variable
2. Parse `{...}` after variable
3. Parse `->` arrow operator
4. Handle sigil context (@, $, %)
5. Support chained access

**Estimated time**: 2-3 hours

## Phase 3: Advanced Features

### Priority 3: Ternary Operator

```perl
my $max = $a > $b ? $a : $b;
my $result = $error ? handle_error() : process_data();
```

**AST Node**:
```typescript
interface TernaryNode extends ASTNode {
    type: 'Ternary';
    condition: ASTNode;
    thenExpr: ASTNode;
    elseExpr: ASTNode;
}
```

**Implementation**: Add to precedence table at level 16 (between range and assignment)

**Estimated time**: 30 minutes - 1 hour

### Priority 4: Unary Operators

```perl
!$x
-$y
+$z
not $condition
defined $var
```

**AST Node** (already defined!):
```typescript
interface UnaryOpNode extends ASTNode {
    type: 'UnaryOp';
    operator: string;
    operand: ASTNode;
}
```

**Implementation**: Parse in `parsePrimary()` before other primaries

**Estimated time**: 1 hour

### Priority 5: Classes (Perl 7 Style)

```perl
class Point {
    field $x :reader :writer = 0;
    field $y :reader :writer = 0;

    method move($dx, $dy) {
        $x += $dx;
        $y += $dy;
    }

    method distance() {
        return sqrt($x * $x + $y * $y);
    }
}

my $p = Point->new(x => 5, y => 10);
$p->move(2, 3);
```

**AST Nodes Needed**:
```typescript
interface ClassNode extends ASTNode {
    type: 'Class';
    name: string;
    fields: FieldNode[];
    methods: MethodNode[];
}

interface FieldNode extends ASTNode {
    type: 'Field';
    variable: VariableNode;
    attributes: string[];  // :reader, :writer, etc.
    initializer?: ASTNode;
}

interface MethodNode extends ASTNode {
    type: 'Method';
    name: string;
    parameters: ParameterNode[];
    body: ASTNode[];
}

interface MethodCallNode extends ASTNode {
    type: 'MethodCall';
    object: ASTNode;
    method: string;
    arguments: ASTNode[];
}
```

**Estimated time**: 3-4 hours

## Implementation Strategy

### Recommended Order

1. ✅ **Sub definitions** (Session 3 - COMPLETE!) - Complete function support
2. **Array/hash literals** (Session 4) - Basic data structures
3. **Array/hash access** (Session 5) - Data structure manipulation
4. **Ternary operator** - Expression completeness
5. **Unary operators** - Expression completeness
6. **Classes** - Object-oriented programming

### Why This Order?

1. ✅ **Subs first** (DONE!) because:
   - We already had calls and returns
   - Makes the language immediately useful
   - Clean, self-contained feature
   - **Result**: Basic language completeness achieved!

2. **Data structures next** because:
   - Needed for real programs
   - Foundation for classes
   - Well-defined scope

3. **Ternary/unary** because:
   - Quick wins
   - Expression completeness
   - Low complexity

4. **Classes last** because:
   - Most complex feature
   - Depends on everything else
   - Can use all prior features

## Testing Strategy (Continued)

Continue the TDD approach that's working well:

### For Each Feature

1. **Write tests first** ✅
2. **Add AST nodes** ✅
3. **Implement parsing** ✅
4. **Run all tests** (check regressions) ✅
5. **Keep tests high-level** ✅

### Test Template

```typescript
test('parses [feature name]', async () => {
    const stmts = await parse('[perl code]');

    assert.strictEqual(stmts.length, 1);
    const node = stmts[0] as [NodeType];
    assert.strictEqual(node.type, '[Type]');
    // ... check key properties
});
```

## File Organization

Parser.ts is now ~850 lines. Consider splitting after session 3:

```
src/
├── Parser/
│   ├── index.ts              # Main Parser class, run() method
│   ├── ExpressionParser.ts   # precedenceClimb, parsePrimary
│   ├── StatementParser.ts    # parseStatement dispatcher
│   ├── ControlParser.ts      # If/while/for/foreach/unless
│   ├── FunctionParser.ts     # Sub definitions, calls, returns
│   ├── DataParser.ts          # Arrays, hashes, access
│   └── ClassParser.ts        # Class definitions (future)
├── AST/
│   ├── index.ts              # Re-exports all
│   ├── Expressions.ts        # Literals, variables, operations
│   ├── Statements.ts         # Control flow, declarations
│   └── Declarations.ts       # Subs, classes, fields
```

**Recommendation**: Wait until ~1000-1200 lines before splitting. Current organization is still manageable.

## Success Metrics

### Session 3 Goal (ACHIEVED! ✅)
- ✅ Sub definitions working
- ✅ Anonymous subs working
- ✅ Default parameters working
- ✅ Can write complete functions
- ✅ 74 tests passing (exceeded goal!)

### Session 4 Goal
- 🎯 Array and hash literals working
- 🎯 List context handling
- 🎯 Fat comma operator (=>)
- 🎯 Nested data structures
- 🎯 ~80-85 tests passing

### Language Completeness Goals

**Basic completeness** (can write real programs):
- ✅ Variables and operators
- ✅ Control flow
- ✅ Functions (calls + definitions + returns)
- 🔲 Data structures (arrays/hashes)
- 🔲 Data structure access

**Full completeness** (production ready):
- Everything above, plus:
- 🔲 Ternary operator
- 🔲 Unary operators
- 🔲 Classes and methods
- 🔲 Method calls

## Example Target Code

After implementing sub definitions (Session 3), the parser should handle:

```perl
sub fibonacci($n) {
    return 0 if $n == 0;
    return 1 if $n == 1;
    return fibonacci($n - 1) + fibonacci($n - 2);
}

sub factorial($n, $acc = 1) {
    return $acc if $n <= 1;
    return factorial($n - 1, $n * $acc);
}

for my $i (1..10) {
    my $fib = fibonacci($i);
    my $fact = factorial($i);
    print("fib($i) = $fib, fact($i) = $fact");
}
```

After full completion, should handle:

```perl
class Stack {
    field @items = ();

    method push($item) {
        @items = (@items, $item);
    }

    method pop() {
        my $last = @items[-1];
        @items = @items[0..-2];
        return $last;
    }

    method size() {
        return scalar(@items);
    }
}

my $s = Stack->new();
$s->push(1);
$s->push(2);
$s->push(3);
print($s->pop());  # 3
```

## Development Velocity

Based on Sessions 1-3:

- Session 1: ~700 lines code, 32 tests (foundation)
- Session 2: ~550 lines code, +31 tests (control flow + functions)
- Session 3: ~150 lines code, +11 tests (sub definitions)
- Average: ~460 lines/session, ~25 tests/session

**Session 3 velocity increase reasons**:
- Reused existing helpers (parseBlock, parameter pattern)
- Solid infrastructure already in place
- TDD well-established
- Clean, focused feature

**Estimated remaining**:
- Data structures: 1-2 sessions
- Classes: 1-2 sessions
- Polish/cleanup: 1 session
- **Total to full completion: 3-5 more sessions**

## Resources

- ✅ **Precedence table**: Implemented and tested
- ✅ **TDD pattern**: Proven effective
- ✅ **Async generators**: Working perfectly
- ✅ **Block parsing**: Reusable helper
- 📖 **PERL_SYNTAX_SPEC.md**: Reference for features
- 📖 **DEVELOPMENT_LOG.md**: Session notes and decisions

## Next Session Checklist

Before starting Session 4:

1. ✅ Review current test suite (74 tests)
2. ✅ Read DEVELOPMENT_LOG.md Session 3 notes
3. 🎯 Understand array/hash literal syntax from examples
4. 🎯 Plan AST nodes for data structures
5. 🎯 Understand +{} disambiguation for hash literals
6. 🎯 Start with tests (TDD!)

---

**Status**: Session 3 Complete! Ready for Session 4 - Data Structures! 🚀

**Achievement Unlocked**: Basic Language Completeness - Parser can handle complete, self-contained programs with functions, control flow, and recursion!
