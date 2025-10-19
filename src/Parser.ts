import { Lexeme } from './Lexer.js';
import {
    ASTNode,
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
    CallNode,
    ReturnNode,
    SubNode,
    ParameterNode,
    ArrayLiteralNode,
    HashLiteralNode,
    ListNode,
    ArrayAccessNode,
    HashAccessNode,
    MethodCallNode
} from './AST.js';

interface OperatorInfo {
    precedence: number;
    associativity: 'LEFT' | 'RIGHT' | 'NONE';
}

export class Parser {
    private precedenceTable: Map<string, OperatorInfo>;

    constructor() {
        this.precedenceTable = this.buildPrecedenceTable();
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
        }

        // Check for sub declaration
        if (lexemes[0].category === 'DECLARATION' && lexemes[0].token.value === 'sub') {
            return this.parseSubDeclaration(lexemes);
        }

        // Check for declaration (my, our, state, const)
        if (lexemes[0].category === 'DECLARATION') {
            return this.parseDeclaration(lexemes);
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
        }

        // Variables
        if (lexeme.category === 'SCALAR_VAR' ||
            lexeme.category === 'ARRAY_VAR' ||
            lexeme.category === 'HASH_VAR') {
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
        if (lexeme.category === 'IDENTIFIER') {
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
                const key = this.parseExpression(keyLexemes, 0);

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

    private getOperatorInfo(operator: string): OperatorInfo | null {
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

    private parseWhileStatement(lexemes: Lexeme[]): WhileNode | null {
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
            block: blockResult.statements
        };

        return whileNode;
    }

    private parseUntilStatement(lexemes: Lexeme[]): UntilNode | null {
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
            block: blockResult.statements
        };

        return untilNode;
    }

    private parseForeachStatement(lexemes: Lexeme[]): ForeachNode | null {
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

        if (declarator) {
            const foreachNode: ForeachNode = {
                type: 'Foreach',
                variable,
                declarator,
                listExpr,
                block: blockResult.statements
            };
            return foreachNode;
        }

        const foreachNode: ForeachNode = {
            type: 'Foreach',
            variable,
            listExpr,
            block: blockResult.statements
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

    private buildPrecedenceTable(): Map<string, OperatorInfo> {
        const table = new Map<string, OperatorInfo>();

        // Level 3: Exponentiation (RIGHT associative)
        table.set('**', { precedence: 3, associativity: 'RIGHT' });

        // Level 6: Multiplicative (LEFT)
        ['*', '/', '%', 'x'].forEach(op => {
            table.set(op, { precedence: 6, associativity: 'LEFT' });
        });

        // Level 7: Additive and concatenation (LEFT)
        ['+', '-', '.'].forEach(op => {
            table.set(op, { precedence: 7, associativity: 'LEFT' });
        });

        // Level 8: Bit shift (LEFT)
        ['<<', '>>'].forEach(op => {
            table.set(op, { precedence: 8, associativity: 'LEFT' });
        });

        // Level 9: Relational comparison (LEFT)
        ['<', '>', '<=', '>=', 'lt', 'gt', 'le', 'ge'].forEach(op => {
            table.set(op, { precedence: 9, associativity: 'LEFT' });
        });

        // Level 10: Equality comparison (LEFT)
        ['==', '!=', '<=>', 'eq', 'ne', 'cmp'].forEach(op => {
            table.set(op, { precedence: 10, associativity: 'LEFT' });
        });

        // Level 11: Bitwise AND (LEFT)
        table.set('&', { precedence: 11, associativity: 'LEFT' });

        // Level 12: Bitwise OR and XOR (LEFT)
        ['|', '^'].forEach(op => {
            table.set(op, { precedence: 12, associativity: 'LEFT' });
        });

        // Level 13: Logical AND (LEFT)
        table.set('&&', { precedence: 13, associativity: 'LEFT' });

        // Level 14: Logical OR and defined-or (LEFT)
        ['||', '//'].forEach(op => {
            table.set(op, { precedence: 14, associativity: 'LEFT' });
        });

        // Level 15: Range (NONE)
        table.set('..', { precedence: 15, associativity: 'NONE' });

        // Level 16: Ternary conditional (RIGHT associative)
        table.set('?', { precedence: 16, associativity: 'RIGHT' });

        // Level 17: Assignment (RIGHT associative)
        ['=', '+=', '-=', '*=', '/=', '%=', '**=', '.=', 'x=',
         '||=', '//=', '&&=', '&=', '|=', '^=', '<<=', '>>='].forEach(op => {
            table.set(op, { precedence: 17, associativity: 'RIGHT' });
        });

        // Level 18: Comma and fat comma (LEFT)
        [',', '=>'].forEach(op => {
            table.set(op, { precedence: 18, associativity: 'LEFT' });
        });

        // Level 20: Low-precedence AND (LEFT)
        table.set('and', { precedence: 20, associativity: 'LEFT' });

        // Level 21: Low-precedence OR and XOR (LEFT)
        ['or', 'xor'].forEach(op => {
            table.set(op, { precedence: 21, associativity: 'LEFT' });
        });

        return table;
    }
}
