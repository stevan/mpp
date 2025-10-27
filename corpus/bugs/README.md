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
