# MPP - Modern Perl Parser

A parser framework for imperative statement-based programming languages, built using async generators for streaming, backpressure, and REPL-friendly parsing.

## Project Overview

MPP implements a **modernized Perl-like language** with:
- Sigils for variables (`$scalar`, `@array`, `%hash`)
- No barewords (eliminates ambiguity)
- Fixed regex delimiters (deferred for initial implementation)
- Explicit hash literal syntax (`+{ key => value }`)
- Clean operator precedence (21 levels)

## Architecture

```
Input Chunks → Tokenizer → Lexer → Parser → AST Stream
               (boundary   (semantic  (precedence
                detection)  classify)  climbing)
```

### Pipeline Stages

1. **Tokenizer** - Splits input into tokens at character boundaries
   - Handles strings (single/double quoted with escapes)
   - Recognizes variables by sigil ($, @, %, &)
   - Detects operators (single and multi-character)
   - Tracks line/column positions
   - Special handling for `$_` keyword

2. **Lexer** - Classifies tokens into semantic categories
   - `LITERAL` - Numbers and strings
   - `SCALAR_VAR`, `ARRAY_VAR`, `HASH_VAR` - Variables by sigil
   - `BINOP`, `ASSIGNOP`, `UNOP` - Operators by purpose
   - `DECLARATION`, `CONTROL` - Keywords by function
   - Delimiters preserved (LPAREN, RBRACE, TERMINATOR, etc.)

3. **Parser** - Builds AST using precedence climbing
   - Buffers lexemes until statement terminator (`;`)
   - Implements 20 operator precedence levels
   - Handles right-associative operators (**, =)
   - Handles left-associative operators (+, -, *, etc.)
   - Supports parenthesized expressions
   - Parses variable declarations (`my $x = 10;`)

## Implementation Status

### ✅ Session 1: Foundation
**Tokenizer** (270 lines)
- [x] Number & string literals
- [x] Variables with sigils
- [x] Multi-character operators
- [x] Position tracking

**Lexer** (128 lines)
- [x] Semantic classification
- [x] Operator categorization

**Parser** (~300 lines)
- [x] Precedence climbing (20 levels)
- [x] Basic expressions & declarations

### ✅ Session 2: Control Flow
- [x] If/elsif/else chains
- [x] Unless (prefix & postfix)
- [x] While/until loops
- [x] Foreach loops with ranges
- [x] Postfix conditionals
- [x] Block statements

### ✅ Session 3: Functions
- [x] Function definitions with parameters
- [x] Anonymous subs
- [x] Default parameter values
- [x] Function calls with arguments
- [x] Return statements
- [x] Recursive function calls

### ✅ Session 4: Data Structures
- [x] Array literals `[1, 2, 3]`
- [x] Hash literals `+{ "key" => "value" }`
- [x] List literals `(1, 2, 3)`
- [x] Nested data structures
- [x] Fat comma operator `=>`
- [x] Comma disambiguation (list vs parens)

### ✅ Session 5: Data Structure Access
- [x] Array element access `$array[0]`
- [x] Hash value access `$hash{"key"}`
- [x] Array reference dereference `$aref->[0]`
- [x] Hash reference dereference `$href->{"key"}`
- [x] Chained access `$data->[0]{"key"}[1]`
- [x] Access in expressions `$array[0] + $array[1]`

**Test Coverage**
- **122 tests total**, all passing
- 90 unit tests (Parser.test.ts)
- 16 milestone tests (DataStructures.test.ts)
- 5 integration tests (Examples.test.ts)
- 9 lexer tests, 13 tokenizer tests
- TDD approach throughout
- No `any` types, strict TypeScript

### ⏸️ Deferred for Later

**Not Yet Implemented:**
- [ ] Method calls (`$obj->method()`)
- [ ] Unary operators (`!`, `-`, `not`)
- [ ] Ternary operator (`?:`)
- [ ] Range operator (`..`) as expression
- [ ] Regex literals (`/pattern/`, `s/old/new/`)
- [ ] Class definitions
- [ ] HEREDOCs (excluded from language design)

## Design Decisions

### Simplified from Perl 5

1. **No barewords** - Functions require parentheses, strings require quotes
2. **`+{ }` for hash literals** - Eliminates block vs hash ambiguity
3. **No regex literals initially** - Use function-based regex API instead
4. **`$_` is a keyword** - No symbol table feedback needed
5. **No HEREDOCs** - Simplifies tokenizer state machine
6. **Fixed `/` delimiters for regex** - When added later
7. **No symbol table feedback** - Sigils + keywords = syntax-directed parsing

### Why This Works

The language design eliminates the hardest Perl 5 parsing problems:
- **Sigils identify variable types syntactically** (no context needed)
- **No barewords** (no ambiguity between functions and strings)
- **No function prototypes** (no parse-time behavior changes)
- **Explicit hash literals** (no heuristics needed)

Result: **Pure forward-streaming parser, no feedback loops required!**

## Project Structure

```
mpp/
├── src/
│   ├── Tokenizer.ts          # Boundary detection + token emission
│   ├── Lexer.ts              # Semantic classification
│   ├── Parser.ts             # Precedence climbing parser (~700 lines)
│   └── AST.ts                # AST node type definitions
├── tests/
│   ├── Tokenizer.test.ts     # 13 unit tests
│   ├── Lexer.test.ts         # 9 unit tests
│   ├── Parser.test.ts        # 74 unit tests
│   ├── Examples.test.ts      # 5 integration tests
│   └── DataStructures.test.ts # 16 milestone tests
├── tsconfig.json             # Strict TypeScript config
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## Running Tests

```bash
npm install
npm test              # Build and run all tests
npm run build         # Compile TypeScript
npm run repl          # Start interactive REPL
```

## Interactive REPL

Explore the parser interactively with the built-in REPL:

```bash
npm run repl
```

Example session:
```
MPP AST Explorer
Type Perl code to see its AST. Type .exit or .quit to quit.

mpp> my $x = 10;
{
  "type": "Declaration",
  "declarator": "my",
  "variable": {
    "type": "Variable",
    "name": "$x"
  },
  "initializer": {
    "type": "Number",
    "value": "10"
  }
}

mpp> $x > 5 ? "big" : "small";
{
  "type": "Ternary",
  "condition": { ... },
  "trueExpr": { ... },
  "falseExpr": { ... }
}

mpp> .exit
Goodbye!
```

Commands:
- `.help` - Show help
- `.exit` / `.quit` - Exit the REPL

## Operator Precedence Table

| Level | Operators | Associativity | Description |
|-------|-----------|---------------|-------------|
| 3 | `**` | RIGHT | Exponentiation |
| 4 | `!`, `-`, `+` (unary) | RIGHT | Unary negation, logical not |
| 6 | `*`, `/`, `%`, `x` | LEFT | Multiplicative |
| 7 | `+`, `-`, `.` | LEFT | Additive, concatenation |
| 8 | `<<`, `>>` | LEFT | Bit shift |
| 9 | `<`, `>`, `<=`, `>=`, `lt`, `gt`, `le`, `ge` | LEFT | Comparison |
| 10 | `==`, `!=`, `<=>`, `eq`, `ne`, `cmp` | LEFT | Equality |
| 11 | `&` | LEFT | Bitwise AND |
| 12 | `|`, `^` | LEFT | Bitwise OR, XOR |
| 13 | `&&` | LEFT | Logical AND |
| 14 | `||`, `//` | LEFT | Logical OR, defined-or |
| 15 | `..` | NONE | Range |
| 16 | `?:` | RIGHT | Ternary conditional |
| 17 | `=`, `+=`, `-=`, `*=`, `/=`, `%=`, `**=`, `.=`, `x=`, `||=`, `//=`, `&&=`, `&=`, `|=`, `^=`, `<<=`, `>>=` | RIGHT | Assignment |
| 18 | `,`, `=>` | LEFT | Comma, fat comma |
| 20 | `and` | LEFT | Low-precedence AND |
| 21 | `or`, `xor` | LEFT | Low-precedence OR, XOR |

## Example Usage

```perl
# Complete program with data structures and access
my $users = [
    +{ "name" => "Alice", "age" => 30, "scores" => [95, 87, 92] },
    +{ "name" => "Bob", "age" => 25, "scores" => [88, 91, 85] }
];

sub average_score($person) {
    my $scores = $person->{"scores"};
    my $sum = $scores->[0] + $scores->[1] + $scores->[2];
    return $sum / 3;
}

my $first_user = $users->[0];
my $name = $first_user->{"name"};
my $avg = average_score($first_user);

print($name);
print($avg);
```

The parser can handle:
- ✅ Array literals: `[1, 2, 3]`
- ✅ Hash literals: `+{ "key" => "value" }`
- ✅ Nested structures: `[1, +{ "x" => [2, 3] }]`
- ✅ Array/hash access: `$array[0]`, `$hash{"key"}`
- ✅ Dereferencing: `$aref->[0]`, `$href->{"key"}`
- ✅ Chained access: `$data->[0]{"key"}[1]`
- ✅ Functions with parameters and recursion
- ✅ Complete control flow (for, if, while, unless)

## Benefits of This Architecture

1. **Backpressure** - Slow AST consumers pause tokenizer automatically
2. **REPL-friendly** - Can detect incomplete input before parsing
3. **Memory efficient** - Process statement-by-statement, not whole files
4. **Composable** - Easy to add optimizer, type checker, etc.
5. **Testable** - Each stage is independent
6. **No ambiguity** - Design choices eliminate parser heuristics
7. **Type-safe** - No `any` types, full TypeScript strict mode

## Development Approach

### Testing Strategy
- **TDD** - Write tests first, then implement
- **Incremental** - Build one feature at a time
- **High-level tests** - Avoid boxing into implementation details
- **Strict typing** - No `any` types, `exactOptionalPropertyTypes: true`
- **Async generators** - Streaming throughout the pipeline

### Milestone Testing Pattern
After completing each major milestone, create a dedicated test file:
- `Examples.test.ts` - Integration tests for complete programs
- `DataStructures.test.ts` - Comprehensive data structure usage
- Future: `Methods.test.ts`, `Classes.test.ts`, etc.

These milestone tests:
1. Demonstrate realistic usage of the complete feature
2. Serve as regression tests for complex interactions
3. Act as documentation for what the parser can handle
4. Test nested and combined features working together

## License

MIT
