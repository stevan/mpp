# Bug Corpus

This directory contains test cases for known parser bugs that need to be fixed.

## Purpose

- **Document issues** as they're discovered
- **Track progress** on fixes
- **Prevent regressions** once fixed
- **Prioritize work** by seeing all issues at once

## File Format

Each bug gets two files:

1. **`NNN-description.mpp`** - Test case showing the issue
   - Include comments explaining what's wrong
   - Provide minimal code that reproduces the bug

2. **`NNN-description.ast`** - Expected AST output
   - Shows what the parser *should* produce
   - Used for automated verification once fixed

## Workflow

1. **Discovery**: Spot a bug in the parser
2. **Document**: Create `.mpp` and `.ast` files
3. **Verify Failure**: Run test to confirm it fails
4. **Fix**: Implement the fix in the parser
5. **Verify Success**: Run test to confirm it passes
6. **Move**: Optionally move to main corpus once fixed

## Current Issues

### 050 - Hash Autoquoting ✅
**Status**: Fixed
**Issue**: Barewords before `=>` should be treated as strings
**Example**: `foo => 1` now correctly parses as `"foo" => 1`
**Note**: Both bare `{}` and `+{}` syntax work for hash literals

### 051 - Optional Parentheses for Subroutines and Methods ✅
**Status**: Fixed
**Issue**: Empty parameter lists should be optional for sub and method declarations
**Example**: `sub foo { 10 }` now correctly parses the same as `sub foo () { 10 }`
**Note**: Parentheses are now optional for both `sub` and `method` declarations when there are no parameters

### 052 - Lexical Subroutines ✅
**Status**: Fixed
**Issue**: `my sub` and `our sub` declarations were not being parsed
**Example**: `my sub foo { 10 }` now correctly parses as a lexically-scoped subroutine
**Note**: Both `my sub` and `our sub` are now fully supported, with or without parameters

### 053 - Class Inheritance ✅
**Status**: Fixed
**Issue**: The `:isa()` syntax for class inheritance was not being parsed
**Example**: `class Dog :isa(Animal) {}` now correctly parses with parent class information
**Note**: Supports qualified parent class names like `My::Base::Class`

### 054 - Version Statements ✅
**Status**: Fixed
**Issue**: Version statements like `use v5.40;` were not being parsed correctly
**Example**: `use v5.40;` and `use 5.040;` now correctly parse as version requirements
**Note**: Supports both `v5.40` and `5.040` formats

### 055 - Package Blocks ✅
**Status**: Fixed
**Issue**: The `package Foo {}` block syntax was not supported, only `package Foo;` worked
**Example**: `package Foo { ... }` now correctly parses as a scoped package block
**Note**: Supports both simple and qualified package names like `My::Module`

## Adding New Issues

```bash
# Create test case
cat > corpus/bugs/051-your-issue.mpp << 'EOF'
# Issue: Description here
# Expected: What should happen

your code here
EOF

# Create expected AST
cat > corpus/bugs/051-your-issue.ast << 'EOF'
(expected AST here)
EOF

# Verify it fails
node bin/ast-dump.js corpus/bugs/051-your-issue.mpp
```

## Running Bug Tests

```bash
# Test a specific bug
npm test -- corpus/bugs/050-hash-autoquoting

# Test all bugs (will show failures)
npm test corpus/bugs/
```
