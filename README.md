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

### ✅ Completed (Session 1)

**Tokenizer** (270 lines, 13 tests)
- [x] Number literals
- [x] String literals (single/double quoted with escapes)
- [x] Variables with sigils ($x, @array, %hash, &sub)
- [x] Special variable `$_`
- [x] Keywords (if, my, sub, return, etc.)
- [x] Identifiers (user-defined names)
- [x] Operators (single and multi-character)
- [x] Delimiters (parentheses, braces, brackets, semicolon, comma)
- [x] Line/column position tracking

**Lexer** (128 lines, 9 tests)
- [x] Literal classification
- [x] Variable classification by sigil type
- [x] Operator classification (binary, assignment, unary)
- [x] Keyword classification (declaration, control)
- [x] Delimiter preservation
- [x] Identifier classification

**Parser** (~300 lines, 10 tests)
- [x] AST node types (Number, String, Variable, BinaryOp, Declaration)
- [x] Precedence climbing algorithm
- [x] 20 operator precedence levels
- [x] Right-associative operators (**, =, +=, etc.)
- [x] Left-associative operators (+, -, *, ==, &&, etc.)
- [x] Parenthesized expressions
- [x] Multiple statements
- [x] Variable declarations with initializers
- [x] Statement-level emission (streams one AST per statement)

**Test Coverage**
- 32 tests total, all passing
- TDD approach throughout
- High-level tests (not overly specific)
- No `any` types used
- Strict TypeScript configuration

### ⏸️ Deferred for Later

**Not Yet Implemented:**
- [ ] Regex literals (`/pattern/`, `s/old/new/`, `qr//`)
- [ ] HEREDOCs (excluded from language design)
- [ ] Control structures (if/elsif/else, while, for)
- [ ] Function definitions (sub)
- [ ] Class definitions
- [ ] Ternary operator (?:)
- [ ] Postfix conditionals (`say "x" if $y`)
- [ ] Array/hash literals ([], +{})
- [ ] Function calls
- [ ] Method calls (->)
- [ ] Array/hash indexing
- [ ] Unary operators (!, -, not)
- [ ] Range operator (..)
- [ ] Comma operator (list building)

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
│   ├── Tokenizer.ts       # Boundary detection + token emission
│   ├── Lexer.ts           # Semantic classification
│   ├── Parser.ts          # Precedence climbing parser
│   └── AST.ts             # AST node type definitions
├── tests/
│   ├── Tokenizer.test.ts  # 13 tests
│   ├── Lexer.test.ts      # 9 tests
│   └── Parser.test.ts     # 10 tests
├── tsconfig.json          # Strict TypeScript config
├── package.json           # Dependencies and scripts
└── README.md              # This file
```

## Running Tests

```bash
npm install
npm test              # Build and run all tests
npm run build         # Compile TypeScript
```

## Operator Precedence Table

| Level | Operators | Associativity | Description |
|-------|-----------|---------------|-------------|
| 3 | `**` | RIGHT | Exponentiation |
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
| 17 | `=`, `+=`, `-=`, `*=`, `/=`, `%=`, `**=`, `.=`, `x=`, `||=`, `//=`, `&&=`, `&=`, `|=`, `^=`, `<<=`, `>>=` | RIGHT | Assignment |
| 18 | `,`, `=>` | LEFT | Comma, fat comma |
| 20 | `and` | LEFT | Low-precedence AND |
| 21 | `or`, `xor` | LEFT | Low-precedence OR, XOR |

## Example Usage

```typescript
import { Tokenizer } from './src/Tokenizer.js';
import { Lexer } from './src/Lexer.js';
import { Parser } from './src/Parser.js';

async function* sourceGen() {
    yield 'my $x = 2 + 3 * 4;';
}

const tokenizer = new Tokenizer();
const lexer = new Lexer();
const parser = new Parser();

const tokens = tokenizer.run(sourceGen());
const lexemes = lexer.run(tokens);

for await (const ast of parser.run(lexemes)) {
    console.log(JSON.stringify(ast, null, 2));
}
```

Output:
```json
{
  "type": "Declaration",
  "declarator": "my",
  "variable": {
    "type": "Variable",
    "name": "$x"
  },
  "initializer": {
    "type": "BinaryOp",
    "operator": "+",
    "left": {
      "type": "Number",
      "value": "2"
    },
    "right": {
      "type": "BinaryOp",
      "operator": "*",
      "left": {
        "type": "Number",
        "value": "3"
      },
      "right": {
        "type": "Number",
        "value": "4"
      }
    }
  }
}
```

Note the correct precedence: `2 + (3 * 4)`, not `(2 + 3) * 4`.

## Benefits of This Architecture

1. **Backpressure** - Slow AST consumers pause tokenizer automatically
2. **REPL-friendly** - Can detect incomplete input before parsing
3. **Memory efficient** - Process statement-by-statement, not whole files
4. **Composable** - Easy to add optimizer, type checker, etc.
5. **Testable** - Each stage is independent
6. **No ambiguity** - Design choices eliminate parser heuristics
7. **Type-safe** - No `any` types, full TypeScript strict mode

## Development Approach

- **TDD** - Write tests first, then implement
- **Incremental** - Build one feature at a time
- **High-level tests** - Avoid boxing into implementation details
- **Strict typing** - No `any` types, `exactOptionalPropertyTypes: true`
- **Async generators** - Streaming throughout the pipeline

## License

MIT
