import { describe, test } from 'node:test';
import assert from 'node:assert';
import { Tokenizer } from '../src/Tokenizer.js';
import { Lexer } from '../src/Lexer.js';
import { Parser } from '../src/Parser.js';
import { ErrorNode } from '../src/AST.js';

// Helper to parse source code into AST
async function parse(source: string) {
    const tokenizer = new Tokenizer();
    const lexer = new Lexer();
    const parser = new Parser();

    async function* sourceGen() {
        yield source;
    }

    const tokens = tokenizer.run(sourceGen());
    const lexemes = lexer.run(tokens);
    const statements = [];

    for await (const stmt of parser.run(lexemes)) {
        statements.push(stmt);
    }

    return statements;
}

describe('Error Handling', () => {
    test('detects unknown character in declaration', async () => {
        const source = 'my $x = 10 ` 5;'; // ` is not a valid character
        const ast = await parse(source);

        // Parser stops at error, returns partial declaration
        assert.strictEqual(ast.length, 1);
        const node = ast[0];
        assert.strictEqual(node.type, 'Declaration');

        // The initializer should parse up to the error (just the 10)
        const decl = node as any;
        assert.ok(decl.initializer);
        assert.strictEqual(decl.initializer.type, 'Number');
        assert.strictEqual(decl.initializer.value, '10');
    });

    test('detects unterminated double-quoted string', async () => {
        const source = 'my $str = "hello';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0];
        assert.strictEqual(node.type, 'Declaration');

        const decl = node as any;
        assert.ok(decl.initializer);
        assert.strictEqual(decl.initializer.type, 'Error');

        const error = decl.initializer as ErrorNode;
        assert.strictEqual(error.value, '"hello');
        assert.strictEqual(error.line, 1);
        assert.ok(error.message.includes('Unterminated string literal'));
        assert.ok(error.message.includes('missing closing "'));
    });

    test('detects unterminated single-quoted string', async () => {
        const source = "my $str = 'world";
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0];
        assert.strictEqual(node.type, 'Declaration');

        const decl = node as any;
        assert.ok(decl.initializer);
        assert.strictEqual(decl.initializer.type, 'Error');

        const error = decl.initializer as ErrorNode;
        assert.strictEqual(error.value, "'world");
        assert.strictEqual(error.line, 1);
        assert.ok(error.message.includes('Unterminated string literal'));
        assert.ok(error.message.includes("missing closing '"));
    });

    test('includes correct line and column information', async () => {
        const source = 'my $x = 10;\nmy $y = "bad';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 2);

        // First statement should be fine
        assert.strictEqual(ast[0].type, 'Declaration');

        // Second statement should have error
        const secondDecl = ast[1] as any;
        assert.strictEqual(secondDecl.type, 'Declaration');
        assert.strictEqual(secondDecl.initializer.type, 'Error');

        const error = secondDecl.initializer as ErrorNode;
        assert.strictEqual(error.line, 2, 'Error should be on line 2');
        assert.strictEqual(error.column, 9, 'Error should start at column 9');
    });

    test('unknown character as primary expression creates error node', async () => {
        // When the unknown character appears as a value/primary expression
        const source = 'my $x = `;';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const decl = ast[0] as any;
        assert.strictEqual(decl.type, 'Declaration');
        assert.strictEqual(decl.initializer.type, 'Error');

        const error = decl.initializer as ErrorNode;
        assert.strictEqual(error.value, '`');
        assert.ok(error.message.includes('Unexpected character'));
    });

    test('error in standalone expression', async () => {
        // Backtick as a primary expression
        const source = '`;';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0];
        assert.strictEqual(node.type, 'Error');

        const error = node as ErrorNode;
        assert.strictEqual(error.value, '`');
        assert.ok(error.message.includes('Unexpected character'));
        assert.strictEqual(error.line, 1);
        assert.strictEqual(error.column, 1);
    });
});
