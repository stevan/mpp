/**
 * Central Language Specification for MPP (Modern Perl Parser)
 *
 * This module contains all language definitions in one place:
 * - Keywords (categorized by purpose)
 * - Operators (with precedence and associativity)
 * - Sigils and delimiters
 * - Multi-character operator sequences
 *
 * Design Goals:
 * - Single source of truth for language syntax
 * - Easy to maintain and extend
 * - Clear categorization for semantic analysis
 * - Explicit precedence hierarchy
 */

import { TokenType } from './Types.js';

// ============================================================================
// KEYWORDS
// ============================================================================

/**
 * Keywords categorized by their role in the language
 */
export const KEYWORDS = {
    // Variable declaration keywords
    DECLARATION: new Set([
        'my', 'our', 'state', 'const',
        'sub', 'async',
        'class', 'field', 'method'
    ]),

    // Special keywords (has is special - treated like field but with different syntax)
    SPECIAL: new Set([
        'has'
    ]),

    // Control flow keywords
    CONTROL: new Set([
        'if', 'elsif', 'else', 'unless',
        'while', 'until', 'for', 'foreach',
        'given', 'when', 'default', 'break',
        'next', 'last', 'redo', 'continue', 'return',
        'do', 'eval',
        'try', 'catch', 'finally', 'throw',
        'die', 'warn', 'defer'
    ]),

    // Module system keywords
    MODULE: new Set([
        'use', 'require', 'package', 'import'
    ]),

    // Built-in functions (that look like keywords)
    BUILTIN: new Set([
        'print', 'say',
        'spawn', 'send', 'recv', 'self', 'kill', 'alive',
        'defined', 'undef', 'exists', 'delete',
        // Boolean literals
        'true', 'false'
    ]),

    // Word-form operators (treated as keywords for tokenization)
    WORD_OPERATOR: new Set([
        'and', 'or', 'not', 'xor',
        'cmp', 'eq', 'ne', 'lt', 'gt', 'le', 'ge'
    ])
} as const;

/**
 * All keywords combined (for tokenizer lookup)
 */
export const ALL_KEYWORDS = new Set([
    ...KEYWORDS.DECLARATION,
    ...KEYWORDS.CONTROL,
    ...KEYWORDS.MODULE,
    ...KEYWORDS.BUILTIN,
    ...KEYWORDS.WORD_OPERATOR,
    ...KEYWORDS.SPECIAL
]);

// ============================================================================
// OPERATORS
// ============================================================================

/**
 * Operator precedence and associativity
 * Based on Perl operator precedence with some simplifications
 */
export interface OperatorInfo {
    precedence: number;
    associativity: 'LEFT' | 'RIGHT' | 'NONE';
}

/**
 * Operator precedence table
 * Lower numbers = higher precedence (tighter binding)
 */
export const OPERATOR_PRECEDENCE: Record<string, OperatorInfo> = {
    // Level 3: Exponentiation (RIGHT associative)
    '**': { precedence: 3, associativity: 'RIGHT' },

    // Level 6: Multiplicative (LEFT)
    '*': { precedence: 6, associativity: 'LEFT' },
    '/': { precedence: 6, associativity: 'LEFT' },
    '%': { precedence: 6, associativity: 'LEFT' },
    'x': { precedence: 6, associativity: 'LEFT' },

    // Level 7: Additive and concatenation (LEFT)
    '+': { precedence: 7, associativity: 'LEFT' },
    '-': { precedence: 7, associativity: 'LEFT' },
    '.': { precedence: 7, associativity: 'LEFT' },

    // Level 8: Bit shift (LEFT)
    '<<': { precedence: 8, associativity: 'LEFT' },
    '>>': { precedence: 8, associativity: 'LEFT' },

    // Level 9: Relational comparison (LEFT)
    '<': { precedence: 9, associativity: 'LEFT' },
    '>': { precedence: 9, associativity: 'LEFT' },
    '<=': { precedence: 9, associativity: 'LEFT' },
    '>=': { precedence: 9, associativity: 'LEFT' },
    'lt': { precedence: 9, associativity: 'LEFT' },
    'gt': { precedence: 9, associativity: 'LEFT' },
    'le': { precedence: 9, associativity: 'LEFT' },
    'ge': { precedence: 9, associativity: 'LEFT' },

    // Level 10: Equality comparison (LEFT)
    '==': { precedence: 10, associativity: 'LEFT' },
    '!=': { precedence: 10, associativity: 'LEFT' },
    '<=>': { precedence: 10, associativity: 'LEFT' },
    'eq': { precedence: 10, associativity: 'LEFT' },
    'ne': { precedence: 10, associativity: 'LEFT' },
    'cmp': { precedence: 10, associativity: 'LEFT' },

    // Level 11: Bitwise AND (LEFT)
    '&': { precedence: 11, associativity: 'LEFT' },

    // Level 12: Bitwise OR and XOR (LEFT)
    '|': { precedence: 12, associativity: 'LEFT' },
    '^': { precedence: 12, associativity: 'LEFT' },

    // Level 13: Logical AND (LEFT)
    '&&': { precedence: 13, associativity: 'LEFT' },

    // Level 14: Logical OR and defined-or (LEFT)
    '||': { precedence: 14, associativity: 'LEFT' },
    '//': { precedence: 14, associativity: 'LEFT' },

    // Level 15: Range (NONE)
    '..': { precedence: 15, associativity: 'NONE' },

    // Level 16: Ternary conditional (RIGHT associative)
    '?': { precedence: 16, associativity: 'RIGHT' },

    // Level 17: Assignment (RIGHT associative)
    '=': { precedence: 17, associativity: 'RIGHT' },
    '+=': { precedence: 17, associativity: 'RIGHT' },
    '-=': { precedence: 17, associativity: 'RIGHT' },
    '*=': { precedence: 17, associativity: 'RIGHT' },
    '/=': { precedence: 17, associativity: 'RIGHT' },
    '%=': { precedence: 17, associativity: 'RIGHT' },
    '**=': { precedence: 17, associativity: 'RIGHT' },
    '.=': { precedence: 17, associativity: 'RIGHT' },
    'x=': { precedence: 17, associativity: 'RIGHT' },
    '||=': { precedence: 17, associativity: 'RIGHT' },
    '//=': { precedence: 17, associativity: 'RIGHT' },
    '&&=': { precedence: 17, associativity: 'RIGHT' },
    '&=': { precedence: 17, associativity: 'RIGHT' },
    '|=': { precedence: 17, associativity: 'RIGHT' },
    '^=': { precedence: 17, associativity: 'RIGHT' },
    '<<=': { precedence: 17, associativity: 'RIGHT' },
    '>>=': { precedence: 17, associativity: 'RIGHT' },

    // Level 18: Comma and fat comma (LEFT)
    ',': { precedence: 18, associativity: 'LEFT' },
    '=>': { precedence: 18, associativity: 'LEFT' },

    // Level 20: Low-precedence AND (LEFT)
    'and': { precedence: 20, associativity: 'LEFT' },

    // Level 21: Low-precedence OR and XOR (LEFT)
    'or': { precedence: 21, associativity: 'LEFT' },
    'xor': { precedence: 21, associativity: 'LEFT' },

    // Special operators (not in precedence table but recognized)
    '->': { precedence: 2, associativity: 'LEFT' }, // Arrow (highest precedence, postfix)
    '++': { precedence: 2, associativity: 'NONE' }, // Increment (prefix/postfix)
    '--': { precedence: 2, associativity: 'NONE' }, // Decrement (prefix/postfix)
    ':': { precedence: 19, associativity: 'NONE' },  // Colon (for labels, attributes)
};

/**
 * Operators categorized by semantic role
 */
export const OPERATORS = {
    // Binary operators (used in expressions)
    BINARY: new Set([
        '+', '-', '*', '/', '%', '**',
        '.', 'x',
        '==', '!=', '<', '>', '<=', '>=', '<=>',
        'eq', 'ne', 'lt', 'gt', 'le', 'ge', 'cmp',
        '&&', '||', '//', 'and', 'or', 'xor',
        '&', '|', '^', '<<', '>>',
        '->', '=>',
        ',', '..'
    ]),

    // Assignment operators
    ASSIGNMENT: new Set([
        '=', '+=', '-=', '*=', '/=', '%=', '**=',
        '.=', 'x=',
        '||=', '//=', '&&=',
        '&=', '|=', '^=', '<<=', '>>='
    ]),

    // Unary operators
    UNARY: new Set([
        '!', '~', 'not',
        '++', '--'  // Can be used as prefix operators
    ])
} as const;

/**
 * Multi-character operators (ordered by length for tokenization)
 * Must check longer sequences first to avoid ambiguity
 */
export const MULTI_CHAR_OPERATORS = {
    THREE_CHAR: [
        '<=>',  // Spaceship operator
        '**=',  // Exponentiation assignment
        '||=',  // Logical OR assignment
        '//=',  // Defined-OR assignment
        '&&=',  // Logical AND assignment
        '<<=',  // Left shift assignment
        '>>='   // Right shift assignment
    ],
    TWO_CHAR: [
        // Comparison
        '==', '!=', '<=', '>=', '<=>',
        // Logical
        '&&', '||', '//',
        // Arithmetic
        '**',
        // Increment/Decrement
        '++', '--',
        // Bitwise
        '<<', '>>',
        // Assignment
        '+=', '-=', '*=', '/=', '%=',
        '.=', 'x=',
        '&=', '|=', '^=',
        // Special
        '->', '=>', '..'
    ]
} as const;

// ============================================================================
// SIGILS
// ============================================================================

/**
 * Variable type sigils
 */
export const SIGILS = {
    SCALAR: '$',
    ARRAY: '@',
    HASH: '%',
    CODE: '&'
} as const;

/**
 * All sigil characters
 */
export const ALL_SIGILS = new Set([
    SIGILS.SCALAR,
    SIGILS.ARRAY,
    SIGILS.HASH,
    SIGILS.CODE
]);

// ============================================================================
// DELIMITERS
// ============================================================================

/**
 * Delimiter characters and their TokenType mappings
 */
export const DELIMITERS: Record<string, TokenType> = {
    '(': TokenType.LPAREN,
    ')': TokenType.RPAREN,
    '{': TokenType.LBRACE,
    '}': TokenType.RBRACE,
    '[': TokenType.LBRACKET,
    ']': TokenType.RBRACKET,
    ';': TokenType.TERMINATOR,
    ',': TokenType.COMMA
};

/**
 * Characters that are delimiters
 */
export const DELIMITER_CHARS = new Set(Object.keys(DELIMITERS));

/**
 * Paired delimiter mappings (opening -> closing)
 */
export const DELIMITER_PAIRS: Record<string, string> = {
    '(': ')',
    '{': '}',
    '[': ']',
    '<': '>'
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a string is a keyword
 */
export function isKeyword(str: string): boolean {
    return ALL_KEYWORDS.has(str);
}

/**
 * Check if a character is a sigil
 */
export function isSigil(char: string): char is typeof SIGILS[keyof typeof SIGILS] {
    return ALL_SIGILS.has(char as any);
}

/**
 * Check if a character is a delimiter
 */
export function isDelimiter(char: string): boolean {
    return DELIMITER_CHARS.has(char);
}

/**
 * Check if an operator is multi-character
 */
export function isMultiCharOperator(op: string): boolean {
    return (MULTI_CHAR_OPERATORS.THREE_CHAR as readonly string[]).includes(op) ||
           (MULTI_CHAR_OPERATORS.TWO_CHAR as readonly string[]).includes(op);
}

/**
 * Get the delimiter TokenType for a character
 */
export function getDelimiterType(char: string): TokenType {
    const type = DELIMITERS[char];
    if (!type) {
        throw new Error(`Unknown delimiter character: ${char}`);
    }
    return type;
}

/**
 * Get the closing delimiter for an opening delimiter
 */
export function getClosingDelimiter(opening: string): string {
    return DELIMITER_PAIRS[opening] || opening;
}

/**
 * Check if a character can start an operator
 */
export function isOperatorChar(char: string): boolean {
    return '+-*/%=<>!&|^~.?:'.includes(char);
}

// ============================================================================
// ENHANCED UTILITY FUNCTIONS FOR PARSER
// ============================================================================

/**
 * Check if a string is a control keyword
 */
export function isControlKeyword(str: string): boolean {
    return KEYWORDS.CONTROL.has(str);
}

/**
 * Check if a string is a declaration keyword
 */
export function isDeclarationKeyword(str: string): boolean {
    return KEYWORDS.DECLARATION.has(str);
}

/**
 * Check if a string is a builtin keyword
 */
export function isBuiltinKeyword(str: string): boolean {
    return KEYWORDS.BUILTIN.has(str);
}

/**
 * Check if a string is a module keyword
 */
export function isModuleKeyword(str: string): boolean {
    return KEYWORDS.MODULE.has(str);
}

/**
 * Check if a string is a word operator
 */
export function isWordOperator(str: string): boolean {
    return KEYWORDS.WORD_OPERATOR.has(str);
}

/**
 * Check if a string is a special keyword (has)
 */
export function isSpecialKeyword(str: string): boolean {
    return KEYWORDS.SPECIAL.has(str);
}

/**
 * Check if a string is any operator
 */
export function isOperator(str: string): boolean {
    return OPERATORS.BINARY.has(str) ||
           OPERATORS.ASSIGNMENT.has(str) ||
           OPERATORS.UNARY.has(str);
}

/**
 * Check if a string is a binary operator
 */
export function isBinaryOperator(str: string): boolean {
    return OPERATORS.BINARY.has(str);
}

/**
 * Check if a string is an assignment operator
 */
export function isAssignmentOperator(str: string): boolean {
    return OPERATORS.ASSIGNMENT.has(str);
}

/**
 * Check if a string is a unary operator
 */
export function isUnaryOperator(str: string): boolean {
    return OPERATORS.UNARY.has(str);
}

/**
 * Check if a string is the arrow operator
 */
export function isArrowOperator(str: string): boolean {
    return str === '->';
}

/**
 * Check if a string is the fat comma operator
 */
export function isFatComma(str: string): boolean {
    return str === '=>';
}

/**
 * Check if a string is a colon operator
 */
export function isColonOperator(str: string): boolean {
    return str === ':';
}

/**
 * Get operator info with null safety
 */
export function getOperatorInfo(op: string): OperatorInfo | null {
    return OPERATOR_PRECEDENCE[op] || null;
}

/**
 * Check if an operator exists in the precedence table
 */
export function hasOperatorPrecedence(op: string): boolean {
    return op in OPERATOR_PRECEDENCE;
}

/**
 * Check if an operator is right-associative
 */
export function isRightAssociative(op: string): boolean {
    const info = OPERATOR_PRECEDENCE[op];
    return info ? info.associativity === 'RIGHT' : false;
}

/**
 * Check if an operator is left-associative
 */
export function isLeftAssociative(op: string): boolean {
    const info = OPERATOR_PRECEDENCE[op];
    return info ? info.associativity === 'LEFT' : false;
}

/**
 * Get the precedence level of an operator
 */
export function getOperatorPrecedence(op: string): number {
    const info = OPERATOR_PRECEDENCE[op];
    return info ? info.precedence : -1;
}

/**
 * Compare operator precedence (returns -1, 0, or 1)
 */
export function compareOperatorPrecedence(op1: string, op2: string): number {
    const p1 = getOperatorPrecedence(op1);
    const p2 = getOperatorPrecedence(op2);

    if (p1 === -1 || p2 === -1) return 0;
    if (p1 < p2) return 1;  // Lower number = higher precedence
    if (p1 > p2) return -1;
    return 0;
}

/**
 * Check if a string is a postfix control keyword (if, unless, while, until)
 */
export function isPostfixControlKeyword(str: string): boolean {
    return str === 'if' || str === 'unless' ||
           str === 'while' || str === 'until';
}

/**
 * Check if a string is a loop control keyword (last, next, redo)
 */
export function isLoopControlKeyword(str: string): boolean {
    return str === 'last' || str === 'next' || str === 'redo';
}

/**
 * Check if a string is a loop keyword (for, foreach, while, until)
 */
export function isLoopKeyword(str: string): boolean {
    return str === 'for' || str === 'foreach' ||
           str === 'while' || str === 'until';
}

/**
 * Get the category of a keyword
 */
export function getKeywordCategory(keyword: string): string | null {
    if (KEYWORDS.DECLARATION.has(keyword)) return 'DECLARATION';
    if (KEYWORDS.CONTROL.has(keyword)) return 'CONTROL';
    if (KEYWORDS.MODULE.has(keyword)) return 'MODULE';
    if (KEYWORDS.BUILTIN.has(keyword)) return 'BUILTIN';
    if (KEYWORDS.WORD_OPERATOR.has(keyword)) return 'WORD_OPERATOR';
    if (KEYWORDS.SPECIAL.has(keyword)) return 'SPECIAL';
    return null;
}
