# MPP Feature Priorities

**Status:** 247 tests passing | ~2,550 lines of parser code
**Last Updated:** Session 13
**Note:** This file replaces NEXT_STEPS.md - always consult this for implementation priorities

---

## Implementation Philosophy

1. **Focus on modern Perl syntax** - Use `class` instead of `bless`, signatures instead of `@_`
2. **Defer complex features** - Regex, string interpolation postponed until needed
3. **Drop obsolete features** - No typeglobs, formats, prototypes, or magic variables
4. **Prioritize practical value** - Build features that enable real programs

---

## 🟢 PHASE 1: Core Builtins (2-3 hours, ~60 lines)

**Status:** ✅ COMPLETE (Session 10)
**Priority:** HIGH - Essential for basic programs

### 1. `die` and `warn` statements (10 lines)
- Built-in error/warning functions
- Parse as function calls (like `return`)
- Example: `die "Error: $msg";`, `warn "Deprecated";`

### 2. `print` and `say` statements (15 lines)
- Output functions
- Parse as function calls
- Example: `print "Hello";`, `say $message;`

### 3. `do` blocks (20 lines)
- Return value from block
- Like bare blocks but returns last expression
- Example: `my $x = do { ... };`

### 4. `require` builtin (15 lines)
- Module loading (already works as function call!)
- Just verify and document
- Example: `require "Config.pm";`

---

## 🟡 PHASE 2: Loop Control (2-3 hours, ~100 lines)

**Status:** Not started
**Priority:** HIGH - Complete control flow

### 5. Loop control: `last`, `next`, `redo` (40 lines)
- Add keywords to tokenizer
- New AST nodes: `LastNode`, `NextNode`, `RedoNode`
- Parse like `return`
- Example: `last;`, `next if $skip;`, `redo;`

### 6. Loop control with labels (60 lines)
- Extends above with label support
- Parse `LABEL: while (...) { ... last LABEL; }`
- Add label field to loop AST nodes
- Example: `OUTER: for (...) { INNER: for (...) { last OUTER; } }`

---

## 🟢 PHASE 3: Special Variables (1-2 hours, ~40 lines)

**Status:** ✅ COMPLETE (Session 12)
**Priority:** HIGH - Practical programming features

### 7. Special variables: `%ENV`, `@ARGV` ✅
- Work automatically - no special handling needed!
- Parse like regular hash/array variables
- Example: `$ENV{PATH}`, `for my $arg (@ARGV) { ... }`

### 8. `$_` default variable ✅
- Works automatically with existing tokenizer
- Special tokenization for `$_` already present
- Example: `for (@array) { print $_; }`

---

## 🟢 PHASE 4: Quote Operators (1-2 hours, ~75 lines)

**Status:** ✅ COMPLETE (Session 12) - qw// implemented
**Priority:** MEDIUM - Convenient syntax

### 9. `qw//` quote-word operator ✅ (66 lines actual)
- Tokenizer: recognize `qw/.../` with various delimiters
- Split on whitespace, return list of barewords
- Supports paired delimiters: `()`, `[]`, `{}`, `<>`
- Supports non-paired: `/`, `|`, `!`, etc.
- Example: `qw(foo bar baz)` → `('foo', 'bar', 'baz')`

### 10. Fat comma auto-quoting (25 lines) - DEFERRED
- `foo => bar` auto-quotes left side if bareword
- May already work - needs testing
- Lower priority - defer to later session

---

## 🟢 PHASE 5: References & Dereferencing (3-4 hours, ~200 lines)

**Status:** ✅ COMPLETE (Session 13)
**Priority:** MEDIUM - Modern Perl syntax

### 11. Anonymous constructors: `[]` and `{}` ✅ (already worked!)
- Empty `[]` creates array reference
- Empty `{}` creates hash reference (with `+` prefix)
- Works in expression context
- Example: `my $aref = [];`, `my $href = +{};`
- Example: `my $data = { items => [] };`

### 12. Postfix dereference: `->@*`, `->%*`, `->$*` ✅ (~35 lines actual)
- Tokenizer: added POSTFIX_DEREF_SIGIL token type
- Lexer: classify postfix deref sigils
- Parser: parsePostfixOperators handles ->@*, ->%*, ->$*
- New AST node: `PostfixDerefNode`
- Example: `$aref->@*`, `$href->%*`, `$sref->$*`

### 13. Postfix deref slice: `->@[...]`, `->@{...}` ✅ (~120 lines actual)
- Combines postfix deref with slicing
- Parse after postfix dereference in parsePostfixOperators
- New AST node: `PostfixDerefSliceNode`
- Handles lists and ranges
- Example: `$aref->@[0..4]`, `$href->@{qw(a b c)}`

---

## 🔴 PHASE 6: Packages & Namespaces (4-5 hours, ~250 lines)

**Status:** Not started
**Priority:** MEDIUM - Module system foundation

### 14. Package declarations (80 lines)
- Add `package` keyword to tokenizer
- New AST node: `PackageNode { name: string }`
- Parse `package Name;` and `package Name { ... }`
- Example: `package MyModule;`, `package Foo::Bar;`

### 15. Fully qualified names (100 lines)
- Parse `Package::Name::function` as identifiers with `::`
- Parse `$Package::Variable`, `@Package::Array`, `%Package::Hash`
- Tokenizer: handle `::` in identifiers and variables
- Example: `My::Module::function()`, `$Config::VERSION`

### 16. `use` statements (70 lines)
- Add `use` keyword to tokenizer
- New AST node: `UseNode { module: string, imports?: ASTNode }`
- Parse `use Module;` and `use Module qw(...);`
- Return UseNode for compiler/interpreter to handle
- Example: `use strict;`, `use List::Util qw(max min);`

---

## 🔴 PHASE 7: Modern OO (5-6 hours, ~300 lines)

**Status:** Not started
**Priority:** LOW-MEDIUM - Class syntax instead of bless

### 17. `class` keyword (120 lines)
- Add `class` keyword to tokenizer
- New AST node: `ClassNode { name: string, body: ASTNode[] }`
- Parse `class Name { ... }` blocks
- Example: `class Point { ... }`, `class Point::3D { ... }`

### 18. Field declarations in classes (80 lines)
- Add `field` keyword to tokenizer
- New AST node: `FieldNode { variable: VariableNode, attributes?: string[] }`
- Parse `field $x;` and `field $x :param;`
- Example: `field $x :param;`, `field @items;`

### 19. Method modifier: `method` (50 lines)
- Add `method` keyword as alternative to `sub` in classes
- Automatically adds `$self` as first parameter
- Extends SubNode or new MethodNode
- Example: `method move($dx, $dy) { ... }`

### 20. `has` attribute syntax (50 lines)
- Add `has` keyword (alternative/supplement to `field`)
- Parse attribute modifiers (`:reader`, `:writer`, `:param`)
- Example: `has $x :reader :writer;`

---

## 🔴 PHASE 8: Subroutine Features (2-3 hours, ~150 lines)

**Status:** Not started
**Priority:** LOW - We have basic signatures already

### 21. Enhanced signatures (80 lines)
- Named parameters: `sub foo(:$name, :$age) { ... }`
- Slurpy parameters: `sub foo($first, @rest) { ... }`
- Hash slurpy: `sub foo($x, %opts) { ... }`
- Extend existing signature parsing
- Example: `sub configure(:$host, :$port = 80) { ... }`

### 22. Subroutine attributes (70 lines)
- Add attribute parsing after sub name/signature
- New field in SubNode: `attributes: string[]`
- Common attributes: `:lvalue`, `:method`
- Example: `sub get_value :lvalue { ... }`

---

## 🟢 PHASE 9: BEGIN/END (1-2 hours, ~90 lines)

**Status:** Not started
**Priority:** MEDIUM - Initialization and cleanup

### 23. `BEGIN` and `END` blocks (90 lines)
- Add `BEGIN` and `END` keywords to tokenizer
- New AST nodes: `BeginNode { block: ASTNode[] }`, `EndNode { block: ASTNode[] }`
- Parse like special blocks
- Example: `BEGIN { use strict; }`, `END { close_resources(); }`

---

## ⏸️ DEFERRED (Future consideration)

**These features are postponed until needed:**

### String Interpolation (250 lines)
- `"$var and ${expr}"` syntax
- Foundation for regex interpolation
- Significant tokenizer state machine complexity
- **Defer until regex support required**

### Simple Regex Literals (100 lines)
- `m/.../`, `qr/.../` without interpolation
- Just literal patterns
- **Defer for now**

### Pattern Match Operators (80 lines)
- `=~`, `!~` operators
- Requires regex literals
- **Defer for now**

### Full Regex with Interpolation (200 lines)
- Modifiers: `/i`, `/g`, `/m`, `/s`, `/x`
- Variable interpolation in patterns
- Requires string interpolation
- **Defer for now**

### Substitution Operator (180 lines)
- `s/pattern/replacement/mods`
- Handle modifiers (`g`, `i`, `e`, etc.)
- **Defer for now**

### Transliteration (150 lines)
- `tr/from/to/mods` or `y/from/to/mods`
- Character-by-character replacement
- **Defer for now**

### Here-docs (120 lines)
- `<<EOF` multiline string syntax
- Complex tokenizer state management
- **Defer - use string concatenation instead**

---

## ❌ DROPPED (Won't implement)

**These features are excluded from scope:**

### `@_` variable
- **Reason:** Not needed with function signatures
- Modern Perl uses signatures instead

### Subroutine Prototypes
- `sub max ($$) { ... }` syntax
- **Reason:** Old-style, discouraged in modern Perl
- Signatures are the replacement

### `bless` and Ref-based OO
- `bless {}, $class;` syntax
- **Reason:** Using `class` keyword instead
- Modern OO syntax is cleaner

### Typeglobs & Symbolic Refs
- `*foo{THING}` syntax
- **Reason:** Too complex, rarely used in modern code
- Edge cases and obscure semantics

### Formats and `write`
- Ancient report formatting system
- **Reason:** Obsolete, never used in modern Perl

### `tie` Mechanism
- Variable magic and tied interfaces
- **Reason:** Runtime magic, out of parser scope

### Overloading
- Operator overloading via `use overload`
- **Reason:** Runtime feature, not parser-level

### Magic Variables (beyond %ENV, @ARGV, $_)
- `$!`, `$@`, `$?`, `$$`, etc.
- **Reason:** Too many special cases, runtime semantics

---

## 📊 Summary Statistics

| Category | Features | Est. Hours | Est. Lines |
|----------|----------|------------|------------|
| **Phase 1: Core Builtins** | 4 | 2-3 | ~60 |
| **Phase 2: Loop Control** | 2 | 2-3 | ~100 |
| **Phase 3: Special Variables** | 2 | 1-2 | ~40 |
| **Phase 4: Quote Operators** | 2 | 1-2 | ~75 |
| **Phase 5: References** | 3 | 3-4 | ~200 |
| **Phase 6: Packages** | 3 | 4-5 | ~250 |
| **Phase 7: Modern OO** | 4 | 5-6 | ~300 |
| **Phase 8: Sub Features** | 2 | 2-3 | ~150 |
| **Phase 9: BEGIN/END** | 1 | 1-2 | ~90 |
| **Total to Implement** | **23** | **22-30** | **~1,265** |
| **Deferred** | 7 | - | ~1,080 if done later |
| **Dropped** | 8 | - | N/A |

---

## 🎯 Recommended Implementation Order

### Sprint 1: Essential Builtins (2-3 hours)
- die, warn, print, say, do
- require (verify it works)

**ROI:** Immediate utility, enables error handling and output

---

### Sprint 2: Loop Control (2-3 hours)
- last, next, redo
- Labels for loops

**ROI:** Complete control flow, enables complex loop logic

---

### Sprint 3: Variables & Utilities (2-3 hours)
- %ENV, @ARGV, $_
- qw// operator
- Fat comma auto-quoting

**ROI:** Practical programming features, environment access

---

### Sprint 4: Modern Dereferencing (3-4 hours)
- Anonymous constructors [], {}
- Postfix deref ->@*, ->%*, ->$*
- Postfix deref slices

**ROI:** Clean modern syntax, better than old-style dereferencing

---

### Sprint 5: Package System (4-5 hours)
- package declarations
- Fully qualified names
- use statements

**ROI:** Module organization and code structure

---

### Sprint 6: Class Syntax (5-6 hours)
- class keyword
- field declarations
- method modifier
- has attributes

**ROI:** Modern OO support, replaces bless-based OO

---

### Sprint 7: Advanced Subs (2-3 hours)
- Enhanced signatures (named params, slurpy)
- Subroutine attributes

**ROI:** Complete function features

---

### Sprint 8: Special Blocks (1-2 hours)
- BEGIN/END blocks

**ROI:** Initialization and cleanup hooks

---

## 🚀 Quick Start Recommendation

**Start with Sprints 1-3** (6-9 hours total, ~175 lines)
- High value, low complexity
- No architectural changes
- 11 practical features
- Great test coverage

After completing these, you'll have:
- ✅ Complete control flow
- ✅ All essential builtins
- ✅ Special variables for real programs
- ✅ Convenient syntax (qw//, fat comma)

---

## Current Status (Session 13)

**Completed Sprints:**
- ✅ Sprint 1: Essential Builtins (Session 10) - die, warn, print, say, do, require
- ✅ Sprint 2: Loop Control (Session 11) - last, next, redo, loop labels
- ✅ Sprint 3: Special Variables (Session 12) - %ENV, @ARGV, $_, qw//
- ✅ Sprint 4: Modern Dereferencing (Session 13) - ->@*, ->%*, ->$*, ->@[...], ->@{...}

**Test Count:** 247 passing
**Parser Size:** ~2,550 lines
**Next Session:** Start Sprint 5 (Package System) or Sprint 6 (Class Syntax)
