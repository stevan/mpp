# Session 10 Prompt - MPP Parser Development

## Quick Start

You are continuing development of the **MPP (Modern Perl Parser)** project. This is a TypeScript-based parser for a modern subset of Perl, built with strict TDD methodology.

**Current Status:**
- **193 tests passing** ✅
- **~1,850 lines of parser code**
- Last session: Implemented range expressions, bareword hash keys, list assignment, array slices, and hash slices
- Created comprehensive feature roadmap

## Critical Files to Read First

1. **FEATURE_PRIORITIES.md** ⭐ **READ THIS FIRST** ⭐
   - Replaces NEXT_STEPS.md
   - Comprehensive roadmap of 23 features to implement
   - Organized into 9 phases with time estimates
   - Shows what to defer and what to drop
   - **ALWAYS consult this before planning work**

2. **DEVELOPMENT_LOG.md** (Session 9 section at bottom)
   - Summary of what was built in Session 9
   - 5 features: ranges, bareword keys, list assignment, slices
   - Architecture insights and lessons learned

3. **README.md**
   - Project overview and capabilities
   - How to run tests: `npm test`
   - How to run REPL: `npm run repl`

## Recommended Next Steps

### Option 1: Sprint 1 - Essential Builtins (RECOMMENDED)

**Time:** 2-3 hours | **Value:** HIGH | **Complexity:** LOW

Implement core built-in functions:

1. **`die` and `warn` statements** (~10 lines)
   - Parse as built-in function calls (like return)
   - Example: `die "Error: $msg";`

2. **`print` and `say` statements** (~15 lines)
   - Parse as built-in function calls
   - Example: `print "Hello";`, `say $message;`

3. **`do` blocks** (~20 lines)
   - Return value from block
   - Example: `my $x = do { ... };`

4. **`require` builtin** (~15 lines)
   - Verify it works as function call (likely already works!)
   - Example: `require "Config.pm";`

**Why Sprint 1:**
- High practical value
- No architectural changes needed
- Enables error handling and output
- Quick wins build momentum

### Option 2: Sprint 2 - Loop Control

**Time:** 2-3 hours | **Value:** HIGH | **Complexity:** LOW

Implement loop control flow:

1. **`last`, `next`, `redo` statements** (~40 lines)
   - Add keywords to tokenizer
   - New AST nodes
   - Parse like `return`

2. **Labels for loops** (~60 lines)
   - `OUTER: while (...) { ... last OUTER; }`
   - Add label field to loop AST nodes

**Why Sprint 2:**
- Completes control flow
- Natural progression
- Commonly used in real code

## Development Workflow

### 1. Test-Driven Development (TDD)

**Always follow this pattern:**

```bash
# 1. Write tests first (tests/Parser.test.ts)
npm test  # Should fail

# 2. Implement feature (src/Parser.ts, src/AST.ts)
npm test  # Should pass

# 3. Verify all tests still pass
npm test  # 193+ tests passing
```

### 2. Architecture Guidelines

**Parser Structure:**
- **Tokenizer** (`src/Tokenizer.ts`) - Converts source to tokens
- **Lexer** (`src/Lexer.ts`) - Classifies tokens into categories
- **Parser** (`src/Parser.ts`) - Builds AST using precedence climbing
- **AST** (`src/AST.ts`) - Node type definitions

**Key Methods:**
- `parseStatement()` - Top-level statement dispatcher
- `parsePrimary()` - Literals, variables, atoms
- `precedenceClimb()` - Binary operators with precedence
- `parsePostfixOps()` - Array/hash access, method calls, slices

**Adding New Features:**
1. Define AST node in `src/AST.ts`
2. Add keyword to `src/Tokenizer.ts` if needed
3. Add parsing logic to appropriate method
4. Write comprehensive tests

### 3. Common Patterns

**Depth Tracking** (for nested structures):
```typescript
let depth = 0;
for (let i = 0; i < lexemes.length; i++) {
    if (lexemes[i].category === 'LPAREN') depth++;
    if (lexemes[i].category === 'RPAREN') depth--;
    // Process at depth 0
}
```

**Bareword Detection**:
```typescript
if (lexemes.length === 1 && lexemes[0].category === 'IDENTIFIER') {
    // It's a bareword
    const bareword: StringNode = {
        type: 'String',
        value: lexemes[0].token.value
    };
}
```

**Statement vs Expression**:
- Statements: if, while, foreach, sub, return, die, etc.
- Expressions: literals, variables, operators, function calls

## Project Structure

```
mpp/
├── src/
│   ├── Tokenizer.ts    (~330 lines) - Token generation
│   ├── Lexer.ts        (~120 lines) - Token classification
│   ├── Parser.ts       (~1,850 lines) - Main parser
│   └── AST.ts          (~157 lines) - AST node definitions
├── tests/
│   ├── Tokenizer.test.ts
│   ├── Lexer.test.ts
│   ├── Parser.test.ts  (193 tests!)
│   ├── DataStructures.test.ts
│   └── Examples.test.ts
├── bin/
│   └── repl.js         - Interactive REPL
├── FEATURE_PRIORITIES.md ⭐ - Implementation roadmap
├── DEVELOPMENT_LOG.md   - Session summaries
├── SESSION_PROMPT.md    - This file
└── README.md           - Project overview
```

## Quick Reference

### Running Tests
```bash
npm test                 # Run all tests
npm run build            # Compile TypeScript
npm run repl             # Interactive REPL
```

### Test Locations
- **Unit tests**: `tests/Parser.test.ts` (most tests here)
- **Integration**: `tests/Examples.test.ts` (complete programs)
- **Milestones**: `tests/DataStructures.test.ts` (feature groups)

### Adding a New Feature

**Example: Adding `die` statement**

1. **Define AST node** (src/AST.ts):
```typescript
export interface DieNode extends ASTNode {
    type: 'Die';
    message?: ASTNode;  // Optional error message
}
```

2. **Add to imports** (src/Parser.ts):
```typescript
import { ..., DieNode } from './AST.js';
```

3. **Add keyword** (src/Tokenizer.ts):
```typescript
private keywords = new Set([
    'if', 'elsif', 'else', ..., 'die'  // Add here
]);
```

4. **Parse it** (src/Parser.ts in parseStatement):
```typescript
if (lexemes[0].token.value === 'die') {
    return this.parseDieStatement(lexemes);
}

private parseDieStatement(lexemes: Lexeme[]): DieNode | null {
    // Parse optional message
    const messageLexemes = lexemes.slice(1);
    const message = messageLexemes.length > 0
        ? this.parseExpression(messageLexemes, 0)
        : undefined;

    return { type: 'Die', message };
}
```

5. **Write tests** (tests/Parser.test.ts):
```typescript
test('parses die with message', async () => {
    const stmts = await parse('die "Error";');
    assert.strictEqual(stmts[0].type, 'Die');
    // ... more assertions
});
```

## Current Capabilities

**The parser now handles:**

✅ **Control Flow**: if/elsif/else, unless, while/until, for/foreach, postfix conditionals
✅ **Functions**: Named subs, anonymous subs, parameters with defaults, return statements
✅ **Data Structures**: Arrays, hashes, lists, nested structures
✅ **Access**: Array/hash access, dereferencing, chained access
✅ **Slicing**: Array slices, hash slices
✅ **Operators**: 20 precedence levels, unary, binary, ternary, range
✅ **Methods**: Method calls, chaining, class methods
✅ **Assignment**: Simple, compound, list assignment, element mutation
✅ **Syntax**: Bareword hash keys, fat comma, blocks

**193 tests covering all features!**

## What's Deferred

**Not implementing yet** (see FEATURE_PRIORITIES.md for full list):
- Regex (m/.../, s///, tr///, =~, !~)
- String interpolation ("$var")
- Here-docs (<<EOF)

## What's Dropped

**Never implementing** (obsolete or too complex):
- Subroutine prototypes
- `bless` (using `class` instead)
- Typeglobs and symbolic refs
- Formats and `write`
- `tie` mechanism
- Most magic variables

## Session Goals

**Primary Goal:** Implement Sprint 1 (Essential Builtins)
- 4 features
- ~60 lines of code
- 2-3 hours
- High practical value

**Secondary Goal:** If time permits, start Sprint 2 (Loop Control)

**Documentation Goal:** Update DEVELOPMENT_LOG.md with session summary

## Getting Started Checklist

- [ ] Read FEATURE_PRIORITIES.md (especially Sprint 1 section)
- [ ] Run `npm test` to verify 193 tests pass
- [ ] Review Session 9 summary in DEVELOPMENT_LOG.md
- [ ] Choose Sprint 1 or Sprint 2 to implement
- [ ] Write tests first!
- [ ] Implement features
- [ ] Run all tests
- [ ] Update DEVELOPMENT_LOG.md

## Important Notes

⚠️ **Always use FEATURE_PRIORITIES.md** - It's the authoritative roadmap
⚠️ **TDD is mandatory** - Write tests before implementation
⚠️ **Keep tests passing** - All 193 tests must pass after changes
⚠️ **No `any` types** - Maintain 100% type safety
⚠️ **Document sessions** - Update DEVELOPMENT_LOG.md when done

## Ready to Start!

You have everything you need to begin:
- Clear roadmap (FEATURE_PRIORITIES.md)
- Proven architecture (193 passing tests)
- Comprehensive documentation (DEVELOPMENT_LOG.md)
- Strong foundation (~1,850 lines of parser code)

**Recommended first command:** Read FEATURE_PRIORITIES.md, then start Sprint 1!

Good luck! 🚀
