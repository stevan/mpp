import { describe, test } from 'node:test';
import assert from 'node:assert';
import { Tokenizer } from '../src/Tokenizer.js';
import { Lexer } from '../src/Lexer.js';
import { Parser } from '../src/Parser.js';
import { DeclarationNode, ArrayLiteralNode, HashLiteralNode, ListNode, BinaryOpNode } from '../src/AST.js';

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

describe('Data Structures Milestone', () => {
    test('parses simple array reference declaration', async () => {
        const source = 'my $numbers = [1, 2, 3, 4, 5];';
        const stmts = await parse(source);

        assert.strictEqual(stmts.length, 1);
        const decl = stmts[0] as DeclarationNode;
        assert.strictEqual(decl.type, 'Declaration');
        assert.strictEqual(decl.variable.name, '$numbers');
        assert.strictEqual(decl.initializer?.type, 'ArrayLiteral');

        const array = decl.initializer as ArrayLiteralNode;
        assert.strictEqual(array.elements.length, 5);
    });

    test('parses nested array structures', async () => {
        const source = 'my $nested = [1, [2, 3], [4, [5, 6]]];';
        const stmts = await parse(source);

        assert.strictEqual(stmts.length, 1);
        const decl = stmts[0] as DeclarationNode;
        const array = decl.initializer as ArrayLiteralNode;
        assert.strictEqual(array.elements.length, 3);
        assert.strictEqual(array.elements[1].type, 'ArrayLiteral');
        assert.strictEqual(array.elements[2].type, 'ArrayLiteral');
    });

    test('parses array with mixed types', async () => {
        const source = 'my $mixed = [1, "hello", $x, 2 + 3];';
        const stmts = await parse(source);

        assert.strictEqual(stmts.length, 1);
        const decl = stmts[0] as DeclarationNode;
        const array = decl.initializer as ArrayLiteralNode;
        assert.strictEqual(array.elements.length, 4);
        assert.strictEqual(array.elements[0].type, 'Number');
        assert.strictEqual(array.elements[1].type, 'String');
        assert.strictEqual(array.elements[2].type, 'Variable');
        assert.strictEqual(array.elements[3].type, 'BinaryOp');
    });

    test('parses simple hash reference declaration', async () => {
        const source = 'my $person = +{ "name" => "Alice", "age" => 30 };';
        const stmts = await parse(source);

        assert.strictEqual(stmts.length, 1);
        const decl = stmts[0] as DeclarationNode;
        assert.strictEqual(decl.type, 'Declaration');
        assert.strictEqual(decl.variable.name, '$person');
        assert.strictEqual(decl.initializer?.type, 'HashLiteral');

        const hash = decl.initializer as HashLiteralNode;
        assert.strictEqual(hash.pairs.length, 2);
    });

    test('parses multi-line hash literal', async () => {
        const source = `my $config = +{
    "debug" => 1,
    "timeout" => 30,
    "retries" => 3
};`;
        const stmts = await parse(source);

        assert.strictEqual(stmts.length, 1);
        const decl = stmts[0] as DeclarationNode;
        const hash = decl.initializer as HashLiteralNode;
        assert.strictEqual(hash.pairs.length, 3);
    });

    test('parses complex nested data structure', async () => {
        const source = `my $complex = [
    1,
    +{ "key" => "value" },
    [2, 3],
    +{ "nested" => +{ "deep" => 42 } }
];`;
        const stmts = await parse(source);

        assert.strictEqual(stmts.length, 1);
        const decl = stmts[0] as DeclarationNode;
        const array = decl.initializer as ArrayLiteralNode;
        assert.strictEqual(array.elements.length, 4);
        assert.strictEqual(array.elements[0].type, 'Number');
        assert.strictEqual(array.elements[1].type, 'HashLiteral');
        assert.strictEqual(array.elements[2].type, 'ArrayLiteral');
        assert.strictEqual(array.elements[3].type, 'HashLiteral');

        // Check deep nesting
        const nestedHash = array.elements[3] as HashLiteralNode;
        assert.strictEqual(nestedHash.pairs[0].value.type, 'HashLiteral');
    });

    test('parses list assignment to array variable', async () => {
        const source = 'my @array = (1, 2, 3, 4, 5);';
        const stmts = await parse(source);

        assert.strictEqual(stmts.length, 1);
        const decl = stmts[0] as DeclarationNode;
        assert.strictEqual(decl.variable.name, '@array');
        assert.strictEqual(decl.initializer?.type, 'List');

        const list = decl.initializer as ListNode;
        assert.strictEqual(list.elements.length, 5);
    });

    test('parses list of strings', async () => {
        const source = 'my @strings = ("a", "b", "c");';
        const stmts = await parse(source);

        assert.strictEqual(stmts.length, 1);
        const decl = stmts[0] as DeclarationNode;
        const list = decl.initializer as ListNode;
        assert.strictEqual(list.elements.length, 3);
        assert.strictEqual(list.elements[0].type, 'String');
    });

    test('parses data structure with computed values', async () => {
        const source = `my $data = [
    1 + 2,
    +{ "sum" => 10 + 20, "product" => 5 * 6 },
    [3 ** 2, 4 ** 2]
];`;
        const stmts = await parse(source);

        assert.strictEqual(stmts.length, 1);
        const decl = stmts[0] as DeclarationNode;
        const array = decl.initializer as ArrayLiteralNode;
        assert.strictEqual(array.elements.length, 3);

        // First element is computed
        assert.strictEqual(array.elements[0].type, 'BinaryOp');

        // Second element is hash with computed values
        const hash = array.elements[1] as HashLiteralNode;
        assert.strictEqual(hash.pairs[0].value.type, 'BinaryOp');
        assert.strictEqual(hash.pairs[1].value.type, 'BinaryOp');

        // Third element is array with computed values
        const innerArray = array.elements[2] as ArrayLiteralNode;
        assert.strictEqual(innerArray.elements[0].type, 'BinaryOp');
        assert.strictEqual(innerArray.elements[1].type, 'BinaryOp');
    });

    test('parses complete data structures program', async () => {
        const source = `my $numbers = [1, 2, 3, 4, 5];
my $person = +{ "name" => "Alice", "age" => 30 };
my @list = (1, 2, 3);
my $nested = [1, +{ "key" => [2, 3] }, 4];`;

        const stmts = await parse(source);

        assert.strictEqual(stmts.length, 4);
        assert.strictEqual((stmts[0] as DeclarationNode).initializer?.type, 'ArrayLiteral');
        assert.strictEqual((stmts[1] as DeclarationNode).initializer?.type, 'HashLiteral');
        assert.strictEqual((stmts[2] as DeclarationNode).initializer?.type, 'List');
        assert.strictEqual((stmts[3] as DeclarationNode).initializer?.type, 'ArrayLiteral');
    });

    test('parses empty data structures', async () => {
        const source = `my $empty_array = [];
my $empty_hash = +{};`;

        const stmts = await parse(source);

        assert.strictEqual(stmts.length, 2);
        const array = (stmts[0] as DeclarationNode).initializer as ArrayLiteralNode;
        const hash = (stmts[1] as DeclarationNode).initializer as HashLiteralNode;
        assert.strictEqual(array.elements.length, 0);
        assert.strictEqual(hash.pairs.length, 0);
    });

    test('parses array of hash references', async () => {
        const source = `my $users = [
    +{ "name" => "Alice", "id" => 1 },
    +{ "name" => "Bob", "id" => 2 },
    +{ "name" => "Charlie", "id" => 3 }
];`;

        const stmts = await parse(source);

        assert.strictEqual(stmts.length, 1);
        const decl = stmts[0] as DeclarationNode;
        const array = decl.initializer as ArrayLiteralNode;
        assert.strictEqual(array.elements.length, 3);
        array.elements.forEach(elem => {
            assert.strictEqual(elem.type, 'HashLiteral');
            assert.strictEqual((elem as HashLiteralNode).pairs.length, 2);
        });
    });

    test('parses hash with array reference values', async () => {
        const source = `my $matrix = +{
    "row1" => [1, 2, 3],
    "row2" => [4, 5, 6],
    "row3" => [7, 8, 9]
};`;

        const stmts = await parse(source);

        assert.strictEqual(stmts.length, 1);
        const decl = stmts[0] as DeclarationNode;
        const hash = decl.initializer as HashLiteralNode;
        assert.strictEqual(hash.pairs.length, 3);
        hash.pairs.forEach(pair => {
            assert.strictEqual(pair.value.type, 'ArrayLiteral');
            assert.strictEqual((pair.value as ArrayLiteralNode).elements.length, 3);
        });
    });

    test('parses data structure in function call', async () => {
        const source = 'process_data([1, 2, 3], +{ "mode" => "fast" });';
        const stmts = await parse(source);

        assert.strictEqual(stmts.length, 1);
        assert.strictEqual(stmts[0].type, 'Call');
    });

    test('parses data structure returned from function', async () => {
        const source = `sub get_config() {
    return +{ "debug" => 1, "timeout" => 30 };
}`;

        const stmts = await parse(source);

        assert.strictEqual(stmts.length, 1);
        assert.strictEqual(stmts[0].type, 'Sub');
    });

    test('disambiguates list from parenthesized expression correctly', async () => {
        const source = `my $single = (1 + 2);
my @multiple = (1, 2);`;

        const stmts = await parse(source);

        assert.strictEqual(stmts.length, 2);
        // First is BinaryOp (parenthesized expression)
        assert.strictEqual((stmts[0] as DeclarationNode).initializer?.type, 'BinaryOp');
        // Second is List
        assert.strictEqual((stmts[1] as DeclarationNode).initializer?.type, 'List');
    });
});
