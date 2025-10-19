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

## Session 9 Summary

**Date**: Session 9 of MPP development
**Duration**: ~2 hours
**Methodology**: Test-Driven Development (TDD)
**Result**: Five "quick win" features + comprehensive feature planning!

### Starting Point
- 177 tests passing
- Complete control flow, functions, data structures
- Method calls and element assignment working
- No range expressions, slicing, or bareword keys

### Ending Point
- **193 tests passing** (+16 new tests)
- Range expressions: `1..10`, `'a'..'z'`
- Bareword hash keys: `$hash{key}` (no quotes needed)
- List assignment: `($x, $y) = (1, 2)`
- Array slices: `@array[0..4]`, `@array[0, 2, 4]`
- Hash slices: `@hash{qw(foo bar baz)}`
- **Created FEATURE_PRIORITIES.md** - comprehensive roadmap

## What We Built This Session

### 1. Range Expressions (src/Parser.ts) - Already Worked! ✅

**Discovery**: The `..` operator was already in the precedence table (level 15) and worked as a binary operator through precedence climbing.

**Tests Added**: 6 tests
- Simple numeric range: `1..10`
- Range in assignment: `my @nums = (1..10)`
- String range: `'a'..'z'`
- Range with variable bounds: `$start..$end`
- Range with expressions: `(1 + 1)..(5 * 2)`
- Range in array literal: `[1..5, 10..15]`

**Why It Worked**: Precedence climbing algorithm handles all binary operators uniformly. No special cases needed!

### 2. Bareword Hash Keys (src/Parser.ts:1034-1045)

**Features**:
- Bareword syntax: `$hash{key}` instead of `$hash{"key"}`
- Mixed styles: `$hash{foo}{"bar"}{baz}`
- Works in chained access

**Implementation**:
- Modified hash access parsing to detect single IDENTIFIER
- Convert bareword to StringNode without quotes
- ~15 lines of code

**AST**: Reuses existing HashAccessNode, key becomes StringNode with bareword value

**Tests Added**: 4 tests
- Basic bareword: `$hash{key}`
- In assignment: `my $value = $hash{name}`
- With dereference: `$href->{key}`
- Mixed chain: `$hash{foo}{"bar"}{baz}`

**File**: src/Parser.ts:1034-1045

### 3. List Assignment (Already Worked!) ✅

**Discovery**: List assignment already worked through existing list and assignment parsing!

**Features**:
- Simple assignment: `($x, $y) = (1, 2)`
- From array: `($first, $second) = @array`
- Multiple variables: `($a, $b, $c) = (10, 20, 30)`
- Mixed types: `($scalar, @array, %hash) = (1, 2, 3)`

**Tests Added**: 4 tests covering all variants

**Why It Worked**:
- Parenthesized lists already parsed as ListNode
- Assignment accepts any expression as left side
- No code changes needed!

### 4. Array Slices (src/Parser.ts:535-630, src/AST.ts:139-143)

**Features**:
- Range slices: `@array[0..4]`
- List slices: `@array[0, 2, 4]`
- Variable ranges: `@items[$start..$end]`
- In assignment: `my @subset = @data[0..9]`

**New AST Node**:
```typescript
interface ArraySliceNode extends ASTNode {
    type: 'ArraySlice';
    base: ASTNode;    // The array variable (with @ sigil)
    indices: ASTNode; // The index expression (range or list)
}
```

**Implementation**:
- Detect `@array[...]` pattern in parsePrimary()
- Check for comma at depth 0 to distinguish list from single expression
- Parse as ListNode if commas found, otherwise as expression (usually range)
- ~95 lines of code

**Tests Added**: 4 tests
- Slice with range: `@array[0..4]`
- Slice with list: `@array[0, 2, 4]`
- Variable range: `@items[$start..$end]`
- In assignment: `my @subset = @data[0..9]`

**Files**:
- src/AST.ts:139-143 (new node)
- src/Parser.ts:26 (import)
- src/Parser.ts:535-630 (parsing logic)

### 5. Hash Slices (src/Parser.ts:633-747, src/AST.ts:151-155)

**Features**:
- Quoted keys: `@hash{"a", "b", "c"}`
- Bareword keys: `@hash{foo, bar, baz}` (auto-detected!)
- Array variable: `@hash{@keys}`
- In assignment: `my @values = @config{"host", "port"}`

**New AST Node**:
```typescript
interface HashSliceNode extends ASTNode {
    type: 'HashSlice';
    base: ASTNode;    // The hash variable (with @ sigil)
    keys: ASTNode;    // The keys expression (often a list)
}
```

**Implementation**:
- Detect `@hash{...}` pattern (@ sigil + braces)
- Check for comma to distinguish list from single expression
- For lists: detect bareword keys (single IDENTIFIER) and convert to StringNode
- ~115 lines of code

**Tests Added**: 4 tests
- List of quoted keys: `@hash{"a", "b", "c"}`
- Bareword keys: `@hash{foo, bar, baz}`
- Array variable: `@hash{@keys}`
- In assignment: `my @values = @config{"host", "port"}`

**Files**:
- src/AST.ts:151-155 (new node)
- src/Parser.ts:28 (import)
- src/Parser.ts:633-747 (parsing logic with bareword detection)

### 6. Feature Planning & Documentation

**Created FEATURE_PRIORITIES.md**:
- Replaces NEXT_STEPS.md
- Comprehensive prioritization of 23 features to implement
- 7 features deferred (regex, string interpolation, heredocs)
- 8 features dropped (prototypes, bless, tie, typeglobs, etc.)
- Organized into 9 phases by complexity and value
- Implementation time estimates
- Detailed sprint recommendations

**Key Decisions**:
- Use `class` syntax instead of `bless`
- Drop `@_` (have signatures)
- Keep `%ENV`, `@ARGV`, `$_`
- Defer all regex features for now
- Drop obsolete features (formats, typeglobs)
- Modern Perl syntax focus

## Technical Achievements This Session

### 1. Architecture Validation

**Two Features "Just Worked"**:
- Range expressions - precedence table design paid off
- List assignment - generic expression parsing was flexible enough

**Lesson**: Good architecture enables features to emerge naturally

### 2. Bareword Auto-Detection Pattern

Implemented in two places:
1. Hash access: `$hash{key}` → single IDENTIFIER in braces
2. Hash slices: `@hash{foo, bar}` → each element in list checked

**Pattern**:
```typescript
if (keyLexemes.length === 1 && keyLexemes[0].category === 'IDENTIFIER') {
    const barewordKey: StringNode = {
        type: 'String',
        value: keyLexemes[0].token.value
    };
    // Use bareword without quotes
}
```

**Reusability**: This pattern can be used anywhere barewords are allowed

### 3. Comma-Based Disambiguation

Used in both array slices and hash slices:

```typescript
// Check for commas at depth 0
let hasComma = false;
for (let i = 0; i < lexemes.length; i++) {
    // Track depth...
    if (depth === 0 && lexemes[i].category === 'COMMA') {
        hasComma = true;
        break;
    }
}

if (hasComma) {
    // Parse as list
} else {
    // Parse as single expression
}
```

**Benefit**: Clean distinction between `@array[0..4]` and `@array[0, 2, 4]`

## Test Statistics

```
Session Start:  177 tests
Session End:    193 tests
New Tests:      +16 (6 ranges + 4 bareword + 4 list assign + 4 array slice + 4 hash slice)
Pass Rate:      100%
Test Coverage:  All slice and range features comprehensive
```

### Test Breakdown by Feature
- Range expressions: 6 tests (already worked!)
- Bareword hash keys: 4 tests
- List assignment: 4 tests (already worked!)
- Array slices: 4 tests
- Hash slices: 4 tests (with bareword support)

## Files Modified This Session

```
src/AST.ts
├── Added: ArraySliceNode interface (lines 139-143)
└── Added: HashSliceNode interface (lines 151-155)

src/Parser.ts
├── Modified: Imports - added ArraySliceNode, HashSliceNode
├── Modified: parsePostfixOps() - bareword hash key detection (1034-1045)
├── Added: Array slice parsing in parsePrimary() (535-630)
└── Added: Hash slice parsing in parsePrimary() (633-747)

tests/Parser.test.ts
├── Modified: Imports - added ArraySliceNode, HashSliceNode
├── Added: 6 range expression tests (already worked!)
├── Added: 4 bareword hash key tests
├── Added: 4 list assignment tests (already worked!)
├── Added: 4 array slice tests
└── Added: 4 hash slice tests

FEATURE_PRIORITIES.md (NEW FILE)
└── Comprehensive feature roadmap replacing NEXT_STEPS.md
```

## Project Metrics After Session 9

```
Total Tests:         193 (was 177)
Source Files:        4 (unchanged)
Test Files:          4 (unchanged)
Parser.ts Lines:     ~1,850 (was ~1,650)
AST.ts Lines:        ~157 (was ~145)
Pass Rate:           100%
Type Safety:         100% (no any types!)
Documentation:       FEATURE_PRIORITIES.md created
```

## Design Decisions Made This Session

### 1. Slices Use @ Sigil

**Decision**: Array/hash slices return lists, use `@` sigil
**Syntax**: `@array[0..4]` not `$array[0..4]`
**Reason**: Matches Perl semantics (slices return lists)
**AST Impact**: Separate ArraySliceNode and HashSliceNode types

### 2. Barewords Auto-Detected

**Decision**: Automatically recognize barewords in hash context
**When**: Single IDENTIFIER in braces/list
**Benefit**: Clean syntax, matches Perl
**Implementation**: Check for IDENTIFIER category, create StringNode without quotes

### 3. Comma Disambiguation

**Decision**: Use comma presence to distinguish list from expression
**Application**: Array slices, hash slices
**Examples**: 
- `@array[0..4]` → single expression (range)
- `@array[0, 2, 4]` → list (three indices)

### 4. Feature Prioritization Framework

**Decision**: Create comprehensive roadmap before continuing
**Organization**: 9 phases, 23 features to implement
**Categories**: Keep (23), Defer (7), Drop (8)
**Benefit**: Clear direction, avoid scope creep

## Examples That Now Work

```perl
# Range expressions
my @nums = (1..10);
my @letters = ('a'..'z');
for my $i (0..$#array) {
    print($array[$i]);
}

# Bareword hash keys
my $name = $user{name};
my $email = $config{email_address};
$data{foo}{"bar"}{baz} = 42;

# List assignment
($x, $y) = ($y, $x);  # Swap
my ($first, $second, $third) = @array;
($a, $b, $c) = (1, 2, 3);

# Array slices
my @subset = @data[0..9];
my @evens = @numbers[0, 2, 4, 6, 8];
my @range = @items[$start..$end];

# Hash slices
my @values = @config{"host", "port", "user"};
my @settings = @hash{qw(debug timeout retries)};
my @data = @env{@required_keys};
```

## What's Next: Session 10

**Recommended**: Start Sprint 1 from FEATURE_PRIORITIES.md

**Sprint 1: Essential Builtins (2-3 hours)**:
1. `die` and `warn` statements (~10 lines)
2. `print` and `say` statements (~15 lines)
3. `do` blocks (~20 lines)
4. `require` builtin (verify it works as function)

**Why Sprint 1**:
- High value, low complexity
- No architectural changes
- Enables error handling and output
- Natural progression from current state

**Alternative**: Sprint 2 (Loop Control) for `last`, `next`, `redo`

## Lessons Learned

### 1. Good Architecture Compounds

**Observation**: Two features "just worked" without code changes
- Range expressions: Precedence table was generic enough
- List assignment: Expression parsing was flexible enough

**Takeaway**: Invest in generic, composable designs early

### 2. Bareword Detection is Reusable

**Pattern**: Single IDENTIFIER → bareword key
**Used in**: Hash access, hash slice elements
**Future**: Can apply to fat comma auto-quoting, qw//, etc.

### 3. Planning Saves Time

**Before Session 9**: Ad-hoc feature selection
**After Session 9**: Clear roadmap with 23 prioritized features
**Benefit**: Know what to build next, avoid bikeshedding

### 4. Test Coverage Enables Confidence

**All 193 tests passing**:
- Safe to refactor
- Clear feature boundaries
- Documentation through examples
- Regression protection

### 5. "Quick Wins" Are Additive

**5 features in one session**:
- 2 already worked (validation of design)
- 3 implemented (~225 lines total)
- 16 new tests
- Clear documentation

**Velocity**: Can maintain 3-5 features per session with good planning

## Architectural Insights

### Slice Syntax Design

**Array Slices**: `@array[indices]`
- Base: ARRAY_VAR category
- Delimiter: `[...]` (LBRACKET/RBRACKET)
- Indices: Single expression or list

**Hash Slices**: `@hash{keys}`
- Base: ARRAY_VAR category (returns list!)
- Delimiter: `{...}` (LBRACE/RBRACE)
- Keys: Single expression or list (with bareword support)

**Common Pattern**:
1. Detect `@` sigil + delimiter
2. Check for comma to determine list vs expression
3. Parse elements (with optional bareword detection)
4. Return slice node

### Precedence Table as Feature Enabler

**Existing Operators Already Work**:
- `..` (range, level 15)
- `x` (repeat, level 6)
- `//` (defined-or, level 14)
- String comparison: `eq`, `ne`, `lt`, `gt`, `le`, `ge`
- Numeric comparison: `<=>`, `cmp`
- Logical: `and`, `or`, `xor`

**Lesson**: Adding operators to precedence table early pays dividends

## Session Velocity Comparison

- Session 7: Method calls (~50 lines, 6 tests)
- Session 8: Element assignment (~80 lines, 8 tests)
- Session 9: 5 features (~225 lines, 16 tests)

**Why Session 9 was efficient**:
- Some features already worked
- Good planning (test-first approach)
- Reusable patterns (bareword, comma detection)
- Clear scope (no architectural changes)

## Documentation Impact

### Before Session 9
- NEXT_STEPS.md: Simple list of ideas
- No prioritization
- No time estimates

### After Session 9
- FEATURE_PRIORITIES.md: Comprehensive roadmap
- 9 phases with time estimates
- 23 features to implement, 7 deferred, 8 dropped
- Sprint recommendations
- Clear scope boundaries

**Benefit**: Next sessions can start coding immediately, no planning overhead

## Session End Stats

- ✅ 193 tests passing (was 177)
- ✅ No compiler errors
- ✅ No `any` types
- ✅ 5 new features implemented (2 "free", 3 coded)
- ✅ Array and hash slices complete
- ✅ Bareword syntax working
- ✅ Comprehensive roadmap created
- ✅ FEATURE_PRIORITIES.md replaces NEXT_STEPS.md
- ✅ Ready for Sprint 1!

**Result**: Highly productive session! Added practical features AND created clear path forward. Parser now supports 193 test cases with modern Perl slice syntax.

**Next Session Goal**: Implement Sprint 1 (Essential Builtins: die, warn, print, say, do) - approximately 2-3 hours, high ROI.


## Session 10 Summary

**Date**: Session 10 of MPP development
**Duration**: ~1.5 hours
**Methodology**: Strict Test-Driven Development (TDD)
**Result**: Sprint 1 Complete - Essential Builtins implemented!

### Starting Point
- 193 tests passing
- Parser with ~1,850 lines
- Complete slice syntax and range expressions

### Ending Point
- **214 tests passing** (+21 new tests)
- **Sprint 1 Complete**: All 4 essential builtins implemented
- Parser with ~2,100 lines (+~250 lines)

## What We Built This Session

### 1. `die` and `warn` Statements (8 tests)

**Features**:
- `die` with optional message: `die "Error"`, `die $msg`, `die;`
- `warn` with optional message: `warn "Deprecation"`, `warn;`
- Parse as statement keywords similar to `return`
- Can take expressions as messages

**AST Nodes**:
```typescript
interface DieNode extends ASTNode {
    type: 'Die';
    message?: ASTNode;
}

interface WarnNode extends ASTNode {
    type: 'Warn';
    message?: ASTNode;
}
```

**Implementation**:
- Added keywords to Tokenizer.ts
- Added to controlKeywords in Lexer.ts
- Implemented parseDieStatement() and parseWarnStatement() in Parser.ts
- ~60 lines of code

### 2. `print` and `say` Statements (8 tests)

**Features**:
- `print` with arguments: `print "Hello"`, `print "A", "B"`, `print;`
- `say` with arguments: `say "Hello"`, `say $msg`, `say;`
- Support multiple comma-separated arguments
- Can be used as statements OR function calls
- `print("hello")` with parens → function call
- `print "hello"` without parens → print statement

**AST Nodes**:
```typescript
interface PrintNode extends ASTNode {
    type: 'Print';
    arguments: ASTNode[];
}

interface SayNode extends ASTNode {
    type: 'Say';
    arguments: ASTNode[];
}
```

**Implementation**:
- Added keywords to Tokenizer.ts
- NOT added to controlKeywords (kept as KEYWORD category)
- Parse as statement when not followed by `(`
- Parse as function call when followed by `(`
- Enhanced parsePrimary() to allow KEYWORD tokens as function names
- ~120 lines of code

### 3. `do` Blocks (4 tests)

**Features**:
- `do { ... }` blocks that return last expression value
- Can be used in expressions: `my $x = do { ... };`
- Can be used as standalone statements: `do { ... };`
- Multiple statements inside: `do { $a = 1; $b = 2; $a + $b; }`

**AST Node**:
```typescript
interface DoBlockNode extends ASTNode {
    type: 'DoBlock';
    statements: ASTNode[];
}
```

**Implementation**:
- `do` is already a control keyword
- Implemented parseDoBlock() in parseStatement
- Added do block handling in parsePrimary() for expression context
- Reuses block statement parsing logic
- ~90 lines of code

### 4. `require` Builtin (1 test)

**Verification**:
- `require("Config.pm")` already works as function call!
- No code changes needed
- Added test to verify it works

**Why it works**:
- `require` is a KEYWORD in the tokenizer
- KEYWORDs can be function names when followed by `(`
- Enhancement made for `print`/`say` also enables `require`

## Test Coverage Summary

**Total Tests**: 214 (was 193)

**New Tests**:
- die statements: 4 tests
- warn statements: 4 tests
- print statements: 4 tests
- say statements: 4 tests
- do blocks: 4 tests
- require builtin: 1 test

**Test Breakdown by Feature**:
- All tests pass with 100% success rate
- No regressions in existing features

## Design Decisions Made This Session

### 1. `print` and `say` Dual Parsing

**Decision**: Allow both statement and function call syntax
**Implementation**: 
- Check if followed by `(` → parse as function call
- Otherwise → parse as print/say statement
**Benefit**: Matches Perl's flexible syntax

### 2. Enhanced Function Call Parsing

**Decision**: Allow KEYWORD tokens as function names
**Location**: parsePrimary() line 800
**Impact**: Enables `print()`, `say()`, `require()` as function calls
**Before**: Only IDENTIFIER could be function names
**After**: IDENTIFIER or KEYWORD can be function names

### 3. do Blocks in Two Contexts

**Decision**: Parse do blocks in both parseStatement and parsePrimary
**Reason**: 
- In statements: `do { ... };` standalone
- In expressions: `my $x = do { ... };`
**Implementation**: Same block parsing logic in both places

### 4. Consistent Block Statement Parsing

**Decision**: Reuse parseBlock() logic for do blocks
**Pattern**: Extract lexemes, parse statements with depth tracking
**Result**: Consistent behavior across all block types

## Files Modified This Session

```
src/AST.ts
├── Added: DieNode interface
├── Added: WarnNode interface
├── Added: PrintNode interface
├── Added: SayNode interface
└── Added: DoBlockNode interface

src/Tokenizer.ts
└── Added keywords: 'die', 'warn', 'print', 'say'

src/Lexer.ts
└── Added to controlKeywords: 'die', 'warn' (not print/say)

src/Parser.ts
├── Modified: Imports - added DieNode, WarnNode, PrintNode, SayNode, DoBlockNode
├── Modified: parseStatement() - added die, warn, print, say, do handling
├── Modified: parsePrimary() - enhanced function call parsing for KEYWORDs
├── Modified: parsePrimary() - added do block expression parsing
├── Added: parseDieStatement() (~30 lines)
├── Added: parseWarnStatement() (~30 lines)
├── Added: parsePrintStatement() (~60 lines)
├── Added: parseSayStatement() (~60 lines)
└── Added: parseDoBlock() (~70 lines)

tests/Parser.test.ts
├── Modified: Imports - added DieNode, WarnNode, PrintNode, SayNode, DoBlockNode
├── Added: 4 die tests
├── Added: 4 warn tests
├── Added: 4 print tests
├── Added: 4 say tests
├── Added: 4 do block tests
└── Added: 1 require test
```

## Project Metrics After Session 10

```
Total Tests:         214 (was 193, +21)
Source Files:        4 (unchanged)
Test Files:          4 (unchanged)
Parser.ts Lines:     ~2,100 (was ~1,850, +~250)
AST.ts Lines:        ~175 (was ~157, +~18)
Pass Rate:           100%
Type Safety:         100% (no any types!)
Sprint 1:            COMPLETE ✅
```

## Examples That Now Work

```perl
# Error handling
die "Fatal error occurred";
die "Error: $message" if $error;
warn "This feature is deprecated";

# Output
print "Hello, World!";
print "Value: ", $x, "
";
say "Message: $text";  # Adds newline automatically
say;  # Print newline

# Function call syntax
print("Hello");
say("World");
require("Config.pm");

# Do blocks
my $result = do {
    my $a = 10;
    my $b = 20;
    $a + $b;  # Returns 30
};

my $value = do { $x > 5 ? $x * 2 : $x + 1; };

# Standalone do
do {
    print "Starting...";
    process_data();
    print "Done";
};
```

## What's Next: Session 11

**Recommended**: Start Sprint 2 from FEATURE_PRIORITIES.md

**Sprint 2: Loop Control (2-3 hours)**:
1. `last`, `next`, `redo` statements
2. Loop labels: `OUTER: while (...) { ... last OUTER; }`

**Why Sprint 2**:
- Completes control flow features
- Natural progression from Sprint 1
- Commonly used in real Perl code
- Similar complexity to Sprint 1

**Alternative**: Sprint 3 (Special Variables: `%ENV`, `@ARGV`, `$_`)

## Lessons Learned

### 1. TDD Catches Integration Issues Early

**Observation**: Tests for `print("hello")` failed initially
**Root Cause**: KEYWORD tokens weren't allowed as function names
**Resolution**: Enhanced function call parsing in one place
**Benefit**: All keyword builtins now work as function calls

### 2. Dual Syntax Requires Careful Disambiguation

**Challenge**: `print` can be statement or function call
**Solution**: Check for `(` to determine parsing mode
**Pattern**: Applicable to other dual-syntax features

### 3. Code Reuse Prevents Bugs

**Decision**: Reuse block parsing logic for do blocks
**Alternative**: Write custom parsing for do blocks
**Benefit**: Consistent behavior, fewer bugs, less code

### 4. Architecture Decisions Have Wide Impact

**Change**: Allow KEYWORD as function name
**Impact**: Enabled `print()`, `say()`, AND `require()`
**Lesson**: Small architectural improvements unlock multiple features

## Session Velocity

- **Features Implemented**: 4 (die/warn, print/say, do, require)
- **Tests Added**: 21
- **Lines Added**: ~270 total
- **Time**: ~1.5 hours
- **Velocity**: ~180 lines/hour, ~14 tests/hour

**Comparison to Session 9**:
- Session 9: 5 features, 16 tests, ~225 lines
- Session 10: 4 features, 21 tests, ~270 lines
- Similar velocity, maintaining quality

## Sprint 1 Completion Status

✅ **All 4 features complete**:
1. ✅ `die` and `warn` statements
2. ✅ `print` and `say` statements
3. ✅ `do` blocks
4. ✅ `require` builtin (verified working)

**ROI**: Essential builtins enable error handling, output, and module loading - critical for any practical Perl program.

**Next**: Sprint 2 for loop control flow completion.


---

## Session 11 Summary

**Date**: Session 11 of MPP development
**Duration**: ~2 hours
**Methodology**: Strict Test-Driven Development (TDD)
**Result**: Sprint 2 Complete - Loop Control Flow!

### Starting Point
- 214 tests passing
- Sprint 1 complete (die, warn, print, say, do, require)
- Basic loops (while, until, for/foreach) without control

### Ending Point
- **226 tests passing** (+12 new tests)
- Loop control statements: `last`, `next`, `redo`
- Loop labels: `LABEL: while/until/for`
- Complete control flow support

## What We Built This Session

### 1. Loop Control Statements (last, next, redo)

**Features**:
- `last` - Exit loop immediately (like `break` in C)
- `next` - Skip to next iteration (like `continue` in C)
- `redo` - Restart current iteration without re-evaluating condition
- Optional label support: `last OUTER;`, `next LOOP;`
- Works in postfix conditionals: `next if $skip;`

**AST Nodes**:
```typescript
interface LastNode extends ASTNode {
    type: 'Last';
    label?: string;
}

interface NextNode extends ASTNode {
    type: 'Next';
    label?: string;
}

interface RedoNode extends ASTNode {
    type: 'Redo';
    label?: string;
}
```

**Implementation**:
- Added to Tokenizer keywords: `redo` (last/next already existed)
- Added to Lexer controlKeywords: `redo`
- Parser methods: `parseLastStatement()`, `parseNextStatement()`, `parseRedoStatement()`
- Parse like `return` - keyword + optional label identifier

**Examples**:
```perl
# Basic usage
while ($running) {
    last if $done;
    next if $skip;
    redo if $retry;
}

# With labels
OUTER: for my $i (@items) {
    INNER: for my $j (@others) {
        last OUTER if $critical_error;
        next INNER if $j eq 'skip';
    }
}
```

**Tests Added**: 8 tests
- 3 basic tests (without labels)
- 3 label tests
- 2 integration tests (in loops, with conditionals)

### 2. Loop Labels

**Features**:
- Labels for while, until, for/foreach loops
- Syntax: `LABEL: while (...) { ... }`
- Labels are identifiers (typically uppercase by convention)
- Used with `last LABEL`, `next LABEL`, `redo LABEL`
- Enables breaking out of nested loops

**AST Changes**:
```typescript
interface WhileNode extends ASTNode {
    type: 'While';
    condition: ASTNode;
    block: ASTNode[];
    label?: string;  // NEW
}

interface UntilNode extends ASTNode {
    type: 'Until';
    condition: ASTNode;
    block: ASTNode[];
    label?: string;  // NEW
}

interface ForeachNode extends ASTNode {
    type: 'Foreach';
    variable: VariableNode;
    declarator?: string;
    listExpr: ASTNode;
    block: ASTNode[];
    label?: string;  // NEW
}
```

**Implementation**:
- Label detection in `parseStatement()`: Check for `IDENTIFIER : CONTROL` pattern
- Extract label and pass to loop parsing methods
- Updated signatures: `parseWhileStatement(lexemes, label?)`
- Updated signatures: `parseUntilStatement(lexemes, label?)`
- Updated signatures: `parseForeachStatement(lexemes, label?)`

**Parsing Logic**:
```typescript
// In parseStatement()
if (lexemes[0].category === 'IDENTIFIER' &&
    lexemes[1].token.value === ':' &&
    lexemes[2].category === 'CONTROL') {
    
    const label = lexemes[0].token.value;
    const keyword = lexemes[2].token.value;
    // Pass to appropriate loop parser
}
```

**Tests Added**: 4 tests
- while with label
- until with label
- foreach with label
- nested loops with labels and last (integration)

## Architecture Insights

### 1. Colon as Label Separator

**Decision**: Recognize `:` as BINOP in label context
**Why**: Tokenizer already handles `:` as operator (for ternary and hash pairs)
**Benefit**: No tokenizer changes needed, just parse-time detection

### 2. Optional Parameters for Labels

**Pattern**: `parseForeachStatement(lexemes, label?: string)`
**Benefit**: Backward compatible - existing calls work without changes
**Implementation**: Use spread operator for optional fields

```typescript
const whileNode: WhileNode = {
    type: 'While',
    condition,
    block: blockResult.statements,
    ...(label && { label })  // Only add if present
};
```

### 3. Label-First Parsing

**Order**: Check for labels BEFORE postfix conditionals
**Why**: Labels must be detected at statement start
**Location**: Lines 152-173 in Parser.ts parseStatement()

## Code Changes

### Files Modified
1. **src/AST.ts** (~15 lines)
   - Added LastNode, NextNode, RedoNode interfaces
   - Added optional `label` field to WhileNode, UntilNode, ForeachNode

2. **src/Tokenizer.ts** (~1 line)
   - Added `redo` to keywords set

3. **src/Lexer.ts** (~1 line)
   - Added `redo` to controlKeywords set

4. **src/Parser.ts** (~100 lines)
   - Label detection logic in parseStatement()
   - parseLastStatement(), parseNextStatement(), parseRedoStatement()
   - Updated loop parsing methods with optional label parameter

5. **tests/Parser.test.ts** (~110 lines)
   - 12 new tests for loop control and labels
   - Imports for new node types

### Total Changes
- **Lines Added**: ~227 lines
- **Tests Added**: 12 tests
- **Test Coverage**: 214 → 226 tests

## Sprint 2 Completion Status

✅ **Both features complete**:
1. ✅ Loop control: `last`, `next`, `redo`
2. ✅ Loop labels: `LABEL: while/until/for`

**ROI**: Complete control flow enables complex loop logic and proper error handling in nested loops - essential for real-world programs.

## Examples from Tests

```perl
# Basic loop control
last;
next;
redo;

# With labels
last OUTER;
next LOOP;
redo RETRY;

# In loops
while ($x) {
    last;
}

for my $item (@items) {
    next if $skip;
}

# Labeled loops
OUTER: while ($condition) {
    $x = $x + 1;
}

RETRY: until ($done) {
    process();
}

ITEMS: for my $item (@list) {
    say $item;
}

# Nested with control
OUTER: while ($x) {
    INNER: for my $i (@items) {
        last OUTER if $done;
    }
}
```

## Lessons Learned

### 1. Keyword Already Existed!

**Surprise**: `last` and `next` were already in tokenizer/lexer
**Missing**: Only `redo` needed to be added
**Lesson**: Check existing code before assuming changes needed
**Saved**: Time and potential bugs from duplicate additions

### 2. Property Names Matter

**Bug**: Test used `whileStmt.body` instead of `whileStmt.block`
**Root Cause**: WhileNode uses `block`, ForeachNode uses `block`
**Fix**: Quick - just updated test
**Lesson**: Stay consistent with existing naming conventions

### 3. Spread Syntax for Optional Fields

**Pattern**: `...(label && { label })`
**Benefit**: Clean way to conditionally add fields
**Alternative**: Separate if statements would be verbose
**Adoption**: Used consistently across all three loop types

### 4. Early Parsing Position Matters

**Decision**: Parse labels before postfix conditionals
**Why**: Labels appear at statement start
**Impact**: Natural flow, no conflicts with other features

## Performance Notes

- All 226 tests pass in ~87ms
- Compilation clean with no TypeScript errors
- Test coverage maintained at 100% for new features

## What's Next: Session 12

**Recommended**: Start Sprint 3 from FEATURE_PRIORITIES.md

**Sprint 3: Special Variables (1-2 hours)**:
1. `%ENV`, `@ARGV` special variables
2. `$_` default variable
3. Possibly `qw//` quote-word operator (if time permits)

**Why Sprint 3**:
- High practical value
- Low complexity
- Natural progression
- Enables real program I/O

**Alternative**: Sprint 4 (Modern Dereferencing: `->@*`, `->%*`, etc.)

## Session Velocity

- **Features Implemented**: 2 (loop control, labels)
- **Tests Added**: 12
- **Lines Added**: ~227 total
- **Time**: ~2 hours
- **Velocity**: ~114 lines/hour, 6 tests/hour

**Comparison**:
- Session 9: 5 features, 16 tests, ~225 lines
- Session 10: 4 features, 21 tests, ~270 lines
- Session 11: 2 features, 12 tests, ~227 lines
- Consistent quality and thoroughness

**Total Progress**:
- Started: 214 tests
- Ended: 226 tests
- Growth: +5.6%
- All sprints on track!

---

## Session 12 Summary - Sprint 3 Complete!

**Date**: Session 12 of MPP development  
**Duration**: ~1.5 hours  
**Methodology**: Strict Test-Driven Development (TDD)  
**Result**: Sprint 3 Complete - Special Variables & Quote-Word Operator!

### Starting Point
- 226 tests passing
- Sprint 2 complete (loop control)
- No special variable handling

### Ending Point
- **239 tests passing** (+13 new tests)
- Special variables: `%ENV`, `@ARGV`, `$_` fully supported
- `qw//` quote-word operator with multiple delimiters
- All Sprint 3 features complete!

## What We Built This Session

### 1. Special Variables (%ENV, @ARGV, $_)

**Key Insight**: These "just work" as regular variables! No parser changes needed.

**Examples**:
```perl
# %ENV - Environment variables
$ENV{PATH};                    # Access PATH
$ENV{DEBUG} = 1;               # Set DEBUG
my %copy = %ENV;               # Copy entire hash

# @ARGV - Command-line arguments
$ARGV[0];                      # First argument
for my $arg (@ARGV) { ... }    # Iterate over args

# $_ - Default variable
print $_;                      # Print default
my $result = $_ + 10;          # Use in expression
```

**Architecture**: 
- Variable names like `ENV`, `ARGV`, `_` are just identifiers
- Sigils determine usage context (`$ENV{x}` vs `%ENV`)
- Already handled correctly by existing tokenizer/parser

**Tests Added**: 7 tests
- `$ENV{key}` hash element access
- `$ARGV[index]` array element access
- `@ARGV` in foreach loop
- `%ENV` as hash variable
- `$_` in print statement
- `$_` in expressions
- `$ENV{key}` assignment

### 2. qw// Quote-Word Operator

**Features**:
- Multiple delimiters: `qw()`, `qw[]`, `qw{}`, `qw//`, `qw||`, etc.
- Paired delimiters: `()`, `[]`, `{}`, `<>` with proper nesting
- Non-paired delimiters: `/`, `|`, `!`, etc.
- Splits on whitespace, filters empty strings
- Returns list of bareword strings

**Implementation**:

**Tokenizer** (~50 lines in Tokenizer.ts):
```typescript
// Recognize qw followed by delimiter
if (value === 'qw') {
    const delimiter = chunk[i];
    const closingDelim = this.getClosingDelimiter(delimiter);
    
    // Find closing delimiter (with depth tracking for paired)
    // Split content on whitespace
    const words = content.split(/\s+/).filter(w => w.length > 0);
    
    yield {
        type: 'QWLIST',
        value: JSON.stringify(words)
    };
}
```

**Lexer** (~1 line in Lexer.ts):
```typescript
// Treat QWLIST as LITERAL
if (token.type === 'QWLIST') {
    return { category: 'LITERAL', token };
}
```

**Parser** (~15 lines in Parser.ts):
```typescript
if (lexeme.token.type === 'QWLIST') {
    const words: string[] = JSON.parse(lexeme.token.value);
    const elements: StringNode[] = words.map(word => ({
        type: 'String',
        value: word
    }));
    return { type: 'List', elements };
}
```

**Examples**:
```perl
# Various delimiters
my @words = qw(foo bar baz);      # Parentheses
my @list = qw/one two three/;     # Slashes
my @items = qw[alpha beta gamma]; # Square brackets
my @nums = qw{1 2 3};             # Curly braces

# Multiple spaces normalized
qw(a    b     c)  # → ('a', 'b', 'c')

# In function calls
process(qw(foo bar));  # Pass list to function
```

**Tests Added**: 6 tests
- `qw()` with parentheses
- `qw//` with slashes
- `qw[]` with square brackets
- `qw{}` with curly braces
- `qw()` with multiple spaces (normalization)
- `qw()` in function call

## Code Changes

### Files Modified
1. **tests/Parser.test.ts** (~80 lines)
   - 7 special variable tests
   - 6 qw// operator tests

2. **src/Tokenizer.ts** (~60 lines)
   - qw// tokenization logic
   - `getClosingDelimiter()` helper method
   - Delimiter matching with depth tracking

3. **src/Lexer.ts** (~1 line)
   - Added QWLIST to literal types

4. **src/Parser.ts** (~15 lines)
   - QWLIST handling in parsePrimary()
   - Convert to ListNode with StringNode elements

### Total Changes
- **Lines Added**: ~156 lines
- **Tests Added**: 13 tests
- **Test Coverage**: 226 → 239 tests

## Architecture Insights

### 1. Special Variables Are Just Names

**Realization**: `ENV`, `ARGV`, `_` are regular identifiers  
**Impact**: Zero parser/tokenizer changes needed  
**Lesson**: Perl's syntax context magic (sigils) handles everything

The sigil determines behavior:
- `$ENV{key}` - scalar access to hash
- `%ENV` - the hash itself
- `@ARGV` - the array
- `$ARGV[0]` - scalar from array

### 2. qw// Is Tokenizer-Level

**Decision**: Handle qw// in tokenizer, not parser  
**Why**: Content parsing (splitting) is tokenization  
**Benefit**: Parser sees clean ListNode, no special logic needed

**Alternative Considered**: Parse qw in parser
**Rejected**: Would require parser to split strings, handle delimiters

### 3. JSON for Token Value Transfer

**Pattern**: Store word list as JSON in token value  
**Benefit**: Type-safe transfer from tokenizer to parser  
**Implementation**: `JSON.stringify(words)` → `JSON.parse(value)`

### 4. Delimiter Pairing Logic

**Challenge**: Paired `()` vs non-paired `//` delimiters  
**Solution**: `getClosingDelimiter()` helper  
**Logic**:
- Paired: track depth, match opener with closer
- Non-paired: delimiter is its own closer

## Performance Notes

- All 239 tests pass in ~88ms
- qw// tokenization adds minimal overhead
- No breaking changes to existing features

## Examples from Tests

```perl
# Special Variables
$ENV{PATH};                  # Environment variable
my $first = $ARGV[0];        # Command-line arg
for my $arg (@ARGV) { }      # Iterate args
print $_;                    # Default variable
my %copy = %ENV;             # Copy environment

# qw// Quote-Word
my @words = qw(foo bar baz); # Simple list
my @list = qw/one two three/; # Different delimiter
my @items = qw[a b c];       # Square brackets
my @nums = qw{1 2 3};        # Curly braces
qw(a    b     c);            # Whitespace normalized
process(qw(foo bar));        # In function call
```

## Sprint 3 Completion Status

✅ **All features complete**:
1. ✅ `%ENV`, `@ARGV` special variables
2. ✅ `$_` default variable
3. ✅ `qw//` quote-word operator (bonus!)

**ROI**: Essential for real programs - environment access, command-line args, and convenient list syntax.

## Lessons Learned

### 1. Not Everything Needs Special Handling

**Assumption**: Special variables need parser changes  
**Reality**: They're just names with special meaning at runtime  
**Lesson**: Check if existing mechanisms suffice before adding complexity

### 2. Test Corrections Are Learning Opportunities

**Issue**: Initial tests used `%ENV` in `$ENV{key}` context  
**Learning**: Sigil context switching is fundamental to Perl  
**Fix**: Corrected tests to reflect proper Perl semantics  
**Value**: Deepened understanding of sigil behavior

### 3. Tokenizer vs Parser Responsibility

**Question**: Where to implement qw//?  
**Answer**: Tokenizer - it's about text processing  
**Benefit**: Clean separation of concerns  
**Pattern**: Tokenizer handles syntax, parser handles structure

### 4. JSON as Protocol

**Pattern**: Use JSON to pass structured data in token values  
**Benefit**: Type-safe, simple, debuggable  
**Usage**: `JSON.stringify(words)` in tokenizer, `JSON.parse()` in parser

## What's Next: Session 13

**Recommended**: Sprint 4 from FEATURE_PRIORITIES.md

**Sprint 4: Modern Dereferencing (3-4 hours)**:
1. Anonymous constructors: `[]`, `{}` (~70 lines)
2. Postfix dereference: `->@*`, `->%*`, `->$*` (~80 lines)
3. Postfix deref slice: `->@[...]`, `->@{...}` (~50 lines)

**Why Sprint 4**:
- Modern Perl syntax (5.20+)
- Cleaner than old-style dereferencing
- Natural progression from existing deref

**Alternative**: Sprint 5 (Package System) or Sprint 6 (Class Syntax)

## Session Velocity

- **Features Implemented**: 3 (special vars, qw//)
- **Tests Added**: 13
- **Lines Added**: ~156 total
- **Time**: ~1.5 hours
- **Velocity**: ~104 lines/hour, ~9 tests/hour

**Comparison**:
- Session 10: 4 features, 21 tests, ~270 lines, 2h
- Session 11: 2 features, 12 tests, ~227 lines, 2h
- Session 12: 3 features, 13 tests, ~156 lines, 1.5h
- **Consistent productivity**, adaptive to complexity

**Total Progress**:
- Started Session 12: 226 tests
- Ended Session 12: 239 tests
- Growth: +5.8%
- **All sprints on track!**

---

## Session 13 Summary - Sprint 4 Complete!

**Date**: Session 13 of MPP development
**Duration**: ~2.5 hours
**Methodology**: Strict Test-Driven Development (TDD)
**Result**: Sprint 4 Complete - Modern Postfix Dereferencing!

### Starting Point
- 239 tests passing
- Sprint 3 complete (special variables, qw//)
- No postfix dereferencing support

### Ending Point
- **247 tests passing** (+8 new tests)
- Postfix dereference operators: `->@*`, `->%*`, `->$*` fully supported
- Postfix dereference slices: `->@[...]`, `->@{...}` fully supported
- All Sprint 4 features complete!

## What We Built This Session

### 1. Postfix Dereference Operators (->@*, ->%*, ->$*)

**Key Insight**: Modern Perl 5.20+ postfix dereferencing syntax required tokenizer-level support!

**Examples**:
```perl
# Array dereference
my @array = $aref->@*;          # Dereference array reference
for my $item ($aref->@*) { }    # Use in loops

# Hash dereference
my %hash = $href->%*;           # Dereference hash reference
my @keys = keys $href->%*;      # Get keys

# Scalar dereference
my $value = $sref->$*;          # Dereference scalar reference
```

**Implementation**:

**Tokenizer** (~15 lines in Tokenizer.ts):
- Added special handling for sigil + `*` pattern
- Created new `POSTFIX_DEREF_SIGIL` token type
- Handles `@*`, `%*`, `$*` patterns

```typescript
// Special case: postfix dereference sigils @*, %*, $*
if (nextChar === '*' || nextChar === '[' || nextChar === '{') {
    yield {
        type: 'POSTFIX_DEREF_SIGIL',
        value: char, // Just the sigil: @, %, or $
        line,
        column
    };
    // Don't consume the *, [, or { - let it be tokenized separately
}
```

**Lexer** (~4 lines in Lexer.ts):
```typescript
// Postfix dereference sigils (@*, %*, $*)
if (token.type === 'POSTFIX_DEREF_SIGIL') {
    return { category: 'POSTFIX_DEREF_SIGIL', token };
}
```

**AST** (new nodes in AST.ts):
```typescript
export interface PostfixDerefNode extends ASTNode {
    type: 'PostfixDeref';
    base: ASTNode;        // The reference expression
    derefType: string;    // '@' for array, '%' for hash, '$' for scalar
}
```

**Parser** (~20 lines in Parser.ts):
```typescript
// In parsePostfixOperators, after -> is consumed
if (lexemes[pos].category === 'POSTFIX_DEREF_SIGIL' &&
    pos + 1 < lexemes.length &&
    lexemes[pos + 1].token.value === '*') {

    const sigil = lexemes[pos].token.value;
    pos += 2; // Consume sigil and *

    const derefNode: PostfixDerefNode = {
        type: 'PostfixDeref',
        base: node,
        derefType: sigil
    };

    node = derefNode;
    continue;
}
```

**Tests Added**: 4 tests
- Basic array deref: `$aref->@*`
- Basic hash deref: `$href->%*`
- Basic scalar deref: `$sref->$*`
- In assignment: `my @array = $aref->@*`

### 2. Postfix Dereference Slices (->@[...], ->@{...})

**Features**:
- Array deref slices: `$aref->@[0..4]`, `$aref->@[0, 2, 4]`
- Hash deref slices: `$href->@{"a", "b"}`, `$href->@{@keys}`
- Works with ranges and lists
- Chainable after method calls

**Implementation**:

**AST** (new node in AST.ts):
```typescript
export interface PostfixDerefSliceNode extends ASTNode {
    type: 'PostfixDerefSlice';
    base: ASTNode;        // The reference expression
    sliceType: string;    // '@' for array/hash slices
    indices: ASTNode;     // The indices/keys (range or list)
    indexType: string;    // '[' for array slice, '{' for hash slice
}
```

**Parser** (~100 lines in Parser.ts):
- Detect `POSTFIX_DEREF_SIGIL` followed by `[` or `{`
- Parse indices/keys as expression or list
- Handle comma detection for list vs single expression
- Reuses existing list parsing logic

**Examples**:
```perl
# Array deref slices
my @slice = $aref->@[0..4];         # Range slice
my @items = $aref->@[0, 2, 4];      # List slice
my @subset = $aref->@[$start..$end]; # Variable range

# Hash deref slices
my @values = $href->@{"a", "b", "c"}; # Quoted keys
my @data = $href->@{@keys};          # Array variable

# Chaining
my @items = $obj->get_ref()->@[0..9]; # After method call
```

**Tests Added**: 4 tests
- Array slice with range: `$aref->@[0..4]`
- Hash slice with quoted keys: `$href->@{"a", "b", "c"}`
- Array slice with list: `$aref->@[0, 2, 4]`
- Chained deref: `$obj->get_ref()->@*`

## Code Changes

### Files Modified
1. **src/AST.ts** (~12 lines)
   - Added PostfixDerefNode interface
   - Added PostfixDerefSliceNode interface

2. **src/Tokenizer.ts** (~15 lines)
   - Added POSTFIX_DEREF_SIGIL token type
   - Special handling for `@*`, `%*`, `$*`, `@[`, `@{` patterns

3. **src/Lexer.ts** (~4 lines)
   - Added POSTFIX_DEREF_SIGIL category classification

4. **src/Parser.ts** (~120 lines)
   - Added PostfixDerefNode, PostfixDerefSliceNode to imports
   - Postfix dereference parsing in parsePostfixOperators
   - Postfix dereference slice parsing with list detection

5. **tests/Parser.test.ts** (~100 lines)
   - 8 comprehensive tests for all postfix deref features
   - Added PostfixDerefNode, PostfixDerefSliceNode to imports

### Total Changes
- **Lines Added**: ~251 lines
- **Tests Added**: 8 tests
- **Test Coverage**: 239 → 247 tests

## Architecture Insights

### 1. Tokenizer-Level Context Needed

**Challenge**: Perl's `@*` pattern conflicts with variable tokenization
**Problem**: `@foo` is a variable, but `@*` is a dereference operator
**Solution**: Special tokenization before variable matching

**Pattern**:
```typescript
// Check BEFORE general variable matching
if (isSigil(char) && (nextChar === '*' || nextChar === '[' || nextChar === '{')) {
    yield { type: 'POSTFIX_DEREF_SIGIL', value: char };
    // Only consume the sigil, not the following char
}
```

**Lesson**: Token context matters - same character sequence means different things

### 2. Postfix Operator Chaining

**Pattern**: Postfix operators handled in while loop
**Location**: parsePostfixOperators method
**Benefit**: Natural chaining support

**Current postfix operators**:
1. Method calls: `->method()`
2. Array access: `->[index]`
3. Hash access: `->{key}`
4. Postfix deref: `->@*`, `->%*`, `->$*` (NEW)
5. Postfix deref slice: `->@[...]`, `->@{...}` (NEW)

**Example chain**:
```perl
$obj->get_data()->[0]{key}->@*
# 1. Method call
# 2. Array access
# 3. Hash access
# 4. Postfix deref
```

### 3. Slice vs Single Expression Detection

**Reused pattern from array/hash slices**:
```typescript
// Check for comma at depth 0
let hasComma = false;
for (let i = 0; i < lexemes.length; i++) {
    // Track depth...
    if (depth === 0 && lexemes[i].category === 'COMMA') {
        hasComma = true;
        break;
    }
}

if (hasComma) {
    // Parse as List
} else {
    // Parse as single expression (often a range)
}
```

**Benefit**: Clean distinction between `@[0..4]` and `@[0, 2, 4]`

## Performance Notes

- All 247 tests pass in ~88ms
- Postfix dereference adds minimal tokenizer overhead
- No breaking changes to existing features

## Examples from Tests

```perl
# Postfix Dereferencing
$aref->@*;                    # Array dereference
$href->%*;                    # Hash dereference
$sref->$*;                    # Scalar dereference
my @array = $aref->@*;        # In assignment

# Postfix Dereference Slices
$aref->@[0..4];               # Array slice with range
$aref->@[0, 2, 4];            # Array slice with list
$href->@{"a", "b", "c"};      # Hash slice with keys
$obj->get_ref()->@*;          # Chained after method call
```

## Sprint 4 Completion Status

✅ **All features complete**:
1. ✅ Anonymous constructors `[]`, `{}` (already worked!)
2. ✅ Postfix dereference `->@*`, `->%*`, `->$*`
3. ✅ Postfix dereference slices `->@[...]`, `->@{...}`

**ROI**: Modern Perl 5.20+ syntax enables cleaner, more readable reference dereferencing. Much better than old-style `@{$aref}` syntax!

## Lessons Learned

### 1. Tokenization Context is Critical

**Assumption**: Parser-level detection would suffice
**Reality**: Tokenizer must understand context to avoid skipping characters
**Solution**: Special-case patterns before general tokenization rules

**Example**:
- `@foo` → VARIABLE token
- `@*` → POSTFIX_DEREF_SIGIL + OPERATOR tokens
- `@[` → POSTFIX_DEREF_SIGIL + LBRACKET tokens

### 2. Order of Token Checks Matters

**Pattern**: Check special cases before general cases
**Implementation**: Postfix deref check before variable check
**Benefit**: Prevents incorrect token categorization

### 3. Reusable Parsing Patterns

**Observation**: Slice detection logic reused from Session 9
**Pattern**: Comma-based list vs expression detection
**Benefit**: Consistent behavior, less code, fewer bugs

### 4. TDD Catches Tokenization Issues

**Flow**:
1. Write tests → tests fail
2. Implement parser → tests still fail (unexpected!)
3. Debug → discover tokenizer skipping `@`
4. Fix tokenizer → all tests pass

**Lesson**: TDD revealed tokenizer issue that manual testing might have missed

## What's Next: Session 14

**Recommended**: Sprint 5 from FEATURE_PRIORITIES.md

**Sprint 5: Package System (4-5 hours)**:
1. Package declarations (~80 lines)
2. Fully qualified names (~100 lines)
3. `use` statements (~70 lines)

**Why Sprint 5**:
- Module organization and code structure
- Foundation for larger programs
- Natural progression from dereferencing

**Alternative**: Sprint 6 (Class Syntax) for modern OO

## Session Velocity

- **Features Implemented**: 3 (postfix deref, postfix deref slices, + verified anonymous constructors)
- **Tests Added**: 8
- **Lines Added**: ~251 total
- **Time**: ~2.5 hours
- **Velocity**: ~100 lines/hour, ~3 tests/hour

**Comparison**:
- Session 11: 2 features, 12 tests, ~227 lines, 2h
- Session 12: 3 features, 13 tests, ~156 lines, 1.5h
- Session 13: 3 features, 8 tests, ~251 lines, 2.5h
- **Consistent quality, adapting to complexity**

## Cumulative Stats (Through Session 13)

**Test Count**: 247 passing ✅
**Code Size**: ~2,550 lines of parser code
**Features**: 10 complete sprints/features

**Completed Sprints**:
1. ✅ Sprint 1: Essential Builtins (die, warn, print, say, do, require)
2. ✅ Sprint 2: Loop Control (last, next, redo, labels)
3. ✅ Sprint 3: Special Variables (%ENV, @ARGV, $_, qw//)
4. ✅ Sprint 4: Modern Dereferencing (->@*, ->%*, ->$*, ->@[...], ->@{...})

**Upcoming**:
- Sprint 5: Package System
- Sprint 6: Class Syntax (Modern OO)
- Sprint 7: Advanced Subs

---

## Session 14 Summary - Sprint 5 Complete!

**Date**: Session 14 of MPP development
**Duration**: ~2 hours
**Methodology**: Strict Test-Driven Development (TDD)
**Result**: Sprint 5 Complete - Package System!

### Starting Point
- 247 tests passing
- Sprint 4 complete (modern dereferencing)
- No package/module system support

### Ending Point
- **261 tests passing** (+14 new tests)
- Package declarations: `package Foo::Bar;` fully supported
- Use statements: `use strict;`, `use List::Util qw(max min);` fully supported
- Fully qualified names: `Package::Name::function()`, `$Package::Variable` fully supported
- All Sprint 5 features complete!

## What We Built This Session

### 1. Package Declarations

**Features**:
- Simple package: `package Foo;`
- Namespaced: `package Foo::Bar;`
- Multiple levels: `package My::Module::Submodule;`
- Followed by statements: `package Foo; my $x = 10;`

**AST Node**:
```typescript
export interface PackageNode extends ASTNode {
    type: 'Package';
    name: string;         // Package name (e.g., "Foo::Bar")
}
```

**Implementation**:
- `package` keyword already in tokenizer
- Added parsePackageDeclaration() in Parser.ts (~45 lines)
- Handles `::` by detecting two consecutive `:` operators
- Builds fully qualified package name from tokens

**Examples**:
```perl
package MyApp;
package MyApp::Database;
package My::Deep::Module::Name;
```

**Tests Added**: 4 tests
- Simple package declaration
- Package with :: separator
- Package with multiple :: separators
- Package followed by other statements

### 2. Use Statements

**Features**:
- Simple use: `use strict;`
- Namespaced: `use List::Util;`
- With imports: `use List::Util qw(max min);`
- Multiple levels: `use My::Deep::Module::Name;`

**AST Node**:
```typescript
export interface UseNode extends ASTNode {
    type: 'Use';
    module: string;       // Module name (e.g., "strict", "List::Util")
    imports?: ASTNode;    // Optional import list (e.g., qw(max min))
}
```

**Implementation**:
- `use` keyword already in tokenizer
- Added parseUseStatement() in Parser.ts (~55 lines)
- Handles `::` in module names
- Parses optional import list as expression
- Properly handles undefined vs defined imports

**Examples**:
```perl
use strict;
use warnings;
use List::Util;
use List::Util qw(max min sum);
use My::Module::Name;
```

**Tests Added**: 5 tests
- Simple use statement
- Use with :: separator
- Use with qw import list
- Use with multiple :: separators
- Use followed by other statements

### 3. Fully Qualified Names

**Features**:
- Qualified functions: `List::Util::max(1, 2)`
- Qualified variables: `$Config::VERSION`
- Qualified arrays: `@Package::Array`
- Qualified hashes: `%Package::Hash`
- In expressions: `my $x = $Config::VERSION + 1;`

**Implementation**:
- Modified Tokenizer.ts to handle `::` in identifiers (~20 lines)
- Modified Tokenizer.ts to handle `::` in variables (~15 lines)
- Extended identifier tokenization to continue on `::`
- Extended variable tokenization to continue on `::`
- No AST changes needed - uses existing CallNode and VariableNode

**Tokenization Logic**:
```typescript
// For both identifiers and variables
while (i < chunk.length) {
    if (this.isIdentifierChar(chunk[i])) {
        i++;
        column++;
    } else if (chunk[i] === ':' && i + 1 < chunk.length && chunk[i + 1] === ':') {
        // Handle :: package separator
        i += 2;
        column += 2;
    } else {
        break;
    }
}
```

**Examples**:
```perl
# Fully qualified function calls
List::Util::max(1, 2);
Data::Dumper::Dumper($obj);

# Fully qualified variables
$Config::VERSION;
@Package::Array;
%Package::Hash;

# In expressions
my $x = $Config::VERSION + 1;
my @items = @Package::Array;
```

**Tests Added**: 5 tests
- Fully qualified function call
- Fully qualified scalar variable
- Fully qualified array variable
- Fully qualified hash variable
- Fully qualified variable in expression

## Code Changes

### Files Modified

1. **src/AST.ts** (~12 lines)
   - Added PackageNode interface
   - Added UseNode interface

2. **src/Tokenizer.ts** (~35 lines)
   - Extended identifier tokenization with :: handling
   - Extended variable tokenization with :: handling

3. **src/Parser.ts** (~105 lines)
   - Added PackageNode, UseNode to imports
   - Added package declaration check in parseStatement
   - Added use statement check in parseStatement
   - Implemented parsePackageDeclaration() (~45 lines)
   - Implemented parseUseStatement() (~55 lines)

4. **tests/Parser.test.ts** (~170 lines)
   - Added PackageNode, UseNode to imports
   - 4 package declaration tests
   - 5 use statement tests
   - 5 fully qualified name tests

### Total Changes
- **Lines Added**: ~322 lines
- **Tests Added**: 14 tests
- **Test Coverage**: 247 → 261 tests

## Architecture Insights

### 1. :: Handling at Tokenizer Level

**Decision**: Handle `::` during identifier/variable tokenization
**Alternative**: Parse `::` as separate tokens at parser level
**Benefit**: Cleaner - identifiers and variables are atomic tokens
**Implementation**: Check for `::` pattern in tokenization loop

**Pattern**:
- In package/use parsing: `::` parsed as two `:` operators
- In identifiers/variables: `::` consumed as part of token

### 2. Consistent Parsing Pattern

**Observation**: Package and use parsing use same `::` detection logic
**Pattern**: Loop through lexemes, build name from IDENTIFIER + `::`
**Benefit**: DRY code, consistent behavior

**Code Pattern**:
```typescript
let name = '';
for (let i = 0; i < lexemes.length; i++) {
    if (lexemes[i].category === 'IDENTIFIER') {
        name += lexemes[i].token.value;
    } else if (isColonColon(lexemes, i)) {
        name += '::';
        i++; // Skip second :
    } else {
        break;
    }
}
```

### 3. Optional Imports Handling

**Challenge**: TypeScript exactOptionalPropertyTypes
**Problem**: `imports?: ASTNode` vs `imports: ASTNode | undefined`
**Solution**: Only set property if value exists

**Pattern**:
```typescript
const useNode: UseNode = {
    type: 'Use',
    module: moduleName
};

if (imports !== undefined) {
    useNode.imports = imports;
}

return useNode;
```

### 4. No New Token Types Needed

**Observation**: `package` and `use` already in keywords
**Decision**: No tokenizer keyword additions
**Benefit**: Existing infrastructure worked perfectly
**Lesson**: Check existing tokens before adding new ones

## Performance Notes

- All 261 tests pass in ~90ms
- Package name parsing adds minimal overhead
- No breaking changes to existing features
- Clean TypeScript compilation with no errors

## Examples from Tests

```perl
# Package Declarations
package Foo;
package Foo::Bar;
package My::Module::Submodule;
package Foo; my $x = 10;

# Use Statements
use strict;
use List::Util;
use List::Util qw(max min);
use My::Deep::Module::Name;
use strict; my $x = 10;

# Fully Qualified Names
List::Util::max(1, 2);
$Config::VERSION;
@Package::Array;
%Package::Hash;
my $x = $Config::VERSION + 1;
```

## Sprint 5 Completion Status

✅ **All features complete**:
1. ✅ Package declarations (~45 lines actual)
2. ✅ Fully qualified names (~35 lines actual)
3. ✅ `use` statements (~55 lines actual)

**Total**: ~135 lines of implementation + ~170 lines of tests

**ROI**: Foundation for module organization and larger programs. Essential for any real-world Perl application with multiple files.

## Lessons Learned

### 1. Two Levels of :: Handling

**Insight**: `::` handled differently in different contexts
- **In tokenizer**: Part of identifier/variable tokens
- **In parser**: Parsed from two `:` operator tokens

**Lesson**: Context-appropriate handling yields cleaner code

### 2. Keyword Reuse

**Discovery**: `package` and `use` already in tokenizer
**Benefit**: Zero tokenizer changes for keywords
**Takeaway**: Earlier sessions' foresight paid off

### 3. exactOptionalPropertyTypes Strictness

**Challenge**: TypeScript's strict optional property handling
**Learning**: Can't assign `undefined` to optional properties
**Solution**: Conditionally set properties only when defined
**Benefit**: Catches potential null/undefined bugs

### 4. TDD Workflow Still Effective

**Flow**:
1. Write tests → fail
2. Add AST nodes → still fail
3. Implement parsing → tests pass

**Observation**: TDD caught TypeScript errors early
**Result**: Clean implementation on first try

## What's Next: Session 15

**Recommended**: Sprint 6 from FEATURE_PRIORITIES.md

**Sprint 6: Class Syntax (5-6 hours)**:
1. `class` keyword (~120 lines)
2. `field` declarations (~80 lines)
3. `method` modifier (~50 lines)
4. `has` attribute syntax (~50 lines)

**Why Sprint 6**:
- Modern OO support (Perl 5.38+)
- Replaces old `bless`-based OO
- Natural progression from package system

**Alternative**: Sprint 7 (Advanced Subs) or Sprint 8 (BEGIN/END blocks)

## Session Velocity

- **Features Implemented**: 3 (package, use, qualified names)
- **Tests Added**: 14
- **Lines Added**: ~322 total (~135 implementation, ~187 tests)
- **Time**: ~2 hours
- **Velocity**: ~161 lines/hour, ~7 tests/hour

**Comparison**:
- Session 12: 3 features, 13 tests, ~156 lines, 1.5h
- Session 13: 3 features, 8 tests, ~251 lines, 2.5h
- Session 14: 3 features, 14 tests, ~322 lines, 2h
- **Consistent high velocity across sessions**

## Cumulative Stats (Through Session 14)

**Test Count**: 261 passing ✅
**Code Size**: ~2,650 lines of parser code
**Features**: 11 complete sprints/features

**Completed Sprints**:
1. ✅ Sprint 1: Essential Builtins (die, warn, print, say, do, require)
2. ✅ Sprint 2: Loop Control (last, next, redo, labels)
3. ✅ Sprint 3: Special Variables (%ENV, @ARGV, $_, qw//)
4. ✅ Sprint 4: Modern Dereferencing (->@*, ->%*, ->$*, ->@[...], ->@{...})
5. ✅ Sprint 5: Package System (package, use, qualified names) 🎉

**Progress**:
- 5 of 9 planned phases complete
- ~60% of estimated features implemented
- Strong velocity maintained
- Zero breaking changes

**Upcoming**:
- Sprint 6: Class Syntax (Modern OO)
- Sprint 7: Advanced Subs
- Sprint 8: BEGIN/END blocks

