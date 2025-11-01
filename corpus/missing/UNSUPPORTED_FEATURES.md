# Unsupported Perl Features in MPP Parser

This document lists Perl features that are not yet supported by the MPP Parser. Test files for these features are stored in the `corpus/missing/` directory for future implementation.

**Last Updated:** November 1, 2025

## Successfully Implemented Features

The following features have been successfully implemented and moved to `corpus/input/`:

- ✅ String comparison operators: `eq`, `ne`, `lt`, `gt`, `le`, `ge`, `cmp`
- ✅ Boolean literals: `true`, `false`
- ✅ Try/catch/finally exception handling
- ✅ Defer blocks for cleanup
- ✅ Given/when/default pattern matching
- ✅ Match/case expressions
- ✅ Auto-increment/decrement operators: `++`, `--`
- ✅ Regex literals: `/pattern/flags`
- ✅ Pattern matching operators: `=~`, `!~`
- ✅ 60+ builtin functions including:
  - Type checking: `ref`, `blessed`, `refaddr`, `reftype`, `is_bool`, `weaken`
  - String functions: `length`, `substr`, `index`, `rindex`, `sprintf`, `split`, `join`, `chomp`, `trim`, `lc`, `uc`
  - Array functions: `push`, `pop`, `shift`, `unshift`, `splice`, `reverse`, `sort`
  - Hash functions: `keys`, `values`, `each`, `exists`, `delete`
  - List functions: `grep`, `map`, `scalar`, `wantarray`
  - Math functions: `abs`, `sqrt`, `int`, `rand`, `sin`, `cos`, `exp`, `log`
  - I/O functions: `open`, `close`, `read`, `write`, `readline`
  - Time functions: `time`, `localtime`, `gmtime`, `sleep`
  - Process functions: `fork`, `wait`, `system`, `exec`, `exit`, `kill`

## Currently Unsupported Features

### 1. Regex Substitution and Translation
**Files:** `advanced/066-regex-operators.mpp`

#### Substitution Operator (`s///`)
```perl
$text =~ s/old/new/;
$text =~ s/\s+/ /g;
$html =~ s/<[^>]+>//g;
```

#### Translation Operator (`tr///`)
```perl
$text =~ tr/a-z/A-Z/;
$text =~ tr/0-9/X/;
```

**Note:** Basic pattern matching with `=~` and `!~` IS supported. Only substitution and translation are missing.

### 2. Eval Blocks and Error Variables
**Files:** `advanced/067-eval-blocks.mpp`

#### Eval Blocks
```perl
eval {
    dangerous_operation();
};
if ($@) {
    print "Error: $@";
}
```

#### Special Variables
- `$@` - Error message from eval or die

**Note:** Modern try/catch/finally IS supported as an alternative to eval blocks.

### 3. Bitwise NOT Operator
**Files:** `advanced/056-bitwise-operators.mpp`, `advanced/061-bitwise-not.mpp`

#### Bitwise NOT (`~`)
```perl
my $not = ~5;
my $mask = ~(1 << $n);
```

**Note:** All other bitwise operators (AND `&`, OR `|`, XOR `^`, shifts `<<` `>>`) ARE supported.

### 4. Control Flow Constructs

#### Continue Blocks
**Files:** `control-flow/064-continue-blocks.mpp`
```perl
while ($condition) {
    # main block
} continue {
    # always executed, even after next
}
```

#### C-style For Loops
**Files:** `control-flow/065-c-style-for.mpp`
```perl
for (my $i = 0; $i < 10; $i++) {
    process($i);
}
```

**Note:** Foreach loops and range-based iteration ARE supported.

### 5. Module Import Syntax
**Files:** `builtins/073-builtin-functions.mpp`

#### Use Builtin Statement
```perl
use builtin qw(true false is_bool weaken);
```

**Note:** The builtin functions themselves (is_bool, weaken, blessed, etc.) ARE already supported and can be called directly. Only the `use builtin` import statement is missing.

### 6. Modern Class Features (Corinna)
**Files:** `classes/075-class-features.mpp`

Advanced object-oriented features:
- Class version declarations: `:version(1.0)`
- Multiple inheritance: `:isa(Parent)`
- Role composition: `:does(Role)`
- Lifecycle methods: `BUILD`, `DEMOLISH`, `ADJUST`
- Class/static fields: `:common`
- Abstract classes: `:abstract`
- Required methods: `:required`
- Role definitions

**Note:** Basic class syntax with fields and methods IS already supported.

## Implementation Priority

Based on modern Perl usage patterns and implementation complexity:

### High Priority
1. **Substitution/Translation Operators** (`s///`, `tr///`)
   - Extremely common in text processing
   - Essential for many Perl scripts
   - Estimated effort: 6-8 hours

2. **C-style For Loops** (`for (init; test; increment)`)
   - Common pattern, especially for numeric iteration
   - Familiar to developers from other languages
   - Estimated effort: 3-4 hours

### Medium Priority
3. **`use builtin` Statement**
   - Needed for proper module compatibility
   - Estimated effort: 2-3 hours

4. **Continue Blocks**
   - Useful for cleanup logic in loops
   - Less common than other features
   - Estimated effort: 2-3 hours

5. **Modern Class Features** (Corinna)
   - Important for advanced OOP
   - Large feature set
   - Estimated effort: 10-15 hours

### Lower Priority
6. **Bitwise NOT Operator** (`~`)
   - Less frequently used
   - All other bitwise operators already work
   - Estimated effort: 1-2 hours

7. **Eval Blocks**
   - Legacy error handling
   - Modern try/catch already supported
   - Estimated effort: 4-6 hours (includes `$@` variable)

## Notes

- The parser currently supports most modern Perl syntax
- 505 tests passing across 71 corpus files
- Focus has shifted from basic syntax to advanced features
- Error recovery produces clean AST nodes for supported features
