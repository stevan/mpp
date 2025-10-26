import { Token, TokenType } from './Tokenizer.js';
import { LexemeCategory } from './Types.js';
import * as Lang from './LanguageSpec.js';

export { LexemeCategory };

export interface Lexeme {
    category: LexemeCategory;
    token: Token;
}

export class Lexer {
    async *run(tokens: AsyncGenerator<Token>): AsyncGenerator<Lexeme> {
        for await (const token of tokens) {
            yield this.classify(token);
        }
    }

    private classify(token: Token): Lexeme {
        // Error tokens
        if (token.type === TokenType.ERROR) {
            return {
                category: LexemeCategory.TOKEN_ERROR,
                token
            };
        }

        // Literals (including QWLIST)
        if (token.type === TokenType.NUMBER || token.type === TokenType.STRING || token.type === TokenType.QWLIST) {
            return {
                category: LexemeCategory.LITERAL,
                token
            };
        }

        // Postfix dereference sigils (@*, %*, $*)
        if (token.type === TokenType.POSTFIX_DEREF_SIGIL) {
            return { category: LexemeCategory.POSTFIX_DEREF_SIGIL, token };
        }

        // Variables (classified by sigil)
        if (token.type === TokenType.VARIABLE) {
            const sigil = token.value[0];
            switch (sigil) {
                case '$':
                    return { category: LexemeCategory.SCALAR_VAR, token };
                case '@':
                    return { category: LexemeCategory.ARRAY_VAR, token };
                case '%':
                    return { category: LexemeCategory.HASH_VAR, token };
                case '&':
                    return { category: LexemeCategory.CODE_VAR, token };
                default:
                    return { category: LexemeCategory.VARIABLE, token };
            }
        }

        // Keywords
        if (token.type === TokenType.KEYWORD) {
            if (Lang.KEYWORDS.DECLARATION.has(token.value)) {
                return { category: LexemeCategory.DECLARATION, token };
            }
            if (Lang.KEYWORDS.CONTROL.has(token.value)) {
                return { category: LexemeCategory.CONTROL, token };
            }
            // Other keywords
            return { category: LexemeCategory.KEYWORD, token };
        }

        // Operators
        if (token.type === TokenType.OPERATOR) {
            if (Lang.OPERATORS.ASSIGNMENT.has(token.value)) {
                return { category: LexemeCategory.ASSIGNOP, token };
            }
            if (Lang.OPERATORS.BINARY.has(token.value)) {
                return { category: LexemeCategory.BINOP, token };
            }
            if (Lang.OPERATORS.UNARY.has(token.value)) {
                return { category: LexemeCategory.UNOP, token };
            }
            // Default to binary operator
            return { category: LexemeCategory.BINOP, token };
        }

        // Delimiters - preserve their specific types
        if (token.type === TokenType.LPAREN) return { category: LexemeCategory.LPAREN, token };
        if (token.type === TokenType.RPAREN) return { category: LexemeCategory.RPAREN, token };
        if (token.type === TokenType.LBRACE) return { category: LexemeCategory.LBRACE, token };
        if (token.type === TokenType.RBRACE) return { category: LexemeCategory.RBRACE, token };
        if (token.type === TokenType.LBRACKET) return { category: LexemeCategory.LBRACKET, token };
        if (token.type === TokenType.RBRACKET) return { category: LexemeCategory.RBRACKET, token };
        if (token.type === TokenType.TERMINATOR) return { category: LexemeCategory.TERMINATOR, token };
        if (token.type === TokenType.COMMA) return { category: LexemeCategory.COMMA, token };

        // Identifiers
        if (token.type === TokenType.IDENTIFIER) {
            return { category: LexemeCategory.IDENTIFIER, token };
        }

        // TypeScript will ensure this is exhaustive - no UNKNOWN needed
        // If we reach here, it's a compile-time error
        const _exhaustive: never = token.type;
        throw new Error(`Unhandled token type: ${_exhaustive}`);
    }
}
