# MPP Corpus Tests

This directory contains a **corpus of test cases** for the Modern Perl Parser (MPP). The corpus serves as:

1. **Golden file tests** - Regression testing for parser behavior
2. **Documentation** - Human-readable examples of language features
3. **Acceptance tests** - Verify complete programs parse correctly

## Structure

```
corpus/
├── input/
│   ├── basics/              # Variables, literals, operators, precedence
│   ├── control-flow/        # if/elsif/else, unless, while, foreach
│   ├── data-structures/     # Arrays, hashes, access, slicing
│   ├── functions/           # Definitions, calls, parameters, recursion
│   ├── classes/             # OO features, fields, methods
│   ├── modules/             # Packages, use statements, qualified names
│   ├── advanced/            # Postfix deref, special vars, qw, do blocks
│   ├── builtins/            # Built-in functions (print, say, die, warn)
│   └── programs/            # Complete multi-statement programs
├── expected/
│   └── (mirrors input/ structure with .json files)
└── README.md
```

Each category contains related test cases, organized by feature area.

## Usage

### Running Corpus Tests

```bash
# Run all tests (including corpus)
npm test

# Run only corpus tests
npm test tests/Corpus.test.ts
```

### Adding New Test Cases

1. **Create input file**: Write a `.mpp` file in the appropriate category
   ```bash
   # Choose the right category for your test
   echo 'my @array = (1, 2, 3);' > corpus/input/data-structures/051-array-declaration.mpp
   ```

2. **Generate expected output**: Run the update-snapshots script
   ```bash
   npm run build && node bin/update-snapshots.js
   ```

3. **Review the JSON**: Check the generated JSON is correct
   ```bash
   cat corpus/expected/data-structures/051-array-declaration.json
   ```

4. **Commit both files**: Input and expected JSON

### Categories

Choose the appropriate category for new tests:

- **basics/** - Simple syntax: variables, literals, operators, precedence
- **control-flow/** - Conditionals and loops
- **data-structures/** - Arrays, hashes, and data manipulation
- **functions/** - Function definitions, calls, parameters
- **classes/** - Object-oriented programming features
- **modules/** - Package system and imports
- **advanced/** - Advanced features like dereferencing, special vars
- **builtins/** - Built-in functions and statements
- **programs/** - Complete, realistic programs

### Updating Snapshots

When parser behavior changes intentionally:

```bash
# Regenerate ALL expected JSON files
npm run build && node bin/update-snapshots.js

# Review the diffs
git diff corpus/expected/

# Commit if correct
git add corpus/
git commit -m "Update corpus snapshots for parser changes"
```

## Corpus Coverage

The corpus currently includes **55 test cases** organized into **9 categories**:

### basics/ (11 tests)
- 001-scalar-variable - Variable references
- 002-number-literal - Numeric literals
- 003-string-literal - String literals
- 004-scalar-declaration - Variable declarations
- 005-addition - Basic arithmetic
- 006-precedence - Operator precedence
- 007-exponentiation - Right-associative operators
- 008-parentheses - Grouping with parentheses
- 009-comparison - Comparison operators
- 010-logical-and - Logical operators
- 011-ternary - Ternary conditional operator

### control-flow/ (7 tests)
- 012-if-statement - Simple if
- 013-if-else - If/else branching
- 014-if-elsif-else - Multi-way branching
- 015-postfix-if - Postfix conditional
- 016-unless - Unless statement
- 017-while-loop - While loops
- 018-foreach-loop - Foreach iteration

### data-structures/ (11 tests)
- 019-range - Range operator
- 020-array-literal - Array construction
- 021-hash-literal - Hash construction
- 022-nested-structures - Nested data structures
- 023-array-access - Array element access
- 024-hash-access - Hash value access
- 025-array-deref - Array reference dereferencing
- 026-hash-deref - Hash reference dereferencing
- 027-chained-access - Chained access operations
- 028-array-slice - Array slicing
- 029-hash-slice - Hash slicing

### functions/ (6 tests)
- 030-function-definition - Function definitions
- 031-function-call - Function calls
- 032-default-parameter - Default parameter values
- 033-fibonacci - Recursive functions
- 051-sub-method-optional-parens - Optional parentheses for subs/methods
- 052-lexical-subroutines - Lexical subs (my sub, our sub)

### classes/ (4 tests)
- 034-class-definition - Class declarations
- 035-has-syntax - Has attribute syntax
- 036-method-call - Method invocation
- 053-class-inheritance - Class inheritance with :isa()

### modules/ (5 tests)
- 037-package - Package declarations
- 038-use-statement - Use statements with imports
- 039-qualified-name - Fully qualified names
- 054-version-statements - Version statements (use v5.40)
- 055-package-blocks - Package block syntax (package Foo {})

### advanced/ (8 tests)
- 040-postfix-deref - Postfix dereferencing (->@*)
- 041-postfix-deref-slice - Postfix deref slicing
- 042-special-var-env - %ENV special variable
- 043-special-var-argv - @ARGV special variable
- 044-special-var-default - $_ default variable
- 045-qw-operator - Quote-word operator
- 046-do-block - Do blocks
- 047-loop-control - Loop control with labels

### builtins/ (2 tests)
- 048-print-say - Output functions
- 049-die-warn - Error/warning functions

### programs/ (1 test)
- 050-complete-program - Full program with multiple features

## How It Works

The test runner (`tests/Corpus.test.ts`):

1. Discovers all `.mpp` files in `corpus/input/`
2. Parses each file through Tokenizer → Lexer → Parser
3. Converts AST to formatted JSON
4. Compares against expected JSON in `corpus/expected/`
5. Fails if any mismatch is detected

### Updating Snapshots

Use `bin/update-snapshots.js`:
- Regenerates all JSON files from `.mpp` sources
- Useful after intentional parser changes
- Always review diffs before committing

### Test Mode (default)

Normal test runs:
- Compares parsed AST against existing JSON
- Fails on any mismatch
- Shows helpful error messages

## Benefits

✅ **Human-readable** - Test cases are easy to write
✅ **Comprehensive** - Test complete programs, not fragments
✅ **Regression detection** - Any parser changes are caught
✅ **Documentation** - Examples of language features
✅ **Easy to review** - JSON diffs show exactly what changed
✅ **Version controlled** - Track language evolution over time

## Guidelines

### Naming Convention

Use a 3-digit prefix and descriptive name:
- `basics/001-scalar-variable.mpp`
- `control-flow/015-postfix-if.mpp`
- `programs/050-complete-program.mpp`

Place tests in the appropriate category directory.

### Test Case Size

- Keep tests **focused** - one feature per file when possible
- Use **complete statements** - include semicolons
- Make tests **self-contained** - don't rely on other files
- For **complete programs**, add comments explaining the structure

### JSON Files

- **Never edit manually** - always regenerate
- **Review carefully** before committing
- **Don't commit** if output looks incorrect

## Troubleshooting

### Test Fails After Parser Change

1. Check if the change was intentional
2. If yes: `npm run build && node bin/update-snapshots.js`
3. Review the diff: `git diff corpus/expected/`
4. If correct, commit; if not, fix the parser

### Missing Expected JSON File

Error message will say:
```
Expected file not found: corpus/expected/XXX.json
Run update-snapshots to generate it
```

Solution: `npm run build && node bin/update-snapshots.js`

### AST Mismatch

Error shows which file failed:
```
❌ AST mismatch for 025-array-deref
   Input: corpus/input/025-array-deref.mpp
   Expected: corpus/expected/025-array-deref.json
```

Compare manually or regenerate if change was intentional.

## Future Expansion

Consider adding:
- **Negative tests** - Files that should fail to parse (in `errors/` category)
- **Error messages** - Expected error output for invalid syntax
- **More edge cases** - Corner cases for each feature
- **Performance tests** - Track parsing speed over time
- **Fuzzing corpus** - Random programs for stress testing
- **New categories** - As the language grows (e.g., `async/`, `patterns/`)

## Related

- Main test suite: `tests/*.test.ts`
- Test runner: `tests/Corpus.test.ts`
- Language spec: `src/LanguageSpec.ts`
- Documentation: `README.md`
