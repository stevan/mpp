# Development Log - MPP Parser

## Session 6 Summary

**Date**: Session 6 of MPP development
**Duration**: ~2 hours
**Methodology**: Strict Test-Driven Development (TDD)
**Result**: Unary operators, ternary operator, and interactive REPL!

### Starting Point
- 122 tests passing
- Complete data structures with access operations
- Binary operators only

### Ending Point
- **144 tests passing** (+22 new tests)
- Unary operators: `-`, `+`, `!` (with proper precedence)
- Ternary operator: `? :` (right-associative)
- Interactive REPL tool for exploring AST
- Updated precedence table with levels 4 and 16

## What We Built This Session

### 1. Unary Operators (src/Parser.ts, src/AST.ts)

**Features**:
- Unary minus: `-5`, `-$x`, `-($a + $b)`
- Unary plus: `+10`
- Logical not: `!$flag`, `!($x > 5)`
- Multiple unary operators: `!!$value`, `-+$x`
- Proper precedence: `-$x + 10` → `(-$x) + 10`
- Disambiguation from hash literals: `+{ }` still works

**AST Node**:
```typescript
interface UnaryOpNode extends ASTNode {
    type: 'UnaryOp';
    operator: string;  // '-', '+', or '!'
    operand: ASTNode;
}
```

**Implementation Details**:
- Added to `parsePrimary()` at lines 368-393
- Checks for `BINOP`, `OPERATOR`, and `UNOP` categories
- Special handling: `+` followed by `{` → hash literal, not unary plus
- Recursive parsing enables multiple unary operators
- Precedence level 4 (tighter than binary operators)

**Tests Added**: 14 tests (122 → 136)
- Simple unary with literals and variables
- Unary in complex expressions
- Double negation (`!!`)
- Multiple unary (`-+$x`)
- Precedence verification
- Hash literal regression test

### 2. Ternary Operator (src/Parser.ts, src/AST.ts, src/Tokenizer.ts)

**Features**:
- Simple ternary: `$x > 5 ? 10 : 20`
- Variable expressions: `$condition ? $a : $b`
- Complex expressions: `$x > 10 ? $x * 2 : $x + 1`
- Nested ternary (right-associative): `$a ? $b : $c ? $d : $e`
- In function calls: `print($x > 5 ? "big" : "small")`
- With function calls: `$flag ? get_a() : get_b()`
- With unary operators: `!$flag ? -10 : +20`

**AST Node**:
```typescript
interface TernaryNode extends ASTNode {
    type: 'Ternary';
    condition: ASTNode;
    trueExpr: ASTNode;
    falseExpr: ASTNode;
}
```

**Implementation Details**:
- Added `?` and `:` to `Tokenizer.isOperatorChar()` at line 230
- Added `?` to precedence table at level 16 (between range and assignment)
- Special handling in `precedenceClimb()` at lines 319-380:
  - Finds matching `:` at correct nesting depth
  - Handles nested ternary operators correctly
  - Right-associative: `a ? b : c ? d : e` → `a ? b : (c ? d : e)`
  - Depth tracking accounts for parentheses, brackets, braces, and nested `?:`

**Tests Added**: 8 tests (136 → 144)
- Simple ternary with literals and variables
- Complex expressions in branches
- Nested ternary (right associativity)
- Ternary in function calls
- Function calls in branches
- Standalone ternary
- With unary operators

### 3. Interactive REPL Tool (bin/repl.js)

**Features**:
- Interactive AST exploration
- Pretty-printed JSON output
- Multi-statement support
- Built-in commands: `.help`, `.exit`, `.quit`
- Error handling

**Usage**:
```bash
npm run repl
```

**Example Session**:
```
mpp> my $x = 10;
{
  "type": "Declaration",
  "declarator": "my",
  "variable": { "type": "Variable", "name": "$x" },
  "initializer": { "type": "Number", "value": "10" }
}

mpp> $x > 5 ? "big" : "small";
{
  "type": "Ternary",
  "condition": { ... },
  "trueExpr": { ... },
  "falseExpr": { ... }
}
```

**Benefits**:
- Quick experimentation with syntax
- Visual AST structure understanding
- Testing edge cases
- Learning tool for new contributors

## Examples That Now Work

```perl
# Unary operators
my $negative = -5;
my $opposite = -$x;
my $inverted = !$flag;
my $result = -$x + 10;  # (-$x) + 10
my $double = !!$value;

# Ternary operator
my $label = $x > 5 ? "big" : "small";
my $value = $condition ? $a : $b;
my $result = $x > 10 ? $x * 2 : $x + 1;

# Nested ternary (right-associative)
my $grade = $score >= 90 ? "A" : $score >= 80 ? "B" : "C";
# Parsed as: $score >= 90 ? "A" : ($score >= 80 ? "B" : "C")

# Complex combinations
my $result = !$flag ? -10 : +20;
my $output = $valid ? get_value() : get_default();
print($x > 0 ? "positive" : $x < 0 ? "negative" : "zero");
```

## Architectural Insights

### Unary Operator Placement
Unary operators are handled in `parsePrimary()` because:
1. **High precedence** - They bind tighter than all binary operators
2. **Prefix position** - They appear before the primary expression
3. **Recursive handling** - Multiple unary ops (`!!$x`) work naturally
4. **Disambiguation** - Can check lookahead for `+{` hash literal

### Ternary Operator Complexity
Ternary required special handling because:
1. **Three operands** - Doesn't fit binary operator pattern
2. **Two operators** - `?` and `:` must be paired
3. **Nesting depth** - Finding matching `:` requires depth tracking
4. **Right-associative** - `a ? b : c ? d : e` groups right: `a ? b : (c ? d : e)`

The depth tracking algorithm:
```typescript
// Track nesting of:
// - Parentheses, brackets, braces
// - Nested ternary operators
// Find `:` at depth 0
for (let i = currentPos; i < lexemes.length; i++) {
    if (lexemes[i] is '(' or '[' or '{') depth++;
    else if (lexemes[i] is ')' or ']' or '}') depth--;
    else if (depth === 0 && lexemes[i] === '?') depth++;
    else if (depth === 1 && lexemes[i] === ':') depth--;
    else if (depth === 0 && lexemes[i] === ':') {
        colonPos = i;
        break;
    }
}
```

### REPL Design
The REPL is simple but effective:
- Uses readline for interactive input
- Parses each line independently
- No state between lines (stateless)
- JSON.stringify for AST display (simple but clear)

## What's Next: Session 7

Natural progressions:
1. **Method calls** - `$obj->method($arg)` - OOP support
2. **Range operator as expression** - `(1..10)` not just in foreach
3. **Assignment to elements** - `$array[0] = 5;` - Mutable data structures
4. **String interpolation** - `"Value: $x"` - String features
5. **Regex literals** - `m/pattern/` - Pattern matching

The most impactful next step would be **method calls** since:
- Enables object-oriented programming
- Reuses `->` operator (already tokenized)
- Builds on function call parsing (already implemented)
- Common pattern in real Perl code

## Lessons Learned

1. **Check lexer categories** - The `!` operator was initially missed because it was categorized as `UNOP` not `BINOP`. Always verify lexer output!

2. **Tokenizer additions need testing** - Adding `?` and `:` to `isOperatorChar()` was simple but required rebuild to take effect.

3. **Precedence matters** - Ternary at level 16 (between range and assignment) matches Perl's precedence, enabling natural expressions like `$x = $a ? $b : $c`.

4. **Right-associativity is key** - Ternary must be right-associative for nested ternary to work correctly: `a ? b : c ? d : e`.

5. **REPL is invaluable** - Having an interactive tool makes experimentation much faster. Should have built this earlier!

6. **TDD catches regressions** - The hash literal test (`+{ }`) verified unary `+` didn't break existing functionality.

7. **Depth tracking is reusable** - The same pattern works for ternary `:` matching, hash pair `=>` finding, and data structure parsing.

## Files Modified

**Session 6 Changes**:
1. **src/AST.ts** - Added `UnaryOpNode` and `TernaryNode` interfaces
2. **src/Tokenizer.ts** - Added `?` and `:` as operator characters
3. **src/Parser.ts** - Added unary parsing in `parsePrimary()`, ternary in `precedenceClimb()`
4. **tests/Parser.test.ts** - Added 22 new tests (14 unary + 8 ternary)
5. **bin/repl.js** - Created interactive REPL tool (NEW FILE)
6. **package.json** - Added `npm run repl` script
7. **README.md** - Added REPL documentation and updated precedence table

**Cumulative Stats**:
- Tokenizer: ~332 lines (added `?` and `:`)
- Lexer: ~100 lines (unchanged)
- Parser: ~1500 lines (added unary and ternary support)
- AST: ~142 lines (added 2 node types)
- Tests: ~1240 lines (added 22 tests)
- REPL: ~97 lines (NEW)
- **Total: ~3400 lines**
- **Tests: 144 passing**

## Session 5 Summary

**Date**: Session 5 of MPP development
**Duration**: ~1 hour
**Methodology**: Test-Driven Development (TDD)
**Result**: Complete data structure access - arrays, hashes, dereferencing, and chaining!

### Starting Point
- 107 tests passing
- Complete data structure literals (arrays, hashes, lists)
- No access operations yet

### Ending Point
- **122 tests passing** (+15 new tests for access operations)
- Array element access: `$array[0]`
- Hash value access: `$hash{"key"}`
- Array reference dereference: `$aref->[0]`
- Hash reference dereference: `$href->{"key"}`
- Chained access: `$data->[0]{"key"}[1]{"name"}`
- **Data structure support now complete!**

## What We Built This Session

### 1. Array Access (src/Parser.ts, src/AST.ts)

**Features**:
- Direct array access: `$array[0]`
- Expression indices: `$array[$i + 1]`
- Array reference dereference: `$aref->[0]`
- Function call dereference: `get_array()->[0]`
- Access in expressions: `$array[0] + $array[1]`

**AST Node**:
```typescript
interface ArrayAccessNode extends ASTNode {
    type: 'ArrayAccess';
    base: ASTNode;  // The array variable or expression
    index: ASTNode; // The index expression
}
```

### 2. Hash Access (src/Parser.ts, src/AST.ts)

**Features**:
- Direct hash access: `$hash{"key"}`
- Variable keys: `$hash{$key}`
- Hash reference dereference: `$href->{"key"}`
- Function call dereference: `get_hash()->{"key"}`
- Access in expressions: `$person{"first"} . $person{"last"}`

**AST Node**:
```typescript
interface HashAccessNode extends ASTNode {
    type: 'HashAccess';
    base: ASTNode;  // The hash variable or expression
    key: ASTNode;   // The key expression
}
```

### 3. Postfix Operator Architecture

**Implementation**:
Added `parsePostfixOperators()` function that:
- Handles postfix operators after primary expressions
- Loops to support chained access
- Processes `->` dereference operator
- Processes `[...]` for array access
- Processes `{...}` for hash access
- Returns wrapped AST node

**Integration**:
Called from `precedenceClimb()` immediately after `parsePrimary()` returns, before binary operators are processed. This ensures postfix operators bind tightly (like function calls).

### 4. Chained Access Support

**Features**:
- Array then hash: `$data->[0]{"key"}`
- Hash then array: `$data->{"items"}[0]`
- Deep nesting: `$data->[0]{"users"}[1]{"name"}`
- Arbitrary depth chaining

**Implementation**:
The `parsePostfixOperators()` function loops, building nested access nodes:
```
HashAccessNode {
  base: ArrayAccessNode {
    base: HashAccessNode {
      base: ArrayAccessNode {
        base: Variable "$data"
        index: 0
      }
      key: "users"
    }
    index: 1
  }
  key: "name"
}
```

## Key Implementation Details

### Postfix Operator Binding
Postfix operators (`[`, `{`) bind very tightly - tighter than any binary operator. They're processed immediately after `parsePrimary()` returns, before entering the binary operator loop.

### Dereference Operator (`->`)
The `->` operator is consumed but doesn't create a separate AST node. Instead:
- When we see `->`, we consume it
- Then check for `[` or `{` following it
- Create ArrayAccessNode or HashAccessNode with the expression as base

This means `$aref->[0]` and `$array[0]` have the same AST structure - the difference is in the base node (expression vs. variable).

### Depth Tracking for Brackets/Braces
When finding matching `]` or `}`, we track depth to handle nested structures:
```perl
$matrix[get_row($i)][get_col($j)]
```

## Test Coverage

Added 15 comprehensive tests:
- 5 tests for array access (direct and dereference)
- 5 tests for hash access (direct and dereference)
- 3 tests for chained access
- 2 tests for access in expressions

All tests pass, including all 107 previous tests (regression-free!).

## Examples That Now Work

```perl
# Array access
my $first = $array[0];
my $last = $array[$#array];
my $item = $aref->[2];

# Hash access
my $name = $person{"name"};
my $value = $href->{"key"};
my $setting = $config{$key};

# Chained access
my $value = $data->[0]{"users"}[1]{"email"};
my $score = $results->{"team1"}{"players"}[0]{"score"};

# In expressions
my $sum = $array[0] + $array[1] + $array[2];
my $full_name = $person{"first"} . " " . $person{"last"};

# With function calls
my $item = get_data()->[0];
my $val = fetch_config()->{"timeout"};
```

## Architectural Insights

### Why Postfix in Precedence Climbing?
Postfix operators could be handled in `parsePrimary()`, but integrating them into `precedenceClimb()` has advantages:
1. **Consistent precedence handling** - Postfix has highest precedence
2. **Natural chaining** - Loop continues for multiple postfixes
3. **Clean separation** - `parsePrimary()` handles atoms, `parsePostfixOperators()` handles suffixes
4. **Binary operator integration** - Postfix binds before any binary ops

### AST Design Choice
We use separate ArrayAccessNode and HashAccessNode rather than a generic IndexNode because:
1. **Type clarity** - Clear distinction in AST
2. **Semantic meaning** - Different runtime behavior
3. **Future extensibility** - May want different optimizations

The `->` operator doesn't get its own node because it's purely syntactic - at runtime, `$aref->[0]` and `$array[0]` behave similarly (both access an element).

## What's Next: Session 6

Natural progressions:
1. **Unary operators** - `!`, `-`, `+`, `not`
2. **Ternary operator** - `$x ? $y : $z`
3. **Method calls** - `$obj->method($arg)`
4. **Range operator** - `1..10` as expression
5. **Assignment to array/hash elements** - `$array[0] = 5;`

The most impactful next step would be **unary operators** since they're needed for boolean logic (`!$flag`) and arithmetic (`-$x`).

## Lessons Learned

1. **Postfix operators are special** - They need tight binding (higher than any binary operator) and are best handled immediately after primary expressions.

2. **Chaining is natural with loops** - By looping in `parsePostfixOperators()`, chained access falls out naturally without special logic.

3. **Dereference is syntax, not semantics** - The `->` operator doesn't need an AST node; it's just syntax that indicates the base is an expression rather than a direct variable.

4. **Reuse existing patterns** - Depth tracking for brackets/braces reused the same pattern from Session 4's data structure literals.

5. **Test-driven works** - Writing 15 tests first made implementation straightforward. All tests passed on first run!

## Session 4 Summary

**Date**: Session 4 of MPP development
**Duration**: ~1.5 hours
**Methodology**: Test-Driven Development (TDD) with milestone testing
**Result**: Complete data structure literals - arrays, hashes, and lists!

### Starting Point
- 74 tests passing
- Complete functions, control flow, and expressions
- No data structure literals yet

### Ending Point
- **107 tests passing** (+33 new tests: 17 unit tests + 16 milestone tests)
- Array reference literals: `[1, 2, 3]`
- Hash reference literals: `+{ "key" => "value" }`
- List literals: `(1, 2, 3)`
- Nested data structures working perfectly
- Fat comma operator `=>` support
- **New milestone testing pattern established!**

## What We Built This Session

### 1. Array Literals (src/Parser.ts, src/AST.ts)

**Features**:
- Simple arrays: `[1, 2, 3, 4, 5]`
- Empty arrays: `[]`
- Mixed types: `[1, "hello", $x, 2 + 3]`
- Nested arrays: `[1, [2, 3], [4, [5, 6]]]`
- Arrays with expressions: `[1 + 2, 3 * 4]`

**AST Node**:
```typescript
interface ArrayLiteralNode extends ASTNode {
    type: 'ArrayLiteral';
    elements: ASTNode[];
}
```

**Implementation**: Added array literal parsing in `parsePrimary()`:
- Detect `[` token (LBRACKET)
- Find matching `]` with depth tracking
- Split contents by comma at depth 0
- Recursively parse each element as expression
- Track brackets, braces, and parens for proper nesting

### 2. Hash Literals (src/Parser.ts, src/AST.ts)

**Features**:
- Simple hashes: `+{ "name" => "Alice", "age" => 30 }`
- Empty hashes: `+{}`
- Nested hashes: `+{ "outer" => +{ "inner" => 42 } }`
- Hash with expressions: `+{ "sum" => 1 + 2 }`
- Fat comma support: `=>` as key-value separator

**AST Node**:
```typescript
interface HashLiteralNode extends ASTNode {
    type: 'HashLiteral';
    pairs: Array<{ key: ASTNode; value: ASTNode }>;
}
```

**Implementation**:
- Detect `+{` sequence (unary + followed by LBRACE)
- Parse key-value pairs separated by `=>`
- Added `parseHashPair()` helper method
- Split by commas at depth 0
- Fat comma already supported by Tokenizer

**Critical Fix**: Had to check for both `BINOP` and `OPERATOR` categories since `+` is classified as BINOP by the Lexer.

### 3. List Literals (src/Parser.ts, src/AST.ts)

**Features**:
- List literals: `(1, 2, 3)`
- Disambiguation from parenthesized expressions: `(1 + 2)` vs `(1, 2)`
- List assignments: `my @array = (1, 2, 3);`

**AST Node**:
```typescript
interface ListNode extends ASTNode {
    type: 'List';
    elements: ASTNode[];
}
```

**Implementation**:
- Enhanced parenthesis handling in `parsePrimary()`
- Check for comma at depth 0 to distinguish list from expression
- If comma found → parse as List
- Otherwise → parse as parenthesized expression
- Proper depth tracking for all bracket types

### 4. Milestone Testing Pattern

**New Pattern Established**:
Created `tests/DataStructures.test.ts` with 16 comprehensive tests:
- Simple declarations with data structures
- Nested structures
- Mixed types
- Computed values in structures
- Arrays of hashes
- Hashes of arrays
- Complete programs with data structures
- Disambiguation tests

**Benefits**:
1. Documents realistic usage patterns
2. Tests feature interactions
3. Serves as regression tests
4. Shows parser capabilities

This pattern will be used for future milestones (Methods, Classes, etc.)

## Key Challenges and Solutions

### Challenge 1: Hash Literal Prefix Parsing
**Issue**: `+{` wasn't being recognized because `+` was categorized as BINOP, not OPERATOR.
**Solution**: Check for both `lexeme.category === 'BINOP' || lexeme.category === 'OPERATOR'` when detecting the `+` prefix.

### Challenge 2: List vs Parenthesized Expression
**Issue**: Need to distinguish `(1)` from `(1, 2)` at parse time.
**Solution**:
- Scan for comma at depth 0 inside parentheses
- If comma found → List
- Otherwise → Parenthesized expression
- Applied depth tracking lesson from Session 3

### Challenge 3: Nested Structure Depth Tracking
**Issue**: Need to correctly split by commas without breaking nested structures.
**Solution**: Track three depth counters (brackets, braces, parens) and only split when all are at depth 0. Same pattern used across arrays, hashes, and lists.

## Test Structure Evolution

**Before Session 4**:
- 74 tests in 3 test files
- Parser.test.ts contained all parser tests
- Examples.test.ts for integration

**After Session 4**:
- 107 tests in 5 test files
- Parser.test.ts: 74 unit tests (atomic features)
- DataStructures.test.ts: 16 milestone tests (complete feature usage)
- Examples.test.ts: 5 integration tests (full programs)
- Lexer.test.ts: 9 tests
- Tokenizer.test.ts: 13 tests

## Code Stats

**Lines of Code**:
- Parser.ts: ~700 lines (+200 from Session 3)
- AST.ts: ~125 lines (+15 from Session 3)
- Total project: ~1400 lines

**Test Coverage**: 107/107 passing (100%)

## Examples That Now Work

```perl
# Array references
my $numbers = [1, 2, 3, 4, 5];
my $nested = [1, [2, 3], [4, [5, 6]]];

# Hash references
my $person = +{ "name" => "Alice", "age" => 30 };
my $config = +{
    "debug" => 1,
    "timeout" => 30
};

# Complex nested structures
my $data = [
    1,
    +{ "key" => "value" },
    [2, 3],
    +{ "nested" => +{ "deep" => 42 } }
];

# Lists in assignments
my @array = (1, 2, 3, 4, 5);

# Arrays of hashes (like database rows!)
my $users = [
    +{ "name" => "Alice", "id" => 1 },
    +{ "name" => "Bob", "id" => 2 }
];
```

## What's Next: Session 5

The natural next step is **array and hash access**:
- Array element access: `$array[0]`
- Hash value access: `$hash{key}`
- Array reference dereference: `$aref->[0]`
- Hash reference dereference: `$href->{key}`

This will complete the data structure support by adding **read** access to complement the **write** (literal) support we just added.

## Lessons Learned

1. **Lexeme category matters**: Always check what category the Lexer assigns. The `+` operator is BINOP, not OPERATOR.

2. **Depth tracking is essential**: Reused the depth tracking pattern from Session 3. It's critical for parsing nested structures correctly.

3. **Milestone tests are valuable**: Creating comprehensive test files after major features provides:
   - Documentation of capabilities
   - Regression protection
   - Real-world usage examples

4. **Disambiguation patterns**: The comma-detection approach for lists vs parens works perfectly and could be applied to similar ambiguities.

## Session 3 Summary

**Date**: Session 3 of MPP development
**Duration**: ~2 hours
**Methodology**: Test-Driven Development (TDD)
**Result**: Complete function definition support (subs) - basic language completeness achieved!

### Starting Point
- 63 tests passing
- Complete control flow (if/elsif/else, unless, while/until, foreach, postfix conditionals)
- Function calls and return statements
- No function definitions yet

### Ending Point
- **74 tests passing** (+11 new tests: 6 unit tests + 5 integration tests)
- Named sub definitions with parameters
- Anonymous sub definitions
- Default parameter values
- Complete programs with functions, recursion, and control flow
- **Parser can now handle self-contained, executable programs!**

## What We Built This Session

### 1. Sub (Function) Definitions (src/Parser.ts, src/AST.ts)

**Features**:
- Named subs: `sub add($x, $y) { return $x + $y; }`
- Anonymous subs: `my $double = sub ($x) { return $x * 2; };`
- Parameters with default values: `sub greet($name = "World") { ... }`
- Zero or more parameters
- Full block body support with multiple statements
- Recursive function calls

**AST Nodes Added**:
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

**Tests Added**: 6 unit tests in Parser.test.ts
- Named sub with parameters
- Named sub with no parameters
- Sub with default parameter values
- Anonymous sub (in variable declaration)
- Sub with multiple statements in body
- Sub with multiple parameters including defaults

### 2. Integration Tests (tests/Examples.test.ts)

**New Test File Created**: Complete program examples

**Tests Added**: 5 integration tests
- Fibonacci function with recursive calls
- Complete fibonacci program (function + loop)
- Factorial function with default parameter
- Multiple function definitions
- Nested control flow in function

**Example Code Now Parseable**:
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

## Technical Achievements This Session

### 1. Sub Declaration Parsing

Implemented `parseSubDeclaration()` method (src/Parser.ts:512-605):
```typescript
private parseSubDeclaration(lexemes: Lexeme[]): SubNode | null {
    // Parse optional name
    // Parse parameter list (comma-separated at depth 0)
    // Parse block body (reuse parseBlock())
    // Return SubNode with or without name
}
```

Key aspects:
- Detects `sub` keyword in both statement and expression contexts
- Parses optional identifier for named subs
- Splits parameters by comma at parenthesis depth 0
- Reuses `parseBlock()` helper for body parsing
- Handles named vs anonymous subs with conditional object construction

### 2. Parameter Parsing

Implemented `parseParameter()` method (src/Parser.ts:607-645):
```typescript
private parseParameter(lexemes: Lexeme[]): ParameterNode | null {
    // Parse variable (must be $scalar, @array, or %hash)
    // Check for = operator
    // Parse optional default value expression
    // Return ParameterNode with or without default
}
```

### 3. Anonymous Sub Support

Added anonymous sub detection in `parsePrimary()` (src/Parser.ts:378-388):
- Detects `sub` keyword in expression context
- Calls `parseSubDeclaration()` without name
- Enables `my $func = sub { ... };` syntax

## Issues Encountered and Resolved

### Critical Bug 1: Postfix Conditionals with Return Statements

**Problem**: `return 0 if $n == 0` failed to parse inside sub bodies
- First two statements of fibonacci function returned null
- Only the third statement (plain return) parsed successfully

**Root Cause**: In `parseStatement()` at line 147, postfix conditional handler called `parseExpression()` to parse the statement part:
```typescript
const stmt = this.parseExpression(stmtLexemes, 0);  // WRONG!
```

This failed because `return` is a statement, not an expression. `parseExpression()` doesn't know how to handle the `return` keyword.

**Solution**: Changed to recursive `parseStatement()` call (src/Parser.ts:147):
```typescript
const stmt = this.parseStatement(stmtLexemes);  // Correct - handles return
```

**Impact**: This fix enabled postfix conditionals to work with any statement type, not just expressions.

**File**: src/Parser.ts:147

### Critical Bug 2: Multi-Statement Programs Not Parsing

**Problem**: Programs with multiple top-level statements only parsed the first statement
- `sub fibonacci { ... } for my $i { ... }` only parsed the fibonacci sub
- The for loop after the sub was never yielded

**Root Cause**: In `run()` method at line 75-87, handling of closing braces:
```typescript
if (braceDepth === 0 && buffer.length > 0) {
    if (buffer[0].category === 'CONTROL') {
        pendingControlStructure = true;  // Mark for elsif/else check
    } else if (buffer[0].category === 'LBRACE') {
        yield parseStatement(buffer);    // Bare blocks yielded
    }
    // Sub definitions were NOT handled - buffer never cleared!
}
```

When a sub definition closed its brace, the code didn't yield it because:
- Not a CONTROL keyword (so not marked pending)
- Not a bare LBRACE (so not yielded immediately)
- Buffer kept accumulating, never cleared

**Solution**: Added explicit handling for sub definitions (src/Parser.ts:87-94):
```typescript
} else if (buffer[0].category === 'DECLARATION' && buffer[0].token.value === 'sub') {
    // Sub definition - parse immediately
    const ast = this.parseStatement(buffer);
    if (ast) {
        yield ast;
    }
    buffer = [];
}
```

**Impact**: Sub definitions are now properly yielded at their closing brace, allowing subsequent statements to be parsed.

**File**: src/Parser.ts:87-94

### Bug 3: Postfix Depth Tracking

**Problem**: Postfix conditionals were being detected inside sub bodies where they shouldn't be
- `return 0 if $n == 0` inside `{ }` was being split incorrectly

**Root Cause**: Original postfix detection didn't track depth:
```typescript
for (let i = 1; i < lexemes.length; i++) {
    if (lexemes[i].category === 'CONTROL') {  // No depth check!
```

**Solution**: Added depth tracking to only detect postfix at depth 0 (src/Parser.ts:128-136):
```typescript
let depth = 0;
for (let i = 1; i < lexemes.length; i++) {
    if (lexemes[i].category === 'LPAREN' || lexemes[i].category === 'LBRACE') {
        depth++;
    }
    if (lexemes[i].category === 'RPAREN' || lexemes[i].category === 'RBRACE') {
        depth--;
    }
    if (depth === 0 && lexemes[i].category === 'CONTROL') {  // Only at depth 0
```

**Impact**: Postfix conditionals now only trigger at statement level, not inside nested structures.

**File**: src/Parser.ts:128-136

## Test Statistics

```
Session Start:  63 tests
Session End:    74 tests
New Tests:      +11 (6 unit + 5 integration)
Pass Rate:      100%
Test Coverage:  All sub features comprehensive
```

### Test Breakdown by Feature
- Sub definitions (unit): 6 tests
- Complete programs (integration): 5 tests
- All previous tests: Still passing (63 tests)

## Files Modified This Session

```
src/AST.ts
├── Added: ParameterNode
└── Added: SubNode

src/Parser.ts
├── Modified: Imports - added SubNode, ParameterNode
├── Modified: parseStatement() - added sub detection (line 210-212)
├── Modified: parseStatement() - fixed postfix to use recursive call (line 147)
├── Modified: parseStatement() - added depth tracking for postfix (line 128-136)
├── Modified: run() - added sub definition yielding (line 87-94)
├── Modified: parsePrimary() - added anonymous sub support (line 378-388)
├── Added: parseSubDeclaration() - main sub parsing logic
└── Added: parseParameter() - parameter parsing with defaults

tests/Parser.test.ts
├── Modified: Imports - added SubNode, ParameterNode
└── Added: 6 sub definition tests

tests/Examples.test.ts (NEW FILE)
└── Added: 5 integration tests for complete programs
```

## Project Metrics After Session 3

```
Total Tests:         74 (was 63)
Source Files:        4 (unchanged)
Test Files:          4 (was 3, added Examples.test.ts)
Parser.ts Lines:     ~1000 (was ~850)
AST.ts Lines:        ~110 (was ~100)
Pass Rate:           100%
Type Safety:         100% (still no any types!)
```

## Design Decisions Made This Session

### 1. Sub Definition Syntax

**Decision**: Require parentheses for parameters, even with zero params
**Syntax**: `sub hello() { }` not `sub hello { }`
**Reason**: Consistency with function calls and unambiguous parsing
**Benefit**: No bareword ambiguity, clean syntax-directed parsing

### 2. Anonymous Subs as Expressions

**Decision**: Allow `sub { }` in expression context
**Usage**: `my $func = sub ($x) { return $x * 2; };`
**Implementation**: Detect in `parsePrimary()` alongside literals and variables
**Benefit**: First-class functions, enables functional programming patterns

### 3. Optional Name for SubNode

**Decision**: Use `name?: string` in SubNode AST
**Reason**: Same node type for named and anonymous subs
**Benefit**: Simpler AST, unified handling, TypeScript strict mode compatible

### 4. Recursive parseStatement for Postfix

**Decision**: Call `parseStatement()` instead of `parseExpression()` for postfix statement part
**Reason**: Postfix can apply to any statement, not just expressions
**Examples**: `return 0 if $x`, `my $y = 1 unless $z`
**Benefit**: Full statement support in postfix form

## Language Features Now Supported

### Complete Function Support ✅
✅ Function definitions (named and anonymous)
✅ Function parameters with defaults
✅ Function calls with arguments
✅ Return statements
✅ Recursive function calls

### Complete Control Flow ✅
✅ If/elsif/else chains
✅ Unless (prefix and postfix)
✅ While/until loops
✅ Foreach/for loops with ranges
✅ Postfix conditionals (all statement types)
✅ Block statements (lexical scoping)

### Complete Expressions ✅
✅ Literals (numbers, strings)
✅ Variables (scalar, array, hash)
✅ Binary operators (20 precedence levels)
✅ Parenthesized expressions
✅ Variable declarations

### Parser Can Now Handle

**Complete, self-contained programs**:
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

## What We Learned

### 1. Postfix Statement Context Matters

Initially assumed postfix conditionals only apply to expressions. Reality:
- `return 0 if $x` - return is a statement
- `my $y = 1 unless $z` - declaration is a statement
- `print($x) while $running` - call is an expression

Solution: Recursive `parseStatement()` call handles all cases uniformly.

### 2. Run Method Needs All Statement Types

The `run()` method's closing brace handler must recognize all statement types:
- CONTROL keywords → mark pending (for elsif/else)
- Bare blocks → yield immediately
- Sub definitions → yield immediately
- (Future: class definitions will also need yielding)

Pattern emerging: Block-based declarations need immediate yielding.

### 3. Depth Tracking is Critical

Multiple depth tracking contexts needed:
- Brace depth in `run()` for statement boundaries
- Paren depth in argument/parameter parsing for comma splitting
- Depth in postfix detection to avoid false positives
- Nested depth in block parsing for statement termination

Depth tracking is the core technique for syntax-directed parsing.

### 4. TDD Caught Integration Issues

Unit tests passed early, but integration tests revealed:
- Multi-statement programs failing
- Postfix conditionals in complex contexts failing

Lesson: Always test complete, realistic programs, not just isolated features.

## Session Velocity

- Session 1: ~700 lines code, 32 tests (foundation)
- Session 2: ~550 lines code, +31 tests (control flow + functions)
- Session 3: ~150 lines code, +11 tests (sub definitions)

**Why Session 3 was faster**:
- Reused existing `parseBlock()` helper
- Reused parameter parsing pattern from function calls
- TDD was well-established
- Infrastructure (run loop, statement dispatcher) already solid

## Next Session Preview

**Goal**: Data structures (array and hash literals)

**What to implement**:
```perl
# Array literals
my @array = (1, 2, 3, 4, 5);
my $aref = [1, 2, 3];

# Hash literals
my %hash = (a => 1, b => 2);
my $href = +{ a => 1, b => 2 };  # + prefix required!
```

**Estimated time**: 2-3 hours

**Why this is next**:
- Natural progression after functions
- Needed for real programs
- Foundation for array/hash access (Session 5)
- Clean, self-contained feature set

## Session End Stats

- ✅ 74 tests passing (was 63)
- ✅ No compiler errors
- ✅ No `any` types
- ✅ Complete function support
- ✅ Basic language completeness achieved!
- ✅ Parser handles self-contained programs
- ✅ Comprehensive documentation updated
- ✅ Ready for data structures!

**Result**: Extremely successful session! Parser now represents a **basically complete programming language** - functions, control flow, recursion all working perfectly.

## Session 2 Summary

**Date**: Session 2 of MPP development
**Duration**: Extended session (~3 hours)
**Methodology**: Test-Driven Development (TDD)
**Result**: Complete control flow implementation + function calls + return statements

### Starting Point
- 32 tests passing
- Basic expression parser with precedence climbing
- Variable declarations
- No control structures

### Ending Point
- **63 tests passing** (+31 new tests)
- Complete control flow support
- Function call parsing
- Return statement parsing
- Production-ready async generator pipeline

## What We Built This Session

### 1. If/Elsif/Else Statements (src/Parser.ts, src/AST.ts)

**Features**:
- Full if/elsif/else chain support
- Nested conditionals
- Multiple elsif branches
- Optional else block
- Lookahead for elsif/else continuation

**AST Nodes**:
- `IfNode` with condition, thenBlock, elseIfClauses[], elseBlock?
- `ElseIfClause` helper type

**Tests Added**: 5 tests
- Simple if statement
- If-else statement
- If-elsif statement
- If-elsif-else statement
- Multiple elsif clauses

**Key Implementation**:
- Modified `run()` to track brace depth and detect control structures
- Added `pendingControlStructure` flag for lookahead
- Created `parseIfStatement()` with elsif chain parsing
- Created reusable `parseBlock()` helper

### 2. Unless Statement (Prefix and Postfix)

**Features**:
- Prefix unless with optional else
- Postfix unless (statement modifier)
- Inverted condition semantics

**AST Nodes**:
- `UnlessNode` with condition, thenBlock, elseBlock?

**Tests Added**: Covered in postfix conditional tests

### 3. While/Until Loops

**Features**:
- While loops with condition
- Until loops (inverted while)
- Multiple statements in loop body
- Proper block parsing

**AST Nodes**:
- `WhileNode` with condition and block
- `UntilNode` with condition and block

**Tests Added**: 3 tests
- While loop
- Until loop
- While with multiple statements

**Implementation**: Similar to if, but simpler (no elsif chains)

### 4. Foreach/For Loops

**Features**:
- Foreach with declared variable: `foreach my $x (@array)`
- Foreach with existing variable: `foreach $x (@items)`
- For as alias for foreach
- Optional declarator (my, our, state)
- Range operator support: `for my $i (1..10)`

**AST Nodes**:
- `ForeachNode` with variable, declarator?, listExpr, block

**Tests Added**: 4 tests
- Foreach with declared variable
- Foreach with existing variable
- For as alias
- Multiple statements in block

**Bug Fix**: Added `..` to tokenizer's multi-character operator list

### 5. Postfix Conditionals

**Features**:
- Postfix if: `$x = 10 if $condition;`
- Postfix unless: `$y = 5 unless $error;`
- Postfix while: `$count++ while $running;`
- Postfix until: `$x++ until $done;`

**Implementation**:
- Scan for control keywords at position > 0 in `parseStatement()`
- Split lexemes into statement and condition
- Wrap statement in appropriate control structure
- Reuse same AST nodes as prefix forms

**Tests Added**: 4 tests (one for each postfix form)

### 6. Block Statements

**Features**:
- Bare blocks for lexical scoping: `{ my $x = 5; }`
- Multiple statements in blocks
- Nested blocks
- Proper statement boundary detection

**AST Nodes**:
- `BlockNode` with statements[]

**Tests Added**: 4 tests
- Simple block
- Block with multiple statements
- Nested blocks
- Block followed by statement

**Key Fix**: Updated `parseBlock()` to track nested braces correctly

### 7. Function Calls

**Features**:
- Function calls with parentheses required
- Zero or more arguments
- Comma-separated argument lists
- Expression arguments (variables, operations, nested calls)
- Proper precedence in depth tracking

**AST Nodes**:
- `CallNode` with name and arguments[]

**Tests Added**: 6 tests
- No arguments: `hello();`
- One argument: `print("hello");`
- Multiple arguments: `add(5, 10, 15);`
- Variable arguments: `process($x, $y);`
- Expression arguments: `max($a + 1, $b * 2);`
- Nested calls: `outer(inner(5));`

**Implementation**:
- Detect IDENTIFIER followed by LPAREN in `parsePrimary()`
- Split arguments by COMMA at depth 0
- Parse each argument as expression
- Support nested function calls

### 8. Return Statements

**Features**:
- Return with no value: `return;`
- Return with value: `return 42;`
- Return with expression: `return $x + $y;`
- Return with function call: `return calc($x);`

**AST Nodes**:
- `ReturnNode` with optional value?

**Tests Added**: 5 tests covering all return forms

**Implementation**: Simple keyword detection + optional expression parsing

## Technical Achievements This Session

### 1. Brace Depth Tracking

The `run()` method now tracks brace depth to properly handle:
- Control structures (if/while/foreach with blocks)
- Bare blocks (lexical scoping)
- Nested blocks
- Lookahead for elsif/else

```typescript
if (lexeme.category === 'LBRACE') {
    braceDepth++;
}
if (lexeme.category === 'RBRACE') {
    braceDepth--;
    if (braceDepth === 0 && buffer[0].category === 'CONTROL') {
        pendingControlStructure = true; // Check for elsif/else
    }
}
```

### 2. Postfix Conditional Detection

Elegant solution scanning for control keywords after position 0:

```typescript
for (let i = 1; i < lexemes.length; i++) {
    if (lexemes[i].category === 'CONTROL') {
        const keyword = lexemes[i].token.value;
        if (keyword === 'if' || keyword === 'unless' ||
            keyword === 'while' || keyword === 'until') {
            // Split and wrap statement
        }
    }
}
```

### 3. Nested Block Parsing

Updated `parseBlock()` to handle nested blocks by tracking depth while finding statement boundaries:

```typescript
let braceDepth = 0;
while (stmtEnd < blockLexemes.length) {
    if (blockLexemes[stmtEnd].category === 'LBRACE') braceDepth++;
    if (blockLexemes[stmtEnd].category === 'RBRACE') {
        braceDepth--;
        if (braceDepth === 0) break; // End of nested block
    }
    if (blockLexemes[stmtEnd].category === 'TERMINATOR' && braceDepth === 0) {
        break; // End of regular statement
    }
    stmtEnd++;
}
```

### 4. Function Call Argument Parsing

Splits comma-separated arguments at depth 0:

```typescript
let parenDepth = 0;
for (let i = 0; i < argLexemes.length; i++) {
    if (argLexemes[i].category === 'LPAREN') parenDepth++;
    if (argLexemes[i].category === 'RPAREN') parenDepth--;
    if (argLexemes[i].category === 'COMMA' && parenDepth === 0) {
        // Found argument boundary
    }
}
```

## Test Statistics

```
Session Start:  32 tests
Session End:    63 tests
New Tests:      +31
Pass Rate:      100%
Test Coverage:  All features comprehensive
```

### Test Breakdown by Feature
- If/elsif/else: 5 tests
- While/until: 3 tests
- Foreach/for: 4 tests
- Postfix conditionals: 4 tests
- Block statements: 4 tests
- Function calls: 6 tests
- Return statements: 5 tests

## Files Modified This Session

```
src/AST.ts
├── Added: IfNode, ElseIfClause
├── Added: UnlessNode
├── Added: WhileNode, UntilNode
├── Added: ForeachNode
├── Added: BlockNode
├── Added: CallNode
└── Added: ReturnNode

src/Parser.ts
├── Modified: run() - brace tracking, lookahead
├── Modified: parseStatement() - postfix detection
├── Added: parseIfStatement()
├── Added: parseUnlessStatement()
├── Added: parseWhileStatement()
├── Added: parseUntilStatement()
├── Added: parseForeachStatement()
├── Added: parseBlockStatement()
├── Added: parseReturnStatement()
├── Modified: parseBlock() - nested block support
└── Modified: parsePrimary() - function call detection

src/Tokenizer.ts
└── Fixed: Added '..' to multi-character operators

tests/Parser.test.ts
└── Added: 31 new tests across all features
```

## Project Metrics After Session 2

```
Total Tests:         63 (was 32)
Source Files:        4 (unchanged)
Test Files:          3 (unchanged)
Parser.ts Lines:     ~850 (was ~300)
AST.ts Lines:        ~100 (was ~40)
Pass Rate:           100%
Type Safety:         100% (still no any types!)
```

## Design Decisions Made This Session

### 1. No C-Style For Loops
**Decision**: Skip C-style `for (init; cond; inc)` loops
**Reason**: Would complicate semicolon handling inside parens
**Alternative**: Use foreach with ranges instead

### 2. Parentheses Required for Function Calls
**Decision**: `foo()` required, not `foo`
**Reason**: Eliminates bareword ambiguity
**Benefit**: Clean, unambiguous parsing

### 3. Block vs Hash Literal Disambiguation
**Decision**: Bare `{}` = block, `+{}` = hash literal
**Reason**: No heuristics needed
**Benefit**: Syntax-directed parsing remains pure

### 4. Postfix Uses Same AST Nodes
**Decision**: `$x = 1 if $y` creates IfNode
**Reason**: Semantic equivalence
**Benefit**: Simpler AST, easier code generation

## Issues Encountered and Resolved

### Issue 1: Range Operator Not Tokenized
**Problem**: `1..10` tokenized as `1`, `.`, `.`, `10`
**Solution**: Added `..` to multi-character operator list
**File**: src/Tokenizer.ts:249

### Issue 2: Nested Blocks Not Parsing
**Problem**: Inner block `{ $y = 2; }` parsed as variable
**Solution**: Track brace depth in `parseBlock()`, recognize closing brace as statement boundary
**File**: src/Parser.ts:728-796

### Issue 3: TypeScript Optional Property Strictness
**Problem**: `exactOptionalPropertyTypes` strict checking
**Solution**: Conditionally construct objects with/without optional properties
**Pattern**: Two return paths instead of `undefined` assignment

### Issue 4: elsif/else Lookahead
**Problem**: Parser emitted if statement before seeing elsif
**Solution**: Added `pendingControlStructure` flag, check next token after RBRACE
**File**: src/Parser.ts:35-58

## What We Learned

### 1. Depth Tracking is Essential
Multiple depth counters needed:
- Brace depth in `run()` for control structure detection
- Paren depth in argument parsing for comma splitting
- Nested depth in block parsing for statement boundaries

### 2. Lookahead Can Be Simple
The elsif/else lookahead pattern:
1. Mark as pending after closing brace
2. Check next token
3. Continue if match, emit if no match

No need for complex buffering or backtracking.

### 3. Reusable Helpers Save Time
The `parseBlock()` helper used by:
- If/elsif/else
- While/until
- Foreach
- Bare blocks
- (Future: sub definitions)

### 4. TDD Prevented Regressions
Running tests after each feature ensured:
- No breaking changes
- Feature interactions worked
- Edge cases caught early

All 63 tests passing throughout session!

## Language Features Now Supported

### Complete Control Flow
✅ If/elsif/else chains
✅ Unless (prefix and postfix)
✅ While/until loops
✅ Foreach/for loops with ranges
✅ Postfix conditionals (if/unless/while/until)
✅ Block statements (lexical scoping)
✅ Return statements

### Complete Expressions
✅ Literals (numbers, strings)
✅ Variables (scalar, array, hash)
✅ Binary operators (20 precedence levels)
✅ Parenthesized expressions
✅ Variable declarations
✅ Function calls (with arguments)

### Parser Can Now Handle

```perl
# Control flow
if ($x > 10) {
    $y = 1;
} elsif ($x > 5) {
    $y = 2;
} else {
    $y = 3;
}

unless ($error) {
    process();
}

while ($running) {
    do_work();
}

for my $i (1..10) {
    print($i);
}

# Postfix
say("yes") if $condition;
$count++ while $running;

# Blocks
{
    my $temp = $x;
    $x = $y;
    $y = $temp;
}

# Functions
my $result = calculate($x, $y);
return $result + 10;
```

## Next Session Preview

**Goal**: Sub definitions (function declarations)

**What to implement**:
```perl
sub add($x, $y) {
    return $x + $y;
}

sub greet($name = "World") {
    print("Hello, $name!");
}
```

**Estimated time**: 1-2 hours

**Why this is next**:
- Pairs perfectly with return statements ✅
- Pairs perfectly with function calls ✅
- Enables writing real programs
- Natural next step in language completeness

## Session End Stats

- ✅ 63 tests passing (was 32)
- ✅ No compiler errors
- ✅ No `any` types
- ✅ Complete control flow support
- ✅ Function calls and returns working
- ✅ Production-ready streaming parser
- ✅ Comprehensive documentation updated
- ✅ Ready for sub definitions!

**Result**: Extremely successful session! Parser now handles substantial Perl subset.
