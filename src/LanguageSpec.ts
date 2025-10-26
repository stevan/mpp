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
        'die', 'warn'
    ]),

    // Module system keywords
    MODULE: new Set([
        'use', 'require', 'package', 'import'
    ]),

    // Built-in functions (that look like keywords)
    BUILTIN: new Set([
        'print', 'say',
        'spawn', 'send', 'recv', 'self', 'kill', 'alive',
        'defined', 'undef', 'exists', 'delete'
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
        '!', '~', 'not'
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
