/**
 * Core type definitions for the MPP parser
 * This file contains enum definitions used across multiple modules
 */

export enum TokenType {
    // Error token
    ERROR = 'ERROR',

    // Literals
    NUMBER = 'NUMBER',
    STRING = 'STRING',
    QWLIST = 'QWLIST',

    // Identifiers and Variables
    IDENTIFIER = 'IDENTIFIER',
    VARIABLE = 'VARIABLE',
    KEYWORD = 'KEYWORD',

    // Operators
    OPERATOR = 'OPERATOR',

    // Special sigils for postfix dereferencing
    POSTFIX_DEREF_SIGIL = 'POSTFIX_DEREF_SIGIL',

    // Delimiters
    LPAREN = 'LPAREN',
    RPAREN = 'RPAREN',
    LBRACE = 'LBRACE',
    RBRACE = 'RBRACE',
    LBRACKET = 'LBRACKET',
    RBRACKET = 'RBRACKET',
    COMMA = 'COMMA',
    TERMINATOR = 'TERMINATOR'
}

export enum LexemeCategory {
    // Error
    TOKEN_ERROR = 'TOKEN_ERROR',

    // Literals
    LITERAL = 'LITERAL',
    BOOLEAN = 'BOOLEAN',

    // Variables by sigil
    SCALAR_VAR = 'SCALAR_VAR',
    ARRAY_VAR = 'ARRAY_VAR',
    HASH_VAR = 'HASH_VAR',
    CODE_VAR = 'CODE_VAR',
    VARIABLE = 'VARIABLE',

    // Keywords
    DECLARATION = 'DECLARATION',
    CONTROL = 'CONTROL',
    KEYWORD = 'KEYWORD',

    // Operators
    ASSIGNOP = 'ASSIGNOP',
    BINOP = 'BINOP',
    UNOP = 'UNOP',
    OPERATOR = 'OPERATOR',

    // Postfix dereferencing
    POSTFIX_DEREF_SIGIL = 'POSTFIX_DEREF_SIGIL',

    // Delimiters
    LPAREN = 'LPAREN',
    RPAREN = 'RPAREN',
    LBRACE = 'LBRACE',
    RBRACE = 'RBRACE',
    LBRACKET = 'LBRACKET',
    RBRACKET = 'RBRACKET',
    COMMA = 'COMMA',
    TERMINATOR = 'TERMINATOR',

    // Identifiers
    IDENTIFIER = 'IDENTIFIER'
}
