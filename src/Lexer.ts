import { Token } from './Tokenizer.js';
import * as Lang from './LanguageSpec.js';

export interface Lexeme {
    category: string;
    token: Token;
}

export class Lexer {
    async *run(tokens: AsyncGenerator<Token>): AsyncGenerator<Lexeme> {
        for await (const token of tokens) {
            yield this.classify(token);
        }
    }

    private classify(token: Token): Lexeme {
        // Literals (including QWLIST)
        if (token.type === 'NUMBER' || token.type === 'STRING' || token.type === 'QWLIST') {
            return {
                category: 'LITERAL',
                token
            };
        }

        // Postfix dereference sigils (@*, %*, $*)
        if (token.type === 'POSTFIX_DEREF_SIGIL') {
            return { category: 'POSTFIX_DEREF_SIGIL', token };
        }

        // Variables (classified by sigil)
        if (token.type === 'VARIABLE') {
            const sigil = token.value[0];
            switch (sigil) {
                case '$':
                    return { category: 'SCALAR_VAR', token };
                case '@':
                    return { category: 'ARRAY_VAR', token };
                case '%':
                    return { category: 'HASH_VAR', token };
                case '&':
                    return { category: 'CODE_VAR', token };
                default:
                    return { category: 'VARIABLE', token };
            }
        }

        // Keywords
        if (token.type === 'KEYWORD') {
            if (Lang.KEYWORDS.DECLARATION.has(token.value)) {
                return { category: 'DECLARATION', token };
            }
            if (Lang.KEYWORDS.CONTROL.has(token.value)) {
                return { category: 'CONTROL', token };
            }
            // Other keywords
            return { category: 'KEYWORD', token };
        }

        // Operators
        if (token.type === 'OPERATOR') {
            if (Lang.OPERATORS.ASSIGNMENT.has(token.value)) {
                return { category: 'ASSIGNOP', token };
            }
            if (Lang.OPERATORS.BINARY.has(token.value)) {
                return { category: 'BINOP', token };
            }
            if (Lang.OPERATORS.UNARY.has(token.value)) {
                return { category: 'UNOP', token };
            }
            // Default to binary operator
            return { category: 'BINOP', token };
        }

        // Delimiters - preserve their specific types
        if (token.type === 'LPAREN') return { category: 'LPAREN', token };
        if (token.type === 'RPAREN') return { category: 'RPAREN', token };
        if (token.type === 'LBRACE') return { category: 'LBRACE', token };
        if (token.type === 'RBRACE') return { category: 'RBRACE', token };
        if (token.type === 'LBRACKET') return { category: 'LBRACKET', token };
        if (token.type === 'RBRACKET') return { category: 'RBRACKET', token };
        if (token.type === 'TERMINATOR') return { category: 'TERMINATOR', token };
        if (token.type === 'COMMA') return { category: 'COMMA', token };

        // Identifiers
        if (token.type === 'IDENTIFIER') {
            return { category: 'IDENTIFIER', token };
        }

        // Fallback
        return { category: 'UNKNOWN', token };
    }
}
