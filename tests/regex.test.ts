import test from 'node:test';
import assert from 'node:assert';
import { Tokenizer } from '../src/Tokenizer.js';
import { Lexer } from '../src/Lexer.js';
import { Parser } from '../src/Parser.js';

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

test('Regex Literals and Operators', async (t) => {
    await t.test('basic regex literal', async () => {
        const code = '/hello/';
        const ast = await parse(code);

        assert.strictEqual(ast.length, 1);
        assert.strictEqual(ast[0].type, 'RegexLiteral');
        const regex = ast[0] as any;
        assert.strictEqual(regex.pattern, 'hello');
        assert.strictEqual(regex.flags, '');
    });

    await t.test('regex literal with flags', async () => {
        const code = '/pattern/gi';
        const ast = await parse(code);

        assert.strictEqual(ast.length, 1);
        assert.strictEqual(ast[0].type, 'RegexLiteral');
        const regex = ast[0] as any;
        assert.strictEqual(regex.pattern, 'pattern');
        assert.strictEqual(regex.flags, 'gi');
    });

    await t.test('regex with escaped slash', async () => {
        const code = '/path\\/to\\/file/';
        const ast = await parse(code);

        assert.strictEqual(ast.length, 1);
        assert.strictEqual(ast[0].type, 'RegexLiteral');
        const regex = ast[0] as any;
        assert.strictEqual(regex.pattern, 'path\\/to\\/file');
        assert.strictEqual(regex.flags, '');
    });

    await t.test('regex with special characters', async () => {
        const code = '/^\\d+$/';
        const ast = await parse(code);

        assert.strictEqual(ast.length, 1);
        assert.strictEqual(ast[0].type, 'RegexLiteral');
        const regex = ast[0] as any;
        assert.strictEqual(regex.pattern, '^\\d+$');
    });

    await t.test('pattern match operator =~', async () => {
        const code = '$text =~ /pattern/;';
        const ast = await parse(code);

        assert.strictEqual(ast.length, 1);
        assert.strictEqual(ast[0].type, 'BinaryOp');
        const binop = ast[0] as any;
        assert.strictEqual(binop.operator, '=~');
        assert.strictEqual(binop.left.type, 'Variable');
        assert.strictEqual(binop.left.name, '$text');
        assert.strictEqual(binop.right.type, 'RegexLiteral');
        assert.strictEqual(binop.right.pattern, 'pattern');
    });

    await t.test('negative pattern match operator !~', async () => {
        const code = '$text !~ /pattern/i;';
        const ast = await parse(code);

        assert.strictEqual(ast.length, 1);
        assert.strictEqual(ast[0].type, 'BinaryOp');
        const binop = ast[0] as any;
        assert.strictEqual(binop.operator, '!~');
        assert.strictEqual(binop.right.type, 'RegexLiteral');
        assert.strictEqual(binop.right.pattern, 'pattern');
        assert.strictEqual(binop.right.flags, 'i');
    });

    await t.test('regex in if statement', async () => {
        const code = 'if ($email =~ /@/) { print("valid"); }';
        const ast = await parse(code);

        assert.strictEqual(ast.length, 1);
        assert.strictEqual(ast[0].type, 'If');
        const ifNode = ast[0] as any;
        assert.strictEqual(ifNode.condition.type, 'BinaryOp');
        assert.strictEqual(ifNode.condition.operator, '=~');
        assert.strictEqual(ifNode.condition.right.type, 'RegexLiteral');
        assert.strictEqual(ifNode.condition.right.pattern, '@');
    });

    await t.test('division vs regex disambiguation', async () => {
        const code = `my $x = 10 / 2;
if (/test/) { }
$y = $a / $b;`;
        const ast = await parse(code);

        assert.strictEqual(ast.length, 3);

        // First statement: division
        assert.strictEqual(ast[0].type, 'Declaration');
        const decl = ast[0] as any;
        assert.strictEqual(decl.initializer.type, 'BinaryOp');
        assert.strictEqual(decl.initializer.operator, '/');

        // Second statement: regex in if
        assert.strictEqual(ast[1].type, 'If');
        const ifNode = ast[1] as any;
        assert.strictEqual(ifNode.condition.type, 'RegexLiteral');
        assert.strictEqual(ifNode.condition.pattern, 'test');

        // Third statement: division
        assert.strictEqual(ast[2].type, 'Assignment');
        const assign = ast[2] as any;
        assert.strictEqual(assign.right.type, 'BinaryOp');
        assert.strictEqual(assign.right.operator, '/');
    });

    await t.test('regex after =~ is always regex', async () => {
        const code = '$x =~ /foo\\/bar/gi;';  // Pattern with escaped /
        const ast = await parse(code);

        assert.strictEqual(ast.length, 1);
        assert.strictEqual(ast[0].type, 'BinaryOp');
        const binop = ast[0] as any;
        assert.strictEqual(binop.operator, '=~');
        assert.strictEqual(binop.right.type, 'RegexLiteral');
        assert.strictEqual(binop.right.pattern, 'foo\\/bar');
        assert.strictEqual(binop.right.flags, 'gi');
    });
});