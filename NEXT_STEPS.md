# Next Steps for MPP Development

## Current State (After Session 6)

**144 tests passing** - All green! ✅

### Fully Implemented Features

✅ **Core Expression Parsing** (COMPLETE!)
- Literals (numbers, strings)
- Variables with sigils ($scalar, @array, %hash)
- Binary operators (20 precedence levels with correct associativity)
- **Unary operators** (`-`, `+`, `!`)
- **Ternary operator** (`? :`)
- Parenthesized expressions
- Variable declarations (`my $x = 10;`)

✅ **Control Flow** (COMPLETE!)
- If/elsif/else chains with multiple branches
- Unless (prefix and postfix forms)
- While/until loops
- Foreach/for loops with ranges (`for my $i (1..10)`)
- Postfix conditionals (all statement types: `return 0 if $x`)
- Block statements for lexical scoping

✅ **Functions** (COMPLETE!)
- Function definitions with parameters (`sub add($x, $y) { ... }`)
- Anonymous subs (`my $fn = sub ($x) { return $x * 2; };`)
- Default parameter values (`sub greet($name = "World") { ... }`)
- Function calls with arguments (`add(5, 10)`)
- Return statements (`return $x + $y;`)
- Recursive function calls

✅ **Data Structures** (COMPLETE!)
- Array literals: `[1, 2, 3]`
- Hash literals: `+{ "key" => "value" }`
- List literals: `(1, 2, 3)`
- Nested structures: `[1, +{ "x" => [2, 3] }]`
- Array access: `$array[0]`, `$aref->[0]`
- Hash access: `$hash{"key"}`, `$href->{"key"}`
- Chained access: `$data->[0]{"key"}[1]`
- Dereference operator: `->`

✅ **Developer Tools**
- Interactive REPL (`npm run repl`)
- Comprehensive test suite (144 tests)
- TDD methodology established

### Parser Capabilities

```perl
# The parser can now handle sophisticated programs with:
# - Functions with recursion
# - Data structures with nesting
# - Complex expressions with unary/ternary operators
# - Chained data access

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

## Next Phase: Enhanced Expressions & OOP

### Priority 1: Method Calls ⭐ (RECOMMENDED NEXT)

```perl
# Object method calls
$obj->method($arg);
$person->get_name();
$config->set("timeout", 30);

# Class method calls
Point->new(x => 5, y => 10);
Math->sqrt(16);

# Chained method calls
$obj->method1()->method2()->method3();
$db->connect()->query("SELECT * FROM users")->fetch();
```

**AST Node Needed**:
```typescript
interface MethodCallNode extends ASTNode {
    type: 'MethodCall';
    object: ASTNode;      // $obj, ClassName, or expression
    method: string;       // method name
    arguments: ASTNode[]; // argument list
}
```

**Implementation Tasks**:
1. Detect `->` followed by identifier (not `[` or `{`)
2. Parse method name as identifier
3. Parse argument list (reuse function call parsing)
4. Handle in postfix operator chain
5. Support chained method calls

**Why This is High Priority**:
- Enables object-oriented programming
- Reuses `->` operator (already tokenized)
- Builds on function call parsing (already implemented)
- Common pattern in real Perl code
- Foundation for classes (next major feature)

**Estimated time**: 1-2 hours

**Tests to Write**:
- Simple method call: `$obj->method()`
- Method with arguments: `$obj->method($a, $b)`
- Class method call: `Class->new()`
- Chained method calls: `$obj->m1()->m2()`
- Method call on expression: `get_obj()->method()`
- Method calls in expressions

### Priority 2: Range Operator as Expression

```perl
# Currently works in foreach:
for my $i (1..10) { ... }

# Should also work as expression:
my @range = (1..10);
my $slice = @array[0..5];

# More complex:
my @subset = @data[$start..$end];
```

**AST Node**: Already exists as BinaryOpNode with operator `..`

**Implementation Tasks**:
1. Range already parses in expressions
2. May need context handling for list vs scalar
3. Verify works in all expression contexts

**Estimated time**: 30 minutes - 1 hour

### Priority 3: Assignment to Array/Hash Elements

```perl
# Array element assignment
$array[0] = 5;
$array[$i] = $value;

# Hash element assignment
$hash{"key"} = "value";
$hash{$key} = $data;

# Dereference assignment
$aref->[0] = 10;
$href->{"name"} = "Alice";

# Chained access assignment
$data->[0]{"key"} = $value;
```

**AST Changes**:
- Left side of `=` can now be ArrayAccessNode or HashAccessNode
- Current BinaryOpNode with `=` operator still works

**Implementation Tasks**:
1. Modify assignment parsing to accept access nodes as lvalue
2. Verify ArrayAccessNode and HashAccessNode can be left side
3. Handle chained access assignment
4. Tests for all combinations

**Estimated time**: 1-2 hours

## Phase 3: Advanced Features

### Priority 4: String Interpolation

```perl
# Simple interpolation
my $name = "Alice";
print("Hello, $name!");  # "Hello, Alice!"

# Complex interpolation
my $msg = "User: $user->{"name"}, Score: $scores->[0]";

# Escape sequences
my $str = "Line 1\nLine 2\tTabbed";
```

**Implementation Tasks**:
1. Parse string contents in Tokenizer
2. Identify interpolated variables
3. Build string concatenation in AST
4. Handle escape sequences
5. Support `${expr}` for complex expressions

**Estimated time**: 2-3 hours

**Note**: This is a Tokenizer/Lexer change, not just Parser

### Priority 5: Regular Expressions

```perl
# Match operator
if ($str =~ m/pattern/) { ... }

# Substitution
$str =~ s/old/new/;
$str =~ s/old/new/g;  # Global flag

# Pattern binding
my $result = $str =~ m/(\d+)/;
```

**AST Nodes Needed**:
```typescript
interface RegexNode extends ASTNode {
    type: 'Regex';
    pattern: string;
    flags: string;  // i, g, m, s, x
}

interface RegexOpNode extends ASTNode {
    type: 'RegexOp';
    operator: string;  // =~, !~
    left: ASTNode;     // String expression
    right: RegexNode;  // Regex literal
}
```

**Estimated time**: 3-4 hours

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
        return sqrt($x ** 2 + $y ** 2);
    }
}

my $p = Point->new(x => 5, y => 10);
$p->move(2, 3);
my $d = $p->distance();
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
```

**Dependencies**:
- Requires method calls (Priority 1)
- Uses existing sub definition parsing
- Field attributes are new

**Estimated time**: 3-4 hours

## Implementation Strategy

### Recommended Order for Session 7+

1. **Method calls** (Session 7) - Enables OOP, foundation for classes
2. **Assignment to elements** - Mutable data structures
3. **Range as expression** - Quick win, complete range operator
4. **String interpolation** - Common feature, user-facing
5. **Regular expressions** - Pattern matching capability
6. **Classes** - Full OOP support (requires method calls)

### Why This Order?

1. **Method calls first** because:
   - Enables object-oriented programming
   - Foundation for classes
   - Relatively simple (builds on existing patterns)
   - High user value

2. **Assignment to elements** because:
   - Makes data structures mutable
   - Needed for real programs
   - Clean, well-defined scope

3. **Range as expression** because:
   - Quick win
   - Completes existing feature
   - Low complexity

4. **String interpolation** because:
   - High user value
   - Different layer (Tokenizer)
   - Valuable even without OOP

5. **Regular expressions** because:
   - Distinct feature
   - Powerful capability
   - Can be deferred if needed

6. **Classes last** because:
   - Most complex feature
   - Depends on method calls
   - Can use all prior features
   - Natural culmination

## Testing Strategy (Proven Effective)

Continue the strict TDD approach:

### For Each Feature

1. **Write tests first** ✅ (15-20 tests per feature)
2. **Add AST nodes** ✅
3. **Implement parsing** ✅
4. **Run all tests** (check regressions) ✅
5. **Use REPL to explore** ✅
6. **Keep tests high-level** ✅

### Test Template

```typescript
test('parses [feature name]', async () => {
    const stmts = await parse('[perl code]');

    assert.strictEqual(stmts.length, 1);
    const node = stmts[0] as [NodeType];
    assert.strictEqual(node.type, '[Type]');
    // Check key properties
    // Don't over-specify internal structure
});
```

## File Organization

Current status (~1500 lines in Parser.ts). Consider splitting after Session 7-8:

```
src/
├── Parser/
│   ├── index.ts              # Main Parser class, run() method
│   ├── ExpressionParser.ts   # precedenceClimb, parsePrimary
│   ├── StatementParser.ts    # parseStatement dispatcher
│   ├── ControlParser.ts      # If/while/for/foreach/unless
│   ├── FunctionParser.ts     # Sub definitions, calls, returns
│   ├── DataParser.ts         # Arrays, hashes, access
│   ├── OOPParser.ts          # Methods, classes (future)
│   └── PostfixParser.ts      # Array/hash access, method calls
├── AST/
│   ├── index.ts              # Re-exports all
│   ├── Expressions.ts        # Literals, variables, operations
│   ├── Statements.ts         # Control flow, declarations
│   ├── DataStructures.ts     # Arrays, hashes, access
│   └── OOP.ts                # Classes, methods, fields
```

**Recommendation**: Wait until ~1800-2000 lines before splitting. Current organization is still manageable.

## Success Metrics

### Session 6 Achievement (COMPLETE! ✅)
- ✅ Unary operators working
- ✅ Ternary operator working
- ✅ Interactive REPL created
- ✅ 144 tests passing (exceeded goal!)

### Session 7 Goal
- 🎯 Method calls working
- 🎯 Chained method calls
- 🎯 Class method calls (Class->new())
- 🎯 Assignment to array/hash elements
- 🎯 ~155-165 tests passing

### Language Completeness Goals

**Expression completeness** (ACHIEVED! ✅):
- ✅ Variables and operators
- ✅ Unary operators
- ✅ Binary operators
- ✅ Ternary operator
- ✅ Function calls

**Statement completeness** (ACHIEVED! ✅):
- ✅ Control flow (if/while/for/foreach/unless)
- ✅ Variable declarations
- ✅ Function definitions
- ✅ Return statements
- ✅ Block statements

**Data structure completeness** (ACHIEVED! ✅):
- ✅ Array/hash/list literals
- ✅ Nested structures
- ✅ Array/hash access
- ✅ Chained access
- ✅ Dereference operator

**OOP completeness** (In Progress):
- 🔲 Method calls
- 🔲 Class definitions
- 🔲 Field declarations
- 🔲 Method definitions
- 🔲 Attributes (:reader, :writer)

**Full language completeness**:
- Everything above, plus:
- 🔲 Assignment to elements
- 🔲 String interpolation
- 🔲 Regular expressions
- 🔲 Range as expression

## Example Target Code

After Session 7 (method calls), the parser should handle:

```perl
# Object creation and method calls
my $point = Point->new(x => 5, y => 10);
$point->move(2, 3);
my $distance = $point->distance();

# Chained method calls
my $result = $db->connect()
                ->query("SELECT * FROM users")
                ->fetch()
                ->process();

# Method calls with data structures
my $user = $users->[0]->get_profile()->get_name();
```

After full completion, should handle:

```perl
class Stack {
    field @items = ();

    method push($item) {
        @items = (@items, $item);
        return $self;  # Method chaining
    }

    method pop() {
        my $last = @items[-1];
        @items = @items[0..-2];
        return $last;
    }

    method peek() {
        return @items[-1];
    }

    method size() {
        return scalar(@items);
    }

    method is_empty() {
        return $self->size() == 0;
    }
}

my $stack = Stack->new();
$stack->push(1)->push(2)->push(3);  # Chained

print("Top: " . $stack->peek());    # String interpolation
print("Size: " . $stack->size());

while (!$stack->is_empty()) {
    print($stack->pop());
}
```

## Development Velocity

Based on Sessions 1-6:

- Session 1: Foundation (Tokenizer, Lexer, basic Parser)
- Session 2: Control flow + function calls
- Session 3: Sub definitions
- Session 4: Data structure literals
- Session 5: Data structure access
- Session 6: Unary/ternary operators + REPL
- Average: ~450 lines/session, ~20 tests/session

**Velocity is accelerating because**:
- Solid infrastructure in place
- Reusable patterns established
- TDD process streamlined
- REPL enables faster experimentation

**Estimated remaining**:
- Method calls: 1 session
- Assignment to elements: 1 session
- String interpolation: 1 session
- Classes: 1-2 sessions
- Polish/cleanup: 1 session
- **Total to full completion: 5-6 more sessions**

## Resources

- ✅ **Precedence table**: Complete with unary/ternary
- ✅ **TDD pattern**: Proven highly effective
- ✅ **Async generators**: Working perfectly
- ✅ **REPL tool**: Accelerates development
- ✅ **Helper functions**: Reusable patterns
- 📖 **PERL_SYNTAX_SPEC.md**: Reference for features
- 📖 **DEVELOPMENT_LOG.md**: 6 sessions of insights

## Next Session Checklist

Before starting Session 7:

1. ✅ Review current test suite (144 tests)
2. ✅ Read DEVELOPMENT_LOG.md Session 6 notes
3. 🎯 Understand method call syntax: `$obj->method($args)`
4. 🎯 Review postfix operator pattern from Session 5
5. 🎯 Plan how method calls integrate with access chain
6. 🎯 Use REPL to experiment with `->` operator
7. 🎯 Start with tests (TDD!)

---

**Status**: Session 6 Complete! Ready for Session 7 - Method Calls! 🚀

**Achievement Unlocked**:
- ✅ Complete expression support (unary, binary, ternary)
- ✅ Complete data structures with access
- ✅ Interactive development tools (REPL)
- 🎯 Next: Object-Oriented Programming (method calls → classes)
