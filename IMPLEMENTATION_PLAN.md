# MPP Parser Feature Implementation Plan

## Overview
This document outlines the implementation plan for adding modern Perl features to the MPP Parser. Features are prioritized based on practical usage and implementation complexity.

## Phase 1: Essential Control Flow (High Priority)

### 1.1 Try/Catch/Finally Blocks
**Priority:** Critical - Modern error handling is fundamental
**Complexity:** Medium
**Files:** `corpus/missing/control-flow/071-try-catch.mpp`

#### Implementation Steps:
1. **Tokenizer Updates:**
   - Add `try`, `catch`, `finally` to keyword list in Tokenizer.js
   - Ensure proper tokenization as CONTROL tokens

2. **Lexer Updates:**
   - Add classification for new keywords in Lexer.js
   - Maintain existing control flow token handling

3. **Parser Updates:**
   - Add new statement types: `TryStatement`, `CatchClause`, `FinallyClause`
   - Implement parsing logic in `parseStatement()`:
     ```typescript
     case 'try':
       return this.parseTryStatement();
     ```
   - Handle optional catch and finally blocks
   - Support exception variable binding in catch

4. **AST Structure:**
   ```typescript
   interface TryStatement {
     type: 'Try';
     tryBlock: Statement[];
     catchClauses?: CatchClause[];
     finallyBlock?: Statement[];
   }

   interface CatchClause {
     type: 'Catch';
     param?: Variable;
     block: Statement[];
   }
   ```

5. **Test Cases:**
   - Basic try/catch
   - Try/catch/finally
   - Nested try blocks
   - Try with return values

### 1.2 Defer Blocks
**Priority:** High - Important for resource management
**Complexity:** Low
**Files:** `corpus/missing/advanced/072-defer-blocks.mpp`

#### Implementation Steps:
1. **Tokenizer Updates:**
   - Add `defer` keyword

2. **Parser Updates:**
   - Add `DeferStatement` type
   - Parse as special block statement
   - Track defer order for proper LIFO execution

3. **AST Structure:**
   ```typescript
   interface DeferStatement {
     type: 'Defer';
     block: Statement[];
   }
   ```

## Phase 2: Boolean and Builtin Support

### 2.1 Boolean Literals (true/false)
**Priority:** High - Fundamental for modern Perl
**Complexity:** Low
**Files:** `corpus/missing/builtins/073-builtin-functions.mpp`

#### Implementation Steps:
1. **Tokenizer Updates:**
   - Recognize `true` and `false` as special literals (not identifiers)
   - Create new token type: BOOLEAN

2. **Parser Updates:**
   - Handle BOOLEAN tokens in primary expressions
   - Create BooleanLiteral AST nodes

3. **AST Structure:**
   ```typescript
   interface BooleanLiteral {
     type: 'Boolean';
     value: boolean;
   }
   ```

### 2.2 Builtin Functions
**Priority:** Medium - Useful but not critical
**Complexity:** Medium

#### Implementation Steps:
1. **Parser Updates:**
   - Recognize `use builtin` statements
   - Handle builtin function calls: `is_bool()`, `weaken()`, `blessed()`, etc.
   - These can initially be parsed as regular function calls

## Phase 3: String Comparison Operators

### 3.1 String Comparison Operators
**Priority:** Medium - Common in Perl code
**Complexity:** Low
**Files:** `corpus/missing/operators/063-string-comparison.mpp`

#### Implementation Steps:
1. **Tokenizer Updates:**
   - Add string comparison operators: `eq`, `ne`, `lt`, `gt`, `le`, `ge`, `cmp`
   - Tokenize as OPERATOR tokens

2. **Lexer Updates:**
   - Classify as comparison operators

3. **Parser Updates:**
   - Add to binary operator precedence table
   - Handle in existing binary expression parsing

## Phase 4: Control Flow Extensions

### 4.1 Given/When Statements
**Priority:** Medium - Useful but can use if/elsif
**Complexity:** High
**Files:** `corpus/missing/control-flow/070-given-when.mpp`

#### Implementation Steps:
1. **Tokenizer Updates:**
   - Add keywords: `given`, `when`, `default`, `break`, `continue`

2. **Parser Updates:**
   - Add `GivenStatement`, `WhenClause`, `DefaultClause` types
   - Implement complex pattern matching logic
   - Handle implicit `$_` variable binding

3. **AST Structure:**
   ```typescript
   interface GivenStatement {
     type: 'Given';
     expr: Expression;
     whenClauses: WhenClause[];
     defaultClause?: DefaultClause;
   }
   ```

## Phase 5: Auto-increment/Decrement

### 5.1 ++ and -- Operators
**Priority:** Low-Medium
**Complexity:** Medium
**Files:** `corpus/missing/operators/062-increment-operators.mpp`

#### Implementation Steps:
1. **Tokenizer Updates:**
   - Handle `++` and `--` as single tokens
   - Distinguish from multiple `+` or `-` operators

2. **Parser Updates:**
   - Support both prefix and postfix forms
   - Add to unary operator handling
   - Create appropriate AST nodes

3. **AST Structure:**
   ```typescript
   interface UpdateExpression {
     type: 'UpdateOp';
     operator: '++' | '--';
     prefix: boolean;
     operand: Expression;
   }
   ```

## Implementation Strategy

### Order of Implementation:
1. **Week 1-2:** Boolean literals and string comparison operators (easiest wins)
2. **Week 3-4:** Try/catch/finally blocks (most valuable feature)
3. **Week 5:** Defer blocks
4. **Week 6-7:** Builtin functions
5. **Week 8-9:** Auto-increment/decrement
6. **Week 10-12:** Given/when statements (most complex)

### Testing Strategy:
1. Add tokenizer tests first for new keywords/operators
2. Add lexer classification tests
3. Add parser unit tests for each construct
4. Use existing corpus test files in `corpus/missing/`
5. Move files from `missing/` to `input/` as features are implemented

### Architecture Considerations:

#### Tokenizer Changes:
- Maintain backward compatibility
- Use lookahead for multi-character operators
- Consider context for keyword vs identifier disambiguation

#### Parser Changes:
- Extend existing statement parsing infrastructure
- Maintain clean separation between expression and statement parsing
- Use recursive descent for complex structures

#### AST Design:
- Keep consistent with existing AST node patterns
- Include all necessary information for code generation
- Design for extensibility

### Risk Mitigation:
1. **Feature Flags:** Consider adding feature flags to enable/disable experimental features
2. **Incremental Rollout:** Implement in small, testable chunks
3. **Backward Compatibility:** Ensure existing tests continue to pass
4. **Error Recovery:** Implement graceful error handling for partial implementations

## Success Metrics:
- All tests in `corpus/missing/` pass for implemented features
- No regression in existing 459 tests
- Clean AST output without Error nodes
- Performance remains acceptable (< 10% slowdown)

## Next Steps:
1. Review and approve implementation plan
2. Set up feature branch for development
3. Begin with Phase 1 or Phase 2 (depending on priorities)
4. Regular testing and code review cycles