# Missing Language Features

This directory contains test cases for Perl language features that are not yet supported by the MPP parser.

## Current Status

As of the latest update, most modern Perl features have been implemented:
- ✅ String comparison operators (eq, ne, lt, gt, le, ge, cmp)
- ✅ Boolean literals (true, false)
- ✅ Try/catch/finally exception handling
- ✅ Defer blocks
- ✅ Given/when/default pattern matching
- ✅ Match/case expressions
- ✅ Auto-increment/decrement operators (++, --)
- ✅ Regex literals and basic pattern matching (=~, !~)
- ✅ 60+ builtin functions (push, pop, shift, unshift, splice, etc.)

## Remaining Unsupported Features

### Advanced Features (`advanced/`)

#### `056-bitwise-operators.mpp` & `061-bitwise-not.mpp`
- **Bitwise NOT (`~`)** - Unary bitwise complement operator
- Note: All other bitwise operators (AND, OR, XOR, shifts) are already supported

#### `066-regex-operators.mpp`
- **Substitution operator (`s///`)** - Pattern substitution with modifiers
- **Translation operator (`tr///`)** - Character translation/transliteration
- Note: Basic pattern matching operators (`=~`, `!~`) and regex literals are already supported

#### `067-eval-blocks.mpp`
- **`eval` blocks** - Exception handling via eval { ... }
- **`$@` special variable** - Error variable populated by eval
- Note: Modern try/catch/finally is already supported as an alternative

### Builtin Features (`builtins/`)

#### `073-builtin-functions.mpp`
- **`use builtin` statement** - Module import syntax for builtin functions
- Note: The actual builtin functions themselves (is_bool, weaken, blessed, etc.) are already supported; this file tests the `use builtin` import syntax

### Class Features (`classes/`)

#### `075-class-features.mpp`
Modern Perl class features (Corinna):
- Class metadata: `:version(1.0)`, `:abstract`
- Inheritance: `:isa(Parent)`
- Role composition: `:does(Role)`
- Lifecycle methods: `BUILD`, `DEMOLISH`, `ADJUST`
- Class fields: `:common`
- Required methods: `:required`
- Note: Basic class syntax with fields and methods is already supported

### Control Flow (`control-flow/`)

#### `064-continue-blocks.mpp`
- **Continue blocks** - `while (...) { } continue { }` cleanup blocks

#### `065-c-style-for.mpp`
- **C-style for loops** - `for (my $i = 0; $i < 10; $i++)` syntax
- Note: Foreach loops and range-based iteration are already supported

## Testing Strategy

When a feature is implemented:
1. Move the test file from `corpus/missing/` to the appropriate `corpus/input/` subdirectory
2. Update this README to remove the feature from the unsupported list
3. Update `UNSUPPORTED_FEATURES.md`
4. Ensure all existing tests continue to pass

## Implementation Priority

Based on usage patterns and complexity:

1. **High Priority**
   - Substitution/translation operators (`s///`, `tr///`) - very common in Perl
   - C-style for loops - common in modern code

2. **Medium Priority**
   - `use builtin` statement - for proper module compatibility
   - Continue blocks - useful for cleanup logic
   - Advanced class features (Corinna) - for modern OOP

3. **Lower Priority**
   - Bitwise NOT operator - less commonly used
   - `eval` blocks - try/catch is the modern alternative
