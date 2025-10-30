/**
 * Parser Utility Functions
 *
 * This module provides reusable utilities to eliminate code duplication
 * and standardize common parsing patterns.
 */

import { Lexeme, LexemeCategory } from './Lexer.js';
import { Token } from './Tokenizer.js';
import * as Lang from './LanguageSpec.js';

/**
 * DepthTracker - Handles bracket/brace/paren depth tracking
 * Eliminates the 15+ duplicated depth tracking patterns
 */
export class DepthTracker {
    private bracketDepth = 0;
    private braceDepth = 0;
    private parenDepth = 0;

    /**
     * Reset all depths to 0
     */
    reset(): void {
        this.bracketDepth = 0;
        this.braceDepth = 0;
        this.parenDepth = 0;
    }

    /**
     * Update depths based on a lexeme
     */
    update(lexeme: Lexeme): void {
        switch (lexeme.category) {
            case LexemeCategory.LBRACKET: this.bracketDepth++; break;
            case LexemeCategory.RBRACKET: this.bracketDepth--; break;
            case LexemeCategory.LBRACE: this.braceDepth++; break;
            case LexemeCategory.RBRACE: this.braceDepth--; break;
            case LexemeCategory.LPAREN: this.parenDepth++; break;
            case LexemeCategory.RPAREN: this.parenDepth--; break;
        }
    }

    /**
     * Check if all depths are at zero (balanced)
     */
    isAtDepthZero(): boolean {
        return this.bracketDepth === 0 &&
               this.braceDepth === 0 &&
               this.parenDepth === 0;
    }

    /**
     * Check if any depth is negative (over-closed)
     */
    hasNegativeDepth(): boolean {
        return this.bracketDepth < 0 ||
               this.braceDepth < 0 ||
               this.parenDepth < 0;
    }

    /**
     * Get current depth values
     */
    getDepths(): { brackets: number; braces: number; parens: number } {
        return {
            brackets: this.bracketDepth,
            braces: this.braceDepth,
            parens: this.parenDepth
        };
    }

    /**
     * Find all positions of a specific lexeme type at depth 0
     * This is the most common pattern - finding commas at depth 0
     */
    static findAtDepthZero(
        lexemes: Lexeme[],
        targetCategory: LexemeCategory,
        startPos = 0,
        endPos?: number
    ): number[] {
        const positions: number[] = [];
        const tracker = new DepthTracker();
        const end = endPos ?? lexemes.length;

        for (let i = startPos; i < end; i++) {
            tracker.update(lexemes[i]);

            // Check if we've gone too deep (mismatched delimiters)
            if (tracker.hasNegativeDepth()) {
                break;
            }

            // Check for target at depth 0
            if (lexemes[i].category === targetCategory && tracker.isAtDepthZero()) {
                positions.push(i);
            }
        }

        return positions;
    }

    /**
     * Split lexemes by a delimiter at depth 0 (commonly used for comma-separated lists)
     */
    static splitAtDepthZero(
        lexemes: Lexeme[],
        delimiter: LexemeCategory,
        startPos = 0,
        endPos?: number
    ): Lexeme[][] {
        const positions = DepthTracker.findAtDepthZero(lexemes, delimiter, startPos, endPos);
        const segments: Lexeme[][] = [];

        let start = startPos;
        for (const pos of positions) {
            if (pos > start) {
                segments.push(lexemes.slice(start, pos));
            }
            start = pos + 1; // Skip the delimiter
        }

        // Add the last segment
        const end = endPos ?? lexemes.length;
        if (start < end) {
            segments.push(lexemes.slice(start, end));
        }

        return segments;
    }
}

/**
 * DelimiterMatcher - Finds matching closing delimiters
 * Replaces the repeated "find closing bracket/brace/paren" patterns
 */
export class DelimiterMatcher {
    /**
     * Find the position of the matching closing delimiter
     */
    static findClosing(
        lexemes: Lexeme[],
        startPos: number,
        openingType: LexemeCategory,
        closingType: LexemeCategory
    ): number {
        let depth = 1; // We start after the opening delimiter
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
     * Find matching closing bracket ] for [
     */
    static findClosingBracket(lexemes: Lexeme[], startPos: number): number {
        return this.findClosing(
            lexemes,
            startPos,
            LexemeCategory.LBRACKET,
            LexemeCategory.RBRACKET
        );
    }

    /**
     * Find matching closing brace } for {
     */
    static findClosingBrace(lexemes: Lexeme[], startPos: number): number {
        return this.findClosing(
            lexemes,
            startPos,
            LexemeCategory.LBRACE,
            LexemeCategory.RBRACE
        );
    }

    /**
     * Find matching closing paren ) for (
     */
    static findClosingParen(lexemes: Lexeme[], startPos: number): number {
        return this.findClosing(
            lexemes,
            startPos,
            LexemeCategory.LPAREN,
            LexemeCategory.RPAREN
        );
    }

    /**
     * Extract content between matching delimiters (excluding the delimiters)
     */
    static extractBetween(
        lexemes: Lexeme[],
        startPos: number,
        openingType: LexemeCategory,
        closingType: LexemeCategory
    ): Lexeme[] | null {
        const closingPos = this.findClosing(lexemes, startPos, openingType, closingType);
        if (closingPos === -1) {
            return null; // No matching closing delimiter
        }

        return lexemes.slice(startPos + 1, closingPos);
    }
}

/**
 * TokenChecker - Centralized token checking using LanguageSpec
 * Replaces all the hardcoded string comparisons
 */
export class TokenChecker {
    /**
     * Check if a lexeme is a specific keyword
     */
    static isKeyword(lexeme: Lexeme, keyword: string): boolean {
        return lexeme.category === LexemeCategory.KEYWORD &&
               lexeme.token.value === keyword &&
               Lang.isKeyword(keyword);
    }

    /**
     * Check if a lexeme is a control keyword
     */
    static isControlKeyword(lexeme: Lexeme, keyword?: string): boolean {
        if (keyword) {
            return lexeme.category === LexemeCategory.CONTROL &&
                   lexeme.token.value === keyword &&
                   Lang.KEYWORDS.CONTROL.has(keyword);
        }
        return lexeme.category === LexemeCategory.CONTROL;
    }

    /**
     * Check if a lexeme is a declaration keyword
     */
    static isDeclarationKeyword(lexeme: Lexeme, keyword?: string): boolean {
        if (keyword) {
            return lexeme.category === LexemeCategory.DECLARATION &&
                   lexeme.token.value === keyword &&
                   Lang.KEYWORDS.DECLARATION.has(keyword);
        }
        return lexeme.category === LexemeCategory.DECLARATION;
    }

    /**
     * Check if a lexeme is a specific operator
     */
    static isOperator(lexeme: Lexeme, operator: string): boolean {
        return (lexeme.category === LexemeCategory.OPERATOR ||
                lexeme.category === LexemeCategory.BINOP ||
                lexeme.category === LexemeCategory.ASSIGNOP ||
                lexeme.category === LexemeCategory.UNOP) &&
               lexeme.token.value === operator;
    }

    /**
     * Check if a lexeme is a binary operator
     */
    static isBinaryOperator(lexeme: Lexeme): boolean {
        return lexeme.category === LexemeCategory.BINOP ||
               (lexeme.category === LexemeCategory.OPERATOR &&
                Lang.OPERATORS.BINARY.has(lexeme.token.value));
    }

    /**
     * Check if a lexeme is an assignment operator
     */
    static isAssignmentOperator(lexeme: Lexeme): boolean {
        return lexeme.category === LexemeCategory.ASSIGNOP ||
               (lexeme.category === LexemeCategory.OPERATOR &&
                Lang.OPERATORS.ASSIGNMENT.has(lexeme.token.value));
    }

    /**
     * Check if a lexeme is the arrow operator ->
     */
    static isArrowOperator(lexeme: Lexeme): boolean {
        return this.isOperator(lexeme, '->');
    }

    /**
     * Check if a lexeme is the fat comma operator =>
     */
    static isFatComma(lexeme: Lexeme): boolean {
        return this.isOperator(lexeme, '=>');
    }

    /**
     * Check if a lexeme is a colon :
     */
    static isColon(lexeme: Lexeme): boolean {
        return this.isOperator(lexeme, ':');
    }

    /**
     * Check if a lexeme is a question mark (ternary)
     */
    static isQuestionMark(lexeme: Lexeme): boolean {
        return this.isOperator(lexeme, '?');
    }

    /**
     * Check if a lexeme is a comma
     */
    static isComma(lexeme: Lexeme): boolean {
        return lexeme.category === LexemeCategory.COMMA;
    }

    /**
     * Check if a lexeme is a terminator (semicolon)
     */
    static isTerminator(lexeme: Lexeme): boolean {
        return lexeme.category === LexemeCategory.TERMINATOR;
    }

    /**
     * Check if a lexeme is a variable of any type
     */
    static isVariable(lexeme: Lexeme): boolean {
        return lexeme.category === LexemeCategory.SCALAR_VAR ||
               lexeme.category === LexemeCategory.ARRAY_VAR ||
               lexeme.category === LexemeCategory.HASH_VAR ||
               lexeme.category === LexemeCategory.CODE_VAR ||
               lexeme.category === LexemeCategory.VARIABLE;
    }

    /**
     * Check if a lexeme is a literal (number, string, qwlist)
     */
    static isLiteral(lexeme: Lexeme): boolean {
        return lexeme.category === LexemeCategory.LITERAL;
    }

    /**
     * Check if a lexeme is an identifier
     */
    static isIdentifier(lexeme: Lexeme): boolean {
        return lexeme.category === LexemeCategory.IDENTIFIER;
    }

    /**
     * Check if a token value matches any of the provided values
     */
    static isOneOf(lexeme: Lexeme, values: string[]): boolean {
        return values.includes(lexeme.token.value);
    }
}

/**
 * PositionTracker - Helps track position while parsing
 */
export class PositionTracker {
    private position: number;
    private readonly lexemes: Lexeme[];

    constructor(lexemes: Lexeme[], startPos = 0) {
        this.lexemes = lexemes;
        this.position = startPos;
    }

    /**
     * Get current position
     */
    getPosition(): number {
        return this.position;
    }

    /**
     * Get current lexeme (or null if at end)
     */
    current(): Lexeme | null {
        return this.position < this.lexemes.length ? this.lexemes[this.position] : null;
    }

    /**
     * Peek at next lexeme without advancing
     */
    peek(offset = 1): Lexeme | null {
        const pos = this.position + offset;
        return pos < this.lexemes.length ? this.lexemes[pos] : null;
    }

    /**
     * Advance position and return previous lexeme
     */
    advance(): Lexeme | null {
        const lexeme = this.current();
        if (lexeme) {
            this.position++;
        }
        return lexeme;
    }

    /**
     * Check if at end of lexemes
     */
    isAtEnd(): boolean {
        return this.position >= this.lexemes.length;
    }

    /**
     * Get remaining lexemes from current position
     */
    remaining(): Lexeme[] {
        return this.lexemes.slice(this.position);
    }

    /**
     * Skip lexemes while condition is true
     */
    skipWhile(predicate: (lexeme: Lexeme) => boolean): void {
        while (!this.isAtEnd() && predicate(this.lexemes[this.position])) {
            this.position++;
        }
    }

    /**
     * Skip to a specific lexeme category
     */
    skipTo(category: LexemeCategory): boolean {
        while (!this.isAtEnd()) {
            if (this.lexemes[this.position].category === category) {
                return true;
            }
            this.position++;
        }
        return false;
    }
}

/**
 * Export convenience functions for common patterns
 */

/**
 * Find commas at depth 0 - the most common pattern
 */
export function findCommasAtDepthZero(lexemes: Lexeme[], start = 0, end?: number): number[] {
    return DepthTracker.findAtDepthZero(lexemes, LexemeCategory.COMMA, start, end);
}

/**
 * Split by commas at depth 0 - used for argument lists, array elements, etc.
 */
export function splitByCommas(lexemes: Lexeme[], start = 0, end?: number): Lexeme[][] {
    return DepthTracker.splitAtDepthZero(lexemes, LexemeCategory.COMMA, start, end);
}

/**
 * Check if brackets/braces/parens are balanced
 */
export function areDelimitersBalanced(lexemes: Lexeme[]): boolean {
    const tracker = new DepthTracker();
    for (const lexeme of lexemes) {
        tracker.update(lexeme);
        if (tracker.hasNegativeDepth()) {
            return false;
        }
    }
    return tracker.isAtDepthZero();
}