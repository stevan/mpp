/**
 * Centralized Error Handling System for MPP Parser
 *
 * This module provides:
 * - Standardized error node creation with consistent messages
 * - Error recovery utilities for parser resilience
 * - Contextual error messages with helpful information
 */

import { ErrorNode } from './AST.js';
import { Token } from './Tokenizer.js';
import { Lexeme, LexemeCategory } from './Lexer.js';

/**
 * Error categories for better error classification
 */
export enum ErrorCategory {
    SYNTAX = 'SYNTAX',
    UNEXPECTED_TOKEN = 'UNEXPECTED_TOKEN',
    MISSING_TOKEN = 'MISSING_TOKEN',
    INVALID_EXPRESSION = 'INVALID_EXPRESSION',
    INVALID_STATEMENT = 'INVALID_STATEMENT',
    INVALID_DECLARATION = 'INVALID_DECLARATION',
    UNTERMINATED = 'UNTERMINATED',
    INVALID_OPERATOR = 'INVALID_OPERATOR',
    PARSE_ERROR = 'PARSE_ERROR'
}

/**
 * ParseError class for creating standardized error nodes
 */
export class ParseError {
    /**
     * Create an error for a missing expected token
     */
    static missingToken(expected: string, found: Token | null, context?: string): ErrorNode {
        const foundDesc = found ? `'${found.value}' (${found.type})` : 'end of input';
        const contextStr = context ? ` ${context}` : '';

        return {
            type: 'Error',
            message: `Expected ${expected} but found ${foundDesc}${contextStr}`,
            value: found?.value || '',
            line: found?.line || 0,
            column: found?.column || 0
        };
    }

    /**
     * Create an error for an unexpected token
     */
    static unexpectedToken(token: Token, context?: string): ErrorNode {
        const contextStr = context ? ` ${context}` : '';

        return {
            type: 'Error',
            message: `Unexpected token '${token.value}' (${token.type})${contextStr}`,
            value: token.value,
            line: token.line,
            column: token.column
        };
    }

    /**
     * Create an error for invalid syntax
     */
    static invalidSyntax(message: string, token: Token): ErrorNode {
        return {
            type: 'Error',
            message,
            value: token.value,
            line: token.line,
            column: token.column
        };
    }

    /**
     * Create an error for an empty or invalid expression
     */
    static emptyExpression(context: string, token?: Token): ErrorNode {
        return {
            type: 'Error',
            message: `Empty or invalid expression in ${context}`,
            value: token?.value || '',
            line: token?.line || 0,
            column: token?.column || 0
        };
    }

    /**
     * Create an error for unterminated constructs (strings, blocks, etc.)
     */
    static unterminated(construct: string, startToken: Token, expected?: string): ErrorNode {
        const expectStr = expected ? ` (missing ${expected})` : '';

        return {
            type: 'Error',
            message: `Unterminated ${construct}${expectStr}`,
            value: startToken.value,
            line: startToken.line,
            column: startToken.column
        };
    }

    /**
     * Create an error for invalid operator usage
     */
    static invalidOperator(operator: string, context: string, token: Token): ErrorNode {
        return {
            type: 'Error',
            message: `Invalid use of operator '${operator}' ${context}`,
            value: token.value,
            line: token.line,
            column: token.column
        };
    }

    /**
     * Create an error for missing components in declarations
     */
    static incompleteDeclaration(declarationType: string, missing: string, token: Token): ErrorNode {
        return {
            type: 'Error',
            message: `Incomplete ${declarationType} declaration: missing ${missing}`,
            value: token.value,
            line: token.line,
            column: token.column
        };
    }

    /**
     * Create an error for invalid statement structure
     */
    static invalidStatement(statementType: string, problem: string, token: Token): ErrorNode {
        return {
            type: 'Error',
            message: `Invalid ${statementType} statement: ${problem}`,
            value: token.value,
            line: token.line,
            column: token.column
        };
    }

    /**
     * Create an error for missing closing delimiter
     */
    static missingClosingDelimiter(opening: string, closing: string, token: Token): ErrorNode {
        return {
            type: 'Error',
            message: `Missing closing '${closing}' for '${opening}'`,
            value: token.value,
            line: token.line,
            column: token.column
        };
    }

    /**
     * Create an error for failed parsing with fallback
     */
    static parseFailure(context: string, lexemes: Lexeme[], position: number): ErrorNode {
        const token = position < lexemes.length ? lexemes[position].token : null;

        return {
            type: 'Error',
            message: `Failed to parse ${context}`,
            value: token?.value || '',
            line: token?.line || 0,
            column: token?.column || 0
        };
    }
}

/**
 * ErrorRecovery class for parser resilience
 */
export class ErrorRecovery {
    /**
     * Skip tokens until we find a statement terminator or block boundary
     */
    static skipToNextStatement(lexemes: Lexeme[], startPos: number): number {
        let pos = startPos;
        let depth = 0;

        while (pos < lexemes.length) {
            const lexeme = lexemes[pos];

            // Track nesting depth
            if (lexeme.category === LexemeCategory.LBRACE ||
                lexeme.category === LexemeCategory.LBRACKET ||
                lexeme.category === LexemeCategory.LPAREN) {
                depth++;
            } else if (lexeme.category === LexemeCategory.RBRACE ||
                       lexeme.category === LexemeCategory.RBRACKET ||
                       lexeme.category === LexemeCategory.RPAREN) {
                depth--;
                // If we've closed more than we opened, we've gone too far
                if (depth < 0) {
                    return pos;
                }
            }

            // Found a statement terminator at depth 0
            if (depth === 0 && lexeme.category === LexemeCategory.TERMINATOR) {
                return pos + 1; // Return position after the terminator
            }

            pos++;
        }

        return pos;
    }

    /**
     * Find the matching closing delimiter for an opening delimiter
     */
    static findClosingDelimiter(
        lexemes: Lexeme[],
        startPos: number,
        openingType: LexemeCategory,
        closingType: LexemeCategory
    ): number {
        let depth = 1; // We start inside the opening delimiter
        let pos = startPos + 1;

        while (pos < lexemes.length) {
            if (lexemes[pos].category === openingType) {
                depth++;
            } else if (lexemes[pos].category === closingType) {
                depth--;
                if (depth === 0) {
                    return pos;
                }
            }
            pos++;
        }

        return -1; // Not found
    }

    /**
     * Skip to the next comma at the same nesting depth
     */
    static skipToNextComma(lexemes: Lexeme[], startPos: number): number {
        let pos = startPos;
        let bracketDepth = 0;
        let braceDepth = 0;
        let parenDepth = 0;

        while (pos < lexemes.length) {
            const lexeme = lexemes[pos];

            // Track nesting
            if (lexeme.category === LexemeCategory.LBRACKET) bracketDepth++;
            if (lexeme.category === LexemeCategory.RBRACKET) bracketDepth--;
            if (lexeme.category === LexemeCategory.LBRACE) braceDepth++;
            if (lexeme.category === LexemeCategory.RBRACE) braceDepth--;
            if (lexeme.category === LexemeCategory.LPAREN) parenDepth++;
            if (lexeme.category === LexemeCategory.RPAREN) parenDepth--;

            // Found comma at depth 0
            if (lexeme.category === LexemeCategory.COMMA &&
                bracketDepth === 0 && braceDepth === 0 && parenDepth === 0) {
                return pos;
            }

            // Stop if we've gone out of the current context
            if (bracketDepth < 0 || braceDepth < 0 || parenDepth < 0) {
                return -1;
            }

            pos++;
        }

        return -1;
    }

    /**
     * Check if we can recover from the current position
     */
    static canRecover(lexemes: Lexeme[], position: number): boolean {
        // Can't recover if we're at the end
        if (position >= lexemes.length) {
            return false;
        }

        const lexeme = lexemes[position];

        // We can recover at these points
        return lexeme.category === LexemeCategory.TERMINATOR ||
               lexeme.category === LexemeCategory.RBRACE ||
               lexeme.category === LexemeCategory.CONTROL ||
               lexeme.category === LexemeCategory.DECLARATION;
    }

    /**
     * Try to synchronize to a safe parsing point
     */
    static synchronize(lexemes: Lexeme[], startPos: number): number {
        let pos = startPos;

        while (pos < lexemes.length) {
            const lexeme = lexemes[pos];

            // These are good synchronization points
            if (lexeme.category === LexemeCategory.TERMINATOR) {
                return pos + 1;
            }

            // Start of a new statement/declaration is a good sync point
            if (pos > startPos && (
                lexeme.category === LexemeCategory.DECLARATION ||
                lexeme.category === LexemeCategory.CONTROL ||
                lexeme.category === LexemeCategory.KEYWORD
            )) {
                return pos;
            }

            pos++;
        }

        return pos;
    }
}

/**
 * Error context helpers for better error messages
 */
export class ErrorContext {
    /**
     * Get a description of what we were parsing
     */
    static getContext(parseContext: string[], currentContext?: string): string {
        const contexts = [...parseContext];
        if (currentContext) {
            contexts.push(currentContext);
        }

        if (contexts.length === 0) {
            return '';
        }

        if (contexts.length === 1) {
            return `while parsing ${contexts[0]}`;
        }

        return `while parsing ${contexts.join(' in ')}`;
    }

    /**
     * Format a lexeme for error messages
     */
    static formatLexeme(lexeme: Lexeme): string {
        return `'${lexeme.token.value}' (${lexeme.category})`;
    }

    /**
     * Get a helpful suggestion for common errors
     */
    static getSuggestion(error: string): string | null {
        const suggestions: Record<string, string> = {
            'missing ;': 'Did you forget a semicolon at the end of the statement?',
            'missing )': 'Check that all parentheses are properly closed',
            'missing }': 'Check that all braces are properly closed',
            'missing ]': 'Check that all brackets are properly closed',
            'unexpected else': 'An else clause must follow an if statement',
            'unexpected elsif': 'An elsif clause must be part of an if statement',
            'invalid ternary': 'Ternary operator syntax is: condition ? true_expr : false_expr',
            'empty expression': 'This construct requires a valid expression',
        };

        for (const [key, suggestion] of Object.entries(suggestions)) {
            if (error.toLowerCase().includes(key)) {
                return suggestion;
            }
        }

        return null;
    }
}

/**
 * Export a convenience function for creating errors with context
 */
export function createError(
    type: ErrorCategory,
    message: string,
    token: Token | null,
    context?: string[]
): ErrorNode {
    const contextStr = context && context.length > 0
        ? ` (${ErrorContext.getContext(context)})`
        : '';

    const fullMessage = `${message}${contextStr}`;
    const suggestion = ErrorContext.getSuggestion(message);
    const finalMessage = suggestion
        ? `${fullMessage}. ${suggestion}`
        : fullMessage;

    return {
        type: 'Error',
        message: finalMessage,
        value: token?.value || '',
        line: token?.line || 0,
        column: token?.column || 0
    };
}