import { Token } from './Tokenizer.js';

export interface Lexeme {
    category: string;
    token: Token;
}

export class Lexer {
    private declarationKeywords = new Set([
        'my', 'our', 'state', 'const',
        'sub', 'async', 'class', 'field', 'method'
    ]);

    private controlKeywords = new Set([
        'if', 'elsif', 'else', 'unless',
        'while', 'until', 'for', 'foreach',
        'given', 'when', 'default', 'break',
        'next', 'last', 'continue', 'return',
        'do', 'eval', 'try', 'catch', 'finally', 'throw'
    ]);

    private binaryOperators = new Set([
        '+', '-', '*', '/', '%', '**',
        '.', 'x',
        '==', '!=', '<', '>', '<=', '>=', '<=>',
        'eq', 'ne', 'lt', 'gt', 'le', 'ge', 'cmp',
        '&&', '||', '//', 'and', 'or', 'xor',
        '&', '|', '^', '<<', '>>',
        '->', '=>',
        ',', '..'
    ]);

    private assignmentOperators = new Set([
        '=', '+=', '-=', '*=', '/=', '%=', '**=',
        '.=', 'x=',
        '||=', '//=', '&&=',
        '&=', '|=', '^=', '<<=', '>>='
    ]);

    private unaryOperators = new Set([
        '!', '~', 'not'
    ]);

    async *run(tokens: AsyncGenerator<Token>): AsyncGenerator<Lexeme> {
        for await (const token of tokens) {
            yield this.classify(token);
        }
    }

    private classify(token: Token): Lexeme {
        // Literals
        if (token.type === 'NUMBER' || token.type === 'STRING') {
            return {
                category: 'LITERAL',
                token
            };
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
            if (this.declarationKeywords.has(token.value)) {
                return { category: 'DECLARATION', token };
            }
            if (this.controlKeywords.has(token.value)) {
                return { category: 'CONTROL', token };
            }
            // Other keywords
            return { category: 'KEYWORD', token };
        }

        // Operators
        if (token.type === 'OPERATOR') {
            if (this.assignmentOperators.has(token.value)) {
                return { category: 'ASSIGNOP', token };
            }
            if (this.binaryOperators.has(token.value)) {
                return { category: 'BINOP', token };
            }
            if (this.unaryOperators.has(token.value)) {
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
