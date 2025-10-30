import * as Lang from './LanguageSpec.js';
import { TokenType } from './Types.js';

export { TokenType };

export interface Token {
    type: TokenType;
    value: string;
    line: number;
    column: number;
    flags?: string;  // Optional field for regex flags
}

export class Tokenizer {
    private lastToken: Token | null = null;

    async *run(source: AsyncGenerator<string>): AsyncGenerator<Token> {
        let line = 1;
        let column = 1;
        this.lastToken = null; // Reset for each run

        for await (const chunk of source) {
            let i = 0;

            while (i < chunk.length) {
                const char = chunk[i];

                // Skip whitespace
                if (this.isWhitespace(char)) {
                    if (char === '\n') {
                        line++;
                        column = 1;
                    } else {
                        column++;
                    }
                    i++;
                    continue;
                }

                // Skip comments (# to end of line)
                if (char === '#') {
                    // Skip until newline or end of chunk
                    while (i < chunk.length && chunk[i] !== '\n') {
                        i++;
                        column++;
                    }
                    // The newline will be handled on the next iteration
                    continue;
                }

                // Check for string literals
                if (char === '"' || char === "'") {
                    const result = this.tokenizeString(chunk, i, char, line, column);
                    yield result.token;
                    i = result.newIndex;
                    column = result.newColumn;
                    continue;
                }

                // Check for variable (starts with $, @, %, &)
                // Only match if followed by identifier char or _ (for $_)
                if (this.isSigil(char)) {
                    const nextChar = i + 1 < chunk.length ? chunk[i + 1] : '';

                    // Special case: postfix dereference sigils @*, %*, $*
                    // Also handle postfix deref slices: @[, @{
                    // These are used in modern Perl postfix dereferencing: $aref->@*, $href->%*, $aref->@[0..4]
                    if (nextChar === '*' || nextChar === '[' || nextChar === '{') {
                        yield {
                            type: TokenType.POSTFIX_DEREF_SIGIL,
                            value: char, // Just the sigil: @, %, or $
                            line,
                            column
                        };
                        i++;
                        column++;
                        continue;
                    }

                    // Check if this looks like a variable (sigil + identifier or $_)
                    if (this.isIdentifierStart(nextChar) || nextChar === '_') {
                        const start = i;
                        const startColumn = column;
                        i++;
                        column++;

                        // Special case: $_ is valid
                        if (nextChar === '_' &&
                            (i + 1 >= chunk.length || !this.isIdentifierChar(chunk[i + 1]))) {
                            i++;
                            column++;
                            const token: Token = {
                                type: TokenType.VARIABLE,
                                value: chunk.substring(start, i),
                                line,
                                column: startColumn
                            };
                            yield token;
                            this.lastToken = token;
                            continue;
                        }

                        // Collect identifier characters, including :: for package names
                        while (i < chunk.length) {
                            if (this.isIdentifierChar(chunk[i])) {
                                i++;
                                column++;
                            } else if (chunk[i] === ':' && i + 1 < chunk.length && chunk[i + 1] === ':') {
                                // Handle :: package separator
                                i += 2;
                                column += 2;
                            } else {
                                break;
                            }
                        }

                        const varToken: Token = {
                            type: TokenType.VARIABLE,
                            value: chunk.substring(start, i),
                            line,
                            column: startColumn
                        };
                        yield varToken;
                        this.lastToken = varToken;
                        continue;
                    }
                    // If not followed by identifier, fall through to operator handling
                }

                // Check for identifier or keyword
                if (this.isIdentifierStart(char)) {
                    const start = i;
                    const startColumn = column;

                    // Collect identifier characters, including :: for package names
                    while (i < chunk.length) {
                        if (this.isIdentifierChar(chunk[i])) {
                            i++;
                            column++;
                        } else if (chunk[i] === ':' && i + 1 < chunk.length && chunk[i + 1] === ':') {
                            // Handle :: package separator
                            i += 2;
                            column += 2;
                        } else {
                            break;
                        }
                    }

                    const value = chunk.substring(start, i);

                    // Special handling for qw// quote-word operator
                    if (value === 'qw') {
                        // Skip whitespace between 'qw' and delimiter
                        while (i < chunk.length && this.isWhitespace(chunk[i]) && chunk[i] !== '\n') {
                            i++;
                            column++;
                        }

                        if (i < chunk.length) {
                            const delimiter = chunk[i];
                            const closingDelim = this.getClosingDelimiter(delimiter);
                            i++;
                            column++;

                            // Find closing delimiter
                            const contentStart = i;
                            let depth = 1;
                            while (i < chunk.length && depth > 0) {
                                if (chunk[i] === delimiter) {
                                    if (closingDelim === delimiter) {
                                        // Non-paired delimiter (/, |, etc.)
                                        depth--;
                                        break;
                                    } else {
                                        // Opening of paired delimiter
                                        depth++;
                                    }
                                } else if (closingDelim !== delimiter && chunk[i] === closingDelim) {
                                    depth--;
                                    if (depth === 0) break;
                                }
                                i++;
                                column++;
                            }

                            const content = chunk.substring(contentStart, i);
                            // Split on whitespace and filter empty strings
                            const words = content.split(/\s+/).filter(w => w.length > 0);

                            i++; // Skip closing delimiter
                            column++;

                            yield {
                                type: TokenType.QWLIST,
                                value: JSON.stringify(words), // Store as JSON array
                                line,
                                column: startColumn
                            };
                            continue;
                        }
                    }

                    const type = Lang.isKeyword(value) ? TokenType.KEYWORD : TokenType.IDENTIFIER;

                    const idToken: Token = {
                        type,
                        value,
                        line,
                        column: startColumn
                    };
                    yield idToken;
                    this.lastToken = idToken;
                    continue;
                }

                // Check for number
                if (this.isDigit(char)) {
                    const start = i;
                    const startColumn = column;

                    while (i < chunk.length && this.isDigit(chunk[i])) {
                        i++;
                        column++;
                    }

                    const token: Token = {
                        type: TokenType.NUMBER,
                        value: chunk.substring(start, i),
                        line,
                        column: startColumn
                    };
                    yield token;
                    this.lastToken = token;
                    continue;
                }

                // Check for multi-character operators (3-char first, then 2-char)
                if (i + 2 < chunk.length) {
                    const threeChar = chunk.substring(i, i + 3);
                    if (Lang.isMultiCharOperator(threeChar)) {
                        const token: Token = {
                            type: TokenType.OPERATOR,
                            value: threeChar,
                            line,
                            column
                        };
                        yield token;
                        this.lastToken = token;
                        i += 3;
                        column += 3;
                        continue;
                    }
                }

                if (i + 1 < chunk.length) {
                    const twoChar = chunk.substring(i, i + 2);
                    if (Lang.isMultiCharOperator(twoChar)) {
                        const token: Token = {
                            type: TokenType.OPERATOR,
                            value: twoChar,
                            line,
                            column
                        };
                        yield token;
                        this.lastToken = token;
                        i += 2;
                        column += 2;
                        continue;
                    }
                }

                // Check for delimiters
                if (Lang.isDelimiter(char)) {
                    const type = Lang.getDelimiterType(char);
                    const token: Token = {
                        type,
                        value: char,
                        line,
                        column
                    };
                    yield token;
                    this.lastToken = token;
                    i++;
                    column++;
                    continue;
                }

                // Check for regex literal (must come before single-char operator)
                if (char === '/' && this.looksLikeRegex(chunk, i)) {
                    const startColumn = column;
                    i++; // Skip initial /
                    column++;

                    let pattern = '';
                    let escaped = false;

                    // Scan until closing / (handling escapes)
                    while (i < chunk.length) {
                        const ch = chunk[i];
                        if (escaped) {
                            pattern += ch;
                            escaped = false;
                        } else if (ch === '\\') {
                            pattern += ch;
                            escaped = true;
                        } else if (ch === '/') {
                            // Found closing delimiter
                            i++;
                            column++;
                            break;
                        } else {
                            pattern += ch;
                        }
                        i++;
                        column++;
                    }

                    // Scan regex flags (gimsx)
                    let flags = '';
                    while (i < chunk.length && 'gimsx'.includes(chunk[i])) {
                        flags += chunk[i];
                        i++;
                        column++;
                    }

                    const token: Token = {
                        type: TokenType.REGEX,
                        value: pattern,
                        line,
                        column: startColumn
                    };
                    if (flags) {
                        token.flags = flags;
                    }
                    yield token;
                    this.lastToken = token;
                    continue;
                }

                // Check for single-character operator
                if (Lang.isOperatorChar(char)) {
                    const token: Token = {
                        type: TokenType.OPERATOR,
                        value: char,
                        line,
                        column
                    };
                    yield token;
                    this.lastToken = token;
                    i++;
                    column++;
                    continue;
                }

                // Unknown character - emit ERROR token
                yield {
                    type: TokenType.ERROR,
                    value: char,
                    line,
                    column
                };
                i++;
                column++;
            }
        }
    }

    private isWhitespace(char: string): boolean {
        return char === ' ' || char === '\t' || char === '\n' || char === '\r';
    }

    private isSigil(char: string): boolean {
        return Lang.isSigil(char);
    }

    private isDigit(char: string): boolean {
        return char >= '0' && char <= '9';
    }

    private isIdentifierStart(char: string): boolean {
        return (char >= 'a' && char <= 'z') ||
               (char >= 'A' && char <= 'Z') ||
               char === '_';
    }

    private isIdentifierChar(char: string): boolean {
        return (char >= 'a' && char <= 'z') ||
               (char >= 'A' && char <= 'Z') ||
               (char >= '0' && char <= '9') ||
               char === '_';
    }

    private getClosingDelimiter(opening: string): string {
        return Lang.getClosingDelimiter(opening);
    }

    private tokenizeString(
        chunk: string,
        startIndex: number,
        quote: string,
        line: number,
        startColumn: number
    ): { token: Token; newIndex: number; newColumn: number } {
        let i = startIndex + 1; // Skip opening quote
        let column = startColumn + 1;
        let escaped = false;

        while (i < chunk.length) {
            const char = chunk[i];

            if (escaped) {
                escaped = false;
                i++;
                column++;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                i++;
                column++;
                continue;
            }

            if (char === quote) {
                // Found closing quote
                i++; // Include closing quote
                column++;
                return {
                    token: {
                        type: TokenType.STRING,
                        value: chunk.substring(startIndex, i),
                        line,
                        column: startColumn
                    },
                    newIndex: i,
                    newColumn: column
                };
            }

            i++;
            column++;
        }

        // Unclosed string - return ERROR token
        return {
            token: {
                type: TokenType.ERROR,
                value: chunk.substring(startIndex),
                line,
                column: startColumn
            },
            newIndex: i,
            newColumn: column
        };
    }

    private looksLikeRegex(chunk: string, pos: number): boolean {
        // Check if '/' should be treated as regex delimiter

        // After =~ or !~ it's always regex
        if (this.lastToken && this.lastToken.type === TokenType.OPERATOR) {
            const op = this.lastToken.value;
            if (op === '=~' || op === '!~') {
                return true;
            }
        }

        // At start of statement or after control keywords, likely regex
        if (!this.lastToken ||
            this.lastToken.type === TokenType.TERMINATOR ||
            this.lastToken.type === TokenType.LBRACE ||
            (this.lastToken.type === TokenType.KEYWORD &&
             ['if', 'unless', 'while', 'until', 'elsif'].includes(this.lastToken.value))) {
            return true;
        }

        // After operators that expect a value (not after identifiers/variables/numbers)
        if (this.lastToken && (
            this.lastToken.type === TokenType.LPAREN ||
            this.lastToken.type === TokenType.COMMA ||
            (this.lastToken.type === TokenType.OPERATOR &&
             ![')', ']', '}'].includes(this.lastToken.value)))) {
            return true;
        }

        // After something that produces a value, it's likely division
        if (this.lastToken && (
            this.lastToken.type === TokenType.NUMBER ||
            this.lastToken.type === TokenType.VARIABLE ||
            this.lastToken.type === TokenType.IDENTIFIER ||
            this.lastToken.type === TokenType.RPAREN ||
            this.lastToken.type === TokenType.RBRACKET)) {
            return false;
        }

        // Default to division
        return false;
    }
}
