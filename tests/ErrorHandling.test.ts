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

    // Missing Closing Delimiter Tests
    test('missing closing bracket in array literal', async () => {
        const source = 'my @arr = [1, 2, 3;';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const decl = ast[0] as any;
        assert.strictEqual(decl.type, 'Declaration');
        assert.strictEqual(decl.initializer.type, 'Error');
        assert.ok(decl.initializer.message.includes('Missing closing bracket'));
    });

    test('missing closing brace in hash literal', async () => {
        const source = 'my %hash = {a => 1, b => 2;';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const decl = ast[0] as any;
        assert.strictEqual(decl.type, 'Declaration');
        assert.strictEqual(decl.initializer.type, 'Error');
        assert.ok(decl.initializer.message.includes('Missing closing brace'));
    });

    test('missing closing parenthesis in function call', async () => {
        const source = 'print("hello", "world";';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0];
        // The print statement should still parse with error recovery
        assert.ok(node.type === 'Print' || node.type === 'Error');
    });

    test('missing closing bracket in array access', async () => {
        const source = '$arr[0;';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        assert.strictEqual(node.type, 'Error');
        assert.ok(node.message.includes('Missing closing bracket'));
    });

    test('missing closing brace in hash access', async () => {
        const source = '$hash{key;';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        assert.strictEqual(node.type, 'Error');
        assert.ok(node.message.includes('Missing closing brace'));
    });

    // Control Flow Error Tests
    test('if statement without condition', async () => {
        const source = 'if { print "hello"; }';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        assert.strictEqual(node.type, 'If');
        // Condition should be an error or empty
        assert.ok(node.condition.type === 'Error' || !node.condition);
    });

    test('if statement without block', async () => {
        const source = 'if ($x == 1) print "hello";';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        assert.strictEqual(node.type, 'If');
        // Should have parsed as postfix if instead
    });

    test('while loop without condition', async () => {
        const source = 'while { print "infinite"; }';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        assert.strictEqual(node.type, 'While');
        assert.ok(node.condition.type === 'Error' || !node.condition);
    });

    test('foreach without iterator variable', async () => {
        const source = 'foreach (@array) { print; }';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        assert.strictEqual(node.type, 'Foreach');
        // Should use default $_ variable
    });

    // Ternary Operator Error Tests
    test('ternary operator missing colon', async () => {
        const source = '$x ? 1';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        // Should create error node for incomplete ternary
        assert.strictEqual(node.type, 'Error');
        assert.ok(node.message.includes('in ternary operator'));
    });

    test('ternary operator missing true expression', async () => {
        const source = '$x ? : 0';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        assert.strictEqual(node.type, 'Ternary');
        assert.strictEqual(node.trueExpr.type, 'Error');
    });

    test('ternary operator missing false expression', async () => {
        const source = '$x ? 1 :';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        assert.strictEqual(node.type, 'Ternary');
        assert.strictEqual(node.falseExpr.type, 'Error');
    });

    // Sub Declaration Error Tests
    test('sub declaration without name', async () => {
        const source = 'sub { return 42; }';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        // Anonymous sub is actually valid
        assert.strictEqual(node.type, 'Sub');
        assert.strictEqual(node.name, undefined);
    });

    test('sub with invalid parameter', async () => {
        const source = 'sub test(123) { }';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        assert.strictEqual(node.type, 'Sub');
        // Parameter should be error
        assert.ok(node.params[0].type === 'Error');
    });

    test('sub without body', async () => {
        const source = 'sub test($x)';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        assert.strictEqual(node.type, 'Error');
        assert.ok(node.message.includes('incomplete sub'));
    });

    // Class Declaration Error Tests
    test('class without name', async () => {
        const source = 'class { field $x; }';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        assert.strictEqual(node.type, 'Error');
        assert.ok(node.message.includes('missing class name'));
    });

    test('class without body', async () => {
        const source = 'class MyClass';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        assert.strictEqual(node.type, 'Error');
        assert.ok(node.message.includes('incomplete class'));
    });

    test('field declaration without variable', async () => {
        const source = 'class Test { field; }';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        assert.strictEqual(node.type, 'Class');
        assert.ok(node.body[0].type === 'Error');
    });

    test('method without name', async () => {
        const source = 'class Test { method { } }';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        assert.strictEqual(node.type, 'Class');
        assert.ok(node.body[0].type === 'Error');
    });

    // Assignment Error Tests
    test('assignment to literal', async () => {
        const source = '5 = $x;';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        // Parser doesn't validate assignment targets at parse time
        const node = ast[0] as any;
        assert.strictEqual(node.type, 'Assignment');
    });

    test('incomplete assignment', async () => {
        const source = '$x =';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        assert.strictEqual(node.type, 'Assignment');
        assert.strictEqual(node.right.type, 'Error');
    });

    // Do Block Error Tests
    test('do block without braces', async () => {
        const source = 'do print "hello";';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        assert.strictEqual(node.type, 'Error');
        assert.ok(node.message.includes('do'));
    });

    test('do block with missing closing brace', async () => {
        const source = 'do { print "hello";';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        assert.strictEqual(node.type, 'Error');
    });

    // Method Call Error Tests
    test('method call missing closing parenthesis', async () => {
        const source = '$obj->method(1, 2;';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        assert.strictEqual(node.type, 'Error');
        assert.ok(node.message.includes('Missing closing parenthesis'));
    });

    // Hash Pair Error Tests
    test('hash pair without fat comma', async () => {
        const source = 'my %h = (key value);';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const decl = ast[0] as any;
        assert.strictEqual(decl.type, 'Declaration');
        // Parser treats as list, not hash
    });

    // Package/Use Error Tests
    test('package without name', async () => {
        const source = 'package;';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        // Package without name might be valid (default package)
    });

    test('use without module name', async () => {
        const source = 'use;';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        // Use without name is likely an error
    });

    // Array/Hash Slice Error Tests
    test('array slice missing indices', async () => {
        const source = '@arr[];';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        // Empty slice might be valid syntax
    });

    test('hash slice missing keys', async () => {
        const source = '@hash{};';
        const ast = await parse(source);

        assert.strictEqual(ast.length, 1);
        const node = ast[0] as any;
        // Empty slice might be valid syntax
    });
});
