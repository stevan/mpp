# Changelog

All notable changes to the MPP (Modern Perl Parser) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2025-01-XX

### Added - Modern OO Support (Sprint 6)
- **Class declarations**: `class Point { ... }` with namespace support (`class My::Class`)
- **Field declarations**: `field $x :param;` with attributes (`:param`, `:reader`, `:writer`)
- **Method definitions**: `method move($dx, $dy) { ... }` with automatic `$self` parameter
- **Has attribute syntax**: `has $radius :param :reader :writer;` (alternative to `field`)
- Complete modern Perl OO infrastructure (Perl 5.38+ syntax)

### Added - Test Coverage Improvements
- 16 new edge case tests covering empty blocks, nested access, and complex expressions
- 2 new `unless` statement tests (prefix form with and without `else`)
- Added tests for:
  - Empty if/while/foreach/method blocks
  - Deeply nested array/hash access
  - Mixed array and hash access chains
  - Single-element slices
  - Nested ternary expressions
  - Complex method call chains
  - Do blocks with multiple statements

### Improved
- **Test Coverage**: 93.77% line coverage, 100% function coverage (up from 92.20% / 98.44%)
- **Test Count**: 300 tests passing (up from 284, +16 new tests)
- **Parser Size**: ~2,900 lines (up from ~2,650 lines)
- **Documentation**: Comprehensive updates to README.md, FEATURE_PRIORITIES.md, and SESSION_PROMPT.md
- All documentation now reflects current Sprint 6 status and modern OO capabilities

### Developer Experience
- Updated project structure documentation
- Added modern OO code examples to README
- Created detailed class syntax usage examples
- Updated REPL examples with class definitions

### Technical Details
- Zero breaking changes to existing features
- Strict TypeScript compliance maintained (no `any` types)
- TDD approach throughout (tests written first)
- All 300 tests passing in ~100ms

## [0.1.0] - 2025-01-XX

### Initial Release - Core Parser Foundation

#### Features Included

**Sprints 1-5 (Sessions 1-14):**

##### Sprint 1: Essential Builtins (Session 10)
- `die` and `warn` statements
- `print` and `say` built-ins
- `do` blocks for scoped expressions
- `require` for module loading

##### Sprint 2: Loop Control (Session 11)
- `last`, `next`, `redo` statements
- Loop labels for nested loop control
- Works with all loop types (while, until, for, foreach)

##### Sprint 3: Special Variables (Session 12)
- `%ENV` environment variable hash
- `@ARGV` command-line arguments array
- `$_` default variable
- `qw//` quote-word operator with multiple delimiters

##### Sprint 4: Modern Dereferencing (Session 13)
- Postfix array dereference: `$aref->@*`
- Postfix hash dereference: `$href->%*`
- Postfix scalar dereference: `$sref->$*`
- Postfix deref slices: `$aref->@[0..4]`, `$href->@{qw(a b c)}`

##### Sprint 5: Package System (Session 14)
- Package declarations: `package My::Module;`
- Use statements: `use List::Util qw(max min);`
- Fully qualified names: `$Config::VERSION`, `My::Module::function()`

**Core Language Features (Sessions 1-9):**

- **Data Structures**:
  - Array literals: `[1, 2, 3]`
  - Hash literals: `+{ "key" => "value" }`
  - List literals: `(1, 2, 3)`
  - Nested structures supported
  - Anonymous array/hash constructors

- **Data Access**:
  - Array element access: `$array[0]`
  - Hash value access: `$hash{"key"}`
  - Array reference dereference: `$aref->[0]`
  - Hash reference dereference: `$href->{"key"}`
  - Chained access: `$data->[0]{"key"}[1]`
  - Array slices: `@array[0..4]`
  - Hash slices: `@hash{qw(a b c)}`

- **Control Flow**:
  - If/elsif/else chains
  - Unless (prefix & postfix forms)
  - While/until loops
  - Foreach loops with ranges
  - Postfix conditionals: `$x = 5 unless $error;`
  - Block statements

- **Functions**:
  - Function definitions with parameters
  - Anonymous subroutines
  - Default parameter values
  - Return statements
  - Recursive function calls
  - Method calls: `$obj->method()`
  - Method chaining: `$obj->foo()->bar()`

- **Operators**:
  - 21 precedence levels
  - Binary operators: arithmetic, comparison, logical
  - Unary operators: `!`, `-`, `+`
  - Ternary operator: `?:`
  - Range operator: `..`
  - Assignment operators: `=`, `+=`, `-=`, etc.
  - Fat comma: `=>`

- **Variables & Declarations**:
  - Scalar, array, hash variables with sigils
  - Variable declarations with `my`
  - List assignment: `my ($x, $y) = (1, 2);`
  - Multiple assignment forms

### Architecture

- **Streaming Parser**: Async generator-based pipeline
- **Three-Stage Design**:
  1. Tokenizer: Boundary detection and token emission
  2. Lexer: Semantic token classification
  3. Parser: Precedence climbing algorithm

- **Benefits**:
  - Backpressure support
  - REPL-friendly incremental parsing
  - Memory efficient (statement-by-statement processing)
  - Composable architecture
  - Type-safe (100% TypeScript, no `any` types)

### Testing

- **284 tests** in v0.1.0
- Test-driven development (TDD) throughout
- Unit tests, integration tests, and milestone tests
- High-level tests avoiding implementation details
- Strict TypeScript compilation

### Documentation

- Comprehensive README with examples
- FEATURE_PRIORITIES roadmap
- DEVELOPMENT_LOG with session summaries
- SESSION_PROMPT for development continuation
- Interactive REPL for exploration

### Design Decisions

**Simplifications from Perl 5:**
- No barewords (functions require parens, strings require quotes)
- `+{ }` syntax for hash literals (eliminates block ambiguity)
- No regex literals initially (deferred)
- `$_` as keyword (no symbol table needed)
- No heredocs
- Fixed delimiters
- No symbol table feedback required

**Deferred Features:**
- Regex literals and operations
- String interpolation
- Here-docs
- Advanced signatures (named params, slurpy)
- BEGIN/END blocks

**Explicitly Excluded:**
- Barewords
- Subroutine prototypes
- `bless`-based OO (using modern `class` instead)
- Typeglobs and symbolic refs
- Formats and `write`
- `tie` mechanism
- Most magic variables

---

## Version History

- **0.1.1** - Modern OO Support (Sprint 6) + Test Coverage Improvements
- **0.1.0** - Initial Release (Sprints 1-5 + Core Language Features)

## Statistics

### Version 0.1.1
- **Tests**: 300 passing
- **Coverage**: 93.77% lines, 100% functions
- **Parser**: ~2,900 lines
- **Features**: 6 complete sprints
- **Time**: 15 development sessions

### Version 0.1.0
- **Tests**: 284 passing
- **Coverage**: 92.20% lines, 98.44% functions
- **Parser**: ~2,650 lines
- **Features**: 5 complete sprints
- **Time**: 14 development sessions
