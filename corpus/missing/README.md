# Missing Language Features

This directory contains test cases for Perl language features that are not yet supported by the MPP parser. Files are organized by feature type rather than by their original location.

## File Organization

Files with the same name as files in `corpus/input/` contain ONLY the unsupported portions. The working parts remain in the main corpus.

## Unsupported Features by Category

### Operators

#### `061-bitwise-not.mpp`
- **Bitwise NOT (`~`)** - Unary bitwise complement operator

#### `062-increment-operators.mpp`
- **Auto-increment (`++`)** - Postfix and prefix increment
- **Auto-decrement (`--`)** - Postfix and prefix decrement

#### `063-string-comparison.mpp`
- **String comparison operators** - `eq`, `ne`, `lt`, `gt`, `le`, `ge`, `cmp`

#### `066-regex-operators.mpp`
- **Pattern match operators** - `=~`, `!~`
- **Substitution** - `s/old/new/`
- **Translation** - `tr/a-z/A-Z/`

### Control Flow

#### `064-continue-blocks.mpp`
- **Continue blocks** - `while (...) { } continue { }`

#### `065-c-style-for.mpp`
- **C-style for loops** - `for (my $i = 0; $i < 10; $i++)`

### Built-in Functions

#### `067-eval-blocks.mpp`
- **`eval` blocks** - `eval { ... }`
- **`$@` variable** - Error variable for eval

#### `068-array-functions.mpp`
- **`shift`** - Remove and return first array element
- **`unshift`** - Add elements to beginning of array
- **`pop`** - Remove and return last array element
- **`push`** - Add elements to end of array
- **`splice`** - Remove/replace array elements

### Files with Mixed Unsupported Features

These files match names in the main corpus but contain only failing parts:

#### `056-bitwise-operators.mpp`
- Contains only bitwise NOT operator tests

#### `058-comparison-operators.mpp`
- Contains only string comparison operators

#### `059-until-loop.mpp`
- Contains until loops with `++`, `shift`, and continue blocks

#### `060-loop-labels.mpp`
- Contains loops with `++`, C-style for, `=~`, `eval`, and continue blocks

## Notes

- Hexadecimal literals (e.g., `0xFF`) are **supported** and remain in the main corpus
- Basic loop labels are **supported** and remain in the main corpus
- Until loops without special operators are **supported** and remain in the main corpus
- All numeric comparison operators including spaceship (`<=>`) are **supported**

When a feature is implemented, move the relevant test from here back to the main corpus.