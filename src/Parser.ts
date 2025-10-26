import { Lexeme, LexemeCategory } from './Lexer.js';
import * as Lang from './LanguageSpec.js';
import {
    ASTNode,
    ErrorNode,
    NumberNode,
    StringNode,
    VariableNode,
    BinaryOpNode,
    UnaryOpNode,
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
    CallNode,
    ReturnNode,
    LastNode,
    NextNode,
    RedoNode,
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
                    if ((firstKeyword === 'if' && (keyword === 'elsif' || keyword === 'else')) ||
                        (firstKeyword === 'unless' && keyword === 'else')) {
                        // Continue building the control structure
                        buffer.push(lexeme);
                        pendingControlStructure = false;
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
                        // Control structure - mark as pending to check for elsif/else
                        pendingControlStructure = true;
                    } else if (buffer[0].category === 'LBRACE') {
                        // Bare block - parse immediately
                        const ast = this.parseStatement(buffer);
                        if (ast) {
                            yield ast;
                        }
                        buffer = [];
                    } else if (buffer[0].category === 'DECLARATION' && buffer[0].token.value === 'sub') {
                        // Sub definition - parse immediately
                        const ast = this.parseStatement(buffer);
                        if (ast) {
                            yield ast;
                        }
                        buffer = [];
                    } else if (buffer[0].category === 'DECLARATION' && buffer[0].token.value === 'class') {
                        // Class definition - parse immediately
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
            return null;
        }

        // Check for loop labels (LABEL: while/until/for/foreach)
        if (lexemes.length >= 3 &&
            lexemes[0].category === 'IDENTIFIER' &&
            lexemes[1].category === 'BINOP' &&
            lexemes[1].token.value === ':' &&
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
        let depth = 0;
        for (let i = 1; i < lexemes.length; i++) {
            // Track depth
            if (lexemes[i].category === 'LPAREN' || lexemes[i].category === 'LBRACE') {
                depth++;
            }
            if (lexemes[i].category === 'RPAREN' || lexemes[i].category === 'RBRACE') {
                depth--;
            }

            if (depth === 0 && lexemes[i].category === 'CONTROL') {
                const keyword = lexemes[i].token.value;
                if (keyword === 'if' || keyword === 'unless' ||
                    keyword === 'while' || keyword === 'until') {
                    // This is a postfix conditional
                    const stmtLexemes = lexemes.slice(0, i);
                    const condLexemes = lexemes.slice(i + 1);

                    // Parse the statement (recursively call parseStatement to handle return, etc.)
                    const stmt = this.parseStatement(stmtLexemes);
                    if (!stmt) {
                        return null;
                    }

                    // Parse the condition
                    const condition = this.parseExpression(condLexemes, 0);
                    if (!condition) {
                        return null;
                    }

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
            if (lexemes[0].token.value === 'if') {
                return this.parseIfStatement(lexemes);
            }
            if (lexemes[0].token.value === 'unless') {
                return this.parseUnlessStatement(lexemes);
            }
            if (lexemes[0].token.value === 'while') {
                return this.parseWhileStatement(lexemes);
            }
            if (lexemes[0].token.value === 'until') {
                return this.parseUntilStatement(lexemes);
            }
            if (lexemes[0].token.value === 'foreach' || lexemes[0].token.value === 'for') {
                return this.parseForeachStatement(lexemes);
            }
            if (lexemes[0].token.value === 'return') {
                return this.parseReturnStatement(lexemes);
            }
            if (lexemes[0].token.value === 'last') {
                return this.parseLastStatement(lexemes);
            }
            if (lexemes[0].token.value === 'next') {
                return this.parseNextStatement(lexemes);
            }
            if (lexemes[0].token.value === 'redo') {
                return this.parseRedoStatement(lexemes);
            }
            if (lexemes[0].token.value === 'die') {
                return this.parseDieStatement(lexemes);
            }
            if (lexemes[0].token.value === 'warn') {
                return this.parseWarnStatement(lexemes);
            }
            if (lexemes[0].token.value === 'do') {
                return this.parseDoBlock(lexemes);
            }
        }

        // Check for package declaration
        if (lexemes[0].category === 'KEYWORD' && lexemes[0].token.value === 'package') {
            return this.parsePackageDeclaration(lexemes);
        }

        // Check for use statement
        if (lexemes[0].category === 'KEYWORD' && lexemes[0].token.value === 'use') {
            return this.parseUseStatement(lexemes);
        }

        // Check for class declaration
        if (lexemes[0].category === 'DECLARATION' && lexemes[0].token.value === 'class') {
            return this.parseClassDeclaration(lexemes);
        }

        // Check for print and say (can be either statements or function calls)
        if (lexemes[0].category === 'KEYWORD') {
            if (lexemes[0].token.value === 'print') {
                // If followed by '(', treat as function call, not statement
                if (lexemes.length === 1 || lexemes[1].category !== 'LPAREN') {
                    return this.parsePrintStatement(lexemes);
                }
                // Otherwise, let it fall through to be parsed as a function call
            }
            if (lexemes[0].token.value === 'say') {
                // If followed by '(', treat as function call, not statement
                if (lexemes.length === 1 || lexemes[1].category !== 'LPAREN') {
                    return this.parseSayStatement(lexemes);
                }
                // Otherwise, let it fall through to be parsed as a function call
            }
        }

        // Check for sub declaration
        if (lexemes[0].category === 'DECLARATION' && lexemes[0].token.value === 'sub') {
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

            // Parse left side (lvalue)
            const left = this.parseExpression(leftLexemes, 0);
            if (!left) {
                return null;
            }

            // Parse right side (expression)
            const right = this.parseExpression(rightLexemes, 0);
            if (!right) {
                return null;
            }

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

    private parseDeclaration(lexemes: Lexeme[]): DeclarationNode | null {
        if (lexemes.length < 2) {
            return null;
        }

        const declarator = lexemes[0].token.value;
        const variable = lexemes[1];

        if (variable.category !== 'SCALAR_VAR' &&
            variable.category !== 'ARRAY_VAR' &&
            variable.category !== 'HASH_VAR') {
            return null;
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

    private parseExpression(lexemes: Lexeme[], pos: number): ASTNode | null {
        const result = this.precedenceClimb(lexemes, pos, 21); // Start at lowest precedence
        return result?.node || null;
    }

    private precedenceClimb(
        lexemes: Lexeme[],
        pos: number,
        minPrecedence: number
    ): { node: ASTNode; nextPos: number } | null {
        // Parse left side (primary expression)
        const leftResult = this.parsePrimary(lexemes, pos);
        if (!leftResult) {
            return null;
        }

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
            if ((current.category === 'BINOP' || current.category === 'OPERATOR') && current.token.value === '?') {
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
                    } else if (depth === 0 && lexemes[i].token.value === '?') {
                        // Nested ternary
                        depth++;
                    } else if (depth === 1 && lexemes[i].token.value === ':') {
                        // This ':' belongs to the nested ternary
                        depth--;
                    } else if (depth === 0 && (lexemes[i].category === 'BINOP' || lexemes[i].category === 'OPERATOR') && lexemes[i].token.value === ':') {
                        colonPos = i;
                        break;
                    }
                }

                if (colonPos === -1) {
                    break; // Error: missing ':'
                }

                // Parse true expression
                const trueLexemes = lexemes.slice(currentPos, colonPos);
                const trueResult = this.parseExpression(trueLexemes, 0);
                if (!trueResult) {
                    break;
                }

                // Skip the ':'
                currentPos = colonPos + 1;

                // Parse false expression with right associativity
                const nextMinPrec = opInfo.precedence; // RIGHT associative
                const falseResult = this.precedenceClimb(lexemes, currentPos, nextMinPrec);
                if (!falseResult) {
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

            // Check if it's a binary operator
            if (current.category !== 'BINOP' && current.category !== 'ASSIGNOP') {
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
    ): { node: ASTNode; nextPos: number } | null {
        if (pos >= lexemes.length) {
            return null;
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

            // Handle unary minus, unary plus, and logical not
            if (op === '-' || op === '!' || op === '+') {
                // Special case: +{ is a hash literal, not unary plus
                if (op === '+' && pos + 1 < lexemes.length && lexemes[pos + 1].category === 'LBRACE') {
                    // Let the hash literal handling below deal with this
                } else {
                    // This is a unary operator - recursively parse the operand
                    const operandResult = this.parsePrimary(lexemes, pos + 1);
                    if (operandResult) {
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
        }

        // Do blocks (can be used in expressions)
        if (lexeme.category === 'CONTROL' && lexeme.token.value === 'do') {
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

        // Variables
        if (lexeme.category === 'SCALAR_VAR' ||
            lexeme.category === 'ARRAY_VAR' ||
            lexeme.category === 'HASH_VAR') {

            // Check for array slice: @array[indices]
            if (lexeme.category === 'ARRAY_VAR' &&
                pos + 1 < lexemes.length &&
                lexemes[pos + 1].category === 'LBRACKET') {

                // Find matching RBRACKET
                let depth = 1;
                let endPos = pos + 2;
                while (endPos < lexemes.length && depth > 0) {
                    if (lexemes[endPos].category === 'LBRACKET') depth++;
                    if (lexemes[endPos].category === 'RBRACKET') depth--;
                    endPos++;
                }

                // Parse indices expression
                const indicesLexemes = lexemes.slice(pos + 2, endPos - 1);

                // Check if there are commas at depth 0 (list of indices)
                let hasComma = false;
                let checkDepth = 0;
                for (let i = 0; i < indicesLexemes.length; i++) {
                    if (indicesLexemes[i].category === 'LPAREN' || indicesLexemes[i].category === 'LBRACKET' || indicesLexemes[i].category === 'LBRACE') {
                        checkDepth++;
                    }
                    if (indicesLexemes[i].category === 'RPAREN' || indicesLexemes[i].category === 'RBRACKET' || indicesLexemes[i].category === 'RBRACE') {
                        checkDepth--;
                    }
                    if (checkDepth === 0 && indicesLexemes[i].category === 'COMMA') {
                        hasComma = true;
                        break;
                    }
                }

                let indices: ASTNode | null = null;

                if (hasComma) {
                    // Parse as list (comma-separated indices)
                    const elements: ASTNode[] = [];
                    let elemStart = 0;
                    let elemDepth = 0;

                    for (let i = 0; i < indicesLexemes.length; i++) {
                        if (indicesLexemes[i].category === 'LPAREN' || indicesLexemes[i].category === 'LBRACKET' || indicesLexemes[i].category === 'LBRACE') {
                            elemDepth++;
                        }
                        if (indicesLexemes[i].category === 'RPAREN' || indicesLexemes[i].category === 'RBRACKET' || indicesLexemes[i].category === 'RBRACE') {
                            elemDepth--;
                        }

                        if (elemDepth === 0 && indicesLexemes[i].category === 'COMMA') {
                            const elemTokens = indicesLexemes.slice(elemStart, i);
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
                    const lastElemTokens = indicesLexemes.slice(elemStart);
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

                // Find matching RBRACE
                let depth = 1;
                let endPos = pos + 2;
                while (endPos < lexemes.length && depth > 0) {
                    if (lexemes[endPos].category === 'LBRACE') depth++;
                    if (lexemes[endPos].category === 'RBRACE') depth--;
                    endPos++;
                }

                // Parse keys expression
                const keysLexemes = lexemes.slice(pos + 2, endPos - 1);

                // Check if there are commas at depth 0 (list of keys)
                let hasComma = false;
                let checkDepth = 0;
                for (let i = 0; i < keysLexemes.length; i++) {
                    if (keysLexemes[i].category === 'LPAREN' || keysLexemes[i].category === 'LBRACKET' || keysLexemes[i].category === 'LBRACE') {
                        checkDepth++;
                    }
                    if (keysLexemes[i].category === 'RPAREN' || keysLexemes[i].category === 'RBRACKET' || keysLexemes[i].category === 'RBRACE') {
                        checkDepth--;
                    }
                    if (checkDepth === 0 && keysLexemes[i].category === 'COMMA') {
                        hasComma = true;
                        break;
                    }
                }

                let keys: ASTNode | null = null;

                if (hasComma) {
                    // Parse as list (comma-separated keys)
                    const elements: ASTNode[] = [];
                    let elemStart = 0;
                    let elemDepth = 0;

                    for (let i = 0; i < keysLexemes.length; i++) {
                        if (keysLexemes[i].category === 'LPAREN' || keysLexemes[i].category === 'LBRACKET' || keysLexemes[i].category === 'LBRACE') {
                            elemDepth++;
                        }
                        if (keysLexemes[i].category === 'RPAREN' || keysLexemes[i].category === 'RBRACKET' || keysLexemes[i].category === 'RBRACE') {
                            elemDepth--;
                        }

                        if (elemDepth === 0 && keysLexemes[i].category === 'COMMA') {
                            const elemTokens = keysLexemes.slice(elemStart, i);
                            if (elemTokens.length > 0) {
                                // Check for bareword key
                                let elem: ASTNode | null = null;
                                if (elemTokens.length === 1 && elemTokens[0].category === 'IDENTIFIER') {
                                    const barewordKey: StringNode = {
                                        type: 'String',
                                        value: elemTokens[0].token.value
                                    };
                                    elem = barewordKey;
                                } else {
                                    elem = this.parseExpression(elemTokens, 0);
                                }
                                if (elem) {
                                    elements.push(elem);
                                }
                            }
                            elemStart = i + 1; // Skip the comma
                        }
                    }

                    // Don't forget the last element
                    const lastElemTokens = keysLexemes.slice(elemStart);
                    if (lastElemTokens.length > 0) {
                        let elem: ASTNode | null = null;
                        if (lastElemTokens.length === 1 && lastElemTokens[0].category === 'IDENTIFIER') {
                            const barewordKey: StringNode = {
                                type: 'String',
                                value: lastElemTokens[0].token.value
                            };
                            elem = barewordKey;
                        } else {
                            elem = this.parseExpression(lastElemTokens, 0);
                        }
                        if (elem) {
                            elements.push(elem);
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
        if (lexeme.category === 'DECLARATION' && lexeme.token.value === 'sub') {
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
            // Check if next token is LPAREN
            if (pos + 1 < lexemes.length && lexemes[pos + 1].category === 'LPAREN') {
                // This is a function call
                const functionName = lexeme.token.value;
                let currentPos = pos + 2; // Skip identifier and LPAREN

                // Find matching RPAREN
                let depth = 1;
                let endPos = currentPos;
                while (endPos < lexemes.length && depth > 0) {
                    if (lexemes[endPos].category === 'LPAREN') depth++;
                    if (lexemes[endPos].category === 'RPAREN') depth--;
                    endPos++;
                }

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
                     lexemes[pos + 1].category === 'BINOP' &&
                     lexemes[pos + 1].token.value === '->') {
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
            // Find matching RBRACKET
            let depth = 1;
            let endPos = pos + 1;
            while (endPos < lexemes.length && depth > 0) {
                if (lexemes[endPos].category === 'LBRACKET') depth++;
                if (lexemes[endPos].category === 'RBRACKET') depth--;
                endPos++;
            }

            // Parse elements (comma-separated expressions)
            const elementLexemes = lexemes.slice(pos + 1, endPos - 1);
            const elements: ASTNode[] = [];

            if (elementLexemes.length > 0) {
                // Split by commas at depth 0
                let elemStart = 0;
                let bracketDepth = 0;
                let braceDepth = 0;
                let parenDepth = 0;

                for (let i = 0; i < elementLexemes.length; i++) {
                    if (elementLexemes[i].category === 'LBRACKET') bracketDepth++;
                    if (elementLexemes[i].category === 'RBRACKET') bracketDepth--;
                    if (elementLexemes[i].category === 'LBRACE') braceDepth++;
                    if (elementLexemes[i].category === 'RBRACE') braceDepth--;
                    if (elementLexemes[i].category === 'LPAREN') parenDepth++;
                    if (elementLexemes[i].category === 'RPAREN') parenDepth--;

                    if (elementLexemes[i].category === 'COMMA' &&
                        bracketDepth === 0 && braceDepth === 0 && parenDepth === 0) {
                        // Found an element boundary
                        const elemTokens = elementLexemes.slice(elemStart, i);
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
                const lastElemTokens = elementLexemes.slice(elemStart);
                if (lastElemTokens.length > 0) {
                    const elem = this.parseExpression(lastElemTokens, 0);
                    if (elem) {
                        elements.push(elem);
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

        // Hash literals +{...}
        if ((lexeme.category === 'BINOP' || lexeme.category === 'OPERATOR') && lexeme.token.value === '+') {
            // Check if next token is LBRACE
            if (pos + 1 < lexemes.length && lexemes[pos + 1].category === 'LBRACE') {
                // Find matching RBRACE
                let depth = 1;
                let endPos = pos + 2;
                while (endPos < lexemes.length && depth > 0) {
                    if (lexemes[endPos].category === 'LBRACE') depth++;
                    if (lexemes[endPos].category === 'RBRACE') depth--;
                    endPos++;
                }

                // Parse pairs (comma-separated key => value)
                const pairLexemes = lexemes.slice(pos + 2, endPos - 1);
                const pairs: Array<{ key: ASTNode; value: ASTNode }> = [];

                if (pairLexemes.length > 0) {
                    // Split by commas at depth 0
                    let pairStart = 0;
                    let bracketDepth = 0;
                    let braceDepth = 0;
                    let parenDepth = 0;

                    for (let i = 0; i < pairLexemes.length; i++) {
                        if (pairLexemes[i].category === 'LBRACKET') bracketDepth++;
                        if (pairLexemes[i].category === 'RBRACKET') bracketDepth--;
                        if (pairLexemes[i].category === 'LBRACE') braceDepth++;
                        if (pairLexemes[i].category === 'RBRACE') braceDepth--;
                        if (pairLexemes[i].category === 'LPAREN') parenDepth++;
                        if (pairLexemes[i].category === 'RPAREN') parenDepth--;

                        if (pairLexemes[i].category === 'COMMA' &&
                            bracketDepth === 0 && braceDepth === 0 && parenDepth === 0) {
                            // Found a pair boundary
                            const pairTokens = pairLexemes.slice(pairStart, i);
                            if (pairTokens.length > 0) {
                                const pair = this.parseHashPair(pairTokens);
                                if (pair) {
                                    pairs.push(pair);
                                }
                            }
                            pairStart = i + 1; // Skip the comma
                        }
                    }

                    // Don't forget the last pair
                    const lastPairTokens = pairLexemes.slice(pairStart);
                    if (lastPairTokens.length > 0) {
                        const pair = this.parseHashPair(lastPairTokens);
                        if (pair) {
                            pairs.push(pair);
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
            }
        }

        return null;
    }

    private parseHashPair(lexemes: Lexeme[]): { key: ASTNode; value: ASTNode } | null {
        // Find the => operator at depth 0
        let depth = 0;
        let arrowPos = -1;

        for (let i = 0; i < lexemes.length; i++) {
            if (lexemes[i].category === 'LPAREN' || lexemes[i].category === 'LBRACKET' || lexemes[i].category === 'LBRACE') {
                depth++;
            }
            if (lexemes[i].category === 'RPAREN' || lexemes[i].category === 'RBRACKET' || lexemes[i].category === 'RBRACE') {
                depth--;
            }

            if (depth === 0 && (lexemes[i].category === 'BINOP' || lexemes[i].category === 'OPERATOR') && lexemes[i].token.value === '=>') {
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

        const key = this.parseExpression(keyLexemes, 0);
        const value = this.parseExpression(valueLexemes, 0);

        if (key && value) {
            return { key, value };
        }

        return null;
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

            // Check for dereference operator ->
            if (current.category === 'BINOP' && current.token.value === '->') {
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
                    pos++; // Consume LPAREN

                    // Find matching RPAREN
                    let depth = 1;
                    let endPos = pos;
                    while (endPos < lexemes.length && depth > 0) {
                        if (lexemes[endPos].category === 'LPAREN') depth++;
                        if (lexemes[endPos].category === 'RPAREN') depth--;
                        endPos++;
                    }

                    // Parse arguments (comma-separated expressions)
                    const argLexemes = lexemes.slice(pos, endPos - 1);
                    const args: ASTNode[] = [];

                    if (argLexemes.length > 0) {
                        // Split by commas at depth 0
                        let argStart = 0;
                        let parenDepth = 0;
                        let bracketDepth = 0;
                        let braceDepth = 0;

                        for (let i = 0; i < argLexemes.length; i++) {
                            if (argLexemes[i].category === 'LPAREN') parenDepth++;
                            if (argLexemes[i].category === 'RPAREN') parenDepth--;
                            if (argLexemes[i].category === 'LBRACKET') bracketDepth++;
                            if (argLexemes[i].category === 'RBRACKET') bracketDepth--;
                            if (argLexemes[i].category === 'LBRACE') braceDepth++;
                            if (argLexemes[i].category === 'RBRACE') braceDepth--;

                            if (argLexemes[i].category === 'COMMA' &&
                                parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
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
                    lexemes[pos + 1].token.value === '*') {

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
                // Find matching RBRACKET
                let depth = 1;
                let endPos = pos + 1;
                while (endPos < lexemes.length && depth > 0) {
                    if (lexemes[endPos].category === 'LBRACKET') depth++;
                    if (lexemes[endPos].category === 'RBRACKET') depth--;
                    endPos++;
                }

                // Parse index expression
                const indexLexemes = lexemes.slice(pos + 1, endPos - 1);
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
                // Find matching RBRACE
                let depth = 1;
                let endPos = pos + 1;
                while (endPos < lexemes.length && depth > 0) {
                    if (lexemes[endPos].category === 'LBRACE') depth++;
                    if (lexemes[endPos].category === 'RBRACE') depth--;
                    endPos++;
                }

                // Parse key expression
                const keyLexemes = lexemes.slice(pos + 1, endPos - 1);
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

        // Parse the return value as an expression
        const value = this.parseExpression(remainingLexemes, 0);
        if (!value) {
            // Empty return if expression parsing fails
            const returnNode: ReturnNode = {
                type: 'Return'
            };
            return returnNode;
        }

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

        // Parse the die message as an expression
        const message = this.parseExpression(remainingLexemes, 0);
        if (!message) {
            // Empty die if expression parsing fails
            const dieNode: DieNode = {
                type: 'Die'
            };
            return dieNode;
        }

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

        // Parse the warn message as an expression
        const message = this.parseExpression(remainingLexemes, 0);
        if (!message) {
            // Empty warn if expression parsing fails
            const warnNode: WarnNode = {
                type: 'Warn'
            };
            return warnNode;
        }

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

        // Parse the arguments as a comma-separated list
        const args: ASTNode[] = [];
        let depth = 0;
        let start = 0;

        for (let i = 0; i < remainingLexemes.length; i++) {
            const lex = remainingLexemes[i];

            // Track depth for nested expressions
            if (lex.category === 'LPAREN' || lex.category === 'LBRACKET' || lex.category === 'LBRACE') {
                depth++;
            } else if (lex.category === 'RPAREN' || lex.category === 'RBRACKET' || lex.category === 'RBRACE') {
                depth--;
            }

            // At depth 0, commas separate arguments
            if (depth === 0 && lex.category === 'COMMA') {
                const argLexemes = remainingLexemes.slice(start, i);
                if (argLexemes.length > 0) {
                    const arg = this.parseExpression(argLexemes, 0);
                    if (arg) {
                        args.push(arg);
                    }
                }
                start = i + 1;
            }
        }

        // Parse the last argument
        const lastArgLexemes = remainingLexemes.slice(start);
        if (lastArgLexemes.length > 0) {
            const arg = this.parseExpression(lastArgLexemes, 0);
            if (arg) {
                args.push(arg);
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

        // Parse the arguments as a comma-separated list
        const args: ASTNode[] = [];
        let depth = 0;
        let start = 0;

        for (let i = 0; i < remainingLexemes.length; i++) {
            const lex = remainingLexemes[i];

            // Track depth for nested expressions
            if (lex.category === 'LPAREN' || lex.category === 'LBRACKET' || lex.category === 'LBRACE') {
                depth++;
            } else if (lex.category === 'RPAREN' || lex.category === 'RBRACKET' || lex.category === 'RBRACE') {
                depth--;
            }

            // At depth 0, commas separate arguments
            if (depth === 0 && lex.category === 'COMMA') {
                const argLexemes = remainingLexemes.slice(start, i);
                if (argLexemes.length > 0) {
                    const arg = this.parseExpression(argLexemes, 0);
                    if (arg) {
                        args.push(arg);
                    }
                }
                start = i + 1;
            }
        }

        // Parse the last argument
        const lastArgLexemes = remainingLexemes.slice(start);
        if (lastArgLexemes.length > 0) {
            const arg = this.parseExpression(lastArgLexemes, 0);
            if (arg) {
                args.push(arg);
            }
        }

        const sayNode: SayNode = {
            type: 'Say',
            arguments: args
        };
        return sayNode;
    }

    private parseDoBlock(lexemes: Lexeme[]): DoBlockNode | null {
        // Expect: do { statements }
        if (lexemes.length < 3) {
            return null;
        }

        // Skip 'do' keyword
        if (lexemes[1].category !== 'LBRACE') {
            return null;
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

    private parseSubDeclaration(lexemes: Lexeme[]): SubNode | null {
        let pos = 1; // Skip 'sub' keyword

        if (pos >= lexemes.length) {
            return null;
        }

        // Check for optional name (identifier)
        let name: string | undefined = undefined;
        if (lexemes[pos].category === 'IDENTIFIER') {
            name = lexemes[pos].token.value;
            pos++;
        }

        // Expect LPAREN for parameters
        if (pos >= lexemes.length || lexemes[pos].category !== 'LPAREN') {
            return null;
        }
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
        const parameters: ParameterNode[] = [];

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
                    if (param) {
                        parameters.push(param);
                    }
                    paramStart = i + 1; // Skip the comma
                }
            }

            // Don't forget the last parameter
            const lastParamTokens = paramLexemes.slice(paramStart);
            if (lastParamTokens.length > 0) {
                const param = this.parseParameter(lastParamTokens);
                if (param) {
                    parameters.push(param);
                }
            }
        }

        pos = paramEnd; // Move past RPAREN

        // Expect LBRACE for body
        if (pos >= lexemes.length || lexemes[pos].category !== 'LBRACE') {
            return null;
        }

        // Parse the block body
        const blockResult = this.parseBlock(lexemes, pos);
        if (!blockResult) {
            return null;
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

    private parseParameter(lexemes: Lexeme[]): ParameterNode | null {
        if (lexemes.length === 0) {
            return null;
        }

        // First token should be a variable
        if (lexemes[0].category !== 'SCALAR_VAR' &&
            lexemes[0].category !== 'ARRAY_VAR' &&
            lexemes[0].category !== 'HASH_VAR') {
            return null;
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

    private parseIfStatement(lexemes: Lexeme[]): IfNode | null {
        let pos = 1; // Skip 'if'

        // Parse condition (must be parenthesized)
        if (pos >= lexemes.length || lexemes[pos].category !== 'LPAREN') {
            return null;
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
            return null;
        }

        pos = condEnd;

        // Parse then block
        const thenResult = this.parseBlock(lexemes, pos);
        if (!thenResult) {
            return null;
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

    private parseUnlessStatement(lexemes: Lexeme[]): UnlessNode | null {
        let pos = 1; // Skip 'unless'

        // Parse condition (must be parenthesized)
        if (pos >= lexemes.length || lexemes[pos].category !== 'LPAREN') {
            return null;
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
            return null;
        }

        pos = condEnd;

        // Parse then block
        const thenResult = this.parseBlock(lexemes, pos);
        if (!thenResult) {
            return null;
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

    private parseWhileStatement(lexemes: Lexeme[], label?: string): WhileNode | null {
        let pos = 1; // Skip 'while'

        // Parse condition (must be parenthesized)
        if (pos >= lexemes.length || lexemes[pos].category !== 'LPAREN') {
            return null;
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
            return null;
        }

        pos = condEnd;

        // Parse block
        const blockResult = this.parseBlock(lexemes, pos);
        if (!blockResult) {
            return null;
        }

        const whileNode: WhileNode = {
            type: 'While',
            condition,
            block: blockResult.statements,
            ...(label && { label })
        };

        return whileNode;
    }

    private parseUntilStatement(lexemes: Lexeme[], label?: string): UntilNode | null {
        let pos = 1; // Skip 'until'

        // Parse condition (must be parenthesized)
        if (pos >= lexemes.length || lexemes[pos].category !== 'LPAREN') {
            return null;
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
            return null;
        }

        pos = condEnd;

        // Parse block
        const blockResult = this.parseBlock(lexemes, pos);
        if (!blockResult) {
            return null;
        }

        const untilNode: UntilNode = {
            type: 'Until',
            condition,
            block: blockResult.statements,
            ...(label && { label })
        };

        return untilNode;
    }

    private parseForeachStatement(lexemes: Lexeme[], label?: string): ForeachNode | null {
        let pos = 1; // Skip 'foreach' or 'for'

        // Check for optional declarator (my, our, state)
        let declarator: string | undefined = undefined;
        if (pos < lexemes.length && lexemes[pos].category === 'DECLARATION') {
            declarator = lexemes[pos].token.value;
            pos++;
        }

        // Parse iterator variable (must be a scalar)
        if (pos >= lexemes.length || lexemes[pos].category !== 'SCALAR_VAR') {
            return null;
        }

        const variable: VariableNode = {
            type: 'Variable',
            name: lexemes[pos].token.value
        };
        pos++;

        // Parse list expression (must be parenthesized)
        if (pos >= lexemes.length || lexemes[pos].category !== 'LPAREN') {
            return null;
        }

        // Find matching RPAREN for list expression
        let depth = 1;
        let listEnd = pos + 1;
        while (listEnd < lexemes.length && depth > 0) {
            if (lexemes[listEnd].category === 'LPAREN') depth++;
            if (lexemes[listEnd].category === 'RPAREN') depth--;
            listEnd++;
        }

        // Parse list expression
        const listLexemes = lexemes.slice(pos + 1, listEnd - 1);
        const listExpr = this.parseExpression(listLexemes, 0);
        if (!listExpr) {
            return null;
        }

        pos = listEnd;

        // Parse block
        const blockResult = this.parseBlock(lexemes, pos);
        if (!blockResult) {
            return null;
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
                    // this is the end of a block statement
                    if (braceDepth === 0) {
                        stmtEnd++;
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
        // Skip 'package' keyword
        const remainingLexemes = lexemes.slice(1);

        if (remainingLexemes.length === 0) {
            return null;
        }

        // Build the package name from identifiers and :: operators
        let packageName = '';
        for (let i = 0; i < remainingLexemes.length; i++) {
            const lex = remainingLexemes[i];

            if (lex.category === 'IDENTIFIER') {
                packageName += lex.token.value;
            } else if (lex.category === 'BINOP' && lex.token.value === ':') {
                // Handle :: as two : tokens
                if (i + 1 < remainingLexemes.length &&
                    remainingLexemes[i + 1].category === 'BINOP' &&
                    remainingLexemes[i + 1].token.value === ':') {
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

        const packageNode: PackageNode = {
            type: 'Package',
            name: packageName
        };
        return packageNode;
    }

    private parseUseStatement(lexemes: Lexeme[]): UseNode | null {
        // use Module;
        // use Module qw(...);
        // Skip 'use' keyword
        const remainingLexemes = lexemes.slice(1);

        if (remainingLexemes.length === 0) {
            return null;
        }

        // Build the module name from identifiers and :: operators
        let moduleName = '';
        let i = 0;
        for (; i < remainingLexemes.length; i++) {
            const lex = remainingLexemes[i];

            if (lex.category === 'IDENTIFIER') {
                moduleName += lex.token.value;
            } else if (lex.category === 'BINOP' && lex.token.value === ':') {
                // Handle :: as two : tokens
                if (i + 1 < remainingLexemes.length &&
                    remainingLexemes[i + 1].category === 'BINOP' &&
                    remainingLexemes[i + 1].token.value === ':') {
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

    private parseClassDeclaration(lexemes: Lexeme[]): ClassNode | null {
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
                       lexemes[i].category === 'BINOP' &&
                       lexemes[i].token.value === ':' &&
                       lexemes[i + 1].category === 'BINOP' &&
                       lexemes[i + 1].token.value === ':') {
                // Handle :: separator
                name += '::';
                i += 2; // Skip both :
            } else {
                break;
            }
        }

        if (name === '') {
            return null;
        }

        // Expect opening brace
        if (i >= lexemes.length || lexemes[i].category !== 'LBRACE') {
            return null;
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

        return {
            type: 'Class',
            name,
            body
        };
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

    private parseFieldDeclaration(lexemes: Lexeme[]): FieldNode | null {
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
            return null;
        }

        const variable: VariableNode = {
            type: 'Variable',
            name: lexemes[i].token.value
        };
        i++;

        // Parse optional attributes (starting with :)
        const attributes: string[] = [];
        while (i < lexemes.length) {
            if (lexemes[i].category === 'BINOP' && lexemes[i].token.value === ':') {
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

    private parseMethodDeclaration(lexemes: Lexeme[]): MethodNode | null {
        // method name() { body }
        // method name($x, $y) { body }

        // Skip 'method' keyword
        let pos = 1;

        // Expect method name (identifier)
        if (pos >= lexemes.length || lexemes[pos].category !== 'IDENTIFIER') {
            return null;
        }

        const name = lexemes[pos].token.value;
        pos++;

        // Expect opening parenthesis for parameters
        if (pos >= lexemes.length || lexemes[pos].category !== 'LPAREN') {
            return null;
        }
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
        const parameters: ParameterNode[] = [];

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
                    if (param) {
                        parameters.push(param);
                    }
                    paramStart = i + 1; // Skip the comma
                }
            }

            // Don't forget the last parameter
            const lastParamTokens = paramLexemes.slice(paramStart);
            if (lastParamTokens.length > 0) {
                const param = this.parseParameter(lastParamTokens);
                if (param) {
                    parameters.push(param);
                }
            }
        }

        pos = paramEnd; // Move past RPAREN

        // Expect LBRACE for body
        if (pos >= lexemes.length || lexemes[pos].category !== 'LBRACE') {
            return null;
        }

        // Parse the block body
        const blockResult = this.parseBlock(lexemes, pos);
        if (!blockResult) {
            return null;
        }

        return {
            type: 'Method',
            name,
            parameters,
            body: blockResult.statements
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
