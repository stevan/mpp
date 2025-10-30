# Unsupported Perl Features in MPP Parser

This document lists Perl features that are not yet supported by the MPP Parser. Test files for these features are stored in the `corpus/missing/` directory for future implementation.

## Builtin Functions (Perl 5.36+)
**File:** `builtins/073-builtin-functions.mpp`
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
   - Pattern matching operators (`=~`, `!~`) and regex literals
   - Smartmatch operator (`~~`)
   - Remaining builtin functions

2. **Medium Priority**
   - Modern class features (Corinna)
   - Special variables and references

3. **Lower Priority**
   - BEGIN, END, CHECK, INIT blocks
   - Prototype declarations
   - Additional special variables

## Notes

- Some features may require lexer/tokenizer updates to recognize new keywords
- Error recovery strategies need to be implemented for better parser resilience
- Consider implementing a feature flag system to enable experimental features
- The parser currently generates Error nodes for unrecognized constructs, which helps identify unsupported features