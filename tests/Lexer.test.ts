import { describe, test } from 'node:test';
import assert from 'node:assert';
import { Tokenizer } from '../src/Tokenizer.js';
import { Lexer } from '../src/Lexer.js';

// Helper to convert token stream through tokenizer and lexer
async function collectLexemes(source: string) {
    const tokenizer = new Tokenizer();
    const lexer = new Lexer();
    const lexemes = [];

    // Simple async generator that yields the source
    async function* sourceGen() {
        yield source;
    }

    const tokens = tokenizer.run(sourceGen());

    for await (const lexeme of lexer.run(tokens)) {
        lexemes.push(lexeme);
    }

    return lexemes;
}

describe('Lexer', () => {
    test('classifies literals', async () => {
        const lexemes = await collectLexemes('42 "hello"');

        assert.strictEqual(lexemes.length, 2);
        assert.strictEqual(lexemes[0].category, 'LITERAL');
        assert.strictEqual(lexemes[0].token.type, 'NUMBER');
        assert.strictEqual(lexemes[1].category, 'LITERAL');
        assert.strictEqual(lexemes[1].token.type, 'STRING');
    });

    test('classifies scalar variables', async () => {
        const lexemes = await collectLexemes('$x $name $_');

        assert.strictEqual(lexemes.length, 3);
        assert.strictEqual(lexemes[0].category, 'SCALAR_VAR');
        assert.strictEqual(lexemes[1].category, 'SCALAR_VAR');
        assert.strictEqual(lexemes[2].category, 'SCALAR_VAR');
        assert.strictEqual(lexemes[2].token.value, '$_');
    });

    test('classifies array and hash variables', async () => {
        const lexemes = await collectLexemes('@array %hash');

        assert.strictEqual(lexemes.length, 2);
        assert.strictEqual(lexemes[0].category, 'ARRAY_VAR');
        assert.strictEqual(lexemes[1].category, 'HASH_VAR');
    });

    test('classifies operators by type', async () => {
        const lexemes = await collectLexemes('+ == && ||');

        assert.strictEqual(lexemes.length, 4);
        assert.strictEqual(lexemes[0].category, 'BINOP');
        assert.strictEqual(lexemes[0].token.value, '+');
        assert.strictEqual(lexemes[1].category, 'BINOP');
        assert.strictEqual(lexemes[1].token.value, '==');
        assert.strictEqual(lexemes[2].category, 'BINOP');
        assert.strictEqual(lexemes[2].token.value, '&&');
        assert.strictEqual(lexemes[3].category, 'BINOP');
        assert.strictEqual(lexemes[3].token.value, '||');
    });

    test('classifies assignment operators', async () => {
        const lexemes = await collectLexemes('= += //=');

        assert.strictEqual(lexemes.length, 3);
        assert.strictEqual(lexemes[0].category, 'ASSIGNOP');
        assert.strictEqual(lexemes[1].category, 'ASSIGNOP');
        assert.strictEqual(lexemes[2].category, 'ASSIGNOP');
    });

    test('classifies keywords by purpose', async () => {
        const lexemes = await collectLexemes('if my sub return');

        assert.strictEqual(lexemes.length, 4);
        assert.strictEqual(lexemes[0].category, 'CONTROL');
        assert.strictEqual(lexemes[0].token.value, 'if');
        assert.strictEqual(lexemes[1].category, 'DECLARATION');
        assert.strictEqual(lexemes[1].token.value, 'my');
        assert.strictEqual(lexemes[2].category, 'DECLARATION');
        assert.strictEqual(lexemes[2].token.value, 'sub');
        assert.strictEqual(lexemes[3].category, 'CONTROL');
        assert.strictEqual(lexemes[3].token.value, 'return');
    });

    test('preserves delimiters', async () => {
        const lexemes = await collectLexemes('( ) { } ;');

        assert.strictEqual(lexemes.length, 5);
        assert.strictEqual(lexemes[0].category, 'LPAREN');
        assert.strictEqual(lexemes[1].category, 'RPAREN');
        assert.strictEqual(lexemes[2].category, 'LBRACE');
        assert.strictEqual(lexemes[3].category, 'RBRACE');
        assert.strictEqual(lexemes[4].category, 'TERMINATOR');
    });

    test('classifies complete statement', async () => {
        const lexemes = await collectLexemes('my $x = 10;');

        assert.strictEqual(lexemes.length, 5);
        assert.strictEqual(lexemes[0].category, 'DECLARATION');
        assert.strictEqual(lexemes[1].category, 'SCALAR_VAR');
        assert.strictEqual(lexemes[2].category, 'ASSIGNOP');
        assert.strictEqual(lexemes[3].category, 'LITERAL');
        assert.strictEqual(lexemes[4].category, 'TERMINATOR');
    });

    test('classifies identifiers', async () => {
        const lexemes = await collectLexemes('my_function some_var');

        assert.strictEqual(lexemes.length, 2);
        assert.strictEqual(lexemes[0].category, 'IDENTIFIER');
        assert.strictEqual(lexemes[1].category, 'IDENTIFIER');
    });
});
