/**
 * Common Parsing Patterns
 *
 * This module extracts frequently repeated parsing logic to eliminate
 * code duplication and provide consistent parsing behavior.
 */

import { Lexeme, LexemeCategory } from './Lexer.js';
import * as AST from './AST.js';
import { ParseError, ErrorRecovery } from './ErrorSystem.js';
import {
    DepthTracker,
    DelimiterMatcher,
    TokenChecker,
    splitByCommas
} from './ParserUtils.js';
import * as Lang from './LanguageSpec.js';

/**
 * Result type for parsing operations that can fail
 */
export type ParseResult<T> = T | AST.ErrorNode;

/**
 * CommonParsers class with shared parsing logic
 */
export class CommonParsers {
    /**
     * Parse a comma-separated list of items
     * Used for: function arguments, array elements, hash pairs, etc.
     */
    static parseCommaSeparatedList<T>(
        lexemes: Lexeme[],
        startPos: number,
        endPos: number,
        itemParser: (lexemes: Lexeme[]) => ParseResult<T>,
        context: string
    ): ParseResult<T>[] {
        if (startPos >= endPos) {
            return [];
        }

        const segments = splitByCommas(lexemes, startPos, endPos);
        const results: ParseResult<T>[] = [];

        for (const segment of segments) {
            if (segment.length === 0) {
                // Empty segment between commas
                results.push(ParseError.emptyExpression(
                    `${context} list item`,
                    lexemes[startPos]?.token
                ));
            } else {
                results.push(itemParser(segment));
            }
        }

        return results;
    }

    /**
     * Parse a block of statements enclosed in braces
     */
    static parseBlock(
        lexemes: Lexeme[],
        startPos: number,
        statementParser: (lexemes: Lexeme[]) => ParseResult<AST.ASTNode>,
        context: string
    ): ParseResult<AST.BlockNode> {
        if (startPos >= lexemes.length ||
            lexemes[startPos].category !== LexemeCategory.LBRACE) {
            return ParseError.missingToken(
                '{',
                lexemes[startPos]?.token,
                `at start of ${context}`
            );
        }

        const closingPos = DelimiterMatcher.findClosingBrace(lexemes, startPos);
        if (closingPos === -1) {
            return ParseError.missingClosingDelimiter(
                '{',
                '}',
                lexemes[startPos].token
            );
        }

        const blockContent = lexemes.slice(startPos + 1, closingPos);
        const statements: AST.ASTNode[] = [];

        // Split by terminators and parse each statement
        const tracker = new DepthTracker();
        let statementStart = 0;

        for (let i = 0; i <= blockContent.length; i++) {
            if (i < blockContent.length) {
                tracker.update(blockContent[i]);
            }

            // Parse statement at terminator or end of block
            if ((i < blockContent.length &&
                 blockContent[i].category === LexemeCategory.TERMINATOR &&
                 tracker.isAtDepthZero()) ||
                i === blockContent.length) {

                if (i > statementStart) {
                    const statementLexemes = blockContent.slice(
                        statementStart,
                        i < blockContent.length ? i : undefined
                    );

                    if (statementLexemes.length > 0) {
                        const stmt = statementParser(statementLexemes);
                        statements.push(stmt);
                    }
                }

                statementStart = i + 1; // Skip the terminator
            }
        }

        return {
            type: 'Block',
            statements
        };
    }

    /**
     * Parse function/method parameters
     */
    static parseParameterList(
        lexemes: Lexeme[],
        startPos: number,
        allowDefaults: boolean = true
    ): ParseResult<AST.ParameterNode[]> {
        if (startPos >= lexemes.length ||
            lexemes[startPos].category !== LexemeCategory.LPAREN) {
            return [];
        }

        const closingPos = DelimiterMatcher.findClosingParen(lexemes, startPos);
        if (closingPos === -1) {
            return ParseError.missingClosingDelimiter(
                '(',
                ')',
                lexemes[startPos].token
            );
        }

        const paramContent = lexemes.slice(startPos + 1, closingPos);
        if (paramContent.length === 0) {
            return [];
        }

        const segments = splitByCommas(paramContent);
        const parameters: AST.ParameterNode[] = [];

        for (const segment of segments) {
            if (segment.length === 0) {
                return ParseError.emptyExpression(
                    'parameter',
                    lexemes[startPos]?.token
                );
            }

            // Check for default value (param = value)
            let variable: AST.VariableNode;
            let defaultValue: AST.ASTNode | undefined;

            if (allowDefaults) {
                const equalPos = segment.findIndex(l =>
                    TokenChecker.isOperator(l, '=')
                );

                if (equalPos > 0) {
                    // Has default value
                    if (segment[0].category !== LexemeCategory.SCALAR_VAR) {
                        return ParseError.invalidSyntax(
                            'Parameter must be a scalar variable',
                            segment[0].token
                        );
                    }

                    variable = {
                        type: 'Variable',
                        name: segment[0].token.value
                    };

                    // Parse default value expression
                    const defaultLexemes = segment.slice(equalPos + 1);
                    if (defaultLexemes.length === 0) {
                        return ParseError.emptyExpression(
                            'default value',
                            segment[equalPos].token
                        );
                    }

                    // This would call the expression parser
                    // For now, create a placeholder identifier
                    defaultValue = {
                        type: 'Identifier',
                        name: defaultLexemes.map(l => l.token.value).join(' ')
                    } as AST.ASTNode;
                } else {
                    // No default value
                    if (segment.length !== 1 ||
                        segment[0].category !== LexemeCategory.SCALAR_VAR) {
                        return ParseError.invalidSyntax(
                            'Parameter must be a scalar variable',
                            segment[0].token
                        );
                    }
                    variable = {
                        type: 'Variable',
                        name: segment[0].token.value
                    };
                }
            } else {
                // No defaults allowed
                if (segment.length !== 1 ||
                    segment[0].category !== LexemeCategory.SCALAR_VAR) {
                    return ParseError.invalidSyntax(
                        'Parameter must be a scalar variable',
                        segment[0].token
                    );
                }
                variable = {
                    type: 'Variable',
                    name: segment[0].token.value
                };
            }

            const param: AST.ParameterNode = {
                type: 'Parameter',
                variable
            };
            if (defaultValue !== undefined) {
                param.defaultValue = defaultValue;
            }
            parameters.push(param);
        }

        return parameters;
    }

    /**
     * Parse a simple identifier or qualified name
     */
    static parseQualifiedName(
        lexemes: Lexeme[],
        startPos: number
    ): ParseResult<string> {
        const parts: string[] = [];
        let pos = startPos;

        while (pos < lexemes.length) {
            // Expect identifier
            if (lexemes[pos].category !== LexemeCategory.IDENTIFIER) {
                if (parts.length === 0) {
                    return ParseError.unexpectedToken(
                        lexemes[pos].token,
                        'Expected identifier'
                    );
                }
                break;
            }

            parts.push(lexemes[pos].token.value);
            pos++;

            // Check for :: separator
            if (pos + 1 < lexemes.length &&
                TokenChecker.isColon(lexemes[pos]) &&
                TokenChecker.isColon(lexemes[pos + 1])) {
                pos += 2; // Skip ::
            } else {
                break;
            }
        }

        return parts.join('::');
    }

    /**
     * Parse arguments to a function/method call
     */
    static parseArgumentList(
        lexemes: Lexeme[],
        startPos: number,
        endPos: number,
        expressionParser: (lexemes: Lexeme[]) => ParseResult<AST.ASTNode>
    ): ParseResult<AST.ASTNode[]> {
        if (startPos >= endPos) {
            return [];
        }

        // Handle parenthesized arguments
        if (lexemes[startPos].category === LexemeCategory.LPAREN) {
            const closingPos = DelimiterMatcher.findClosingParen(lexemes, startPos);
            if (closingPos === -1 || closingPos > endPos) {
                return ParseError.missingClosingDelimiter(
                    '(',
                    ')',
                    lexemes[startPos].token
                );
            }

            const argContent = lexemes.slice(startPos + 1, closingPos);
            if (argContent.length === 0) {
                return [];
            }

            return this.parseCommaSeparatedList(
                argContent,
                0,
                argContent.length,
                expressionParser,
                'argument'
            );
        }

        // Handle non-parenthesized arguments (list context)
        return this.parseCommaSeparatedList(
            lexemes,
            startPos,
            endPos,
            expressionParser,
            'argument'
        );
    }

    /**
     * Parse array/hash slice indices
     */
    static parseSliceIndices(
        lexemes: Lexeme[],
        startPos: number,
        endPos: number,
        expressionParser: (lexemes: Lexeme[]) => ParseResult<AST.ASTNode>
    ): ParseResult<AST.ASTNode[]> {
        const segments = splitByCommas(lexemes, startPos, endPos);
        const indices: AST.ASTNode[] = [];

        for (const segment of segments) {
            if (segment.length === 0) {
                return ParseError.emptyExpression(
                    'slice index',
                    lexemes[startPos]?.token
                );
            }

            // Check for bareword in hash slice
            if (segment.length === 1 &&
                segment[0].category === LexemeCategory.IDENTIFIER) {
                // Bareword key
                indices.push({
                    type: 'String',
                    value: segment[0].token.value
                } as AST.StringNode);
            } else {
                // Expression
                const expr = expressionParser(segment);
                indices.push(expr);
            }
        }

        return indices;
    }

    /**
     * Parse a label (LABEL: statement)
     */
    static parseLabeledStatement(
        lexemes: Lexeme[],
        startPos: number,
        statementParser: (lexemes: Lexeme[]) => ParseResult<AST.ASTNode>
    ): ParseResult<AST.ASTNode> {
        if (startPos + 2 >= lexemes.length ||
            lexemes[startPos].category !== LexemeCategory.IDENTIFIER ||
            !TokenChecker.isColon(lexemes[startPos + 1])) {
            return ParseError.invalidSyntax(
                'Invalid label syntax',
                lexemes[startPos]?.token
            );
        }

        const label = lexemes[startPos].token.value;
        const statementLexemes = lexemes.slice(startPos + 2);

        if (statementLexemes.length === 0) {
            return ParseError.emptyExpression(
                'labeled statement',
                lexemes[startPos + 1].token
            );
        }

        const statement = statementParser(statementLexemes);

        // Attach label to appropriate statement types
        if ('label' in statement && typeof statement === 'object') {
            (statement as any).label = label;
            return statement;
        }

        // For statements that don't support labels, wrap in a labeled statement
        return {
            type: 'LabeledStatement',
            label,
            statement
        } as AST.ASTNode;
    }

    /**
     * Parse postfix conditional (statement if/unless/while/until expression)
     */
    static parsePostfixConditional(
        statement: AST.ASTNode,
        lexemes: Lexeme[],
        conditionPos: number,
        expressionParser: (lexemes: Lexeme[]) => ParseResult<AST.ASTNode>
    ): ParseResult<AST.ASTNode> {
        if (conditionPos >= lexemes.length - 1) {
            return ParseError.emptyExpression(
                'postfix condition',
                lexemes[conditionPos]?.token
            );
        }

        const keyword = lexemes[conditionPos].token.value;
        const conditionLexemes = lexemes.slice(conditionPos + 1);
        const condition = expressionParser(conditionLexemes);

        switch (keyword) {
            case 'if': {
                const ifNode: AST.IfNode = {
                    type: 'If',
                    condition,
                    thenBlock: [statement],
                    elseIfClauses: []
                };
                return ifNode;
            }

            case 'unless': {
                const unlessNode: AST.UnlessNode = {
                    type: 'Unless',
                    condition,
                    thenBlock: [statement]
                };
                return unlessNode;
            }

            case 'while':
                return {
                    type: 'While',
                    condition,
                    block: [statement]
                } as AST.WhileNode;

            case 'until':
                return {
                    type: 'Until',
                    condition,
                    block: [statement]
                } as AST.UntilNode;

            default:
                return ParseError.unexpectedToken(
                    lexemes[conditionPos].token,
                    'Invalid postfix conditional'
                );
        }
    }

    /**
     * Check if lexemes form a valid variable declaration pattern
     */
    static isVariableDeclaration(lexemes: Lexeme[]): boolean {
        if (lexemes.length < 2) return false;

        // Check for: my $var, our $var, state $var, const $var
        if (TokenChecker.isDeclarationKeyword(lexemes[0]) &&
            TokenChecker.isVariable(lexemes[1])) {
            return true;
        }

        return false;
    }

    /**
     * Check if lexemes form a function declaration pattern
     */
    static isFunctionDeclaration(lexemes: Lexeme[]): boolean {
        if (lexemes.length < 2) return false;

        // sub name
        if (TokenChecker.isDeclarationKeyword(lexemes[0], 'sub') &&
            lexemes[1].category === LexemeCategory.IDENTIFIER) {
            return true;
        }

        // my sub name, our sub name
        if (lexemes.length >= 3 &&
            TokenChecker.isDeclarationKeyword(lexemes[0]) &&
            TokenChecker.isDeclarationKeyword(lexemes[1], 'sub') &&
            lexemes[2].category === LexemeCategory.IDENTIFIER) {
            return true;
        }

        return false;
    }

    /**
     * Check if lexemes form a class declaration pattern
     */
    static isClassDeclaration(lexemes: Lexeme[]): boolean {
        return lexemes.length >= 2 &&
               TokenChecker.isDeclarationKeyword(lexemes[0], 'class') &&
               lexemes[1].category === LexemeCategory.IDENTIFIER;
    }
}