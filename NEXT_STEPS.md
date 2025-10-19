# Next Steps for MPP Development

## Current State (After Session 2)

**63 tests passing** - All green! ✅

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
- Postfix conditionals (`say "x" if $y`)
- Block statements for lexical scoping

✅ **Functions**
- Function calls with arguments (`add(5, 10)`)
- Return statements (`return $x + $y;`)

### Parser Capabilities

```perl
# The parser can now handle complex code like this:
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

## Next Phase: Function Definitions

### Priority 1: Sub Declarations ⭐

**Goal**: Parse function definitions with signatures

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

**AST Nodes Needed**:
```typescript
interface ParameterNode extends ASTNode {
    type: 'Parameter';
    variable: VariableNode;
    defaultValue?: ASTNode;
}

interface SubNode extends ASTNode {
    type: 'Sub';
    name?: string;  // Optional for anonymous subs
    parameters: ParameterNode[];
    body: ASTNode[];
}
```

**Implementation Tasks**:
1. Add `SubNode` and `ParameterNode` to AST.ts
2. Write tests:
   - Named sub with parameters
   - Named sub with no parameters
   - Sub with default parameter values
   - Anonymous sub (sub expression)
   - Sub returning value
3. Implement `parseSubDeclaration()`:
   - Detect `sub` keyword
   - Parse optional name (identifier)
   - Parse parameter list `($x, $y = default)`
   - Parse block body (reuse `parseBlock()`)
   - Handle anonymous subs in expressions

**Estimated time**: 1-2 hours

**Why this is Priority 1**:
- Pairs perfectly with return statements ✅
- Pairs perfectly with function calls ✅
- Enables complete programs to be written
- Natural complement to control flow

## Phase 2: Data Structures

### Priority 2: Array and Hash Literals

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

### Priority 3: Array/Hash Access

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

### Priority 4: Ternary Operator

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

### Priority 5: Unary Operators

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

### Priority 6: Classes (Perl 7 Style)

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

1. **Sub definitions** (Session 3) - Complete function support
2. **Array/hash literals** - Basic data structures
3. **Array/hash access** - Data structure manipulation
4. **Ternary operator** - Expression completeness
5. **Unary operators** - Expression completeness
6. **Classes** - Object-oriented programming

### Why This Order?

1. **Subs first** because:
   - We already have calls and returns
   - Makes the language immediately useful
   - Clean, self-contained feature

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

### Session 3 Goal
- ✅ Sub definitions working
- ✅ Anonymous subs working
- ✅ Default parameters working
- ✅ Can write complete functions
- ✅ ~70-75 tests passing

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

Based on Sessions 1-2:

- Session 1: ~700 lines code, 32 tests (foundation)
- Session 2: ~550 lines code, +31 tests (control flow + functions)
- Average: ~600 lines/session, ~30 tests/session

**Estimated remaining**:
- Sub definitions: 1 session
- Data structures: 1-2 sessions
- Classes: 1-2 sessions
- **Total to completion: 3-5 more sessions**

## Resources

- ✅ **Precedence table**: Implemented and tested
- ✅ **TDD pattern**: Proven effective
- ✅ **Async generators**: Working perfectly
- ✅ **Block parsing**: Reusable helper
- 📖 **PERL_SYNTAX_SPEC.md**: Reference for features
- 📖 **DEVELOPMENT_LOG.md**: Session notes and decisions

## Next Session Checklist

Before starting Session 3:

1. ✅ Review current test suite (63 tests)
2. ✅ Read DEVELOPMENT_LOG.md for context
3. ✅ Understand sub syntax from examples
4. ✅ Plan AST nodes for subs and parameters
5. ✅ Start with tests (TDD!)

---

**Status**: Ready for Session 3 - Sub Definitions! 🚀
