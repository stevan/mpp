import { describe, test } from 'node:test';
import assert from 'node:assert';
import { Tokenizer } from '../src/Tokenizer.js';

// Helper to convert async generator to array
async function collectTokens(source: string) {
    const tokenizer = new Tokenizer();
    const tokens = [];

    // Simple async generator that yields the source
    async function* sourceGen() {
        yield source;
    }

    for await (const token of tokenizer.run(sourceGen())) {
        tokens.push(token);
    }

    return tokens;
}

describe('Tokenizer', () => {
    test('tokenizes simple arithmetic expression', async () => {
        const tokens = await collectTokens('1 + 2');

        assert.strictEqual(tokens.length, 3);
        assert.strictEqual(tokens[0].type, 'NUMBER');
        assert.strictEqual(tokens[0].value, '1');
        assert.strictEqual(tokens[1].type, 'OPERATOR');
        assert.strictEqual(tokens[1].value, '+');
        assert.strictEqual(tokens[2].type, 'NUMBER');
        assert.strictEqual(tokens[2].value, '2');
    });

    test('tokenizes multi-character operators', async () => {
        const tokens = await collectTokens('$x == 5');

        assert.strictEqual(tokens.length, 3);
        assert.strictEqual(tokens[0].type, 'VARIABLE');
        assert.strictEqual(tokens[0].value, '$x');
        assert.strictEqual(tokens[1].type, 'OPERATOR');
        assert.strictEqual(tokens[1].value, '==');
        assert.strictEqual(tokens[2].type, 'NUMBER');
        assert.strictEqual(tokens[2].value, '5');
    });

    test('tokenizes simple variable assignment', async () => {
        const tokens = await collectTokens('$x = 10');

        assert.strictEqual(tokens.length, 3);
        assert.strictEqual(tokens[0].type, 'VARIABLE');
        assert.strictEqual(tokens[0].value, '$x');
        assert.strictEqual(tokens[1].type, 'OPERATOR');
        assert.strictEqual(tokens[1].value, '=');
        assert.strictEqual(tokens[2].type, 'NUMBER');
        assert.strictEqual(tokens[2].value, '10');
    });

    test('tokenizes double-quoted strings', async () => {
        const tokens = await collectTokens('"hello world"');

        assert.strictEqual(tokens.length, 1);
        assert.strictEqual(tokens[0].type, 'STRING');
        assert.strictEqual(tokens[0].value, '"hello world"');
    });

    test('tokenizes single-quoted strings', async () => {
        const tokens = await collectTokens("'hello world'");

        assert.strictEqual(tokens.length, 1);
        assert.strictEqual(tokens[0].type, 'STRING');
        assert.strictEqual(tokens[0].value, "'hello world'");
    });

    test('tokenizes strings with escaped quotes', async () => {
        const tokens = await collectTokens('"hello \\"world\\""');

        assert.strictEqual(tokens.length, 1);
        assert.strictEqual(tokens[0].type, 'STRING');
        assert.strictEqual(tokens[0].value, '"hello \\"world\\""');
    });

    test('tokenizes expression with string', async () => {
        const tokens = await collectTokens('$name = "Alice"');

        assert.strictEqual(tokens.length, 3);
        assert.strictEqual(tokens[0].type, 'VARIABLE');
        assert.strictEqual(tokens[1].type, 'OPERATOR');
        assert.strictEqual(tokens[2].type, 'STRING');
        assert.strictEqual(tokens[2].value, '"Alice"');
    });

    test('tokenizes keywords', async () => {
        const tokens = await collectTokens('my $x = 5');

        assert.strictEqual(tokens.length, 4);
        assert.strictEqual(tokens[0].type, 'KEYWORD');
        assert.strictEqual(tokens[0].value, 'my');
        assert.strictEqual(tokens[1].type, 'VARIABLE');
        assert.strictEqual(tokens[2].type, 'OPERATOR');
        assert.strictEqual(tokens[3].type, 'NUMBER');
    });

    test('tokenizes identifiers vs keywords', async () => {
        const tokens = await collectTokens('if my_var');

        assert.strictEqual(tokens.length, 2);
        assert.strictEqual(tokens[0].type, 'KEYWORD');
        assert.strictEqual(tokens[0].value, 'if');
        assert.strictEqual(tokens[1].type, 'IDENTIFIER');
        assert.strictEqual(tokens[1].value, 'my_var');
    });

    test('tokenizes special $_ variable', async () => {
        const tokens = await collectTokens('$_');

        assert.strictEqual(tokens.length, 1);
        assert.strictEqual(tokens[0].type, 'VARIABLE');
        assert.strictEqual(tokens[0].value, '$_');
    });

    test('tokenizes delimiters', async () => {
        const tokens = await collectTokens('(){};[]');

        assert.strictEqual(tokens.length, 7);
        assert.strictEqual(tokens[0].type, 'LPAREN');
        assert.strictEqual(tokens[1].type, 'RPAREN');
        assert.strictEqual(tokens[2].type, 'LBRACE');
        assert.strictEqual(tokens[3].type, 'RBRACE');
        assert.strictEqual(tokens[4].type, 'TERMINATOR');
        assert.strictEqual(tokens[5].type, 'LBRACKET');
        assert.strictEqual(tokens[6].type, 'RBRACKET');
    });

    test('tokenizes complete statement', async () => {
        const tokens = await collectTokens('my $x = 10;');

        assert.strictEqual(tokens.length, 5);
        assert.strictEqual(tokens[0].type, 'KEYWORD');
        assert.strictEqual(tokens[0].value, 'my');
        assert.strictEqual(tokens[1].type, 'VARIABLE');
        assert.strictEqual(tokens[1].value, '$x');
        assert.strictEqual(tokens[2].type, 'OPERATOR');
        assert.strictEqual(tokens[2].value, '=');
        assert.strictEqual(tokens[3].type, 'NUMBER');
        assert.strictEqual(tokens[3].value, '10');
        assert.strictEqual(tokens[4].type, 'TERMINATOR');
        assert.strictEqual(tokens[4].value, ';');
    });

    test('tokenizes hash literal with + prefix', async () => {
        const tokens = await collectTokens('+{ x => 1 }');

        assert.strictEqual(tokens.length, 6);
        assert.strictEqual(tokens[0].type, 'OPERATOR');
        assert.strictEqual(tokens[0].value, '+');
        assert.strictEqual(tokens[1].type, 'LBRACE');
        assert.strictEqual(tokens[2].type, 'IDENTIFIER');
        assert.strictEqual(tokens[2].value, 'x');
        assert.strictEqual(tokens[3].type, 'OPERATOR');
        assert.strictEqual(tokens[3].value, '=>');
        assert.strictEqual(tokens[4].type, 'NUMBER');
        assert.strictEqual(tokens[5].type, 'RBRACE');
    });
});
