import { describe, test } from 'node:test';
import assert from 'node:assert';
import { Tokenizer } from '../src/Tokenizer.js';
import { Lexer } from '../src/Lexer.js';
import { Parser } from '../src/Parser.js';
import { SubNode, ForeachNode } from '../src/AST.js';

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

describe('Complete Program Examples', () => {
    test('parses fibonacci function with recursive calls', async () => {
        const code = `sub fibonacci($n) {
    return 0 if $n == 0;
    return 1 if $n == 1;
    return fibonacci($n - 1) + fibonacci($n - 2);
}`;

        const stmts = await parse(code);

        assert.strictEqual(stmts.length, 1);
        const subStmt = stmts[0] as SubNode;
        assert.strictEqual(subStmt.type, 'Sub');
        assert.strictEqual(subStmt.name, 'fibonacci');
        assert.strictEqual(subStmt.parameters.length, 1);
        assert.strictEqual(subStmt.parameters[0].variable.name, '$n');
        assert.strictEqual(subStmt.body.length, 3);
    });

    test('parses complete fibonacci program with function and loop', async () => {
        const code = `sub fibonacci($n) {
    return 0 if $n == 0;
    return 1 if $n == 1;
    return fibonacci($n - 1) + fibonacci($n - 2);
}

for my $i (1..10) {
    print(fibonacci($i));
}`;

        const stmts = await parse(code);

        assert.strictEqual(stmts.length, 2);

        // Check fibonacci function
        const subStmt = stmts[0] as SubNode;
        assert.strictEqual(subStmt.type, 'Sub');
        assert.strictEqual(subStmt.name, 'fibonacci');
        assert.strictEqual(subStmt.parameters.length, 1);
        assert.strictEqual(subStmt.body.length, 3);

        // Check for loop
        const forStmt = stmts[1] as ForeachNode;
        assert.strictEqual(forStmt.type, 'Foreach');
        assert.strictEqual(forStmt.variable.name, '$i');
        assert.strictEqual(forStmt.declarator, 'my');
        assert.strictEqual(forStmt.block.length, 1);
    });

    test('parses factorial function with default parameter', async () => {
        const code = `sub factorial($n, $acc = 1) {
    return $acc if $n <= 1;
    return factorial($n - 1, $n * $acc);
}`;

        const stmts = await parse(code);

        assert.strictEqual(stmts.length, 1);
        const subStmt = stmts[0] as SubNode;
        assert.strictEqual(subStmt.type, 'Sub');
        assert.strictEqual(subStmt.name, 'factorial');
        assert.strictEqual(subStmt.parameters.length, 2);
        assert.strictEqual(subStmt.parameters[0].variable.name, '$n');
        assert.strictEqual(subStmt.parameters[0].defaultValue, undefined);
        assert.strictEqual(subStmt.parameters[1].variable.name, '$acc');
        assert.strictEqual(subStmt.parameters[1].defaultValue?.type, 'Number');
        assert.strictEqual(subStmt.body.length, 2);
    });

    test('parses multiple function definitions', async () => {
        const code = `sub add($x, $y) {
    return $x + $y;
}

sub multiply($x, $y) {
    return $x * $y;
}

sub calculate($a, $b) {
    my $sum = add($a, $b);
    my $product = multiply($a, $b);
    return $sum + $product;
}`;

        const stmts = await parse(code);

        assert.strictEqual(stmts.length, 3);
        assert.strictEqual((stmts[0] as SubNode).type, 'Sub');
        assert.strictEqual((stmts[0] as SubNode).name, 'add');
        assert.strictEqual((stmts[1] as SubNode).type, 'Sub');
        assert.strictEqual((stmts[1] as SubNode).name, 'multiply');
        assert.strictEqual((stmts[2] as SubNode).type, 'Sub');
        assert.strictEqual((stmts[2] as SubNode).name, 'calculate');
    });

    test('parses nested control flow in function', async () => {
        const code = `sub process($x) {
    if ($x > 10) {
        for my $i (1..$x) {
            my $result = calculate($i, $x);
            return $result if $result > 100;
        }
    } elsif ($x > 0) {
        return $x * 2;
    }
    return 0;
}`;

        const stmts = await parse(code);

        assert.strictEqual(stmts.length, 1);
        const subStmt = stmts[0] as SubNode;
        assert.strictEqual(subStmt.type, 'Sub');
        assert.strictEqual(subStmt.name, 'process');
        assert.strictEqual(subStmt.parameters.length, 1);
        assert.strictEqual(subStmt.body.length, 2); // if statement and return
    });
});
