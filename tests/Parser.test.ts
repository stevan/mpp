import { describe, test } from 'node:test';
import assert from 'node:assert';
import { Tokenizer } from '../src/Tokenizer.js';
import { Lexer } from '../src/Lexer.js';
import { Parser } from '../src/Parser.js';
import { BinaryOpNode, DeclarationNode, NumberNode, VariableNode, StringNode, IfNode, UnlessNode, WhileNode, UntilNode, ForeachNode, BlockNode, CallNode, ReturnNode, SubNode, ParameterNode } from '../src/AST.js';

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

describe('Parser', () => {
    test('parses number literal', async () => {
        const stmts = await parse('42;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as NumberNode;
        assert.strictEqual(stmt.type, 'Number');
        assert.strictEqual(stmt.value, '42');
    });

    test('parses string literal', async () => {
        const stmts = await parse('"hello";');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as StringNode;
        assert.strictEqual(stmt.type, 'String');
        assert.strictEqual(stmt.value, '"hello"');
    });

    test('parses variable reference', async () => {
        const stmts = await parse('$x;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as VariableNode;
        assert.strictEqual(stmt.type, 'Variable');
        assert.strictEqual(stmt.name, '$x');
    });

    test('parses simple addition', async () => {
        const stmts = await parse('1 + 2;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as BinaryOpNode;
        assert.strictEqual(stmt.type, 'BinaryOp');
        assert.strictEqual(stmt.operator, '+');
        assert.strictEqual(stmt.left.type, 'Number');
        assert.strictEqual((stmt.left as NumberNode).value, '1');
        assert.strictEqual(stmt.right.type, 'Number');
        assert.strictEqual((stmt.right as NumberNode).value, '2');
    });

    test('parses operator precedence correctly', async () => {
        const stmts = await parse('2 + 3 * 4;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as BinaryOpNode;
        assert.strictEqual(stmt.type, 'BinaryOp');
        assert.strictEqual(stmt.operator, '+');
        assert.strictEqual(stmt.left.type, 'Number');
        assert.strictEqual((stmt.left as NumberNode).value, '2');

        // Right side should be 3 * 4
        const right = stmt.right as BinaryOpNode;
        assert.strictEqual(right.type, 'BinaryOp');
        assert.strictEqual(right.operator, '*');
        assert.strictEqual((right.left as NumberNode).value, '3');
        assert.strictEqual((right.right as NumberNode).value, '4');
    });

    test('parses right-associative exponentiation', async () => {
        const stmts = await parse('2 ** 3 ** 2;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as BinaryOpNode;
        assert.strictEqual(stmt.type, 'BinaryOp');
        assert.strictEqual(stmt.operator, '**');
        assert.strictEqual(stmt.left.type, 'Number');
        assert.strictEqual((stmt.left as NumberNode).value, '2');

        // Right side should be 3 ** 2
        const right = stmt.right as BinaryOpNode;
        assert.strictEqual(right.type, 'BinaryOp');
        assert.strictEqual(right.operator, '**');
        assert.strictEqual((right.left as NumberNode).value, '3');
        assert.strictEqual((right.right as NumberNode).value, '2');
    });

    test('parses assignment', async () => {
        const stmts = await parse('$x = 10;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as BinaryOpNode;
        assert.strictEqual(stmt.type, 'BinaryOp');
        assert.strictEqual(stmt.operator, '=');
        assert.strictEqual(stmt.left.type, 'Variable');
        assert.strictEqual((stmt.left as VariableNode).name, '$x');
        assert.strictEqual(stmt.right.type, 'Number');
        assert.strictEqual((stmt.right as NumberNode).value, '10');
    });

    test('parses parenthesized expressions', async () => {
        const stmts = await parse('(2 + 3) * 4;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as BinaryOpNode;
        assert.strictEqual(stmt.type, 'BinaryOp');
        assert.strictEqual(stmt.operator, '*');

        // Left side should be 2 + 3 (grouped)
        const left = stmt.left as BinaryOpNode;
        assert.strictEqual(left.type, 'BinaryOp');
        assert.strictEqual(left.operator, '+');
        assert.strictEqual(stmt.right.type, 'Number');
        assert.strictEqual((stmt.right as NumberNode).value, '4');
    });

    test('parses multiple statements', async () => {
        const stmts = await parse('$x = 5; $y = 10;');

        assert.strictEqual(stmts.length, 2);
        assert.strictEqual(stmts[0].type, 'BinaryOp');
        assert.strictEqual((stmts[0] as BinaryOpNode).operator, '=');
        assert.strictEqual(stmts[1].type, 'BinaryOp');
        assert.strictEqual((stmts[1] as BinaryOpNode).operator, '=');
    });

    test('parses variable declaration', async () => {
        const stmts = await parse('my $x = 10;');

        assert.strictEqual(stmts.length, 1);
        const decl = stmts[0] as DeclarationNode;
        assert.strictEqual(decl.type, 'Declaration');
        assert.strictEqual(decl.declarator, 'my');
        assert.strictEqual(decl.variable.type, 'Variable');
        assert.strictEqual(decl.variable.name, '$x');
        assert.strictEqual(decl.initializer?.type, 'Number');
        assert.strictEqual((decl.initializer as NumberNode).value, '10');
    });

    test('parses simple if statement', async () => {
        const stmts = await parse('if ($x > 5) { $y = 10; }');

        assert.strictEqual(stmts.length, 1);
        const ifStmt = stmts[0] as IfNode;
        assert.strictEqual(ifStmt.type, 'If');
        assert.strictEqual(ifStmt.condition.type, 'BinaryOp');
        assert.strictEqual((ifStmt.condition as BinaryOpNode).operator, '>');
        assert.strictEqual(ifStmt.thenBlock.length, 1);
        assert.strictEqual(ifStmt.thenBlock[0].type, 'BinaryOp');
        assert.strictEqual(ifStmt.elseIfClauses.length, 0);
        assert.strictEqual(ifStmt.elseBlock, undefined);
    });

    test('parses if-else statement', async () => {
        const stmts = await parse('if ($x > 5) { $y = 10; } else { $y = 0; }');

        assert.strictEqual(stmts.length, 1);
        const ifStmt = stmts[0] as IfNode;
        assert.strictEqual(ifStmt.type, 'If');
        assert.strictEqual(ifStmt.thenBlock.length, 1);
        assert.strictEqual(ifStmt.elseIfClauses.length, 0);
        assert.strictEqual(ifStmt.elseBlock?.length, 1);
        assert.strictEqual(ifStmt.elseBlock?.[0].type, 'BinaryOp');
    });

    test('parses if-elsif statement', async () => {
        const stmts = await parse('if ($x > 10) { $y = 1; } elsif ($x > 5) { $y = 2; }');

        assert.strictEqual(stmts.length, 1);
        const ifStmt = stmts[0] as IfNode;
        assert.strictEqual(ifStmt.type, 'If');
        assert.strictEqual(ifStmt.thenBlock.length, 1);
        assert.strictEqual(ifStmt.elseIfClauses.length, 1);
        assert.strictEqual(ifStmt.elseIfClauses[0].condition.type, 'BinaryOp');
        assert.strictEqual(ifStmt.elseIfClauses[0].block.length, 1);
        assert.strictEqual(ifStmt.elseBlock, undefined);
    });

    test('parses if-elsif-else statement', async () => {
        const stmts = await parse('if ($x > 10) { $y = 1; } elsif ($x > 5) { $y = 2; } else { $y = 3; }');

        assert.strictEqual(stmts.length, 1);
        const ifStmt = stmts[0] as IfNode;
        assert.strictEqual(ifStmt.type, 'If');
        assert.strictEqual(ifStmt.thenBlock.length, 1);
        assert.strictEqual(ifStmt.elseIfClauses.length, 1);
        assert.strictEqual(ifStmt.elseIfClauses[0].condition.type, 'BinaryOp');
        assert.strictEqual(ifStmt.elseIfClauses[0].block.length, 1);
        assert.strictEqual(ifStmt.elseBlock?.length, 1);
    });

    test('parses multiple elsif clauses', async () => {
        const stmts = await parse('if ($x > 10) { $y = 1; } elsif ($x > 5) { $y = 2; } elsif ($x > 0) { $y = 3; } else { $y = 4; }');

        assert.strictEqual(stmts.length, 1);
        const ifStmt = stmts[0] as IfNode;
        assert.strictEqual(ifStmt.type, 'If');
        assert.strictEqual(ifStmt.elseIfClauses.length, 2);
        assert.strictEqual(ifStmt.elseIfClauses[1].condition.type, 'BinaryOp');
        assert.strictEqual(ifStmt.elseBlock?.length, 1);
    });

    test('parses while loop', async () => {
        const stmts = await parse('while ($x < 10) { $x = $x + 1; }');

        assert.strictEqual(stmts.length, 1);
        const whileStmt = stmts[0] as WhileNode;
        assert.strictEqual(whileStmt.type, 'While');
        assert.strictEqual(whileStmt.condition.type, 'BinaryOp');
        assert.strictEqual((whileStmt.condition as BinaryOpNode).operator, '<');
        assert.strictEqual(whileStmt.block.length, 1);
        assert.strictEqual(whileStmt.block[0].type, 'BinaryOp');
    });

    test('parses until loop', async () => {
        const stmts = await parse('until ($done) { $x = $x + 1; }');

        assert.strictEqual(stmts.length, 1);
        const untilStmt = stmts[0] as UntilNode;
        assert.strictEqual(untilStmt.type, 'Until');
        assert.strictEqual(untilStmt.condition.type, 'Variable');
        assert.strictEqual((untilStmt.condition as VariableNode).name, '$done');
        assert.strictEqual(untilStmt.block.length, 1);
        assert.strictEqual(untilStmt.block[0].type, 'BinaryOp');
    });

    test('parses while loop with multiple statements', async () => {
        const stmts = await parse('while ($i < 5) { $sum = $sum + $i; $i = $i + 1; }');

        assert.strictEqual(stmts.length, 1);
        const whileStmt = stmts[0] as WhileNode;
        assert.strictEqual(whileStmt.type, 'While');
        assert.strictEqual(whileStmt.block.length, 2);
        assert.strictEqual(whileStmt.block[0].type, 'BinaryOp');
        assert.strictEqual(whileStmt.block[1].type, 'BinaryOp');
    });

    test('parses foreach loop with declared variable', async () => {
        const stmts = await parse('foreach my $item (@array) { $sum = $sum + $item; }');

        assert.strictEqual(stmts.length, 1);
        const foreachStmt = stmts[0] as ForeachNode;
        assert.strictEqual(foreachStmt.type, 'Foreach');
        assert.strictEqual(foreachStmt.variable.name, '$item');
        assert.strictEqual(foreachStmt.declarator, 'my');
        assert.strictEqual(foreachStmt.listExpr.type, 'Variable');
        assert.strictEqual((foreachStmt.listExpr as VariableNode).name, '@array');
        assert.strictEqual(foreachStmt.block.length, 1);
    });

    test('parses foreach loop with existing variable', async () => {
        const stmts = await parse('foreach $x (@items) { $total = $total + $x; }');

        assert.strictEqual(stmts.length, 1);
        const foreachStmt = stmts[0] as ForeachNode;
        assert.strictEqual(foreachStmt.type, 'Foreach');
        assert.strictEqual(foreachStmt.variable.name, '$x');
        assert.strictEqual(foreachStmt.declarator, undefined);
        assert.strictEqual(foreachStmt.listExpr.type, 'Variable');
        assert.strictEqual(foreachStmt.block.length, 1);
    });

    test('parses for loop (alias for foreach)', async () => {
        const stmts = await parse('for my $i (1..10) { $sum = $sum + $i; }');

        assert.strictEqual(stmts.length, 1);
        const foreachStmt = stmts[0] as ForeachNode;
        assert.strictEqual(foreachStmt.type, 'Foreach');
        assert.strictEqual(foreachStmt.variable.name, '$i');
        assert.strictEqual(foreachStmt.declarator, 'my');
        assert.strictEqual(foreachStmt.listExpr.type, 'BinaryOp');
        assert.strictEqual((foreachStmt.listExpr as BinaryOpNode).operator, '..');
        assert.strictEqual(foreachStmt.block.length, 1);
    });

    test('parses foreach with multiple statements in block', async () => {
        const stmts = await parse('for my $n (@nums) { $sum = $sum + $n; $count = $count + 1; }');

        assert.strictEqual(stmts.length, 1);
        const foreachStmt = stmts[0] as ForeachNode;
        assert.strictEqual(foreachStmt.type, 'Foreach');
        assert.strictEqual(foreachStmt.block.length, 2);
        assert.strictEqual(foreachStmt.block[0].type, 'BinaryOp');
        assert.strictEqual(foreachStmt.block[1].type, 'BinaryOp');
    });

    test('parses postfix if', async () => {
        const stmts = await parse('$x = 10 if $condition;');

        assert.strictEqual(stmts.length, 1);
        const ifStmt = stmts[0] as IfNode;
        assert.strictEqual(ifStmt.type, 'If');
        assert.strictEqual(ifStmt.condition.type, 'Variable');
        assert.strictEqual((ifStmt.condition as VariableNode).name, '$condition');
        assert.strictEqual(ifStmt.thenBlock.length, 1);
        assert.strictEqual(ifStmt.thenBlock[0].type, 'BinaryOp');
        assert.strictEqual((ifStmt.thenBlock[0] as BinaryOpNode).operator, '=');
        assert.strictEqual(ifStmt.elseIfClauses.length, 0);
        assert.strictEqual(ifStmt.elseBlock, undefined);
    });

    test('parses postfix unless', async () => {
        const stmts = await parse('$y = 5 unless $error;');

        assert.strictEqual(stmts.length, 1);
        const unlessStmt = stmts[0] as UnlessNode;
        assert.strictEqual(unlessStmt.type, 'Unless');
        assert.strictEqual(unlessStmt.condition.type, 'Variable');
        assert.strictEqual((unlessStmt.condition as VariableNode).name, '$error');
        assert.strictEqual(unlessStmt.thenBlock.length, 1);
        assert.strictEqual(unlessStmt.thenBlock[0].type, 'BinaryOp');
    });

    test('parses postfix while', async () => {
        const stmts = await parse('$count = $count + 1 while $running;');

        assert.strictEqual(stmts.length, 1);
        const whileStmt = stmts[0] as WhileNode;
        assert.strictEqual(whileStmt.type, 'While');
        assert.strictEqual(whileStmt.condition.type, 'Variable');
        assert.strictEqual((whileStmt.condition as VariableNode).name, '$running');
        assert.strictEqual(whileStmt.block.length, 1);
        assert.strictEqual(whileStmt.block[0].type, 'BinaryOp');
    });

    test('parses postfix until', async () => {
        const stmts = await parse('$x = $x + 1 until $done;');

        assert.strictEqual(stmts.length, 1);
        const untilStmt = stmts[0] as UntilNode;
        assert.strictEqual(untilStmt.type, 'Until');
        assert.strictEqual(untilStmt.condition.type, 'Variable');
        assert.strictEqual((untilStmt.condition as VariableNode).name, '$done');
        assert.strictEqual(untilStmt.block.length, 1);
        assert.strictEqual(untilStmt.block[0].type, 'BinaryOp');
    });

    test('parses bare block statement', async () => {
        const stmts = await parse('{ $x = 10; }');

        assert.strictEqual(stmts.length, 1);
        const blockStmt = stmts[0] as BlockNode;
        assert.strictEqual(blockStmt.type, 'Block');
        assert.strictEqual(blockStmt.statements.length, 1);
        assert.strictEqual(blockStmt.statements[0].type, 'BinaryOp');
    });

    test('parses block with multiple statements', async () => {
        const stmts = await parse('{ my $x = 5; $y = $x + 10; }');

        assert.strictEqual(stmts.length, 1);
        const blockStmt = stmts[0] as BlockNode;
        assert.strictEqual(blockStmt.type, 'Block');
        assert.strictEqual(blockStmt.statements.length, 2);
        assert.strictEqual(blockStmt.statements[0].type, 'Declaration');
        assert.strictEqual(blockStmt.statements[1].type, 'BinaryOp');
    });

    test('parses nested blocks', async () => {
        const stmts = await parse('{ $x = 1; { $y = 2; } }');

        assert.strictEqual(stmts.length, 1);
        const outerBlock = stmts[0] as BlockNode;
        assert.strictEqual(outerBlock.type, 'Block');
        assert.strictEqual(outerBlock.statements.length, 2);
        assert.strictEqual(outerBlock.statements[0].type, 'BinaryOp');
        assert.strictEqual(outerBlock.statements[1].type, 'Block');

        const innerBlock = outerBlock.statements[1] as BlockNode;
        assert.strictEqual(innerBlock.statements.length, 1);
        assert.strictEqual(innerBlock.statements[0].type, 'BinaryOp');
    });

    test('parses block followed by statement', async () => {
        const stmts = await parse('{ $x = 1; } $y = 2;');

        assert.strictEqual(stmts.length, 2);
        assert.strictEqual(stmts[0].type, 'Block');
        assert.strictEqual(stmts[1].type, 'BinaryOp');
    });

    test('parses function call with no arguments', async () => {
        const stmts = await parse('hello();');

        assert.strictEqual(stmts.length, 1);
        const callStmt = stmts[0] as CallNode;
        assert.strictEqual(callStmt.type, 'Call');
        assert.strictEqual(callStmt.name, 'hello');
        assert.strictEqual(callStmt.arguments.length, 0);
    });

    test('parses function call with one argument', async () => {
        const stmts = await parse('print("hello");');

        assert.strictEqual(stmts.length, 1);
        const callStmt = stmts[0] as CallNode;
        assert.strictEqual(callStmt.type, 'Call');
        assert.strictEqual(callStmt.name, 'print');
        assert.strictEqual(callStmt.arguments.length, 1);
        assert.strictEqual(callStmt.arguments[0].type, 'String');
        assert.strictEqual((callStmt.arguments[0] as StringNode).value, '"hello"');
    });

    test('parses function call with multiple arguments', async () => {
        const stmts = await parse('add(5, 10, 15);');

        assert.strictEqual(stmts.length, 1);
        const callStmt = stmts[0] as CallNode;
        assert.strictEqual(callStmt.type, 'Call');
        assert.strictEqual(callStmt.name, 'add');
        assert.strictEqual(callStmt.arguments.length, 3);
        assert.strictEqual(callStmt.arguments[0].type, 'Number');
        assert.strictEqual((callStmt.arguments[0] as NumberNode).value, '5');
        assert.strictEqual(callStmt.arguments[1].type, 'Number');
        assert.strictEqual((callStmt.arguments[1] as NumberNode).value, '10');
        assert.strictEqual(callStmt.arguments[2].type, 'Number');
        assert.strictEqual((callStmt.arguments[2] as NumberNode).value, '15');
    });

    test('parses function call with variable arguments', async () => {
        const stmts = await parse('process($x, $y);');

        assert.strictEqual(stmts.length, 1);
        const callStmt = stmts[0] as CallNode;
        assert.strictEqual(callStmt.type, 'Call');
        assert.strictEqual(callStmt.name, 'process');
        assert.strictEqual(callStmt.arguments.length, 2);
        assert.strictEqual(callStmt.arguments[0].type, 'Variable');
        assert.strictEqual((callStmt.arguments[0] as VariableNode).name, '$x');
        assert.strictEqual(callStmt.arguments[1].type, 'Variable');
        assert.strictEqual((callStmt.arguments[1] as VariableNode).name, '$y');
    });

    test('parses function call with expression arguments', async () => {
        const stmts = await parse('max($a + 1, $b * 2);');

        assert.strictEqual(stmts.length, 1);
        const callStmt = stmts[0] as CallNode;
        assert.strictEqual(callStmt.type, 'Call');
        assert.strictEqual(callStmt.name, 'max');
        assert.strictEqual(callStmt.arguments.length, 2);
        assert.strictEqual(callStmt.arguments[0].type, 'BinaryOp');
        assert.strictEqual((callStmt.arguments[0] as BinaryOpNode).operator, '+');
        assert.strictEqual(callStmt.arguments[1].type, 'BinaryOp');
        assert.strictEqual((callStmt.arguments[1] as BinaryOpNode).operator, '*');
    });

    test('parses nested function calls', async () => {
        const stmts = await parse('outer(inner(5));');

        assert.strictEqual(stmts.length, 1);
        const callStmt = stmts[0] as CallNode;
        assert.strictEqual(callStmt.type, 'Call');
        assert.strictEqual(callStmt.name, 'outer');
        assert.strictEqual(callStmt.arguments.length, 1);
        assert.strictEqual(callStmt.arguments[0].type, 'Call');

        const innerCall = callStmt.arguments[0] as CallNode;
        assert.strictEqual(innerCall.name, 'inner');
        assert.strictEqual(innerCall.arguments.length, 1);
        assert.strictEqual(innerCall.arguments[0].type, 'Number');
    });

    test('parses return with no value', async () => {
        const stmts = await parse('return;');

        assert.strictEqual(stmts.length, 1);
        const returnStmt = stmts[0] as ReturnNode;
        assert.strictEqual(returnStmt.type, 'Return');
        assert.strictEqual(returnStmt.value, undefined);
    });

    test('parses return with simple value', async () => {
        const stmts = await parse('return 42;');

        assert.strictEqual(stmts.length, 1);
        const returnStmt = stmts[0] as ReturnNode;
        assert.strictEqual(returnStmt.type, 'Return');
        assert.strictEqual(returnStmt.value?.type, 'Number');
        assert.strictEqual((returnStmt.value as NumberNode).value, '42');
    });

    test('parses return with variable', async () => {
        const stmts = await parse('return $result;');

        assert.strictEqual(stmts.length, 1);
        const returnStmt = stmts[0] as ReturnNode;
        assert.strictEqual(returnStmt.type, 'Return');
        assert.strictEqual(returnStmt.value?.type, 'Variable');
        assert.strictEqual((returnStmt.value as VariableNode).name, '$result');
    });

    test('parses return with expression', async () => {
        const stmts = await parse('return $x + $y;');

        assert.strictEqual(stmts.length, 1);
        const returnStmt = stmts[0] as ReturnNode;
        assert.strictEqual(returnStmt.type, 'Return');
        assert.strictEqual(returnStmt.value?.type, 'BinaryOp');
        assert.strictEqual((returnStmt.value as BinaryOpNode).operator, '+');
    });

    test('parses return with function call', async () => {
        const stmts = await parse('return calculate($x);');

        assert.strictEqual(stmts.length, 1);
        const returnStmt = stmts[0] as ReturnNode;
        assert.strictEqual(returnStmt.type, 'Return');
        assert.strictEqual(returnStmt.value?.type, 'Call');
        assert.strictEqual((returnStmt.value as CallNode).name, 'calculate');
    });

    // Sub definition tests
    test('parses named sub with parameters', async () => {
        const stmts = await parse('sub add($x, $y) { return $x + $y; }');

        assert.strictEqual(stmts.length, 1);
        const subStmt = stmts[0] as SubNode;
        assert.strictEqual(subStmt.type, 'Sub');
        assert.strictEqual(subStmt.name, 'add');
        assert.strictEqual(subStmt.parameters.length, 2);
        assert.strictEqual(subStmt.parameters[0].type, 'Parameter');
        assert.strictEqual(subStmt.parameters[0].variable.name, '$x');
        assert.strictEqual(subStmt.parameters[0].defaultValue, undefined);
        assert.strictEqual(subStmt.parameters[1].type, 'Parameter');
        assert.strictEqual(subStmt.parameters[1].variable.name, '$y');
        assert.strictEqual(subStmt.body.length, 1);
        assert.strictEqual(subStmt.body[0].type, 'Return');
    });

    test('parses named sub with no parameters', async () => {
        const stmts = await parse('sub hello() { print("Hello, world!"); }');

        assert.strictEqual(stmts.length, 1);
        const subStmt = stmts[0] as SubNode;
        assert.strictEqual(subStmt.type, 'Sub');
        assert.strictEqual(subStmt.name, 'hello');
        assert.strictEqual(subStmt.parameters.length, 0);
        assert.strictEqual(subStmt.body.length, 1);
        assert.strictEqual(subStmt.body[0].type, 'Call');
    });

    test('parses sub with default parameter values', async () => {
        const stmts = await parse('sub greet($name = "World") { print($name); }');

        assert.strictEqual(stmts.length, 1);
        const subStmt = stmts[0] as SubNode;
        assert.strictEqual(subStmt.type, 'Sub');
        assert.strictEqual(subStmt.name, 'greet');
        assert.strictEqual(subStmt.parameters.length, 1);
        assert.strictEqual(subStmt.parameters[0].type, 'Parameter');
        assert.strictEqual(subStmt.parameters[0].variable.name, '$name');
        assert.strictEqual(subStmt.parameters[0].defaultValue?.type, 'String');
        assert.strictEqual((subStmt.parameters[0].defaultValue as StringNode).value, '"World"');
    });

    test('parses anonymous sub', async () => {
        const stmts = await parse('my $double = sub ($x) { return $x * 2; };');

        assert.strictEqual(stmts.length, 1);
        const declStmt = stmts[0] as DeclarationNode;
        assert.strictEqual(declStmt.type, 'Declaration');
        assert.strictEqual(declStmt.variable.name, '$double');
        assert.strictEqual(declStmt.initializer?.type, 'Sub');
        const subNode = declStmt.initializer as SubNode;
        assert.strictEqual(subNode.name, undefined);
        assert.strictEqual(subNode.parameters.length, 1);
        assert.strictEqual(subNode.parameters[0].variable.name, '$x');
        assert.strictEqual(subNode.body.length, 1);
        assert.strictEqual(subNode.body[0].type, 'Return');
    });

    test('parses sub with multiple statements in body', async () => {
        const stmts = await parse('sub calculate($x, $y) { my $result = $x + $y; return $result; }');

        assert.strictEqual(stmts.length, 1);
        const subStmt = stmts[0] as SubNode;
        assert.strictEqual(subStmt.type, 'Sub');
        assert.strictEqual(subStmt.name, 'calculate');
        assert.strictEqual(subStmt.parameters.length, 2);
        assert.strictEqual(subStmt.body.length, 2);
        assert.strictEqual(subStmt.body[0].type, 'Declaration');
        assert.strictEqual(subStmt.body[1].type, 'Return');
    });

    test('parses sub with multiple parameters including defaults', async () => {
        const stmts = await parse('sub func($a, $b = 10, $c = 20) { return $a; }');

        assert.strictEqual(stmts.length, 1);
        const subStmt = stmts[0] as SubNode;
        assert.strictEqual(subStmt.type, 'Sub');
        assert.strictEqual(subStmt.name, 'func');
        assert.strictEqual(subStmt.parameters.length, 3);
        assert.strictEqual(subStmt.parameters[0].variable.name, '$a');
        assert.strictEqual(subStmt.parameters[0].defaultValue, undefined);
        assert.strictEqual(subStmt.parameters[1].variable.name, '$b');
        assert.strictEqual(subStmt.parameters[1].defaultValue?.type, 'Number');
        assert.strictEqual(subStmt.parameters[2].variable.name, '$c');
        assert.strictEqual(subStmt.parameters[2].defaultValue?.type, 'Number');
    });
});
