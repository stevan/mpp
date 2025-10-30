# Unsupported Perl Features in MPP Parser

This document lists Perl features that are not yet supported by the MPP Parser. Test files for these features are stored in the `corpus/missing/` directory for future implementation.

## Control Flow

### 1. Given/When (Switch Statements)
**File:** `control-flow/070-given-when.mpp`
- `given` blocks
- `when` clauses
- `default` blocks
- `break` and `continue` in when blocks
- Pattern matching in when conditions

### 2. Try/Catch/Finally
**File:** `control-flow/071-try-catch.mpp`
- `try` blocks
- `catch` blocks with exception variables
- `finally` blocks
- Nested try/catch structures
- Exception handling and rethrowing

### 3. Match/Case (Experimental)
**File:** `control-flow/074-match-case.mpp`
- `match` expressions
- `case` patterns
- Pattern matching with ranges and lists
- `else` clauses in match

## Modern Features

### 4. Defer Blocks
**File:** `advanced/072-defer-blocks.mpp`
- `defer` blocks for cleanup code
- Execution order (LIFO)
- Defer in various contexts (loops, conditionals, functions)

### 5. Builtin Functions (Perl 5.36+)
**File:** `builtins/073-builtin-functions.mpp`
- Boolean literals: `true`, `false`
- Boolean checking: `is_bool`
- Weak references: `weaken`
- Reference utilities: `blessed`, `refaddr`, `reftype`
- String utilities: `trim`
- Array utilities: `indexed`

### 6. Modern Class Features (Corinna)
**File:** `classes/075-class-features.mpp`
- Class version declarations: `:version(1.0)`
- Multiple inheritance: `:isa(Parent)`
- Role composition: `:does(Role)`
- `BUILD` and `DEMOLISH` methods
- `ADJUST` phase blocks
- Abstract classes: `:abstract`
- Required methods: `:required`
- Common (class) fields: `:common`
- Role definitions

## Previously Identified Unsupported Features

### Operators
**Files in:** `operators/`
- Bitwise NOT: `~`
- Auto-increment/decrement: `++`, `--`
- String comparison: `eq`, `ne`, `lt`, `gt`, `le`, `ge`, `cmp`
- Pattern matching: `=~`, `!~`
- Smartmatch: `~~`

### Special Variables
**Files in:** `basics/`
- Dereference variables: `\$x` (references)
- Special variables: `$!`, `$?`, `$@`, etc.

### Control Flow
**Files in:** `control-flow/`
- Continue blocks in loops
- `goto` statements
- Loop modifiers with multiple statements

### Functions
**Files in:** `functions/`
- Prototype declarations
- Attributes on subroutines
- `BEGIN`, `END`, `CHECK`, `INIT` blocks

## Implementation Priority

Based on modern Perl usage patterns, the following features should be prioritized:

1. **High Priority**
   - Try/catch/finally (error handling is fundamental)
   - Defer blocks (important for resource management)
   - Boolean literals and functions

2. **Medium Priority**
   - Given/when (useful but can be replaced with if/elsif)
   - Modern class features (Corinna)
   - String comparison operators

3. **Lower Priority**
   - Match/case (experimental)
   - Smartmatch operator
   - Special variables

## Notes

- Some features may require lexer/tokenizer updates to recognize new keywords
- Error recovery strategies need to be implemented for better parser resilience
- Consider implementing a feature flag system to enable experimental features
- The parser currently generates Error nodes for unrecognized constructs, which helps identify unsupported features