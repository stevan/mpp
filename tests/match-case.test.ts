import test from 'node:test';
import assert from 'node:assert';
import { Parser } from '../src/Parser.js';
import { Lexer } from '../src/Lexer.js';
import { Tokenizer } from '../src/Tokenizer.js';

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

test('match/case expressions', async (t) => {
    await t.test('basic match with single case', async () => {
        const code = `
match ($value) {
    case (1) {
        print("one");
    }
}`;
        const ast = await parse(code);

        assert.strictEqual(ast.length, 1);
        assert.strictEqual(ast[0].type, 'Match');
        const matchNode = ast[0] as any;
        assert.strictEqual(matchNode.expression.type, 'Variable');
        assert.strictEqual(matchNode.expression.name, '$value');
        assert.strictEqual(matchNode.caseClauses.length, 1);
        assert.strictEqual(matchNode.caseClauses[0].pattern.type, 'Number');
        assert.strictEqual(matchNode.caseClauses[0].pattern.value, '1');
    });

    await t.test('match with multiple cases', async () => {
        const code = `
match ($x) {
    case (1) {
        print("one");
    }
    case (2) {
        print("two");
    }
    case (3) {
        print("three");
    }
}`;
        const ast = await parse(code);

        assert.strictEqual(ast.length, 1);
        assert.strictEqual(ast[0].type, 'Match');
        const matchNode = ast[0] as any;
        assert.strictEqual(matchNode.caseClauses.length, 3);
        assert.strictEqual(matchNode.caseClauses[0].pattern.value, '1');
        assert.strictEqual(matchNode.caseClauses[1].pattern.value, '2');
        assert.strictEqual(matchNode.caseClauses[2].pattern.value, '3');
    });

    await t.test('match with else block', async () => {
        const code = `
match ($day) {
    case (1) {
        print("Monday");
    }
    case (2) {
        print("Tuesday");
    }
    else {
        print("Other day");
    }
}`;
        const ast = await parse(code);

        assert.strictEqual(ast.length, 1);
        assert.strictEqual(ast[0].type, 'Match');
        const matchNode = ast[0] as any;
        assert.strictEqual(matchNode.caseClauses.length, 2);
        assert(matchNode.elseBlock);
        assert.strictEqual(matchNode.elseBlock.length, 1);
        assert.strictEqual(matchNode.elseBlock[0].type, 'Call');
    });

    await t.test('match with expression patterns', async () => {
        const code = `
match ($score) {
    case ($_ > 90) {
        print("A");
    }
    case ($_ > 80) {
        print("B");
    }
    else {
        print("F");
    }
}`;
        const ast = await parse(code);

        assert.strictEqual(ast.length, 1);
        assert.strictEqual(ast[0].type, 'Match');
        const matchNode = ast[0] as any;
        assert.strictEqual(matchNode.caseClauses.length, 2);
        assert.strictEqual(matchNode.caseClauses[0].pattern.type, 'BinaryOp');
        assert.strictEqual(matchNode.caseClauses[0].pattern.operator, '>');
    });

    await t.test('nested match statements', async () => {
        const code = `
match ($type) {
    case ("number") {
        match ($value) {
            case (0) {
                print("zero");
            }
            else {
                print("non-zero");
            }
        }
    }
    case ("string") {
        print("string type");
    }
}`;
        const ast = await parse(code);

        assert.strictEqual(ast.length, 1);
        assert.strictEqual(ast[0].type, 'Match');
        const outerMatch = ast[0] as any;
        assert.strictEqual(outerMatch.caseClauses.length, 2);

        // Check nested match in first case
        const firstCaseBlock = outerMatch.caseClauses[0].block;
        assert.strictEqual(firstCaseBlock.length, 1);
        assert.strictEqual(firstCaseBlock[0].type, 'Match');
        const innerMatch = firstCaseBlock[0] as any;
        assert.strictEqual(innerMatch.caseClauses.length, 1);
        assert(innerMatch.elseBlock);
    });

    await t.test('match in expression context', async () => {
        const code = `
my $result = match ($code) {
    case (200) { "success" }
    case (404) { "not found" }
    else { "unknown" }
};`;
        const ast = await parse(code);

        assert.strictEqual(ast.length, 1);
        assert.strictEqual(ast[0].type, 'Declaration');
        const decl = ast[0] as any;
        assert.strictEqual(decl.initializer.type, 'Match');
        const matchNode = decl.initializer as any;
        assert.strictEqual(matchNode.caseClauses.length, 2);
        assert(matchNode.elseBlock);
    });
});