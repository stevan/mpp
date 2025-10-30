import { Lexeme, LexemeCategory } from './Lexer.js';
import * as Lang from './LanguageSpec.js';
import { ParseError, ErrorRecovery, ErrorContext } from './ErrorSystem.js';
import {
    DepthTracker,
    DelimiterMatcher,
    TokenChecker,
    splitByCommas,
    findCommasAtDepthZero
} from './ParserUtils.js';
import { CommonParsers } from './CommonParsers.js';
import {
    ASTNode,
    ErrorNode,
    NumberNode,
    StringNode,
    BooleanNode,
    VariableNode,
    BinaryOpNode,
    UnaryOpNode,
    PrefixOpNode,
    PostfixOpNode,
    TernaryNode,
    DeclarationNode,
    IfNode,
    UnlessNode,
    ElseIfClause,
    WhileNode,
    UntilNode,
    ForeachNode,
    BlockNode,
    DoBlockNode,
    DeferNode,
    TryNode,
    CatchClause,
    ThrowNode,
    CallNode,
    ReturnNode,
    LastNode,
    NextNode,
    RedoNode,
    BreakNode,
    ContinueNode,
    GivenNode,
    WhenClause,
    DieNode,
    WarnNode,
    PrintNode,
    SayNode,
    SubNode,
    ParameterNode,
    ArrayLiteralNode,
    HashLiteralNode,
    ListNode,
    ArrayAccessNode,
    ArraySliceNode,
    HashAccessNode,
    HashSliceNode,
    MethodCallNode,
    AssignmentNode,
    PostfixDerefNode,
    PostfixDerefSliceNode,
    PackageNode,
    UseNode,
    ClassNode,
    FieldNode,
    MethodNode
} from './AST.js';

export class Parser {
    private precedenceTable: Map<string, Lang.OperatorInfo>;

    constructor() {
        this.precedenceTable = new Map(Object.entries(Lang.OPERATOR_PRECEDENCE));
    }

    async *run(lexemes: AsyncGenerator<Lexeme>): AsyncGenerator<ASTNode> {
        let buffer: Lexeme[] = [];
        let braceDepth = 0;
        let pendingControlStructure = false;

        for await (const lexeme of lexemes) {
            // Check if we're expecting elsif/else continuation
            if (pendingControlStructure) {
                if (lexeme.category === 'CONTROL') {
                    const keyword = lexeme.token.value;
                    // Check for valid continuations
                    const firstKeyword = buffer[0].token.value;

                    // Check if this is a valid continuation for the current structure
                    let isValidContinuation = false;
                    let keepPending = false;

                    if (firstKeyword === 'if' && (keyword === 'elsif' || keyword === 'else')) {
                        isValidContinuation = true;
                    } else if (firstKeyword === 'unless' && keyword === 'else') {
                        isValidContinuation = true;
                    } else if (firstKeyword === 'try') {
                        // After try, we can have catch or finally
                        if (keyword === 'catch' || keyword === 'finally') {
                            isValidContinuation = true;
                            // Don't keep pending - we need to accumulate the catch/finally block
                            keepPending = false;
                        }
                    } else if (firstKeyword === 'given') {
                        // After given, we can have when or default
                        if (keyword === 'when' || keyword === 'default') {
                            isValidContinuation = true;
                            // Keep pending after when to check for more when blocks or default
                            if (keyword === 'when') {
                                keepPending = true;
                            }
                        }
                    }

                    // Check if buffer contains catch blocks and we're getting another catch or finally
                    let hasCatch = false;
                    for (const lex of buffer) {
                        if (lex.category === 'CONTROL' && lex.token.value === 'catch') {
                            hasCatch = true;
                            break;
                        }
                    }

                    if (hasCatch && firstKeyword === 'try' && (keyword === 'catch' || keyword === 'finally')) {
                        isValidContinuation = true;
                        // Don't keep pending - we need to accumulate the catch/finally block
                        keepPending = false;
                    }

                    // Check if buffer contains when blocks and we're getting another when or default
                    let hasWhen = false;
                    for (const lex of buffer) {
                        if (lex.category === 'CONTROL' && lex.token.value === 'when') {
                            hasWhen = true;
                            break;
                        }
                    }

                    if (hasWhen && firstKeyword === 'given' && (keyword === 'when' || keyword === 'default')) {
                        isValidContinuation = true;
                        if (keyword === 'when') {
                            keepPending = true;
                        }
                    }

                    if (isValidContinuation) {
                        // Continue building the control structure
                        buffer.push(lexeme);
                        pendingControlStructure = keepPending;
                        continue;
                    }
                }

                // Not a valid continuation, so parse the pending control structure
                const ast = this.parseStatement(buffer);
                if (ast) {
                    yield ast;
                }
                buffer = [];
                pendingControlStructure = false;
                // Fall through to process current lexeme normally
            }

            // Track brace depth
            if (lexeme.category === 'LBRACE') {
                braceDepth++;
                buffer.push(lexeme);
                continue;
            }
            if (lexeme.category === 'RBRACE') {
                braceDepth--;
                buffer.push(lexeme);

                // If we're back to depth 0, handle based on what type of statement this is
                if (braceDepth === 0 && buffer.length > 0) {
                    if (buffer[0].category === 'CONTROL') {
                        // Control structure - mark as pending to check for elsif/else/catch/finally
                        // But for try blocks, we need special handling
                        const firstKeyword = buffer[0].token.value;
                        pendingControlStructure = true;
                    } else if (buffer[0].category === 'LBRACE') {
                        // Bare block - parse immediately
                        const ast = this.parseStatement(buffer);
                        if (ast) {
                            yield ast;
                        }
                        buffer = [];
                    } else if (buffer[0].category === 'DECLARATION' && TokenChecker.isDeclarationKeyword(buffer[0], 'sub')) {
                        // Sub definition - parse immediately
                        const ast = this.parseStatement(buffer);
                        if (ast) {
                            yield ast;
                        }
                        buffer = [];
                    } else if (buffer.length > 1 &&
                               buffer[0].category === 'DECLARATION' &&
                               (TokenChecker.isDeclarationKeyword(buffer[0], 'my') || TokenChecker.isDeclarationKeyword(buffer[0], 'our')) &&
                               buffer[1].category === 'DECLARATION' &&
                               TokenChecker.isDeclarationKeyword(buffer[1], 'sub')) {
                        // Lexical sub definition (my sub, our sub) - parse immediately
                        const ast = this.parseStatement(buffer);
                        if (ast) {
                            yield ast;
                        }
                        buffer = [];
                    } else if (buffer[0].category === 'DECLARATION' && TokenChecker.isDeclarationKeyword(buffer[0], 'class')) {
                        // Class definition - parse immediately
                        const ast = this.parseStatement(buffer);
                        if (ast) {
                            yield ast;
                        }
                        buffer = [];
                    } else if (buffer[0].category === 'KEYWORD' && TokenChecker.isKeyword(buffer[0], 'package')) {
                        // Package block - parse immediately
                        const ast = this.parseStatement(buffer);
                        if (ast) {
                            yield ast;
                        }
                        buffer = [];
                    }
                }
                continue;
            }

            // Accumulate lexemes until we hit a statement terminator at depth 0
            if (lexeme.category === 'TERMINATOR') {
                if (braceDepth === 0) {
                    if (buffer.length > 0) {
                        const ast = this.parseStatement(buffer);
                        if (ast) {
                            yield ast;
                        }
                        buffer = [];
                    }
                } else {
                    // Inside braces, include the terminator in the buffer
                    buffer.push(lexeme);
                }
                continue;
            }

            buffer.push(lexeme);
        }

        // Handle any remaining buffered lexemes (incomplete statement)
        if (buffer.length > 0) {
            const ast = this.parseStatement(buffer);
            if (ast) {
                yield ast;
            }
        }
    }

    private parseStatement(lexemes: Lexeme[]): ASTNode | null {
        if (lexemes.length === 0) {
            return ParseError.emptyExpression(
                'statement',
                lexemes[0]?.token
            );
        }

        // Check for loop labels (LABEL: while/until/for/foreach)
        if (lexemes.length >= 3 &&
            lexemes[0].category === 'IDENTIFIER' &&
            TokenChecker.isColon(lexemes[1]) &&
            lexemes[2].category === 'CONTROL') {

            const label = lexemes[0].token.value;
            const keyword = lexemes[2].token.value;
            const remainingLexemes = lexemes.slice(2); // Skip label and colon

            // Only loops can have labels
            if (keyword === 'while') {
                return this.parseWhileStatement(remainingLexemes, label);
            }
            if (keyword === 'until') {
                return this.parseUntilStatement(remainingLexemes, label);
            }
            if (keyword === 'for' || keyword === 'foreach') {
                return this.parseForeachStatement(remainingLexemes, label);
            }
        }

        // Check for postfix conditionals (if/unless/while/until appearing after statement)
        // Only detect at depth 0 (not inside braces or parens)
        const tracker = new DepthTracker();
        for (let i = 1; i < lexemes.length; i++) {
            // Track depth
            tracker.update(lexemes[i]);

            if (tracker.isAtDepthZero() && lexemes[i].category === 'CONTROL') {
                const keyword = lexemes[i].token.value;
                if (keyword === 'if' || keyword === 'unless' ||
                    keyword === 'while' || keyword === 'until') {
                    // This is a postfix conditional
                    const stmtLexemes = lexemes.slice(0, i);
                    const condLexemes = lexemes.slice(i + 1);

                    // Parse the statement (recursively call parseStatement to handle return, etc.)
                    const stmt = this.parseStatement(stmtLexemes);
                    if (!stmt) {
                        return ParseError.parseFailure('labeled statement', lexemes, i);
                    }

                    // Parse the condition (always returns a node, possibly ErrorNode)
                    const condition = this.parseExpression(condLexemes, 0);

                    // Create appropriate control structure
                    if (keyword === 'if') {
                        const ifNode: IfNode = {
                            type: 'If',
                            condition,
                            thenBlock: [stmt],
                            elseIfClauses: []
                        };
                        return ifNode;
                    } else if (keyword === 'unless') {
                        const unlessNode: UnlessNode = {
                            type: 'Unless',
                            condition,
                            thenBlock: [stmt]
                        };
                        return unlessNode;
                    } else if (keyword === 'while') {
                        const whileNode: WhileNode = {
                            type: 'While',
                            condition,
                            block: [stmt]
                        };
                        return whileNode;
                    } else if (keyword === 'until') {
                        const untilNode: UntilNode = {
                            type: 'Until',
                            condition,
                            block: [stmt]
                        };
                        return untilNode;
                    }
                }
            }
        }

        // Check for bare block statement (starts with LBRACE)
        if (lexemes[0].category === 'LBRACE') {
            return this.parseBlockStatement(lexemes);
        }

        // Check for prefix control structures
        if (lexemes[0].category === 'CONTROL') {
            if (TokenChecker.isControlKeyword(lexemes[0], 'if')) {
                return this.parseIfStatement(lexemes);
            }
            if (TokenChecker.isControlKeyword(lexemes[0], 'unless')) {
                return this.parseUnlessStatement(lexemes);
            }
            if (TokenChecker.isControlKeyword(lexemes[0], 'while')) {
                return this.parseWhileStatement(lexemes);
            }
            if (TokenChecker.isControlKeyword(lexemes[0], 'until')) {
                return this.parseUntilStatement(lexemes);
            }
            if (TokenChecker.isControlKeyword(lexemes[0], 'foreach') || TokenChecker.isControlKeyword(lexemes[0], 'for')) {
                return this.parseForeachStatement(lexemes);
            }
            if (TokenChecker.isControlKeyword(lexemes[0], 'return')) {
                return this.parseReturnStatement(lexemes);
            }
            if (TokenChecker.isControlKeyword(lexemes[0], 'last')) {
                return this.parseLastStatement(lexemes);
            }
            if (TokenChecker.isControlKeyword(lexemes[0], 'next')) {
                return this.parseNextStatement(lexemes);
            }
            if (TokenChecker.isControlKeyword(lexemes[0], 'redo')) {
                return this.parseRedoStatement(lexemes);
            }
            if (TokenChecker.isControlKeyword(lexemes[0], 'die')) {
                return this.parseDieStatement(lexemes);
            }
            if (TokenChecker.isControlKeyword(lexemes[0], 'warn')) {
                return this.parseWarnStatement(lexemes);
            }
            if (TokenChecker.isControlKeyword(lexemes[0], 'do')) {
                return this.parseDoBlock(lexemes);
            }
            if (TokenChecker.isControlKeyword(lexemes[0], 'defer')) {
                return this.parseDefer(lexemes);
            }
            if (TokenChecker.isControlKeyword(lexemes[0], 'try')) {
                return this.parseTryCatch(lexemes);
            }
            if (TokenChecker.isControlKeyword(lexemes[0], 'throw')) {
                return this.parseThrowStatement(lexemes);
            }
            if (TokenChecker.isControlKeyword(lexemes[0], 'given')) {
                return this.parseGiven(lexemes);
            }
            if (TokenChecker.isControlKeyword(lexemes[0], 'break')) {
                return this.parseBreakStatement(lexemes);
            }
            if (TokenChecker.isControlKeyword(lexemes[0], 'continue')) {
                return this.parseContinueStatement(lexemes);
            }
        }

        // Check for package declaration
        if (lexemes[0].category === 'KEYWORD' && TokenChecker.isKeyword(lexemes[0], 'package')) {
            return this.parsePackageDeclaration(lexemes);
        }

        // Check for use statement
        if (lexemes[0].category === 'KEYWORD' && TokenChecker.isKeyword(lexemes[0], 'use')) {
            return this.parseUseStatement(lexemes);
        }

        // Check for class declaration
        if (lexemes[0].category === 'DECLARATION' && TokenChecker.isDeclarationKeyword(lexemes[0], 'class')) {
            return this.parseClassDeclaration(lexemes);
        }

        // Check for print and say (can be either statements or function calls)
        if (lexemes[0].category === 'KEYWORD') {
            if (TokenChecker.isKeyword(lexemes[0], 'print')) {
                // If followed by '(', treat as function call, not statement
                if (lexemes.length === 1 || lexemes[1].category !== 'LPAREN') {
                    return this.parsePrintStatement(lexemes);
                }
                // Otherwise, let it fall through to be parsed as a function call
            }
            if (TokenChecker.isKeyword(lexemes[0], 'say')) {
                // If followed by '(', treat as function call, not statement
                if (lexemes.length === 1 || lexemes[1].category !== 'LPAREN') {
                    return this.parseSayStatement(lexemes);
                }
                // Otherwise, let it fall through to be parsed as a function call
            }
        }

        // Check for sub declaration
        if (lexemes[0].category === 'DECLARATION' && TokenChecker.isDeclarationKeyword(lexemes[0], 'sub')) {
            return this.parseSubDeclaration(lexemes);
        }

        // Check for declaration (my, our, state, const)
        if (lexemes[0].category === 'DECLARATION') {
            return this.parseDeclaration(lexemes);
        }

        // Check for assignment (lvalue ASSIGNOP expression)
        // Find ASSIGNOP at depth 0
        let assignDepth = 0;
        let assignPos = -1;
        for (let i = 0; i < lexemes.length; i++) {
            if (lexemes[i].category === 'LPAREN' || lexemes[i].category === 'LBRACKET' || lexemes[i].category === 'LBRACE') {
                assignDepth++;
            }
            if (lexemes[i].category === 'RPAREN' || lexemes[i].category === 'RBRACKET' || lexemes[i].category === 'RBRACE') {
                assignDepth--;
            }
            if (assignDepth === 0 && lexemes[i].category === 'ASSIGNOP') {
                assignPos = i;
                break;
            }
        }

        if (assignPos !== -1) {
            // This is an assignment statement
            const leftLexemes = lexemes.slice(0, assignPos);
            const operator = lexemes[assignPos].token.value;
            const rightLexemes = lexemes.slice(assignPos + 1);

            // Parse left side (lvalue) - always returns a node (possibly ErrorNode)
            const left = this.parseExpression(leftLexemes, 0);

            // Parse right side (expression) - always returns a node (possibly ErrorNode)
            const right = this.parseExpression(rightLexemes, 0);

            const assignNode: AssignmentNode = {
                type: 'Assignment',
                left,
                operator,
                right
            };
            return assignNode;
        }

        // Otherwise parse as expression
        return this.parseExpression(lexemes, 0);
    }

    private parseDeclaration(lexemes: Lexeme[]): DeclarationNode | ErrorNode {
        if (lexemes.length < 2) {
            return ParseError.incompleteDeclaration(
                'variable',
                'variable name',
                lexemes[0]?.token || { value: '', type: 'ERROR', line: 0, column: 0 }
            );
        }

        const declarator = lexemes[0].token.value;

        // Check for lexical subroutine (my sub, our sub)
        if (TokenChecker.isDeclarationKeyword(lexemes[1], 'sub')) {
            const subNode = this.parseSubDeclaration(lexemes.slice(1));
            if (subNode && subNode.type === 'Sub') {
                const declNode: DeclarationNode = {
                    type: 'Declaration',
                    declarator,
                    variable: subNode
                };
                return declNode;
            }
            if (subNode && subNode.type === 'Error') {
                return subNode;
            }
            return ParseError.incompleteDeclaration(
                'subroutine',
                'sub definition',
                lexemes[2]?.token || lexemes[0].token
            );
        }

        const variable = lexemes[1];

        if (variable.category !== 'SCALAR_VAR' &&
            variable.category !== 'ARRAY_VAR' &&
            variable.category !== 'HASH_VAR') {
            return ParseError.invalidSyntax(
                `Expected variable after '${declarator}', found ${variable.category}`,
                variable.token
            );
        }

        const varNode: VariableNode = {
            type: 'Variable',
            name: variable.token.value
        };

        // Check for initializer
        if (lexemes.length > 2 && lexemes[2].category === 'ASSIGNOP') {
            const initLexemes = lexemes.slice(3);
            const initializer = this.parseExpression(initLexemes, 0);

            if (initializer) {
                const declNode: DeclarationNode = {
                    type: 'Declaration',
                    declarator,
                    variable: varNode,
                    initializer
                };
                return declNode;
            }
        }

        const declNode: DeclarationNode = {
            type: 'Declaration',
            declarator,
            variable: varNode
        };
        return declNode;
    }

    private parseExpression(lexemes: Lexeme[], pos: number): ASTNode {
        const result = this.precedenceClimb(lexemes, pos, 21); // Start at lowest precedence
        return result.node;
    }

    private precedenceClimb(
        lexemes: Lexeme[],
        pos: number,
        minPrecedence: number
    ): { node: ASTNode; nextPos: number } {
        // Parse left side (primary expression)
        // parsePrimary now always returns a result (possibly an ErrorNode)
        const leftResult = this.parsePrimary(lexemes, pos);

        let left = leftResult.node;
        let currentPos = leftResult.nextPos;

        // Handle postfix operators (array/hash access)
        const postfixResult = this.parsePostfixOperators(lexemes, left, currentPos);
        left = postfixResult.node;
        currentPos = postfixResult.nextPos;

        // Process operators
        while (currentPos < lexemes.length) {
            const current = lexemes[currentPos];

            // Special handling for ternary operator
            if (TokenChecker.isQuestionMark(current)) {
                const opInfo = this.getOperatorInfo('?');
                if (!opInfo || opInfo.precedence > minPrecedence) {
                    break;
                }

                currentPos++; // Consume '?'

                // Parse true expression (up to ':')
                // Find the ':' at the correct depth
                let colonPos = -1;
                let depth = 0;
                for (let i = currentPos; i < lexemes.length; i++) {
                    if (lexemes[i].category === 'LPAREN' || lexemes[i].category === 'LBRACKET' || lexemes[i].category === 'LBRACE') {
                        depth++;
                    } else if (lexemes[i].category === 'RPAREN' || lexemes[i].category === 'RBRACKET' || lexemes[i].category === 'RBRACE') {
                        depth--;
                    } else if (depth === 0 && TokenChecker.isQuestionMark(lexemes[i])) {
                        // Nested ternary
                        depth++;
                    } else if (depth === 1 && TokenChecker.isColon(lexemes[i])) {
                        // This ':' belongs to the nested ternary
                        depth--;
                    } else if (depth === 0 && TokenChecker.isColon(lexemes[i])) {
                        colonPos = i;
                        break;
                    }
                }

                if (colonPos === -1) {
                    // Error: missing ':' in ternary
                    left = ParseError.missingToken(
                        ':',
                        lexemes[currentPos - 1]?.token,
                        'in ternary operator after ? expression'
                    );
                    break;
                }

                // Parse true expression
                const trueLexemes = lexemes.slice(currentPos, colonPos);
                const trueResult = this.parseExpression(trueLexemes, 0);
                if (!trueResult) {
                    // Error: empty true expression in ternary
                    left = ParseError.emptyExpression(
                        'ternary true expression',
                        lexemes[currentPos]?.token
                    );
                    break;
                }

                // Skip the ':'
                currentPos = colonPos + 1;

                // Parse false expression with right associativity
                const nextMinPrec = opInfo.precedence; // RIGHT associative
                const falseResult = this.precedenceClimb(lexemes, currentPos, nextMinPrec);
                if (!falseResult) {
                    // Error: empty false expression in ternary
                    left = ParseError.emptyExpression(
                        'ternary false expression',
                        lexemes[currentPos]?.token
                    );
                    break;
                }

                // Build ternary node
                const ternary: TernaryNode = {
                    type: 'Ternary',
                    condition: left,
                    trueExpr: trueResult,
                    falseExpr: falseResult.node
                };
                left = ternary;
                currentPos = falseResult.nextPos;
                continue;
            }

            // Check if it's a binary operator (including word operators like eq, ne, lt, etc.)
            if (current.category !== 'BINOP' && current.category !== 'ASSIGNOP' && current.category !== 'OPERATOR') {
                break;
            }

            const opInfo = this.getOperatorInfo(current.token.value);
            if (!opInfo || opInfo.precedence > minPrecedence) {
                break; // Lower precedence, stop
            }

            const operator = current.token.value;
            currentPos++; // Consume operator

            // Calculate next minimum precedence based on associativity
            const nextMinPrec = opInfo.associativity === 'RIGHT'
                ? opInfo.precedence
                : opInfo.precedence - 1;

            // Parse right side
            const rightResult = this.precedenceClimb(lexemes, currentPos, nextMinPrec);
            if (!rightResult) {
                // Error: expected right operand
                left = ParseError.missingToken(
                    'expression',
                    lexemes[currentPos]?.token,
                    `after operator '${operator}'`
                );
                break;
            }

            // Build binary operation
            const binOp: BinaryOpNode = {
                type: 'BinaryOp',
                operator,
                left,
                right: rightResult.node
            };
            left = binOp;

            currentPos = rightResult.nextPos;
        }

        return { node: left, nextPos: currentPos };
    }

    private parsePrimary(
        lexemes: Lexeme[],
        pos: number
    ): { node: ASTNode; nextPos: number } {
        if (pos >= lexemes.length) {
            // Return an error for unexpected end of input
            const errorNode = this.createParseError(
                'Unexpected end of input',
                lexemes,
                Math.max(0, lexemes.length - 1)
            );
            return { node: errorNode, nextPos: pos };
        }

        const lexeme = lexemes[pos];

        // Handle tokenization errors
        if (lexeme.category === 'TOKEN_ERROR') {
            const errorNode: ErrorNode = {
                type: 'Error',
                message: this.getErrorMessage(lexeme.token),
                value: lexeme.token.value,
                line: lexeme.token.line,
                column: lexeme.token.column
            };
            return {
                node: errorNode,
                nextPos: pos + 1
            };
        }

        // Unary operators: -, +, !
        if (lexeme.category === 'BINOP' || lexeme.category === 'OPERATOR' || lexeme.category === 'UNOP') {
            const op = lexeme.token.value;

            // Handle unary minus, unary plus, logical not, and prefix increment/decrement
            if (op === '-' || op === '!' || op === '+' || op === '++' || op === '--') {
                // Special case: +{ is a hash literal, not unary plus
                if (op === '+' && pos + 1 < lexemes.length && lexemes[pos + 1].category === 'LBRACE') {
                    // Let the hash literal handling below deal with this
                } else if (op === '++' || op === '--') {
                    // Prefix increment/decrement
                    const operandResult = this.parsePrimary(lexemes, pos + 1);
                    const prefixNode: PrefixOpNode = {
                        type: 'PrefixOp',
                        operator: op,
                        operand: operandResult.node
                    };
                    return {
                        node: prefixNode,
                        nextPos: operandResult.nextPos
                    };
                } else {
                    // This is a unary operator - recursively parse the operand
                    const operandResult = this.parsePrimary(lexemes, pos + 1);
                    // parsePrimary now always returns a result (possibly an ErrorNode)
                    const unaryNode: UnaryOpNode = {
                        type: 'UnaryOp',
                        operator: op,
                        operand: operandResult.node
                    };
                    return {
                        node: unaryNode,
                        nextPos: operandResult.nextPos
                    };
                }
            }
        }

        // Do blocks (can be used in expressions)
        if (TokenChecker.isControlKeyword(lexeme, 'do')) {
            // Expect: do { statements }
            if (pos + 1 < lexemes.length && lexemes[pos + 1].category === 'LBRACE') {
                // Find matching RBRACE
                let depth = 1;
                let endPos = pos + 2;
                while (endPos < lexemes.length && depth > 0) {
                    if (lexemes[endPos].category === 'LBRACE') depth++;
                    if (lexemes[endPos].category === 'RBRACE') depth--;
                    endPos++;
                }

                // Extract block contents
                const blockLexemes = lexemes.slice(pos + 2, endPos - 1);

                // Parse statements inside the block (same logic as parseBlock)
                const statements: ASTNode[] = [];
                let blockPos = 0;

                while (blockPos < blockLexemes.length) {
                    let stmtEnd = blockPos;
                    let braceDepth = 0;

                    while (stmtEnd < blockLexemes.length) {
                        if (blockLexemes[stmtEnd].category === 'LBRACE') {
                            braceDepth++;
                        } else if (blockLexemes[stmtEnd].category === 'RBRACE') {
                            braceDepth--;
                            if (braceDepth === 0) {
                                stmtEnd++;
                                break;
                            }
                        } else if (blockLexemes[stmtEnd].category === 'TERMINATOR' && braceDepth === 0) {
                            break;
                        }
                        stmtEnd++;
                    }

                    const stmtLexemes = blockLexemes.slice(blockPos, stmtEnd);
                    if (stmtLexemes.length > 0) {
                        const stmt = this.parseStatement(stmtLexemes);
                        if (stmt) {
                            statements.push(stmt);
                        }
                    }

                    blockPos = stmtEnd;
                    if (blockPos < blockLexemes.length && blockLexemes[blockPos].category === 'TERMINATOR') {
                        blockPos++;
                    }
                }

                const doBlockNode: DoBlockNode = {
                    type: 'DoBlock',
                    statements
                };
                return {
                    node: doBlockNode,
                    nextPos: endPos
                };
            }
        }

        // Literals
        if (lexeme.category === 'LITERAL') {
            if (lexeme.token.type === 'NUMBER') {
                const numNode: NumberNode = {
                    type: 'Number',
                    value: lexeme.token.value
                };
                return {
                    node: numNode,
                    nextPos: pos + 1
                };
            }
            if (lexeme.token.type === 'STRING') {
                const strNode: StringNode = {
                    type: 'String',
                    value: lexeme.token.value
                };
                return {
                    node: strNode,
                    nextPos: pos + 1
                };
            }
            if (lexeme.token.type === 'QWLIST') {
                // Parse qw// as a list of strings
                const words: string[] = JSON.parse(lexeme.token.value);
                const elements: StringNode[] = words.map(word => ({
                    type: 'String',
                    value: word
                }));
                const listNode: ListNode = {
                    type: 'List',
                    elements
                };
                return {
                    node: listNode,
                    nextPos: pos + 1
                };
            }
        }

        // Boolean literals (true, false)
        if (lexeme.category === 'BOOLEAN') {
            const boolNode: BooleanNode = {
                type: 'Boolean',
                value: lexeme.token.value === 'true'
            };
            return {
                node: boolNode,
                nextPos: pos + 1
            };
        }

        // Variables
        if (lexeme.category === 'SCALAR_VAR' ||
            lexeme.category === 'ARRAY_VAR' ||
            lexeme.category === 'HASH_VAR') {

            // Check for array slice: @array[indices]
            if (lexeme.category === 'ARRAY_VAR' &&
                pos + 1 < lexemes.length &&
                lexemes[pos + 1].category === 'LBRACKET') {

                // Find matching RBRACKET using DelimiterMatcher
                const closingPos = DelimiterMatcher.findClosingBracket(lexemes, pos + 1);
                if (closingPos === -1) {
                    // Missing closing bracket
                    return {
                        node: this.createParseError('Missing closing bracket for array slice', lexemes, pos),
                        nextPos: lexemes.length
                    };
                }
                const endPos = closingPos + 1;

                // Parse indices expression
                const indicesLexemes = lexemes.slice(pos + 2, closingPos);

                // Check if there are commas at depth 0 (list of indices)
                const commaPositions = findCommasAtDepthZero(indicesLexemes);
                let indices: ASTNode | null = null;

                if (commaPositions.length > 0) {
                    // Parse as list (comma-separated indices) using splitByCommas
                    const segments = splitByCommas(indicesLexemes);
                    const elements: ASTNode[] = [];

                    for (const segment of segments) {
                        if (segment.length > 0) {
                            const elem = this.parseExpression(segment, 0);
                            if (elem) {
                                elements.push(elem);
                            }
                        }
                    }

                    const listNode: ListNode = {
                        type: 'List',
                        elements: elements
                    };
                    indices = listNode;
                } else {
                    // Single expression (often a range)
                    indices = this.parseExpression(indicesLexemes, 0);
                }

                if (indices) {
                    const varNode: VariableNode = {
                        type: 'Variable',
                        name: lexeme.token.value
                    };
                    const sliceNode: ArraySliceNode = {
                        type: 'ArraySlice',
                        base: varNode,
                        indices: indices
                    };
                    return {
                        node: sliceNode,
                        nextPos: endPos
                    };
                }
            }

            // Check for hash slice: @hash{keys}
            if (lexeme.category === 'ARRAY_VAR' &&
                pos + 1 < lexemes.length &&
                lexemes[pos + 1].category === 'LBRACE') {

                // Find matching RBRACE using DelimiterMatcher
                const closingPos = DelimiterMatcher.findClosingBrace(lexemes, pos + 1);
                if (closingPos === -1) {
                    // Missing closing brace
                    return {
                        node: this.createParseError('Missing closing brace for hash slice', lexemes, pos),
                        nextPos: lexemes.length
                    };
                }
                const endPos = closingPos + 1;

                // Parse keys expression
                const keysLexemes = lexemes.slice(pos + 2, closingPos);

                // Check if there are commas at depth 0 (list of keys)
                const commaPositions = findCommasAtDepthZero(keysLexemes);
                let keys: ASTNode | null = null;

                if (commaPositions.length > 0) {
                    // Parse as list (comma-separated keys) using splitByCommas
                    const segments = splitByCommas(keysLexemes);
                    const elements: ASTNode[] = [];

                    for (const segment of segments) {
                        if (segment.length > 0) {
                            // Check for bareword key
                            let elem: ASTNode | null = null;
                            if (segment.length === 1 && segment[0].category === 'IDENTIFIER') {
                                const barewordKey: StringNode = {
                                    type: 'String',
                                    value: segment[0].token.value
                                };
                                elem = barewordKey;
                            } else {
                                elem = this.parseExpression(segment, 0);
                            }
                            if (elem) {
                                elements.push(elem);
                            }
                        }
                    }

                    const listNode: ListNode = {
                        type: 'List',
                        elements: elements
                    };
                    keys = listNode;
                } else {
                    // Single expression (e.g., @hash{@keys})
                    keys = this.parseExpression(keysLexemes, 0);
                }

                if (keys) {
                    const varNode: VariableNode = {
                        type: 'Variable',
                        name: lexeme.token.value
                    };
                    const sliceNode: HashSliceNode = {
                        type: 'HashSlice',
                        base: varNode,
                        keys: keys
                    };
                    return {
                        node: sliceNode,
                        nextPos: endPos
                    };
                }
            }

            const varNode: VariableNode = {
                type: 'Variable',
                name: lexeme.token.value
            };
            return {
                node: varNode,
                nextPos: pos + 1
            };
        }

        // Anonymous sub (sub keyword in expression context)
        if (TokenChecker.isDeclarationKeyword(lexeme, 'sub')) {
            // This is an anonymous sub - parse it without a name
            const subNode = this.parseSubDeclaration(lexemes.slice(pos));
            if (subNode) {
                return {
                    node: subNode,
                    nextPos: lexemes.length // Consume all remaining lexemes for the sub
                };
            }
        }

        // Function calls and identifiers
        if (lexeme.category === 'IDENTIFIER' || lexeme.category === 'KEYWORD') {
            // Check if next token is => (autoquoting in hash context)
            if (pos + 1 < lexemes.length &&
                TokenChecker.isFatComma(lexemes[pos + 1])) {
                // Bareword before => - treat as autoquoted string
                const stringNode: StringNode = {
                    type: 'String',
                    value: lexeme.token.value
                };
                return {
                    node: stringNode,
                    nextPos: pos + 1
                };
            }

            // Check if next token is LPAREN
            if (pos + 1 < lexemes.length && lexemes[pos + 1].category === 'LPAREN') {
                // This is a function call
                const functionName = lexeme.token.value;
                let currentPos = pos + 2; // Skip identifier and LPAREN

                // Find matching RPAREN using DelimiterMatcher
                const closingPos = DelimiterMatcher.findClosingParen(lexemes, pos + 1);
                if (closingPos === -1) {
                    return {
                        node: ParseError.missingToken(')', lexemes[pos + 1].token, 'for function call'),
                        nextPos: lexemes.length
                    };
                }
                const endPos = closingPos + 1; // endPos is one past the closing paren

                // Parse arguments (comma-separated expressions)
                const argLexemes = lexemes.slice(currentPos, endPos - 1);
                const args: ASTNode[] = [];

                if (argLexemes.length > 0) {
                    // Split by commas at depth 0
                    let argStart = 0;
                    let parenDepth = 0;

                    for (let i = 0; i < argLexemes.length; i++) {
                        if (argLexemes[i].category === 'LPAREN') parenDepth++;
                        if (argLexemes[i].category === 'RPAREN') parenDepth--;

                        if (argLexemes[i].category === 'COMMA' && parenDepth === 0) {
                            // Found an argument boundary
                            const argTokens = argLexemes.slice(argStart, i);
                            if (argTokens.length > 0) {
                                const arg = this.parseExpression(argTokens, 0);
                                if (arg) {
                                    args.push(arg);
                                }
                            }
                            argStart = i + 1; // Skip the comma
                        }
                    }

                    // Don't forget the last argument
                    const lastArgTokens = argLexemes.slice(argStart);
                    if (lastArgTokens.length > 0) {
                        const arg = this.parseExpression(lastArgTokens, 0);
                        if (arg) {
                            args.push(arg);
                        }
                    }
                }

                const callNode: CallNode = {
                    type: 'Call',
                    name: functionName,
                    arguments: args
                };

                return {
                    node: callNode,
                    nextPos: endPos
                };
            }
            // Check if next token is -> (for class method calls like Point->new())
            else if (pos + 1 < lexemes.length &&
                     TokenChecker.isArrowOperator(lexemes[pos + 1])) {
                // This is an identifier followed by ->, treat it as a Variable-like node
                // The -> will be handled by parsePostfixOperators
                const identNode: VariableNode = {
                    type: 'Variable',
                    name: lexeme.token.value
                };
                return {
                    node: identNode,
                    nextPos: pos + 1
                };
            }
        }

        // Array literals [...]
        if (lexeme.category === 'LBRACKET') {
            // Find matching RBRACKET using DelimiterMatcher
            const closingPos = DelimiterMatcher.findClosingBracket(lexemes, pos);
            if (closingPos === -1) {
                return {
                    node: ParseError.missingToken(']', lexeme.token, 'for array literal'),
                    nextPos: lexemes.length
                };
            }
            const endPos = closingPos + 1; // endPos is one past the closing bracket

            // Parse elements (comma-separated expressions)
            const elementLexemes = lexemes.slice(pos + 1, endPos - 1);
            const elements: ASTNode[] = [];

            if (elementLexemes.length > 0) {
                // Split by commas at depth 0 using utility function
                const segments = splitByCommas(elementLexemes, 0, elementLexemes.length);

                for (const segment of segments) {
                    if (segment.length > 0) {
                        const elem = this.parseExpression(segment, 0);
                        if (elem) {
                            elements.push(elem);
                        }
                    }
                }
            }

            const arrayNode: ArrayLiteralNode = {
                type: 'ArrayLiteral',
                elements: elements
            };

            return {
                node: arrayNode,
                nextPos: endPos
            };
        }

        // Hash literals {..} or +{...}
        // Check for bare hash literal or +{...}
        const isHashLiteral =
            (lexeme.category === 'LBRACE') ||
            ((lexeme.category === 'BINOP' || lexeme.category === 'OPERATOR') &&
             lexeme.token.value === '+' &&
             pos + 1 < lexemes.length &&
             lexemes[pos + 1].category === 'LBRACE');

        if (isHashLiteral) {
            const startPos = lexeme.category === 'LBRACE' ? pos : pos + 1;
            if (startPos < lexemes.length && lexemes[startPos].category === 'LBRACE') {
                // Find matching RBRACE using DelimiterMatcher
                const closingPos = DelimiterMatcher.findClosingBrace(lexemes, startPos);
                if (closingPos === -1) {
                    return {
                        node: ParseError.missingToken('}', lexemes[startPos].token, 'for hash literal'),
                        nextPos: lexemes.length
                    };
                }
                const endPos = closingPos + 1; // endPos is one past the closing brace

                // Parse pairs (comma-separated key => value)
                const pairLexemes = lexemes.slice(startPos + 1, endPos - 1);
                const pairs: Array<{ key: ASTNode; value: ASTNode }> = [];

                if (pairLexemes.length > 0) {
                    // Split by commas at depth 0 using utility function
                    const segments = splitByCommas(pairLexemes, 0, pairLexemes.length);

                    for (const segment of segments) {
                        if (segment.length > 0) {
                            const pair = this.parseHashPair(segment);
                            if (pair) {
                                pairs.push(pair);
                            }
                        }
                    }
                }

                const hashNode: HashLiteralNode = {
                    type: 'HashLiteral',
                    pairs: pairs
                };

                return {
                    node: hashNode,
                    nextPos: endPos
                };
            }
        }

        // Parenthesized expressions or lists
        if (lexeme.category === 'LPAREN') {
            // Find matching RPAREN
            let depth = 1;
            let endPos = pos + 1;
            while (endPos < lexemes.length && depth > 0) {
                if (lexemes[endPos].category === 'LPAREN') depth++;
                if (lexemes[endPos].category === 'RPAREN') depth--;
                endPos++;
            }

            // Check if there's a comma at depth 0 (indicates a list)
            const innerLexemes = lexemes.slice(pos + 1, endPos - 1);
            let hasComma = false;
            let parenDepth = 0;
            let bracketDepth = 0;
            let braceDepth = 0;

            for (let i = 0; i < innerLexemes.length; i++) {
                if (innerLexemes[i].category === 'LPAREN') parenDepth++;
                if (innerLexemes[i].category === 'RPAREN') parenDepth--;
                if (innerLexemes[i].category === 'LBRACKET') bracketDepth++;
                if (innerLexemes[i].category === 'RBRACKET') bracketDepth--;
                if (innerLexemes[i].category === 'LBRACE') braceDepth++;
                if (innerLexemes[i].category === 'RBRACE') braceDepth--;

                if (innerLexemes[i].category === 'COMMA' &&
                    parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
                    hasComma = true;
                    break;
                }
            }

            if (hasComma) {
                // This is a list literal
                const elements: ASTNode[] = [];
                let elemStart = 0;
                parenDepth = 0;
                bracketDepth = 0;
                braceDepth = 0;

                for (let i = 0; i < innerLexemes.length; i++) {
                    if (innerLexemes[i].category === 'LPAREN') parenDepth++;
                    if (innerLexemes[i].category === 'RPAREN') parenDepth--;
                    if (innerLexemes[i].category === 'LBRACKET') bracketDepth++;
                    if (innerLexemes[i].category === 'RBRACKET') bracketDepth--;
                    if (innerLexemes[i].category === 'LBRACE') braceDepth++;
                    if (innerLexemes[i].category === 'RBRACE') braceDepth--;

                    if (innerLexemes[i].category === 'COMMA' &&
                        parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
                        // Found an element boundary
                        const elemTokens = innerLexemes.slice(elemStart, i);
                        if (elemTokens.length > 0) {
                            const elem = this.parseExpression(elemTokens, 0);
                            if (elem) {
                                elements.push(elem);
                            }
                        }
                        elemStart = i + 1; // Skip the comma
                    }
                }

                // Don't forget the last element
                const lastElemTokens = innerLexemes.slice(elemStart);
                if (lastElemTokens.length > 0) {
                    const elem = this.parseExpression(lastElemTokens, 0);
                    if (elem) {
                        elements.push(elem);
                    }
                }

                const listNode: ListNode = {
                    type: 'List',
                    elements: elements
                };

                return { node: listNode, nextPos: endPos };
            } else {
                // This is a parenthesized expression
                const innerNode = this.parseExpression(innerLexemes, 0);

                if (innerNode) {
                    return { node: innerNode, nextPos: endPos };
                }
                // If inner expression is empty, return error
                const errorNode = this.createParseError(
                    'Empty parenthesized expression',
                    lexemes,
                    pos
                );
                return { node: errorNode, nextPos: endPos };
            }
        }

        // If we reach here, we encountered an unexpected token
        const errorNode = this.createParseError(
            `Unexpected token: ${lexeme.token.value} (${lexeme.category})`,
            lexemes,
            pos
        );
        return { node: errorNode, nextPos: pos + 1 };
    }

    private parseHashPair(lexemes: Lexeme[]): { key: ASTNode; value: ASTNode } | null {
        // Find the => operator at depth 0 using DepthTracker
        const tracker = new DepthTracker();
        let arrowPos = -1;

        for (let i = 0; i < lexemes.length; i++) {
            tracker.update(lexemes[i]);

            if (tracker.isAtDepthZero() && TokenChecker.isFatComma(lexemes[i])) {
                arrowPos = i;
                break;
            }
        }

        if (arrowPos === -1) {
            return null;
        }

        // Parse key and value
        const keyLexemes = lexemes.slice(0, arrowPos);
        const valueLexemes = lexemes.slice(arrowPos + 1);

        // Special handling for bareword keys (single identifier)
        let key: ASTNode;
        if (keyLexemes.length === 1 && keyLexemes[0].category === 'IDENTIFIER') {
            // Autoquote bareword key
            const stringNode: StringNode = {
                type: 'String',
                value: keyLexemes[0].token.value
            };
            key = stringNode;
        } else {
            key = this.parseExpression(keyLexemes, 0);
        }

        const value = this.parseExpression(valueLexemes, 0);

        return { key, value };
    }

    private parsePostfixOperators(
        lexemes: Lexeme[],
        base: ASTNode,
        startPos: number
    ): { node: ASTNode; nextPos: number } {
        let node = base;
        let pos = startPos;

        // Loop to handle chained access like $data->[0]{"key"}[1]
        while (pos < lexemes.length) {
            const current = lexemes[pos];

            // Check for postfix increment/decrement
            if ((current.category === 'OPERATOR' || current.category === 'UNOP') &&
                (current.token.value === '++' || current.token.value === '--')) {
                const postfixNode: PostfixOpNode = {
                    type: 'PostfixOp',
                    operator: current.token.value,
                    operand: node
                };
                node = postfixNode;
                pos++;
                continue;
            }

            // Check for dereference operator ->
            if (TokenChecker.isArrowOperator(current)) {
                pos++; // Consume ->
                if (pos >= lexemes.length) {
                    break;
                }

                // Check for method call: -> followed by identifier and (
                if (lexemes[pos].category === 'IDENTIFIER' &&
                    pos + 1 < lexemes.length &&
                    lexemes[pos + 1].category === 'LPAREN') {

                    const methodName = lexemes[pos].token.value;
                    pos++; // Consume method name

                    // Find matching RPAREN using DelimiterMatcher
                    const closingPos = DelimiterMatcher.findClosingParen(lexemes, pos);
                    if (closingPos === -1) {
                        // Missing closing parenthesis
                        const errorNode = this.createParseError('Missing closing parenthesis for method call', lexemes, pos);
                        node = errorNode;
                        pos = lexemes.length;
                        break;
                    }
                    const endPos = closingPos + 1;
                    pos++; // Consume LPAREN

                    // Parse arguments (comma-separated expressions) using splitByCommas
                    const argLexemes = lexemes.slice(pos, closingPos);
                    const args: ASTNode[] = [];

                    if (argLexemes.length > 0) {
                        const segments = splitByCommas(argLexemes);
                        for (const segment of segments) {
                            if (segment.length > 0) {
                                const arg = this.parseExpression(segment, 0);
                                if (arg) {
                                    args.push(arg);
                                }
                            }
                        }
                    }

                    const methodCall: MethodCallNode = {
                        type: 'MethodCall',
                        object: node,
                        method: methodName,
                        arguments: args
                    };

                    node = methodCall;
                    pos = endPos;
                    continue;
                }

                // Check for postfix dereferencing: ->@*, ->%*, ->$*
                if (lexemes[pos].category === 'POSTFIX_DEREF_SIGIL' &&
                    pos + 1 < lexemes.length &&
                    TokenChecker.isOperator(lexemes[pos + 1], '*')) {

                    const sigil = lexemes[pos].token.value; // The sigil: @, %, or $
                    pos += 2; // Consume sigil and *

                    const derefNode: PostfixDerefNode = {
                        type: 'PostfixDeref',
                        base: node,
                        derefType: sigil
                    };

                    node = derefNode;
                    continue;
                }

                // Check for postfix dereference slice: ->@[...], ->@{...}
                if (lexemes[pos].category === 'POSTFIX_DEREF_SIGIL' &&
                    pos + 1 < lexemes.length &&
                    (lexemes[pos + 1].category === 'LBRACKET' ||
                     lexemes[pos + 1].category === 'LBRACE')) {

                    const indexType = lexemes[pos + 1].category === 'LBRACKET' ? '[' : '{';
                    const closeType = indexType === '[' ? 'RBRACKET' : 'RBRACE';
                    const openType = indexType === '[' ? 'LBRACKET' : 'LBRACE';

                    pos++; // Consume sigil
                    pos++; // Consume [ or {

                    // Find matching closing bracket/brace
                    let depth = 1;
                    let endPos = pos;
                    while (endPos < lexemes.length && depth > 0) {
                        if (lexemes[endPos].category === openType) depth++;
                        if (lexemes[endPos].category === closeType) depth--;
                        endPos++;
                    }

                    // Parse indices/keys expression
                    const indexLexemes = lexemes.slice(pos, endPos - 1);

                    // Check for comma to determine if it's a list or single expression
                    let hasComma = false;
                    let checkDepth = 0;
                    for (let i = 0; i < indexLexemes.length; i++) {
                        if (indexLexemes[i].category === 'LPAREN') checkDepth++;
                        if (indexLexemes[i].category === 'RPAREN') checkDepth--;
                        if (indexLexemes[i].category === 'LBRACKET') checkDepth++;
                        if (indexLexemes[i].category === 'RBRACKET') checkDepth--;
                        if (indexLexemes[i].category === 'LBRACE') checkDepth++;
                        if (indexLexemes[i].category === 'RBRACE') checkDepth--;

                        if (checkDepth === 0 && indexLexemes[i].category === 'COMMA') {
                            hasComma = true;
                            break;
                        }
                    }

                    let indices: ASTNode | null = null;
                    if (hasComma) {
                        // Parse as list
                        const elements: ASTNode[] = [];
                        let elemStart = 0;
                        let elemDepth = 0;

                        for (let i = 0; i < indexLexemes.length; i++) {
                            if (indexLexemes[i].category === 'LPAREN') elemDepth++;
                            if (indexLexemes[i].category === 'RPAREN') elemDepth--;
                            if (indexLexemes[i].category === 'LBRACKET') elemDepth++;
                            if (indexLexemes[i].category === 'RBRACKET') elemDepth--;
                            if (indexLexemes[i].category === 'LBRACE') elemDepth++;
                            if (indexLexemes[i].category === 'RBRACE') elemDepth--;

                            if (elemDepth === 0 && indexLexemes[i].category === 'COMMA') {
                                const elemTokens = indexLexemes.slice(elemStart, i);
                                if (elemTokens.length > 0) {
                                    const elem = this.parseExpression(elemTokens, 0);
                                    if (elem) {
                                        elements.push(elem);
                                    }
                                }
                                elemStart = i + 1;
                            }
                        }

                        // Last element
                        const lastElemTokens = indexLexemes.slice(elemStart);
                        if (lastElemTokens.length > 0) {
                            const elem = this.parseExpression(lastElemTokens, 0);
                            if (elem) {
                                elements.push(elem);
                            }
                        }

                        indices = {
                            type: 'List',
                            elements: elements
                        } as ListNode;
                    } else {
                        // Parse as single expression
                        indices = this.parseExpression(indexLexemes, 0);
                    }

                    if (indices) {
                        const sliceNode: PostfixDerefSliceNode = {
                            type: 'PostfixDerefSlice',
                            base: node,
                            sliceType: '@',
                            indices: indices,
                            indexType: indexType
                        };

                        node = sliceNode;
                        pos = endPos;
                        continue;
                    }
                }

                // Continue to check for [ or { after ->
            }

            // Check for array access [
            if (current.category === 'LBRACKET' || lexemes[pos].category === 'LBRACKET') {
                // Find matching RBRACKET using DelimiterMatcher
                const closingPos = DelimiterMatcher.findClosingBracket(lexemes, pos);
                if (closingPos === -1) {
                    // Missing closing bracket
                    const errorNode = this.createParseError('Missing closing bracket for array access', lexemes, pos);
                    node = errorNode;
                    pos = lexemes.length;
                    break;
                }
                const endPos = closingPos + 1;

                // Parse index expression
                const indexLexemes = lexemes.slice(pos + 1, closingPos);
                const index = this.parseExpression(indexLexemes, 0);

                if (index) {
                    const arrayAccess: ArrayAccessNode = {
                        type: 'ArrayAccess',
                        base: node,
                        index: index
                    };
                    node = arrayAccess;
                    pos = endPos;
                    continue;
                }
                break;
            }

            // Check for hash access {
            if (current.category === 'LBRACE' || lexemes[pos].category === 'LBRACE') {
                // Find matching RBRACE using DelimiterMatcher
                const closingPos = DelimiterMatcher.findClosingBrace(lexemes, pos);
                if (closingPos === -1) {
                    // Missing closing brace
                    const errorNode = this.createParseError('Missing closing brace for hash access', lexemes, pos);
                    node = errorNode;
                    pos = lexemes.length;
                    break;
                }
                const endPos = closingPos + 1;

                // Parse key expression
                const keyLexemes = lexemes.slice(pos + 1, closingPos);
                let key: ASTNode | null = null;

                // Check for bareword key (single IDENTIFIER)
                if (keyLexemes.length === 1 && keyLexemes[0].category === 'IDENTIFIER') {
                    // Bareword hash key - convert to string without quotes
                    const barewordKey: StringNode = {
                        type: 'String',
                        value: keyLexemes[0].token.value
                    };
                    key = barewordKey;
                } else {
                    // Regular expression key
                    key = this.parseExpression(keyLexemes, 0);
                }

                if (key) {
                    const hashAccess: HashAccessNode = {
                        type: 'HashAccess',
                        base: node,
                        key: key
                    };
                    node = hashAccess;
                    pos = endPos;
                    continue;
                }
                break;
            }

            // No more postfix operators
            break;
        }

        return { node, nextPos: pos };
    }

    private getOperatorInfo(operator: string): Lang.OperatorInfo | null {
        return this.precedenceTable.get(operator) || null;
    }

    private parseReturnStatement(lexemes: Lexeme[]): ReturnNode | null {
        // Skip 'return' keyword
        const remainingLexemes = lexemes.slice(1);

        // If there are no more lexemes, this is a return with no value
        if (remainingLexemes.length === 0) {
            const returnNode: ReturnNode = {
                type: 'Return'
            };
            return returnNode;
        }

        // Parse the return value as an expression (always returns a node, possibly ErrorNode)
        const value = this.parseExpression(remainingLexemes, 0);

        const returnNode: ReturnNode = {
            type: 'Return',
            value
        };
        return returnNode;
    }

    private parseLastStatement(lexemes: Lexeme[]): LastNode | null {
        // Skip 'last' keyword
        const remainingLexemes = lexemes.slice(1);

        // Check if there's a label (an identifier)
        if (remainingLexemes.length > 0 && remainingLexemes[0].category === 'IDENTIFIER') {
            const lastNode: LastNode = {
                type: 'Last',
                label: remainingLexemes[0].token.value
            };
            return lastNode;
        }

        // No label
        const lastNode: LastNode = {
            type: 'Last'
        };
        return lastNode;
    }

    private parseNextStatement(lexemes: Lexeme[]): NextNode | null {
        // Skip 'next' keyword
        const remainingLexemes = lexemes.slice(1);

        // Check if there's a label (an identifier)
        if (remainingLexemes.length > 0 && remainingLexemes[0].category === 'IDENTIFIER') {
            const nextNode: NextNode = {
                type: 'Next',
                label: remainingLexemes[0].token.value
            };
            return nextNode;
        }

        // No label
        const nextNode: NextNode = {
            type: 'Next'
        };
        return nextNode;
    }

    private parseRedoStatement(lexemes: Lexeme[]): RedoNode | null {
        // Skip 'redo' keyword
        const remainingLexemes = lexemes.slice(1);

        // Check if there's a label (an identifier)
        if (remainingLexemes.length > 0 && remainingLexemes[0].category === 'IDENTIFIER') {
            const redoNode: RedoNode = {
                type: 'Redo',
                label: remainingLexemes[0].token.value
            };
            return redoNode;
        }

        // No label
        const redoNode: RedoNode = {
            type: 'Redo'
        };
        return redoNode;
    }

    private parseDieStatement(lexemes: Lexeme[]): DieNode | null {
        // Skip 'die' keyword
        const remainingLexemes = lexemes.slice(1);

        // If there are no more lexemes, this is a die with no message
        if (remainingLexemes.length === 0) {
            const dieNode: DieNode = {
                type: 'Die'
            };
            return dieNode;
        }

        // Parse the die message as an expression (always returns a node, possibly ErrorNode)
        const message = this.parseExpression(remainingLexemes, 0);

        const dieNode: DieNode = {
            type: 'Die',
            message
        };
        return dieNode;
    }

    private parseWarnStatement(lexemes: Lexeme[]): WarnNode | null {
        // Skip 'warn' keyword
        const remainingLexemes = lexemes.slice(1);

        // If there are no more lexemes, this is a warn with no message
        if (remainingLexemes.length === 0) {
            const warnNode: WarnNode = {
                type: 'Warn'
            };
            return warnNode;
        }

        // Parse the warn message as an expression (always returns a node, possibly ErrorNode)
        const message = this.parseExpression(remainingLexemes, 0);

        const warnNode: WarnNode = {
            type: 'Warn',
            message
        };
        return warnNode;
    }

    private parsePrintStatement(lexemes: Lexeme[]): PrintNode | null {
        // Skip 'print' keyword
        const remainingLexemes = lexemes.slice(1);

        // If there are no more lexemes, this is a print with no arguments
        if (remainingLexemes.length === 0) {
            const printNode: PrintNode = {
                type: 'Print',
                arguments: []
            };
            return printNode;
        }

        // Parse the arguments as a comma-separated list using splitByCommas
        const args: ASTNode[] = [];
        const segments = splitByCommas(remainingLexemes);

        for (const segment of segments) {
            if (segment.length > 0) {
                const arg = this.parseExpression(segment, 0);
                if (arg) {
                    args.push(arg);
                }
            }
        }

        const printNode: PrintNode = {
            type: 'Print',
            arguments: args
        };
        return printNode;
    }

    private parseSayStatement(lexemes: Lexeme[]): SayNode | null {
        // Skip 'say' keyword
        const remainingLexemes = lexemes.slice(1);

        // If there are no more lexemes, this is a say with no arguments
        if (remainingLexemes.length === 0) {
            const sayNode: SayNode = {
                type: 'Say',
                arguments: []
            };
            return sayNode;
        }

        // Parse the arguments as a comma-separated list using splitByCommas
        const args: ASTNode[] = [];
        const segments = splitByCommas(remainingLexemes);

        for (const segment of segments) {
            if (segment.length > 0) {
                const arg = this.parseExpression(segment, 0);
                if (arg) {
                    args.push(arg);
                }
            }
        }

        const sayNode: SayNode = {
            type: 'Say',
            arguments: args
        };
        return sayNode;
    }

    private parseDoBlock(lexemes: Lexeme[]): DoBlockNode | ErrorNode | null {
        // Expect: do { statements }
        if (lexemes.length < 3) {
            return ParseError.incompleteDeclaration('do', 'block body', lexemes[0]?.token);
        }

        // Skip 'do' keyword
        if (lexemes[1].category !== 'LBRACE') {
            return ParseError.missingToken('{', lexemes[1]?.token, 'for do block');
        }

        // Find matching RBRACE
        let depth = 1;
        let endPos = 2;
        while (endPos < lexemes.length && depth > 0) {
            if (lexemes[endPos].category === 'LBRACE') depth++;
            if (lexemes[endPos].category === 'RBRACE') depth--;
            endPos++;
        }

        // Extract block contents
        const blockLexemes = lexemes.slice(2, endPos - 1);

        // Parse statements inside the block (same logic as parseBlock)
        const statements: ASTNode[] = [];
        let blockPos = 0;

        while (blockPos < blockLexemes.length) {
            let stmtEnd = blockPos;
            let braceDepth = 0;

            while (stmtEnd < blockLexemes.length) {
                if (blockLexemes[stmtEnd].category === 'LBRACE') {
                    braceDepth++;
                } else if (blockLexemes[stmtEnd].category === 'RBRACE') {
                    braceDepth--;
                    if (braceDepth === 0) {
                        stmtEnd++;
                        break;
                    }
                } else if (blockLexemes[stmtEnd].category === 'TERMINATOR' && braceDepth === 0) {
                    break;
                }
                stmtEnd++;
            }

            const stmtLexemes = blockLexemes.slice(blockPos, stmtEnd);
            if (stmtLexemes.length > 0) {
                const stmt = this.parseStatement(stmtLexemes);
                if (stmt) {
                    statements.push(stmt);
                }
            }

            blockPos = stmtEnd;
            if (blockPos < blockLexemes.length && blockLexemes[blockPos].category === 'TERMINATOR') {
                blockPos++;
            }
        }

        const doBlockNode: DoBlockNode = {
            type: 'DoBlock',
            statements
        };
        return doBlockNode;
    }

    private parseDefer(lexemes: Lexeme[]): DeferNode | ErrorNode | null {
        // Expect: defer { statements }
        if (lexemes.length < 3) {
            return ParseError.incompleteDeclaration('defer', 'block body', lexemes[0]?.token);
        }

        // Skip 'defer' keyword
        if (lexemes[1].category !== 'LBRACE') {
            return ParseError.missingToken('{', lexemes[1]?.token, 'for defer block');
        }

        // Find matching RBRACE
        let depth = 1;
        let endPos = 2;
        while (endPos < lexemes.length && depth > 0) {
            if (lexemes[endPos].category === 'LBRACE') depth++;
            if (lexemes[endPos].category === 'RBRACE') depth--;
            endPos++;
        }

        // Extract block contents
        const blockLexemes = lexemes.slice(2, endPos - 1);

        // Parse statements inside the block (same logic as parseBlock)
        const statements: ASTNode[] = [];
        let blockPos = 0;

        while (blockPos < blockLexemes.length) {
            let stmtEnd = blockPos;
            let braceDepth = 0;

            while (stmtEnd < blockLexemes.length) {
                if (blockLexemes[stmtEnd].category === 'LBRACE') {
                    braceDepth++;
                } else if (blockLexemes[stmtEnd].category === 'RBRACE') {
                    braceDepth--;
                    if (braceDepth === 0) {
                        stmtEnd++;
                        break;
                    }
                } else if (blockLexemes[stmtEnd].category === 'TERMINATOR' && braceDepth === 0) {
                    break;
                }
                stmtEnd++;
            }

            const stmtLexemes = blockLexemes.slice(blockPos, stmtEnd);
            if (stmtLexemes.length > 0) {
                const stmt = this.parseStatement(stmtLexemes);
                if (stmt) {
                    statements.push(stmt);
                }
            }

            blockPos = stmtEnd;
            if (blockPos < blockLexemes.length && blockLexemes[blockPos].category === 'TERMINATOR') {
                blockPos++;
            }
        }

        const deferNode: DeferNode = {
            type: 'Defer',
            block: statements
        };
        return deferNode;
    }

    private parseTryCatch(lexemes: Lexeme[]): TryNode | ErrorNode | null {
        // Expect: try { ... } catch ($e) { ... } finally { ... }
        if (lexemes.length < 3) {
            return ParseError.incompleteDeclaration('try', 'block body', lexemes[0]?.token);
        }

        // Debug: log what lexemes we received
        // console.log('parseTryCatch received lexemes:', lexemes.map(l => `${l.category}:${l.token.value}`).join(' '));

        // Skip 'try' keyword and expect '{'
        if (lexemes[1].category !== 'LBRACE') {
            return ParseError.missingToken('{', lexemes[1]?.token, 'for try block');
        }

        // Find matching RBRACE for try block
        let depth = 1;
        let endPos = 2;
        while (endPos < lexemes.length && depth > 0) {
            if (lexemes[endPos].category === 'LBRACE') depth++;
            if (lexemes[endPos].category === 'RBRACE') depth--;
            endPos++;
        }

        // Parse try block statements
        const tryBlockLexemes = lexemes.slice(2, endPos - 1);
        const tryBlock: ASTNode[] = [];
        let blockPos = 0;

        while (blockPos < tryBlockLexemes.length) {
            let stmtEnd = blockPos;
            let braceDepth = 0;

            while (stmtEnd < tryBlockLexemes.length) {
                if (tryBlockLexemes[stmtEnd].category === 'LBRACE') {
                    braceDepth++;
                } else if (tryBlockLexemes[stmtEnd].category === 'RBRACE') {
                    braceDepth--;
                    if (braceDepth === 0) {
                        stmtEnd++;
                        break;
                    }
                } else if (tryBlockLexemes[stmtEnd].category === 'TERMINATOR' && braceDepth === 0) {
                    break;
                }
                stmtEnd++;
            }

            const stmtLexemes = tryBlockLexemes.slice(blockPos, stmtEnd);
            if (stmtLexemes.length > 0) {
                const stmt = this.parseStatement(stmtLexemes);
                if (stmt) {
                    tryBlock.push(stmt);
                }
            }

            blockPos = stmtEnd;
            if (blockPos < tryBlockLexemes.length && tryBlockLexemes[blockPos].category === 'TERMINATOR') {
                blockPos++;
            }
        }

        // Now parse catch and finally blocks
        const catchClauses: CatchClause[] = [];
        let finallyBlock: ASTNode[] | undefined;
        let pos = endPos;

        // Parse catch clauses (can have multiple)
        while (pos < lexemes.length &&
               lexemes[pos].category === 'CONTROL' &&
               TokenChecker.isControlKeyword(lexemes[pos], 'catch')) {

            pos++; // Skip 'catch'

            // Check for optional parameter
            let parameter: VariableNode | undefined;
            if (pos < lexemes.length && lexemes[pos].category === 'LPAREN') {
                pos++; // Skip '('

                // Check for variable or closing paren (anonymous catch)
                if (pos < lexemes.length &&
                    (lexemes[pos].category === 'SCALAR_VAR' || lexemes[pos].category === 'VARIABLE')) {
                    parameter = {
                        type: 'Variable',
                        name: lexemes[pos].token.value
                    };
                    pos++;
                }

                // Skip closing paren
                if (pos < lexemes.length && lexemes[pos].category === 'RPAREN') {
                    pos++;
                } else {
                    return ParseError.missingToken(')', lexemes[pos]?.token, 'for catch parameter');
                }
            }

            // Parse catch block
            if (pos >= lexemes.length || lexemes[pos].category !== 'LBRACE') {
                return ParseError.missingToken('{', lexemes[pos]?.token, 'for catch block');
            }

            pos++; // Skip '{'
            depth = 1;
            const catchStart = pos;
            while (pos < lexemes.length && depth > 0) {
                if (lexemes[pos].category === 'LBRACE') depth++;
                if (lexemes[pos].category === 'RBRACE') depth--;
                pos++;
            }

            // Parse catch block statements
            const catchBlockLexemes = lexemes.slice(catchStart, pos - 1);
            const catchBlock: ASTNode[] = [];
            blockPos = 0;

            while (blockPos < catchBlockLexemes.length) {
                let stmtEnd = blockPos;
                let braceDepth = 0;

                while (stmtEnd < catchBlockLexemes.length) {
                    if (catchBlockLexemes[stmtEnd].category === 'LBRACE') {
                        braceDepth++;
                    } else if (catchBlockLexemes[stmtEnd].category === 'RBRACE') {
                        braceDepth--;
                        if (braceDepth === 0) {
                            stmtEnd++;
                            break;
                        }
                    } else if (catchBlockLexemes[stmtEnd].category === 'TERMINATOR' && braceDepth === 0) {
                        break;
                    }
                    stmtEnd++;
                }

                const stmtLexemes = catchBlockLexemes.slice(blockPos, stmtEnd);
                if (stmtLexemes.length > 0) {
                    const stmt = this.parseStatement(stmtLexemes);
                    if (stmt) {
                        catchBlock.push(stmt);
                    }
                }

                blockPos = stmtEnd;
                if (blockPos < catchBlockLexemes.length && catchBlockLexemes[blockPos].category === 'TERMINATOR') {
                    blockPos++;
                }
            }

            const catchClause: CatchClause = {
                block: catchBlock
            };
            if (parameter) {
                catchClause.parameter = parameter;
            }
            catchClauses.push(catchClause);
        }

        // Check for finally block
        if (pos < lexemes.length &&
            lexemes[pos].category === 'CONTROL' &&
            TokenChecker.isControlKeyword(lexemes[pos], 'finally')) {

            pos++; // Skip 'finally'

            if (pos >= lexemes.length || lexemes[pos].category !== 'LBRACE') {
                return ParseError.missingToken('{', lexemes[pos]?.token, 'for finally block');
            }

            pos++; // Skip '{'
            depth = 1;
            const finallyStart = pos;
            while (pos < lexemes.length && depth > 0) {
                if (lexemes[pos].category === 'LBRACE') depth++;
                if (lexemes[pos].category === 'RBRACE') depth--;
                pos++;
            }

            // Parse finally block statements
            const finallyBlockLexemes = lexemes.slice(finallyStart, pos - 1);
            finallyBlock = [];
            blockPos = 0;

            while (blockPos < finallyBlockLexemes.length) {
                let stmtEnd = blockPos;
                let braceDepth = 0;

                while (stmtEnd < finallyBlockLexemes.length) {
                    if (finallyBlockLexemes[stmtEnd].category === 'LBRACE') {
                        braceDepth++;
                    } else if (finallyBlockLexemes[stmtEnd].category === 'RBRACE') {
                        braceDepth--;
                        if (braceDepth === 0) {
                            stmtEnd++;
                            break;
                        }
                    } else if (finallyBlockLexemes[stmtEnd].category === 'TERMINATOR' && braceDepth === 0) {
                        break;
                    }
                    stmtEnd++;
                }

                const stmtLexemes = finallyBlockLexemes.slice(blockPos, stmtEnd);
                if (stmtLexemes.length > 0) {
                    const stmt = this.parseStatement(stmtLexemes);
                    if (stmt) {
                        finallyBlock.push(stmt);
                    }
                }

                blockPos = stmtEnd;
                if (blockPos < finallyBlockLexemes.length && finallyBlockLexemes[blockPos].category === 'TERMINATOR') {
                    blockPos++;
                }
            }
        }

        // Must have at least one catch or finally block
        if (catchClauses.length === 0 && !finallyBlock) {
            return ParseError.parseFailure('try block', lexemes, 0);
        }

        const tryNode: TryNode = {
            type: 'Try',
            tryBlock,
            catchClauses
        };
        if (finallyBlock) {
            tryNode.finallyBlock = finallyBlock;
        }
        return tryNode;
    }

    private parseThrowStatement(lexemes: Lexeme[]): ThrowNode | ErrorNode | null {
        // throw or throw $exception
        let value: ASTNode | undefined;

        if (lexemes.length > 1) {
            // Parse the value to throw
            const valueLexemes = lexemes.slice(1);
            value = this.parseExpression(valueLexemes, 0);
        }

        const throwNode: ThrowNode = {
            type: 'Throw'
        };
        if (value) {
            throwNode.value = value;
        }
        return throwNode;
    }

    private parseGiven(lexemes: Lexeme[]): GivenNode | ErrorNode | null {
        // Expect: given ($expr) { when (...) { ... } default { ... } }
        if (lexemes.length < 4) {
            return ParseError.incompleteDeclaration('given', 'expression and block', lexemes[0]?.token);
        }

        let pos = 1; // Skip 'given' keyword

        // Parse expression in parentheses
        if (lexemes[pos].category !== 'LPAREN') {
            return ParseError.missingToken('(', lexemes[pos]?.token, 'for given expression');
        }
        pos++; // Skip '('

        // Find matching RPAREN
        const exprStart = pos;
        let parenDepth = 1;
        while (pos < lexemes.length && parenDepth > 0) {
            if (lexemes[pos].category === 'LPAREN') parenDepth++;
            if (lexemes[pos].category === 'RPAREN') parenDepth--;
            pos++;
        }

        if (parenDepth > 0) {
            return ParseError.missingToken(')', lexemes[pos - 1]?.token, 'for given expression');
        }

        // Parse the expression
        const exprLexemes = lexemes.slice(exprStart, pos - 1);
        const expression = this.parseExpression(exprLexemes, 0);
        if (!expression) {
            return ParseError.parseFailure('given expression', exprLexemes, 0);
        }

        // Expect '{'
        if (pos >= lexemes.length || lexemes[pos].category !== 'LBRACE') {
            return ParseError.missingToken('{', lexemes[pos]?.token, 'for given block');
        }

        // Find matching RBRACE for given block
        let depth = 1;
        const blockStart = pos + 1;
        pos++; // Skip '{'
        while (pos < lexemes.length && depth > 0) {
            if (lexemes[pos].category === 'LBRACE') depth++;
            if (lexemes[pos].category === 'RBRACE') depth--;
            pos++;
        }

        // Parse when clauses and optional default
        const blockLexemes = lexemes.slice(blockStart, pos - 1);
        const whenClauses: WhenClause[] = [];
        let defaultBlock: ASTNode[] | undefined;
        let blockPos = 0;

        while (blockPos < blockLexemes.length) {
            // Skip any terminators
            while (blockPos < blockLexemes.length && blockLexemes[blockPos].category === 'TERMINATOR') {
                blockPos++;
            }
            if (blockPos >= blockLexemes.length) break;

            const keyword = blockLexemes[blockPos];

            if (keyword.category === 'CONTROL' && TokenChecker.isControlKeyword(keyword, 'when')) {
                // Parse when clause
                blockPos++; // Skip 'when'

                // Parse condition in parentheses
                if (blockPos >= blockLexemes.length || blockLexemes[blockPos].category !== 'LPAREN') {
                    return ParseError.missingToken('(', blockLexemes[blockPos]?.token, 'for when condition');
                }
                blockPos++; // Skip '('

                // Find matching RPAREN
                const condStart = blockPos;
                let condParenDepth = 1;
                while (blockPos < blockLexemes.length && condParenDepth > 0) {
                    if (blockLexemes[blockPos].category === 'LPAREN') condParenDepth++;
                    if (blockLexemes[blockPos].category === 'RPAREN') condParenDepth--;
                    blockPos++;
                }

                // Parse the condition
                const condLexemes = blockLexemes.slice(condStart, blockPos - 1);
                const condition = this.parseExpression(condLexemes, 0);
                if (!condition) {
                    return ParseError.parseFailure('when condition', condLexemes, 0);
                }

                // Parse when block
                if (blockPos >= blockLexemes.length || blockLexemes[blockPos].category !== 'LBRACE') {
                    return ParseError.missingToken('{', blockLexemes[blockPos]?.token, 'for when block');
                }

                blockPos++; // Skip '{'
                let whenDepth = 1;
                const whenBlockStart = blockPos;
                while (blockPos < blockLexemes.length && whenDepth > 0) {
                    if (blockLexemes[blockPos].category === 'LBRACE') whenDepth++;
                    if (blockLexemes[blockPos].category === 'RBRACE') whenDepth--;
                    blockPos++;
                }

                // Parse when block statements
                const whenBlockLexemes = blockLexemes.slice(whenBlockStart, blockPos - 1);
                const whenBlock: ASTNode[] = [];
                let whenStmtPos = 0;

                while (whenStmtPos < whenBlockLexemes.length) {
                    let stmtEnd = whenStmtPos;
                    let braceDepth = 0;

                    while (stmtEnd < whenBlockLexemes.length) {
                        if (whenBlockLexemes[stmtEnd].category === 'LBRACE') {
                            braceDepth++;
                        } else if (whenBlockLexemes[stmtEnd].category === 'RBRACE') {
                            braceDepth--;
                            if (braceDepth === 0) {
                                stmtEnd++;
                                break;
                            }
                        } else if (whenBlockLexemes[stmtEnd].category === 'TERMINATOR' && braceDepth === 0) {
                            break;
                        }
                        stmtEnd++;
                    }

                    const stmtLexemes = whenBlockLexemes.slice(whenStmtPos, stmtEnd);
                    if (stmtLexemes.length > 0) {
                        const stmt = this.parseStatement(stmtLexemes);
                        if (stmt) {
                            whenBlock.push(stmt);
                        }
                    }

                    whenStmtPos = stmtEnd;
                    if (whenStmtPos < whenBlockLexemes.length && whenBlockLexemes[whenStmtPos].category === 'TERMINATOR') {
                        whenStmtPos++;
                    }
                }

                whenClauses.push({
                    condition,
                    block: whenBlock
                });

            } else if (keyword.category === 'CONTROL' && TokenChecker.isControlKeyword(keyword, 'default')) {
                // Parse default block
                blockPos++; // Skip 'default'

                if (blockPos >= blockLexemes.length || blockLexemes[blockPos].category !== 'LBRACE') {
                    return ParseError.missingToken('{', blockLexemes[blockPos]?.token, 'for default block');
                }

                blockPos++; // Skip '{'
                let defaultDepth = 1;
                const defaultBlockStart = blockPos;
                while (blockPos < blockLexemes.length && defaultDepth > 0) {
                    if (blockLexemes[blockPos].category === 'LBRACE') defaultDepth++;
                    if (blockLexemes[blockPos].category === 'RBRACE') defaultDepth--;
                    blockPos++;
                }

                // Parse default block statements
                const defaultBlockLexemes = blockLexemes.slice(defaultBlockStart, blockPos - 1);
                defaultBlock = [];
                let defaultStmtPos = 0;

                while (defaultStmtPos < defaultBlockLexemes.length) {
                    let stmtEnd = defaultStmtPos;
                    let braceDepth = 0;

                    while (stmtEnd < defaultBlockLexemes.length) {
                        if (defaultBlockLexemes[stmtEnd].category === 'LBRACE') {
                            braceDepth++;
                        } else if (defaultBlockLexemes[stmtEnd].category === 'RBRACE') {
                            braceDepth--;
                            if (braceDepth === 0) {
                                stmtEnd++;
                                break;
                            }
                        } else if (defaultBlockLexemes[stmtEnd].category === 'TERMINATOR' && braceDepth === 0) {
                            break;
                        }
                        stmtEnd++;
                    }

                    const stmtLexemes = defaultBlockLexemes.slice(defaultStmtPos, stmtEnd);
                    if (stmtLexemes.length > 0) {
                        const stmt = this.parseStatement(stmtLexemes);
                        if (stmt) {
                            defaultBlock.push(stmt);
                        }
                    }

                    defaultStmtPos = stmtEnd;
                    if (defaultStmtPos < defaultBlockLexemes.length && defaultBlockLexemes[defaultStmtPos].category === 'TERMINATOR') {
                        defaultStmtPos++;
                    }
                }
            } else {
                // Unexpected token in given block
                blockPos++;
            }
        }

        const givenNode: GivenNode = {
            type: 'Given',
            expression,
            whenClauses
        };

        if (defaultBlock) {
            givenNode.defaultBlock = defaultBlock;
        }

        return givenNode;
    }

    private parseBreakStatement(lexemes: Lexeme[]): BreakNode | ErrorNode | null {
        // break or break LABEL
        const breakNode: BreakNode = {
            type: 'Break'
        };

        if (lexemes.length > 1 && lexemes[1].category === 'IDENTIFIER') {
            breakNode.label = lexemes[1].token.value;
        }

        return breakNode;
    }

    private parseContinueStatement(lexemes: Lexeme[]): ContinueNode | ErrorNode | null {
        // continue or continue LABEL
        const continueNode: ContinueNode = {
            type: 'Continue'
        };

        if (lexemes.length > 1 && lexemes[1].category === 'IDENTIFIER') {
            continueNode.label = lexemes[1].token.value;
        }

        return continueNode;
    }

    private parseSubDeclaration(lexemes: Lexeme[]): SubNode | ErrorNode | null {
        let pos = 1; // Skip 'sub' keyword

        if (pos >= lexemes.length) {
            return ParseError.incompleteDeclaration('sub', 'name or parameters', lexemes[0].token);
        }

        // Check for optional name (identifier)
        let name: string | undefined = undefined;
        if (lexemes[pos].category === 'IDENTIFIER') {
            name = lexemes[pos].token.value;
            pos++;
        }

        // Parse parameters (parentheses are optional)
        const parameters: ParameterNode[] = [];

        if (pos < lexemes.length && lexemes[pos].category === 'LPAREN') {
            pos++; // Skip LPAREN

            // Find matching RPAREN
            let depth = 1;
            let paramEnd = pos;
            while (paramEnd < lexemes.length && depth > 0) {
                if (lexemes[paramEnd].category === 'LPAREN') depth++;
                if (lexemes[paramEnd].category === 'RPAREN') depth--;
                paramEnd++;
            }

            // Parse parameters
            const paramLexemes = lexemes.slice(pos, paramEnd - 1);

            if (paramLexemes.length > 0) {
                // Split by commas at depth 0
                let paramStart = 0;
                let parenDepth = 0;

                for (let i = 0; i < paramLexemes.length; i++) {
                    if (paramLexemes[i].category === 'LPAREN') parenDepth++;
                    if (paramLexemes[i].category === 'RPAREN') parenDepth--;

                    if (paramLexemes[i].category === 'COMMA' && parenDepth === 0) {
                        // Found a parameter boundary
                        const paramTokens = paramLexemes.slice(paramStart, i);
                        const param = this.parseParameter(paramTokens);
                        if (param && param.type === 'Parameter') {
                            parameters.push(param);
                        }
                        paramStart = i + 1; // Skip the comma
                    }
                }

                // Don't forget the last parameter
                const lastParamTokens = paramLexemes.slice(paramStart);
                if (lastParamTokens.length > 0) {
                    const param = this.parseParameter(lastParamTokens);
                    if (param && param.type === 'Parameter') {
                        parameters.push(param);
                    }
                }
            }

            pos = paramEnd; // Move past RPAREN
        }

        // Expect LBRACE for body
        if (pos >= lexemes.length || lexemes[pos].category !== 'LBRACE') {
            return ParseError.missingToken('{', lexemes[pos - 1]?.token || lexemes[lexemes.length - 1]?.token, 'for sub body');
        }

        // Parse the block body
        const blockResult = this.parseBlock(lexemes, pos);
        if (!blockResult) {
            return ParseError.missingToken('{', lexemes[pos]?.token, 'for sub body');
        }

        // Create SubNode with or without name
        if (name !== undefined) {
            const subNode: SubNode = {
                type: 'Sub',
                name,
                parameters,
                body: blockResult.statements
            };
            return subNode;
        } else {
            const subNode: SubNode = {
                type: 'Sub',
                parameters,
                body: blockResult.statements
            };
            return subNode;
        }
    }

    private parseParameter(lexemes: Lexeme[]): ParameterNode | ErrorNode | null {
        if (lexemes.length === 0) {
            return ParseError.emptyExpression('parameter', undefined);
        }

        // First token should be a variable
        if (lexemes[0].category !== 'SCALAR_VAR' &&
            lexemes[0].category !== 'ARRAY_VAR' &&
            lexemes[0].category !== 'HASH_VAR') {
            return ParseError.invalidSyntax('Parameter must be a variable', lexemes[0].token);
        }

        const variable: VariableNode = {
            type: 'Variable',
            name: lexemes[0].token.value
        };

        // Check for default value (= expression)
        if (lexemes.length > 1 && lexemes[1].category === 'ASSIGNOP') {
            const defaultLexemes = lexemes.slice(2);
            const defaultValue = this.parseExpression(defaultLexemes, 0);

            if (defaultValue) {
                const paramNode: ParameterNode = {
                    type: 'Parameter',
                    variable,
                    defaultValue
                };
                return paramNode;
            }
        }

        // No default value
        const paramNode: ParameterNode = {
            type: 'Parameter',
            variable
        };
        return paramNode;
    }

    private parseBlockStatement(lexemes: Lexeme[]): BlockNode | null {
        // Parse the block (starting at position 0)
        const blockResult = this.parseBlock(lexemes, 0);
        if (!blockResult) {
            return null;
        }

        const blockNode: BlockNode = {
            type: 'Block',
            statements: blockResult.statements
        };

        return blockNode;
    }

    private parseIfStatement(lexemes: Lexeme[]): IfNode | ErrorNode {
        let pos = 1; // Skip 'if'

        // Parse condition (must be parenthesized)
        if (pos >= lexemes.length || lexemes[pos].category !== 'LPAREN') {
            return ParseError.missingToken(
                '(',
                lexemes[pos]?.token,
                'after if keyword'
            );
        }

        // Find matching RPAREN for condition
        let depth = 1;
        let condEnd = pos + 1;
        while (condEnd < lexemes.length && depth > 0) {
            if (lexemes[condEnd].category === 'LPAREN') depth++;
            if (lexemes[condEnd].category === 'RPAREN') depth--;
            condEnd++;
        }

        // Parse condition expression (always returns a node, possibly ErrorNode)
        const condLexemes = lexemes.slice(pos + 1, condEnd - 1);
        const condition = this.parseExpression(condLexemes, 0);

        pos = condEnd;

        // Parse then block
        const thenResult = this.parseBlock(lexemes, pos);
        if (!thenResult) {
            return ParseError.missingToken('{', lexemes[pos]?.token, 'for if statement body');
        }

        const thenBlock = thenResult.statements;
        pos = thenResult.nextPos;

        // Parse elsif clauses
        const elseIfClauses: ElseIfClause[] = [];
        while (pos < lexemes.length &&
               lexemes[pos].category === 'CONTROL' &&
               lexemes[pos].token.value === 'elsif') {
            pos++; // Skip 'elsif'

            // Parse elsif condition
            if (pos >= lexemes.length || lexemes[pos].category !== 'LPAREN') {
                break;
            }

            depth = 1;
            let elsifCondEnd = pos + 1;
            while (elsifCondEnd < lexemes.length && depth > 0) {
                if (lexemes[elsifCondEnd].category === 'LPAREN') depth++;
                if (lexemes[elsifCondEnd].category === 'RPAREN') depth--;
                elsifCondEnd++;
            }

            const elsifCondLexemes = lexemes.slice(pos + 1, elsifCondEnd - 1);
            const elsifCondition = this.parseExpression(elsifCondLexemes, 0);
            if (!elsifCondition) {
                break;
            }

            pos = elsifCondEnd;

            // Parse elsif block
            const elsifBlockResult = this.parseBlock(lexemes, pos);
            if (!elsifBlockResult) {
                break;
            }

            elseIfClauses.push({
                condition: elsifCondition,
                block: elsifBlockResult.statements
            });

            pos = elsifBlockResult.nextPos;
        }

        // Parse optional else block
        if (pos < lexemes.length &&
            lexemes[pos].category === 'CONTROL' &&
            lexemes[pos].token.value === 'else') {
            pos++; // Skip 'else'

            const elseBlockResult = this.parseBlock(lexemes, pos);
            if (elseBlockResult) {
                const ifNode: IfNode = {
                    type: 'If',
                    condition,
                    thenBlock,
                    elseIfClauses,
                    elseBlock: elseBlockResult.statements
                };
                return ifNode;
            }
        }

        const ifNode: IfNode = {
            type: 'If',
            condition,
            thenBlock,
            elseIfClauses
        };

        return ifNode;
    }

    private parseUnlessStatement(lexemes: Lexeme[]): UnlessNode | ErrorNode {
        let pos = 1; // Skip 'unless'

        // Parse condition (must be parenthesized)
        if (pos >= lexemes.length || lexemes[pos].category !== 'LPAREN') {
            return ParseError.missingToken('(', lexemes[pos]?.token, 'after unless keyword');
        }

        // Find matching RPAREN for condition
        let depth = 1;
        let condEnd = pos + 1;
        while (condEnd < lexemes.length && depth > 0) {
            if (lexemes[condEnd].category === 'LPAREN') depth++;
            if (lexemes[condEnd].category === 'RPAREN') depth--;
            condEnd++;
        }

        // Parse condition expression (always returns a node, possibly ErrorNode)
        const condLexemes = lexemes.slice(pos + 1, condEnd - 1);
        const condition = this.parseExpression(condLexemes, 0);

        pos = condEnd;

        // Parse then block
        const thenResult = this.parseBlock(lexemes, pos);
        if (!thenResult) {
            return ParseError.missingToken('{', lexemes[pos]?.token, 'for unless statement body');
        }

        const thenBlock = thenResult.statements;
        pos = thenResult.nextPos;

        // Parse optional else block
        if (pos < lexemes.length &&
            lexemes[pos].category === 'CONTROL' &&
            lexemes[pos].token.value === 'else') {
            pos++; // Skip 'else'

            const elseBlockResult = this.parseBlock(lexemes, pos);
            if (elseBlockResult) {
                const unlessNode: UnlessNode = {
                    type: 'Unless',
                    condition,
                    thenBlock,
                    elseBlock: elseBlockResult.statements
                };
                return unlessNode;
            }
        }

        const unlessNode: UnlessNode = {
            type: 'Unless',
            condition,
            thenBlock
        };

        return unlessNode;
    }

    private parseWhileStatement(lexemes: Lexeme[], label?: string): WhileNode | ErrorNode {
        let pos = 1; // Skip 'while'

        // Parse condition (must be parenthesized)
        if (pos >= lexemes.length || lexemes[pos].category !== 'LPAREN') {
            return ParseError.missingToken('(', lexemes[pos]?.token, 'after while keyword');
        }

        // Find matching RPAREN for condition
        let depth = 1;
        let condEnd = pos + 1;
        while (condEnd < lexemes.length && depth > 0) {
            if (lexemes[condEnd].category === 'LPAREN') depth++;
            if (lexemes[condEnd].category === 'RPAREN') depth--;
            condEnd++;
        }

        // Parse condition expression
        const condLexemes = lexemes.slice(pos + 1, condEnd - 1);
        const condition = this.parseExpression(condLexemes, 0);
        if (!condition) {
            return ParseError.emptyExpression('while condition', lexemes[pos]?.token);
        }

        pos = condEnd;

        // Parse block
        const blockResult = this.parseBlock(lexemes, pos);
        if (!blockResult) {
            return ParseError.missingToken('{', lexemes[pos]?.token, 'for while statement body');
        }

        const whileNode: WhileNode = {
            type: 'While',
            condition,
            block: blockResult.statements,
            ...(label && { label })
        };

        return whileNode;
    }

    private parseUntilStatement(lexemes: Lexeme[], label?: string): UntilNode | ErrorNode {
        let pos = 1; // Skip 'until'

        // Parse condition (must be parenthesized)
        if (pos >= lexemes.length || lexemes[pos].category !== 'LPAREN') {
            return ParseError.missingToken('(', lexemes[pos]?.token, 'after until keyword');
        }

        // Find matching RPAREN for condition
        let depth = 1;
        let condEnd = pos + 1;
        while (condEnd < lexemes.length && depth > 0) {
            if (lexemes[condEnd].category === 'LPAREN') depth++;
            if (lexemes[condEnd].category === 'RPAREN') depth--;
            condEnd++;
        }

        // Parse condition expression
        const condLexemes = lexemes.slice(pos + 1, condEnd - 1);
        const condition = this.parseExpression(condLexemes, 0);
        if (!condition) {
            return ParseError.emptyExpression('until condition', lexemes[pos]?.token);
        }

        pos = condEnd;

        // Parse block
        const blockResult = this.parseBlock(lexemes, pos);
        if (!blockResult) {
            return ParseError.missingToken('{', lexemes[pos]?.token, 'for until statement body');
        }

        const untilNode: UntilNode = {
            type: 'Until',
            condition,
            block: blockResult.statements,
            ...(label && { label })
        };

        return untilNode;
    }

    private parseForeachStatement(lexemes: Lexeme[], label?: string): ForeachNode | ErrorNode {
        let pos = 1; // Skip 'foreach' or 'for'

        // Check for optional declarator (my, our, state)
        let declarator: string | undefined = undefined;
        if (pos < lexemes.length && lexemes[pos].category === 'DECLARATION') {
            declarator = lexemes[pos].token.value;
            pos++;
        }

        // Parse iterator variable (must be a scalar)
        if (pos >= lexemes.length || lexemes[pos].category !== 'SCALAR_VAR') {
            return ParseError.invalidSyntax('foreach requires a scalar iterator variable', lexemes[pos]?.token);
        }

        const variable: VariableNode = {
            type: 'Variable',
            name: lexemes[pos].token.value
        };
        pos++;

        // Parse list expression (must be parenthesized)
        if (pos >= lexemes.length || lexemes[pos].category !== 'LPAREN') {
            return ParseError.missingToken('(', lexemes[pos]?.token, 'after foreach iterator variable');
        }

        // Find matching RPAREN for list expression
        let depth = 1;
        let listEnd = pos + 1;
        while (listEnd < lexemes.length && depth > 0) {
            if (lexemes[listEnd].category === 'LPAREN') depth++;
            if (lexemes[listEnd].category === 'RPAREN') depth--;
            listEnd++;
        }

        // Parse list expression (always returns a node, possibly ErrorNode)
        const listLexemes = lexemes.slice(pos + 1, listEnd - 1);
        const listExpr = this.parseExpression(listLexemes, 0);

        pos = listEnd;

        // Parse block
        const blockResult = this.parseBlock(lexemes, pos);
        if (!blockResult) {
            return ParseError.missingToken('{', lexemes[pos]?.token, 'for foreach statement body');
        }

        const foreachNode: ForeachNode = {
            type: 'Foreach',
            variable,
            ...(declarator && { declarator }),
            listExpr,
            block: blockResult.statements,
            ...(label && { label })
        };
        return foreachNode;
    }

    private parseBlock(
        lexemes: Lexeme[],
        startPos: number
    ): { statements: ASTNode[]; nextPos: number } | null {
        if (startPos >= lexemes.length || lexemes[startPos].category !== 'LBRACE') {
            return null;
        }

        // Find matching RBRACE
        let depth = 1;
        let endPos = startPos + 1;
        while (endPos < lexemes.length && depth > 0) {
            if (lexemes[endPos].category === 'LBRACE') depth++;
            if (lexemes[endPos].category === 'RBRACE') depth--;
            endPos++;
        }

        // Extract statements inside the block
        const blockLexemes = lexemes.slice(startPos + 1, endPos - 1);

        // Parse statements inside the block
        const statements: ASTNode[] = [];
        let pos = 0;

        while (pos < blockLexemes.length) {
            // Find the next statement boundary
            // Could be a TERMINATOR, or a closing RBRACE of a nested block
            let stmtEnd = pos;
            let braceDepth = 0;

            while (stmtEnd < blockLexemes.length) {
                if (blockLexemes[stmtEnd].category === 'LBRACE') {
                    braceDepth++;
                } else if (blockLexemes[stmtEnd].category === 'RBRACE') {
                    braceDepth--;
                    // If we just closed a brace and we're back at depth 0,
                    // check if this might continue with elsif/else
                    if (braceDepth === 0) {
                        stmtEnd++;
                        // Check if next token is elsif or else
                        if (stmtEnd < blockLexemes.length &&
                            blockLexemes[stmtEnd].category === 'CONTROL') {
                            const nextKeyword = blockLexemes[stmtEnd].token.value;
                            // Check if current statement starts with if/unless
                            const stmtLexemes = blockLexemes.slice(pos, stmtEnd);
                            if (stmtLexemes.length > 0 && stmtLexemes[0].category === 'CONTROL') {
                                const firstKeyword = stmtLexemes[0].token.value;
                                // Check for valid continuations
                                if ((firstKeyword === 'if' && (nextKeyword === 'elsif' || nextKeyword === 'else')) ||
                                    (firstKeyword === 'unless' && nextKeyword === 'else')) {
                                    // Continue to include elsif/else in this statement
                                    continue;
                                }
                            }
                        }
                        break;
                    }
                } else if (blockLexemes[stmtEnd].category === 'TERMINATOR' && braceDepth === 0) {
                    // Found a terminator at depth 0
                    break;
                }
                stmtEnd++;
            }

            // Parse the statement
            const stmtLexemes = blockLexemes.slice(pos, stmtEnd);
            if (stmtLexemes.length > 0) {
                const stmt = this.parseStatement(stmtLexemes);
                if (stmt) {
                    statements.push(stmt);
                }
            }

            // Move past the terminator (if there was one)
            pos = stmtEnd;
            if (pos < blockLexemes.length && blockLexemes[pos].category === 'TERMINATOR') {
                pos++;
            }
        }


        return {
            statements,
            nextPos: endPos
        };
    }

    private parsePackageDeclaration(lexemes: Lexeme[]): PackageNode | null {
        // package Foo::Bar;
        // package Foo::Bar { ... }
        // Skip 'package' keyword
        const remainingLexemes = lexemes.slice(1);

        if (remainingLexemes.length === 0) {
            return null;
        }

        // Build the package name from identifiers and :: operators
        let packageName = '';
        let i = 0;
        for (; i < remainingLexemes.length; i++) {
            const lex = remainingLexemes[i];

            if (lex.category === 'IDENTIFIER') {
                packageName += lex.token.value;
            } else if (TokenChecker.isColon(lex)) {
                // Handle :: as two : tokens
                if (i + 1 < remainingLexemes.length &&
                    TokenChecker.isColon(remainingLexemes[i + 1])) {
                    packageName += '::';
                    i++; // Skip the second :
                } else {
                    // Single : is not valid in package names
                    break;
                }
            } else {
                // End of package name
                break;
            }
        }

        if (packageName === '') {
            return null;
        }

        // Check for package block { }
        if (i < remainingLexemes.length && remainingLexemes[i].category === 'LBRACE') {
            // Parse the block body
            const blockResult = this.parseBlock(remainingLexemes, i);
            if (blockResult) {
                const packageNode: PackageNode = {
                    type: 'Package',
                    name: packageName,
                    body: blockResult.statements
                };
                return packageNode;
            }
        }

        const packageNode: PackageNode = {
            type: 'Package',
            name: packageName
        };
        return packageNode;
    }

    private parseUseStatement(lexemes: Lexeme[]): UseNode | null {
        // use Module;
        // use Module qw(...);
        // use v5.40;
        // use 5.040;
        // Skip 'use' keyword
        const remainingLexemes = lexemes.slice(1);

        if (remainingLexemes.length === 0) {
            return null;
        }

        // Check if this is a version statement
        // Version patterns: v5.40, 5.040, v5
        let isVersion = false;
        let version = '';
        let i = 0;

        // Check for version: starts with identifier like "v5" or just a number
        if (remainingLexemes[0].category === 'IDENTIFIER' && remainingLexemes[0].token.value.match(/^v\d+$/)) {
            // Pattern: v5.40 (identifier "v5" followed by ".40")
            version = remainingLexemes[0].token.value;
            i = 1;
            isVersion = true;

            // Look for .NN after v5
            if (i < remainingLexemes.length &&
                TokenChecker.isOperator(remainingLexemes[i], '.')) {
                version += '.';
                i++;
                if (i < remainingLexemes.length &&
                    remainingLexemes[i].category === 'LITERAL' &&
                    remainingLexemes[i].token.type === 'NUMBER') {
                    version += remainingLexemes[i].token.value;
                    i++;
                }
            }
        } else if (remainingLexemes[0].category === 'LITERAL' && remainingLexemes[0].token.type === 'NUMBER') {
            // Pattern: 5.040 (number followed by . and another number)
            version = remainingLexemes[0].token.value;
            i = 1;
            isVersion = true;

            // Look for .NNN after the first number
            if (i < remainingLexemes.length &&
                TokenChecker.isOperator(remainingLexemes[i], '.')) {
                version += '.';
                i++;
                if (i < remainingLexemes.length &&
                    remainingLexemes[i].category === 'LITERAL' &&
                    remainingLexemes[i].token.type === 'NUMBER') {
                    version += remainingLexemes[i].token.value;
                    i++;
                }
            }
        }

        if (isVersion) {
            const useNode: UseNode = {
                type: 'Use',
                version
            };
            return useNode;
        }

        // Build the module name from identifiers and :: operators
        let moduleName = '';
        for (; i < remainingLexemes.length; i++) {
            const lex = remainingLexemes[i];

            if (lex.category === 'IDENTIFIER') {
                moduleName += lex.token.value;
            } else if (TokenChecker.isColon(lex)) {
                // Handle :: as two : tokens
                if (i + 1 < remainingLexemes.length &&
                    TokenChecker.isColon(remainingLexemes[i + 1])) {
                    moduleName += '::';
                    i++; // Skip the second :
                } else {
                    // Single : is not valid in module names
                    break;
                }
            } else {
                // End of module name
                break;
            }
        }

        if (moduleName === '') {
            return null;
        }

        // Check for import list (e.g., qw(...))
        const importLexemes = remainingLexemes.slice(i);
        let imports: ASTNode | undefined = undefined;

        if (importLexemes.length > 0) {
            // Parse the import list as an expression
            const parsedImports = this.parseExpression(importLexemes, 0);
            if (parsedImports) {
                imports = parsedImports;
            }
        }

        const useNode: UseNode = {
            type: 'Use',
            module: moduleName
        };

        if (imports !== undefined) {
            useNode.imports = imports;
        }

        return useNode;
    }

    private parseClassDeclaration(lexemes: Lexeme[]): ClassNode | ErrorNode | null {
        // class Name { body }
        // class Name::Foo { body }

        // Skip 'class' keyword
        let i = 1;

        // Parse class name (can include ::)
        let name = '';
        while (i < lexemes.length) {
            if (lexemes[i].category === 'IDENTIFIER') {
                name += lexemes[i].token.value;
                i++;
            } else if (i + 1 < lexemes.length &&
                       TokenChecker.isColon(lexemes[i]) &&
                       lexemes[i + 1].category === 'BINOP' &&
                       TokenChecker.isColon(lexemes[i + 1])) {
                // Handle :: separator
                name += '::';
                i += 2; // Skip both :
            } else {
                break;
            }
        }

        if (name === '') {
            return ParseError.incompleteDeclaration('class', 'name', lexemes[0]?.token);
        }

        // Check for :isa(...) inheritance
        let parent: string | undefined = undefined;
        if (i < lexemes.length &&
            TokenChecker.isColon(lexemes[i])) {
            i++; // Skip ':'

            // Expect 'isa' identifier
            if (i < lexemes.length &&
                lexemes[i].category === 'IDENTIFIER' &&
                lexemes[i].token.value === 'isa') {
                i++; // Skip 'isa'

                // Expect opening parenthesis
                if (i < lexemes.length && lexemes[i].category === 'LPAREN') {
                    i++; // Skip '('

                    // Parse parent class name (can include ::)
                    parent = '';
                    while (i < lexemes.length) {
                        if (lexemes[i].category === 'IDENTIFIER') {
                            parent += lexemes[i].token.value;
                            i++;
                        } else if (i + 1 < lexemes.length &&
                                   lexemes[i].category === 'BINOP' &&
                                   lexemes[i].token.value === ':' &&
                                   lexemes[i + 1].category === 'BINOP' &&
                                   lexemes[i + 1].token.value === ':') {
                            // Handle :: separator
                            parent += '::';
                            i += 2; // Skip both :
                        } else if (lexemes[i].category === 'RPAREN') {
                            i++; // Skip ')'
                            break;
                        } else {
                            return ParseError.invalidSyntax('Invalid parent class name in :isa()', lexemes[i].token);
                        }
                    }
                }
            }
        }

        // Expect opening brace
        if (i >= lexemes.length || lexemes[i].category !== 'LBRACE') {
            return ParseError.missingToken('{', lexemes[i - 1]?.token || lexemes[lexemes.length - 1]?.token, 'for class body');
        }
        i++; // Skip opening brace

        // Parse class body until closing brace
        const body: ASTNode[] = [];
        const bodyLexemes: Lexeme[] = [];
        let depth = 1; // We're already inside the first brace
        let prevDepth = 1;

        while (i < lexemes.length) {
            const lexeme = lexemes[i];

            if (lexeme.category === 'LBRACE') {
                depth++;
                bodyLexemes.push(lexeme);
            } else if (lexeme.category === 'RBRACE') {
                depth--;
                if (depth === 0) {
                    // End of class body
                    // Parse any remaining buffered lexemes
                    if (bodyLexemes.length > 0) {
                        const stmt = this.parseClassBodyStatement(bodyLexemes);
                        if (stmt) {
                            body.push(stmt);
                        }
                    }
                    break;
                } else {
                    bodyLexemes.push(lexeme);
                    // If we just closed a nested block (e.g., method body), parse the statement
                    if (depth === 1 && prevDepth === 2) {
                        if (bodyLexemes.length > 0) {
                            const stmt = this.parseClassBodyStatement(bodyLexemes);
                            if (stmt) {
                                body.push(stmt);
                            }
                            bodyLexemes.length = 0; // Clear buffer
                        }
                    }
                }
            } else if (lexeme.category === 'TERMINATOR' && depth === 1) {
                // Statement terminator at class body level
                if (bodyLexemes.length > 0) {
                    const stmt = this.parseClassBodyStatement(bodyLexemes);
                    if (stmt) {
                        body.push(stmt);
                    }
                    bodyLexemes.length = 0; // Clear buffer
                }
            } else {
                bodyLexemes.push(lexeme);
            }

            prevDepth = depth;
            i++;
        }

        const classNode: ClassNode = {
            type: 'Class',
            name,
            body
        };

        if (parent !== undefined) {
            classNode.parent = parent;
        }

        return classNode;
    }

    private parseClassBodyStatement(lexemes: Lexeme[]): ASTNode | null {
        if (lexemes.length === 0) {
            return null;
        }

        // Check for field declaration
        if (lexemes[0].category === 'DECLARATION' && lexemes[0].token.value === 'field') {
            return this.parseFieldDeclaration(lexemes);
        }

        // Check for has declaration (synonym for field)
        if (lexemes[0].category === 'KEYWORD' && lexemes[0].token.value === 'has') {
            return this.parseFieldDeclaration(lexemes);
        }

        // Check for method declaration
        if (lexemes[0].category === 'DECLARATION' && lexemes[0].token.value === 'method') {
            return this.parseMethodDeclaration(lexemes);
        }

        // Otherwise, parse as regular statement (allows subs, etc. in classes)
        return this.parseStatement(lexemes);
    }

    private parseFieldDeclaration(lexemes: Lexeme[]): FieldNode | ErrorNode | null {
        // field $x;
        // field $x :param;
        // field $x :param :reader;
        // has $x :reader :writer :param;

        // Skip 'field' or 'has' keyword
        let i = 1;

        // Expect a variable (scalar, array, or hash)
        if (i >= lexemes.length ||
            (lexemes[i].category !== 'SCALAR_VAR' &&
             lexemes[i].category !== 'ARRAY_VAR' &&
             lexemes[i].category !== 'HASH_VAR')) {
            return ParseError.incompleteDeclaration('field', 'variable', lexemes[0]?.token);
        }

        const variable: VariableNode = {
            type: 'Variable',
            name: lexemes[i].token.value
        };
        i++;

        // Parse optional attributes (starting with :)
        const attributes: string[] = [];
        while (i < lexemes.length) {
            if (TokenChecker.isColon(lexemes[i])) {
                // Next should be an identifier (attribute name)
                if (i + 1 < lexemes.length && lexemes[i + 1].category === 'IDENTIFIER') {
                    attributes.push(lexemes[i + 1].token.value);
                    i += 2; // Skip : and attribute name
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        const fieldNode: FieldNode = {
            type: 'Field',
            variable
        };

        if (attributes.length > 0) {
            fieldNode.attributes = attributes;
        }

        return fieldNode;
    }

    private parseMethodDeclaration(lexemes: Lexeme[]): MethodNode | ErrorNode | null {
        // method name() { body }
        // method name($x, $y) { body }

        // Skip 'method' keyword
        let pos = 1;

        // Expect method name (identifier)
        if (pos >= lexemes.length || lexemes[pos].category !== 'IDENTIFIER') {
            return ParseError.incompleteDeclaration('method', 'name', lexemes[0]?.token);
        }

        const name = lexemes[pos].token.value;
        pos++;

        // Parse parameters (parentheses are optional)
        const parameters: ParameterNode[] = [];

        if (pos < lexemes.length && lexemes[pos].category === 'LPAREN') {
            pos++; // Skip LPAREN

            // Find matching closing parenthesis
            let depth = 1;
            let paramEnd = pos;
            while (paramEnd < lexemes.length && depth > 0) {
                if (lexemes[paramEnd].category === 'LPAREN') depth++;
                if (lexemes[paramEnd].category === 'RPAREN') depth--;
                paramEnd++;
            }

            // Parse parameters (same logic as sub declaration)
            const paramLexemes = lexemes.slice(pos, paramEnd - 1);

            if (paramLexemes.length > 0) {
                // Split by commas at depth 0
                let paramStart = 0;
                let parenDepth = 0;

                for (let i = 0; i < paramLexemes.length; i++) {
                    if (paramLexemes[i].category === 'LPAREN') parenDepth++;
                    if (paramLexemes[i].category === 'RPAREN') parenDepth--;

                    if (paramLexemes[i].category === 'COMMA' && parenDepth === 0) {
                        // Found a parameter boundary
                        const paramTokens = paramLexemes.slice(paramStart, i);
                        const param = this.parseParameter(paramTokens);
                        if (param && param.type === 'Parameter') {
                            parameters.push(param);
                        }
                        paramStart = i + 1; // Skip the comma
                    }
                }

                // Don't forget the last parameter
                const lastParamTokens = paramLexemes.slice(paramStart);
                if (lastParamTokens.length > 0) {
                    const param = this.parseParameter(lastParamTokens);
                    if (param && param.type === 'Parameter') {
                        parameters.push(param);
                    }
                }
            }

            pos = paramEnd; // Move past RPAREN
        }

        // Expect LBRACE for body
        if (pos >= lexemes.length || lexemes[pos].category !== 'LBRACE') {
            return ParseError.missingToken('{', lexemes[pos - 1]?.token || lexemes[lexemes.length - 1]?.token, 'for method body');
        }

        // Parse the block body
        const blockResult = this.parseBlock(lexemes, pos);
        if (!blockResult) {
            return ParseError.missingToken('{', lexemes[pos]?.token, 'for method body');
        }

        return {
            type: 'Method',
            name,
            parameters,
            body: blockResult.statements
        };
    }

    /**
     * Creates an ErrorNode for parse/syntax errors
     * @param message The error message
     * @param lexemes The lexeme array for context
     * @param pos The position in lexemes where the error occurred (defaults to 0)
     */
    private createParseError(message: string, lexemes: Lexeme[], pos: number = 0): ErrorNode {
        // Use the lexeme at pos if available, otherwise use first or create a default
        const lexeme = lexemes[pos] || lexemes[0];

        if (lexeme) {
            return {
                type: 'Error',
                message,
                value: lexeme.token.value,
                line: lexeme.token.line,
                column: lexeme.token.column
            };
        }

        // Fallback for empty lexeme arrays (shouldn't happen in practice)
        return {
            type: 'Error',
            message,
            value: '',
            line: 0,
            column: 0
        };
    }

    private getErrorMessage(token: { type: string; value: string }): string {
        // Detect if this is an unclosed string
        if (token.value.startsWith('"') || token.value.startsWith("'")) {
            const quote = token.value[0];
            return `Unterminated string literal (missing closing ${quote})`;
        }

        // Unknown character
        if (token.value.length === 1) {
            const charCode = token.value.charCodeAt(0);
            if (charCode < 32 || charCode > 126) {
                return `Unexpected control character (code: ${charCode})`;
            }
            return `Unexpected character '${token.value}'`;
        }

        // Other errors
        return `Invalid token: ${token.value}`;
    }
}
