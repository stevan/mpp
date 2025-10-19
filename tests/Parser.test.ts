import { describe, test } from 'node:test';
import assert from 'node:assert';
import { Tokenizer } from '../src/Tokenizer.js';
import { Lexer } from '../src/Lexer.js';
import { Parser } from '../src/Parser.js';
import { BinaryOpNode, DeclarationNode, NumberNode, VariableNode, StringNode, IfNode, UnlessNode, WhileNode, UntilNode, ForeachNode, BlockNode, DoBlockNode, CallNode, ReturnNode, DieNode, WarnNode, PrintNode, SayNode, SubNode, ParameterNode, ArrayLiteralNode, HashLiteralNode, ListNode, ArrayAccessNode, ArraySliceNode, HashAccessNode, HashSliceNode, UnaryOpNode, TernaryNode, MethodCallNode, AssignmentNode, LastNode, NextNode, RedoNode } from '../src/AST.js';

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
        const stmt = stmts[0] as AssignmentNode;
        assert.strictEqual(stmt.type, 'Assignment');
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
        assert.strictEqual(stmts[0].type, 'Assignment');
        assert.strictEqual((stmts[0] as AssignmentNode).operator, '=');
        assert.strictEqual(stmts[1].type, 'Assignment');
        assert.strictEqual((stmts[1] as AssignmentNode).operator, '=');
    });

    // Range Expression Tests
    test('parses simple numeric range', async () => {
        const stmts = await parse('1..10;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as BinaryOpNode;
        assert.strictEqual(stmt.type, 'BinaryOp');
        assert.strictEqual(stmt.operator, '..');
        assert.strictEqual(stmt.left.type, 'Number');
        assert.strictEqual((stmt.left as NumberNode).value, '1');
        assert.strictEqual(stmt.right.type, 'Number');
        assert.strictEqual((stmt.right as NumberNode).value, '10');
    });

    test('parses range in assignment', async () => {
        const stmts = await parse('my @nums = (1..10);');

        assert.strictEqual(stmts.length, 1);
        const decl = stmts[0] as DeclarationNode;
        assert.strictEqual(decl.type, 'Declaration');
        assert.strictEqual(decl.variable.name, '@nums');
        assert.strictEqual(decl.initializer?.type, 'BinaryOp');
        const range = decl.initializer as BinaryOpNode;
        assert.strictEqual(range.operator, '..');
        assert.strictEqual((range.left as NumberNode).value, '1');
        assert.strictEqual((range.right as NumberNode).value, '10');
    });

    test('parses string range', async () => {
        const stmts = await parse("'a'..'z';");

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as BinaryOpNode;
        assert.strictEqual(stmt.type, 'BinaryOp');
        assert.strictEqual(stmt.operator, '..');
        assert.strictEqual(stmt.left.type, 'String');
        assert.strictEqual((stmt.left as StringNode).value, "'a'");
        assert.strictEqual(stmt.right.type, 'String');
        assert.strictEqual((stmt.right as StringNode).value, "'z'");
    });

    test('parses range with variable bounds', async () => {
        const stmts = await parse('$start..$end;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as BinaryOpNode;
        assert.strictEqual(stmt.type, 'BinaryOp');
        assert.strictEqual(stmt.operator, '..');
        assert.strictEqual(stmt.left.type, 'Variable');
        assert.strictEqual((stmt.left as VariableNode).name, '$start');
        assert.strictEqual(stmt.right.type, 'Variable');
        assert.strictEqual((stmt.right as VariableNode).name, '$end');
    });

    test('parses range with expressions', async () => {
        const stmts = await parse('(1 + 1)..(5 * 2);');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as BinaryOpNode;
        assert.strictEqual(stmt.type, 'BinaryOp');
        assert.strictEqual(stmt.operator, '..');
        assert.strictEqual(stmt.left.type, 'BinaryOp');
        assert.strictEqual((stmt.left as BinaryOpNode).operator, '+');
        assert.strictEqual(stmt.right.type, 'BinaryOp');
        assert.strictEqual((stmt.right as BinaryOpNode).operator, '*');
    });

    test('parses range in array literal', async () => {
        const stmts = await parse('[1..5, 10..15];');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as ArrayLiteralNode;
        assert.strictEqual(stmt.type, 'ArrayLiteral');
        assert.strictEqual(stmt.elements.length, 2);
        assert.strictEqual(stmt.elements[0].type, 'BinaryOp');
        assert.strictEqual((stmt.elements[0] as BinaryOpNode).operator, '..');
        assert.strictEqual(stmt.elements[1].type, 'BinaryOp');
        assert.strictEqual((stmt.elements[1] as BinaryOpNode).operator, '..');
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
        assert.strictEqual(ifStmt.thenBlock[0].type, 'Assignment');
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
        assert.strictEqual(ifStmt.elseBlock?.[0].type, 'Assignment');
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
        assert.strictEqual(whileStmt.block[0].type, 'Assignment');
    });

    test('parses until loop', async () => {
        const stmts = await parse('until ($done) { $x = $x + 1; }');

        assert.strictEqual(stmts.length, 1);
        const untilStmt = stmts[0] as UntilNode;
        assert.strictEqual(untilStmt.type, 'Until');
        assert.strictEqual(untilStmt.condition.type, 'Variable');
        assert.strictEqual((untilStmt.condition as VariableNode).name, '$done');
        assert.strictEqual(untilStmt.block.length, 1);
        assert.strictEqual(untilStmt.block[0].type, 'Assignment');
    });

    test('parses while loop with multiple statements', async () => {
        const stmts = await parse('while ($i < 5) { $sum = $sum + $i; $i = $i + 1; }');

        assert.strictEqual(stmts.length, 1);
        const whileStmt = stmts[0] as WhileNode;
        assert.strictEqual(whileStmt.type, 'While');
        assert.strictEqual(whileStmt.block.length, 2);
        assert.strictEqual(whileStmt.block[0].type, 'Assignment');
        assert.strictEqual(whileStmt.block[1].type, 'Assignment');
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
        assert.strictEqual(foreachStmt.block[0].type, 'Assignment');
        assert.strictEqual(foreachStmt.block[1].type, 'Assignment');
    });

    // Loop label tests
    test('parses while loop with label', async () => {
        const stmts = await parse('OUTER: while ($condition) { $x = $x + 1; }');

        assert.strictEqual(stmts.length, 1);
        const whileStmt = stmts[0] as WhileNode;
        assert.strictEqual(whileStmt.type, 'While');
        assert.strictEqual(whileStmt.label, 'OUTER');
        assert.strictEqual(whileStmt.condition.type, 'Variable');
        assert.strictEqual(whileStmt.block.length, 1);
    });

    test('parses until loop with label', async () => {
        const stmts = await parse('RETRY: until ($done) { process(); }');

        assert.strictEqual(stmts.length, 1);
        const untilStmt = stmts[0] as UntilNode;
        assert.strictEqual(untilStmt.type, 'Until');
        assert.strictEqual(untilStmt.label, 'RETRY');
        assert.strictEqual(untilStmt.condition.type, 'Variable');
    });

    test('parses foreach loop with label', async () => {
        const stmts = await parse('ITEMS: for my $item (@list) { say $item; }');

        assert.strictEqual(stmts.length, 1);
        const foreachStmt = stmts[0] as ForeachNode;
        assert.strictEqual(foreachStmt.type, 'Foreach');
        assert.strictEqual(foreachStmt.label, 'ITEMS');
        assert.strictEqual(foreachStmt.variable.name, '$item');
    });

    test('parses nested loops with labels and last', async () => {
        const stmts = await parse('OUTER: while ($x) { INNER: for my $i (@items) { last OUTER if $done; } }');

        assert.strictEqual(stmts.length, 1);
        const outerLoop = stmts[0] as WhileNode;
        assert.strictEqual(outerLoop.type, 'While');
        assert.strictEqual(outerLoop.label, 'OUTER');

        const innerLoop = outerLoop.block[0] as ForeachNode;
        assert.strictEqual(innerLoop.type, 'Foreach');
        assert.strictEqual(innerLoop.label, 'INNER');

        const ifStmt = innerLoop.block[0] as IfNode;
        assert.strictEqual(ifStmt.type, 'If');
        const lastStmt = ifStmt.thenBlock[0] as LastNode;
        assert.strictEqual(lastStmt.type, 'Last');
        assert.strictEqual(lastStmt.label, 'OUTER');
    });

    test('parses postfix if', async () => {
        const stmts = await parse('$x = 10 if $condition;');

        assert.strictEqual(stmts.length, 1);
        const ifStmt = stmts[0] as IfNode;
        assert.strictEqual(ifStmt.type, 'If');
        assert.strictEqual(ifStmt.condition.type, 'Variable');
        assert.strictEqual((ifStmt.condition as VariableNode).name, '$condition');
        assert.strictEqual(ifStmt.thenBlock.length, 1);
        assert.strictEqual(ifStmt.thenBlock[0].type, 'Assignment');
        assert.strictEqual((ifStmt.thenBlock[0] as AssignmentNode).operator, '=');
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
        assert.strictEqual(unlessStmt.thenBlock[0].type, 'Assignment');
    });

    test('parses postfix while', async () => {
        const stmts = await parse('$count = $count + 1 while $running;');

        assert.strictEqual(stmts.length, 1);
        const whileStmt = stmts[0] as WhileNode;
        assert.strictEqual(whileStmt.type, 'While');
        assert.strictEqual(whileStmt.condition.type, 'Variable');
        assert.strictEqual((whileStmt.condition as VariableNode).name, '$running');
        assert.strictEqual(whileStmt.block.length, 1);
        assert.strictEqual(whileStmt.block[0].type, 'Assignment');
    });

    test('parses postfix until', async () => {
        const stmts = await parse('$x = $x + 1 until $done;');

        assert.strictEqual(stmts.length, 1);
        const untilStmt = stmts[0] as UntilNode;
        assert.strictEqual(untilStmt.type, 'Until');
        assert.strictEqual(untilStmt.condition.type, 'Variable');
        assert.strictEqual((untilStmt.condition as VariableNode).name, '$done');
        assert.strictEqual(untilStmt.block.length, 1);
        assert.strictEqual(untilStmt.block[0].type, 'Assignment');
    });

    test('parses bare block statement', async () => {
        const stmts = await parse('{ $x = 10; }');

        assert.strictEqual(stmts.length, 1);
        const blockStmt = stmts[0] as BlockNode;
        assert.strictEqual(blockStmt.type, 'Block');
        assert.strictEqual(blockStmt.statements.length, 1);
        assert.strictEqual(blockStmt.statements[0].type, 'Assignment');
    });

    test('parses block with multiple statements', async () => {
        const stmts = await parse('{ my $x = 5; $y = $x + 10; }');

        assert.strictEqual(stmts.length, 1);
        const blockStmt = stmts[0] as BlockNode;
        assert.strictEqual(blockStmt.type, 'Block');
        assert.strictEqual(blockStmt.statements.length, 2);
        assert.strictEqual(blockStmt.statements[0].type, 'Declaration');
        assert.strictEqual(blockStmt.statements[1].type, 'Assignment');
    });

    test('parses nested blocks', async () => {
        const stmts = await parse('{ $x = 1; { $y = 2; } }');

        assert.strictEqual(stmts.length, 1);
        const outerBlock = stmts[0] as BlockNode;
        assert.strictEqual(outerBlock.type, 'Block');
        assert.strictEqual(outerBlock.statements.length, 2);
        assert.strictEqual(outerBlock.statements[0].type, 'Assignment');
        assert.strictEqual(outerBlock.statements[1].type, 'Block');

        const innerBlock = outerBlock.statements[1] as BlockNode;
        assert.strictEqual(innerBlock.statements.length, 1);
        assert.strictEqual(innerBlock.statements[0].type, 'Assignment');
    });

    test('parses block followed by statement', async () => {
        const stmts = await parse('{ $x = 1; } $y = 2;');

        assert.strictEqual(stmts.length, 2);
        assert.strictEqual(stmts[0].type, 'Block');
        assert.strictEqual(stmts[1].type, 'Assignment');
    });

    // Do block tests
    test('parses do block with single statement', async () => {
        const stmts = await parse('my $x = do { 42; };');

        assert.strictEqual(stmts.length, 1);
        const declStmt = stmts[0] as DeclarationNode;
        assert.strictEqual(declStmt.type, 'Declaration');
        assert.strictEqual(declStmt.initializer?.type, 'DoBlock');

        const doBlock = declStmt.initializer as DoBlockNode;
        assert.strictEqual(doBlock.statements.length, 1);
        assert.strictEqual(doBlock.statements[0].type, 'Number');
    });

    test('parses do block with multiple statements', async () => {
        const stmts = await parse('my $result = do { my $a = 10; my $b = 20; $a + $b; };');

        assert.strictEqual(stmts.length, 1);
        const declStmt = stmts[0] as DeclarationNode;
        assert.strictEqual(declStmt.type, 'Declaration');
        assert.strictEqual(declStmt.initializer?.type, 'DoBlock');

        const doBlock = declStmt.initializer as DoBlockNode;
        assert.strictEqual(doBlock.statements.length, 3);
        assert.strictEqual(doBlock.statements[0].type, 'Declaration');
        assert.strictEqual(doBlock.statements[1].type, 'Declaration');
        assert.strictEqual(doBlock.statements[2].type, 'BinaryOp');
    });

    test('parses do block in assignment', async () => {
        const stmts = await parse('$value = do { $x * 2; };');

        assert.strictEqual(stmts.length, 1);
        const assignStmt = stmts[0] as AssignmentNode;
        assert.strictEqual(assignStmt.type, 'Assignment');
        assert.strictEqual(assignStmt.right.type, 'DoBlock');

        const doBlock = assignStmt.right as DoBlockNode;
        assert.strictEqual(doBlock.statements.length, 1);
        assert.strictEqual(doBlock.statements[0].type, 'BinaryOp');
    });

    test('parses do block as standalone statement', async () => {
        const stmts = await parse('do { print "hello"; };');

        assert.strictEqual(stmts.length, 1);
        assert.strictEqual(stmts[0].type, 'DoBlock');

        const doBlock = stmts[0] as DoBlockNode;
        assert.strictEqual(doBlock.statements.length, 1);
        assert.strictEqual(doBlock.statements[0].type, 'Print');
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

    // Die and warn statement tests
    test('parses die with no message', async () => {
        const stmts = await parse('die;');

        assert.strictEqual(stmts.length, 1);
        const dieStmt = stmts[0] as DieNode;
        assert.strictEqual(dieStmt.type, 'Die');
        assert.strictEqual(dieStmt.message, undefined);
    });

    test('parses die with string message', async () => {
        const stmts = await parse('die "Error occurred";');

        assert.strictEqual(stmts.length, 1);
        const dieStmt = stmts[0] as DieNode;
        assert.strictEqual(dieStmt.type, 'Die');
        assert.strictEqual(dieStmt.message?.type, 'String');
        assert.strictEqual((dieStmt.message as StringNode).value, '"Error occurred"');
    });

    test('parses die with variable message', async () => {
        const stmts = await parse('die $error;');

        assert.strictEqual(stmts.length, 1);
        const dieStmt = stmts[0] as DieNode;
        assert.strictEqual(dieStmt.type, 'Die');
        assert.strictEqual(dieStmt.message?.type, 'Variable');
        assert.strictEqual((dieStmt.message as VariableNode).name, '$error');
    });

    test('parses die with expression', async () => {
        const stmts = await parse('die "Error: " . $msg;');

        assert.strictEqual(stmts.length, 1);
        const dieStmt = stmts[0] as DieNode;
        assert.strictEqual(dieStmt.type, 'Die');
        assert.strictEqual(dieStmt.message?.type, 'BinaryOp');
        assert.strictEqual((dieStmt.message as BinaryOpNode).operator, '.');
    });

    test('parses warn with no message', async () => {
        const stmts = await parse('warn;');

        assert.strictEqual(stmts.length, 1);
        const warnStmt = stmts[0] as WarnNode;
        assert.strictEqual(warnStmt.type, 'Warn');
        assert.strictEqual(warnStmt.message, undefined);
    });

    test('parses warn with string message', async () => {
        const stmts = await parse('warn "Deprecation notice";');

        assert.strictEqual(stmts.length, 1);
        const warnStmt = stmts[0] as WarnNode;
        assert.strictEqual(warnStmt.type, 'Warn');
        assert.strictEqual(warnStmt.message?.type, 'String');
        assert.strictEqual((warnStmt.message as StringNode).value, '"Deprecation notice"');
    });

    test('parses warn with variable', async () => {
        const stmts = await parse('warn $warning;');

        assert.strictEqual(stmts.length, 1);
        const warnStmt = stmts[0] as WarnNode;
        assert.strictEqual(warnStmt.type, 'Warn');
        assert.strictEqual(warnStmt.message?.type, 'Variable');
        assert.strictEqual((warnStmt.message as VariableNode).name, '$warning');
    });

    test('parses warn with function call', async () => {
        const stmts = await parse('warn get_warning();');

        assert.strictEqual(stmts.length, 1);
        const warnStmt = stmts[0] as WarnNode;
        assert.strictEqual(warnStmt.type, 'Warn');
        assert.strictEqual(warnStmt.message?.type, 'Call');
        assert.strictEqual((warnStmt.message as CallNode).name, 'get_warning');
    });

    // Print and say statement tests
    test('parses print with no arguments', async () => {
        const stmts = await parse('print;');

        assert.strictEqual(stmts.length, 1);
        const printStmt = stmts[0] as PrintNode;
        assert.strictEqual(printStmt.type, 'Print');
        assert.strictEqual(printStmt.arguments.length, 0);
    });

    test('parses print with string argument', async () => {
        const stmts = await parse('print "Hello";');

        assert.strictEqual(stmts.length, 1);
        const printStmt = stmts[0] as PrintNode;
        assert.strictEqual(printStmt.type, 'Print');
        assert.strictEqual(printStmt.arguments.length, 1);
        assert.strictEqual(printStmt.arguments[0].type, 'String');
        assert.strictEqual((printStmt.arguments[0] as StringNode).value, '"Hello"');
    });

    test('parses print with multiple arguments', async () => {
        const stmts = await parse('print "Hello", " ", "World";');

        assert.strictEqual(stmts.length, 1);
        const printStmt = stmts[0] as PrintNode;
        assert.strictEqual(printStmt.type, 'Print');
        assert.strictEqual(printStmt.arguments.length, 3);
        assert.strictEqual(printStmt.arguments[0].type, 'String');
        assert.strictEqual(printStmt.arguments[1].type, 'String');
        assert.strictEqual(printStmt.arguments[2].type, 'String');
    });

    test('parses print with variable', async () => {
        const stmts = await parse('print $message;');

        assert.strictEqual(stmts.length, 1);
        const printStmt = stmts[0] as PrintNode;
        assert.strictEqual(printStmt.type, 'Print');
        assert.strictEqual(printStmt.arguments.length, 1);
        assert.strictEqual(printStmt.arguments[0].type, 'Variable');
        assert.strictEqual((printStmt.arguments[0] as VariableNode).name, '$message');
    });

    test('parses say with no arguments', async () => {
        const stmts = await parse('say;');

        assert.strictEqual(stmts.length, 1);
        const sayStmt = stmts[0] as SayNode;
        assert.strictEqual(sayStmt.type, 'Say');
        assert.strictEqual(sayStmt.arguments.length, 0);
    });

    test('parses say with string argument', async () => {
        const stmts = await parse('say "Hello World";');

        assert.strictEqual(stmts.length, 1);
        const sayStmt = stmts[0] as SayNode;
        assert.strictEqual(sayStmt.type, 'Say');
        assert.strictEqual(sayStmt.arguments.length, 1);
        assert.strictEqual(sayStmt.arguments[0].type, 'String');
        assert.strictEqual((sayStmt.arguments[0] as StringNode).value, '"Hello World"');
    });

    test('parses say with variable', async () => {
        const stmts = await parse('say $output;');

        assert.strictEqual(stmts.length, 1);
        const sayStmt = stmts[0] as SayNode;
        assert.strictEqual(sayStmt.type, 'Say');
        assert.strictEqual(sayStmt.arguments.length, 1);
        assert.strictEqual(sayStmt.arguments[0].type, 'Variable');
        assert.strictEqual((sayStmt.arguments[0] as VariableNode).name, '$output');
    });

    test('parses say with expression', async () => {
        const stmts = await parse('say $x + $y;');

        assert.strictEqual(stmts.length, 1);
        const sayStmt = stmts[0] as SayNode;
        assert.strictEqual(sayStmt.type, 'Say');
        assert.strictEqual(sayStmt.arguments.length, 1);
        assert.strictEqual(sayStmt.arguments[0].type, 'BinaryOp');
        assert.strictEqual((sayStmt.arguments[0] as BinaryOpNode).operator, '+');
    });

    // Require builtin test
    test('parses require as function call', async () => {
        const stmts = await parse('require("Config.pm");');

        assert.strictEqual(stmts.length, 1);
        const callStmt = stmts[0] as CallNode;
        assert.strictEqual(callStmt.type, 'Call');
        assert.strictEqual(callStmt.name, 'require');
        assert.strictEqual(callStmt.arguments.length, 1);
        assert.strictEqual(callStmt.arguments[0].type, 'String');
    });

    // Loop control statement tests
    test('parses last without label', async () => {
        const stmts = await parse('last;');

        assert.strictEqual(stmts.length, 1);
        const lastStmt = stmts[0] as LastNode;
        assert.strictEqual(lastStmt.type, 'Last');
        assert.strictEqual(lastStmt.label, undefined);
    });

    test('parses next without label', async () => {
        const stmts = await parse('next;');

        assert.strictEqual(stmts.length, 1);
        const nextStmt = stmts[0] as NextNode;
        assert.strictEqual(nextStmt.type, 'Next');
        assert.strictEqual(nextStmt.label, undefined);
    });

    test('parses redo without label', async () => {
        const stmts = await parse('redo;');

        assert.strictEqual(stmts.length, 1);
        const redoStmt = stmts[0] as RedoNode;
        assert.strictEqual(redoStmt.type, 'Redo');
        assert.strictEqual(redoStmt.label, undefined);
    });

    test('parses last with label', async () => {
        const stmts = await parse('last OUTER;');

        assert.strictEqual(stmts.length, 1);
        const lastStmt = stmts[0] as LastNode;
        assert.strictEqual(lastStmt.type, 'Last');
        assert.strictEqual(lastStmt.label, 'OUTER');
    });

    test('parses next with label', async () => {
        const stmts = await parse('next LOOP;');

        assert.strictEqual(stmts.length, 1);
        const nextStmt = stmts[0] as NextNode;
        assert.strictEqual(nextStmt.type, 'Next');
        assert.strictEqual(nextStmt.label, 'LOOP');
    });

    test('parses redo with label', async () => {
        const stmts = await parse('redo RETRY;');

        assert.strictEqual(stmts.length, 1);
        const redoStmt = stmts[0] as RedoNode;
        assert.strictEqual(redoStmt.type, 'Redo');
        assert.strictEqual(redoStmt.label, 'RETRY');
    });

    test('parses last in while loop', async () => {
        const stmts = await parse('while ($x) { last; }');

        assert.strictEqual(stmts.length, 1);
        const whileStmt = stmts[0] as WhileNode;
        assert.strictEqual(whileStmt.type, 'While');
        assert.strictEqual(whileStmt.block.length, 1);
        assert.strictEqual(whileStmt.block[0].type, 'Last');
    });

    test('parses next in foreach loop', async () => {
        const stmts = await parse('for my $item (@items) { next if $skip; }');

        assert.strictEqual(stmts.length, 1);
        const forStmt = stmts[0] as ForeachNode;
        assert.strictEqual(forStmt.type, 'Foreach');
        assert.strictEqual(forStmt.block.length, 1);
        const ifStmt = forStmt.block[0] as IfNode;
        assert.strictEqual(ifStmt.type, 'If');
        assert.strictEqual(ifStmt.thenBlock.length, 1);
        assert.strictEqual(ifStmt.thenBlock[0].type, 'Next');
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

    // Array Literal Tests
    test('parses simple array literal', async () => {
        const stmts = await parse('[1, 2, 3];');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as ArrayLiteralNode;
        assert.strictEqual(stmt.type, 'ArrayLiteral');
        assert.strictEqual(stmt.elements.length, 3);
        assert.strictEqual(stmt.elements[0].type, 'Number');
        assert.strictEqual((stmt.elements[0] as NumberNode).value, '1');
        assert.strictEqual(stmt.elements[1].type, 'Number');
        assert.strictEqual((stmt.elements[1] as NumberNode).value, '2');
        assert.strictEqual(stmt.elements[2].type, 'Number');
        assert.strictEqual((stmt.elements[2] as NumberNode).value, '3');
    });

    test('parses empty array literal', async () => {
        const stmts = await parse('[];');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as ArrayLiteralNode;
        assert.strictEqual(stmt.type, 'ArrayLiteral');
        assert.strictEqual(stmt.elements.length, 0);
    });

    test('parses array literal with mixed types', async () => {
        const stmts = await parse('[1, "hello", $x];');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as ArrayLiteralNode;
        assert.strictEqual(stmt.type, 'ArrayLiteral');
        assert.strictEqual(stmt.elements.length, 3);
        assert.strictEqual(stmt.elements[0].type, 'Number');
        assert.strictEqual(stmt.elements[1].type, 'String');
        assert.strictEqual(stmt.elements[2].type, 'Variable');
    });

    test('parses nested array literals', async () => {
        const stmts = await parse('[1, [2, 3], 4];');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as ArrayLiteralNode;
        assert.strictEqual(stmt.type, 'ArrayLiteral');
        assert.strictEqual(stmt.elements.length, 3);
        assert.strictEqual(stmt.elements[0].type, 'Number');
        assert.strictEqual(stmt.elements[1].type, 'ArrayLiteral');
        const nested = stmt.elements[1] as ArrayLiteralNode;
        assert.strictEqual(nested.elements.length, 2);
        assert.strictEqual((nested.elements[0] as NumberNode).value, '2');
        assert.strictEqual((nested.elements[1] as NumberNode).value, '3');
        assert.strictEqual(stmt.elements[2].type, 'Number');
    });

    test('parses array literal in variable declaration', async () => {
        const stmts = await parse('my $aref = [1, 2, 3];');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.type, 'Declaration');
        assert.strictEqual(stmt.variable.name, '$aref');
        assert.strictEqual(stmt.initializer?.type, 'ArrayLiteral');
        const arrayLit = stmt.initializer as ArrayLiteralNode;
        assert.strictEqual(arrayLit.elements.length, 3);
    });

    test('parses array literal with expressions', async () => {
        const stmts = await parse('[1 + 2, 3 * 4, $x + $y];');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as ArrayLiteralNode;
        assert.strictEqual(stmt.type, 'ArrayLiteral');
        assert.strictEqual(stmt.elements.length, 3);
        assert.strictEqual(stmt.elements[0].type, 'BinaryOp');
        assert.strictEqual(stmt.elements[1].type, 'BinaryOp');
        assert.strictEqual(stmt.elements[2].type, 'BinaryOp');
    });

    // Hash Literal Tests
    test('parses simple hash literal with fat comma', async () => {
        const stmts = await parse('+{ "a" => 1, "b" => 2 };');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as HashLiteralNode;
        assert.strictEqual(stmt.type, 'HashLiteral');
        assert.strictEqual(stmt.pairs.length, 2);
        assert.strictEqual(stmt.pairs[0].key.type, 'String');
        assert.strictEqual((stmt.pairs[0].key as StringNode).value, '"a"');
        assert.strictEqual(stmt.pairs[0].value.type, 'Number');
        assert.strictEqual((stmt.pairs[0].value as NumberNode).value, '1');
        assert.strictEqual(stmt.pairs[1].key.type, 'String');
        assert.strictEqual((stmt.pairs[1].key as StringNode).value, '"b"');
        assert.strictEqual(stmt.pairs[1].value.type, 'Number');
        assert.strictEqual((stmt.pairs[1].value as NumberNode).value, '2');
    });

    test('parses empty hash literal', async () => {
        const stmts = await parse('+{};');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as HashLiteralNode;
        assert.strictEqual(stmt.type, 'HashLiteral');
        assert.strictEqual(stmt.pairs.length, 0);
    });

    test('parses hash literal in variable declaration', async () => {
        const stmts = await parse('my $href = +{ "name" => "Alice", "age" => 30 };');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.type, 'Declaration');
        assert.strictEqual(stmt.variable.name, '$href');
        assert.strictEqual(stmt.initializer?.type, 'HashLiteral');
        const hashLit = stmt.initializer as HashLiteralNode;
        assert.strictEqual(hashLit.pairs.length, 2);
    });

    test('parses nested hash literals', async () => {
        const stmts = await parse('+{ "outer" => +{ "inner" => 42 } };');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as HashLiteralNode;
        assert.strictEqual(stmt.type, 'HashLiteral');
        assert.strictEqual(stmt.pairs.length, 1);
        assert.strictEqual(stmt.pairs[0].key.type, 'String');
        assert.strictEqual(stmt.pairs[0].value.type, 'HashLiteral');
        const nested = stmt.pairs[0].value as HashLiteralNode;
        assert.strictEqual(nested.pairs.length, 1);
        assert.strictEqual((nested.pairs[0].value as NumberNode).value, '42');
    });

    test('parses hash literal with expression values', async () => {
        const stmts = await parse('+{ "sum" => 1 + 2, "product" => 3 * 4 };');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as HashLiteralNode;
        assert.strictEqual(stmt.type, 'HashLiteral');
        assert.strictEqual(stmt.pairs.length, 2);
        assert.strictEqual(stmt.pairs[0].value.type, 'BinaryOp');
        assert.strictEqual(stmt.pairs[1].value.type, 'BinaryOp');
    });

    // List Literal Tests
    test('parses list literal with comma', async () => {
        const stmts = await parse('(1, 2, 3);');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as ListNode;
        assert.strictEqual(stmt.type, 'List');
        assert.strictEqual(stmt.elements.length, 3);
        assert.strictEqual((stmt.elements[0] as NumberNode).value, '1');
        assert.strictEqual((stmt.elements[1] as NumberNode).value, '2');
        assert.strictEqual((stmt.elements[2] as NumberNode).value, '3');
    });

    test('parses list in array variable declaration', async () => {
        const stmts = await parse('my @array = (1, 2, 3);');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.type, 'Declaration');
        assert.strictEqual(stmt.variable.name, '@array');
        assert.strictEqual(stmt.initializer?.type, 'List');
        const list = stmt.initializer as ListNode;
        assert.strictEqual(list.elements.length, 3);
    });

    test('disambiguates list from parenthesized expression', async () => {
        const stmts = await parse('(1 + 2);');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as BinaryOpNode;
        assert.strictEqual(stmt.type, 'BinaryOp');
        assert.strictEqual(stmt.operator, '+');
    });

    // Mixed/Nested Data Structure Tests
    test('parses array containing hash literal', async () => {
        const stmts = await parse('[1, +{ "key" => "value" }, 3];');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as ArrayLiteralNode;
        assert.strictEqual(stmt.type, 'ArrayLiteral');
        assert.strictEqual(stmt.elements.length, 3);
        assert.strictEqual(stmt.elements[0].type, 'Number');
        assert.strictEqual(stmt.elements[1].type, 'HashLiteral');
        assert.strictEqual(stmt.elements[2].type, 'Number');
    });

    test('parses hash containing array literal', async () => {
        const stmts = await parse('+{ "numbers" => [1, 2, 3] };');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as HashLiteralNode;
        assert.strictEqual(stmt.type, 'HashLiteral');
        assert.strictEqual(stmt.pairs.length, 1);
        assert.strictEqual(stmt.pairs[0].value.type, 'ArrayLiteral');
        const arrayVal = stmt.pairs[0].value as ArrayLiteralNode;
        assert.strictEqual(arrayVal.elements.length, 3);
    });

    test('parses complex nested data structure', async () => {
        const stmts = await parse('my $data = [1, +{ "nested" => [2, 3] }, 4];');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.type, 'Declaration');
        const arrayLit = stmt.initializer as ArrayLiteralNode;
        assert.strictEqual(arrayLit.type, 'ArrayLiteral');
        assert.strictEqual(arrayLit.elements.length, 3);
        assert.strictEqual(arrayLit.elements[1].type, 'HashLiteral');
        const hashLit = arrayLit.elements[1] as HashLiteralNode;
        assert.strictEqual(hashLit.pairs[0].value.type, 'ArrayLiteral');
    });

    // Array Access Tests
    test('parses simple array element access', async () => {
        const stmts = await parse('$array[0];');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as ArrayAccessNode;
        assert.strictEqual(stmt.type, 'ArrayAccess');
        assert.strictEqual(stmt.base.type, 'Variable');
        assert.strictEqual((stmt.base as VariableNode).name, '$array');
        assert.strictEqual(stmt.index.type, 'Number');
        assert.strictEqual((stmt.index as NumberNode).value, '0');
    });

    test('parses array access with expression index', async () => {
        const stmts = await parse('$array[$i + 1];');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as ArrayAccessNode;
        assert.strictEqual(stmt.type, 'ArrayAccess');
        assert.strictEqual(stmt.index.type, 'BinaryOp');
    });

    test('parses array access in assignment', async () => {
        const stmts = await parse('my $x = $array[5];');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.initializer?.type, 'ArrayAccess');
        const access = stmt.initializer as ArrayAccessNode;
        assert.strictEqual((access.base as VariableNode).name, '$array');
        assert.strictEqual((access.index as NumberNode).value, '5');
    });

    test('parses array reference dereference', async () => {
        const stmts = await parse('$aref->[0];');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as ArrayAccessNode;
        assert.strictEqual(stmt.type, 'ArrayAccess');
        assert.strictEqual(stmt.base.type, 'Variable');
        assert.strictEqual((stmt.base as VariableNode).name, '$aref');
        assert.strictEqual(stmt.index.type, 'Number');
    });

    test('parses array dereference with expression base', async () => {
        const stmts = await parse('get_array()->[0];');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as ArrayAccessNode;
        assert.strictEqual(stmt.type, 'ArrayAccess');
        assert.strictEqual(stmt.base.type, 'Call');
    });

    // Array Slice Tests
    test('parses array slice with range', async () => {
        const stmts = await parse('@array[0..4];');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as ArraySliceNode;
        assert.strictEqual(stmt.type, 'ArraySlice');
        assert.strictEqual(stmt.base.type, 'Variable');
        assert.strictEqual((stmt.base as VariableNode).name, '@array');
        assert.strictEqual(stmt.indices.type, 'BinaryOp');
        assert.strictEqual((stmt.indices as BinaryOpNode).operator, '..');
        assert.strictEqual(((stmt.indices as BinaryOpNode).left as NumberNode).value, '0');
        assert.strictEqual(((stmt.indices as BinaryOpNode).right as NumberNode).value, '4');
    });

    test('parses array slice with list of indices', async () => {
        const stmts = await parse('@array[0, 2, 4];');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as ArraySliceNode;
        assert.strictEqual(stmt.type, 'ArraySlice');
        assert.strictEqual(stmt.base.type, 'Variable');
        assert.strictEqual((stmt.base as VariableNode).name, '@array');
        assert.strictEqual(stmt.indices.type, 'List');
        const indicesList = stmt.indices as ListNode;
        assert.strictEqual(indicesList.elements.length, 3);
        assert.strictEqual((indicesList.elements[0] as NumberNode).value, '0');
        assert.strictEqual((indicesList.elements[1] as NumberNode).value, '2');
        assert.strictEqual((indicesList.elements[2] as NumberNode).value, '4');
    });

    test('parses array slice with variable range', async () => {
        const stmts = await parse('@items[$start..$end];');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as ArraySliceNode;
        assert.strictEqual(stmt.type, 'ArraySlice');
        assert.strictEqual(stmt.indices.type, 'BinaryOp');
        assert.strictEqual((stmt.indices as BinaryOpNode).operator, '..');
    });

    test('parses array slice in assignment', async () => {
        const stmts = await parse('my @subset = @data[0..9];');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.type, 'Declaration');
        assert.strictEqual(stmt.variable.name, '@subset');
        assert.strictEqual(stmt.initializer?.type, 'ArraySlice');
        const slice = stmt.initializer as ArraySliceNode;
        assert.strictEqual((slice.base as VariableNode).name, '@data');
    });

    // Hash Access Tests
    test('parses simple hash value access', async () => {
        const stmts = await parse('$hash{"key"};');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as HashAccessNode;
        assert.strictEqual(stmt.type, 'HashAccess');
        assert.strictEqual(stmt.base.type, 'Variable');
        assert.strictEqual((stmt.base as VariableNode).name, '$hash');
        assert.strictEqual(stmt.key.type, 'String');
        assert.strictEqual((stmt.key as StringNode).value, '"key"');
    });

    test('parses hash access with variable key', async () => {
        const stmts = await parse('$hash{$key};');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as HashAccessNode;
        assert.strictEqual(stmt.type, 'HashAccess');
        assert.strictEqual(stmt.key.type, 'Variable');
    });

    test('parses hash access in assignment', async () => {
        const stmts = await parse('my $value = $hash{"name"};');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.initializer?.type, 'HashAccess');
        const access = stmt.initializer as HashAccessNode;
        assert.strictEqual((access.base as VariableNode).name, '$hash');
        assert.strictEqual((access.key as StringNode).value, '"name"');
    });

    test('parses hash reference dereference', async () => {
        const stmts = await parse('$href->{"key"};');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as HashAccessNode;
        assert.strictEqual(stmt.type, 'HashAccess');
        assert.strictEqual(stmt.base.type, 'Variable');
        assert.strictEqual((stmt.base as VariableNode).name, '$href');
        assert.strictEqual(stmt.key.type, 'String');
    });

    test('parses hash dereference with expression base', async () => {
        const stmts = await parse('get_hash()->{"key"};');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as HashAccessNode;
        assert.strictEqual(stmt.type, 'HashAccess');
        assert.strictEqual(stmt.base.type, 'Call');
    });

    // Bareword Hash Key Tests
    test('parses bareword hash key', async () => {
        const stmts = await parse('$hash{key};');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as HashAccessNode;
        assert.strictEqual(stmt.type, 'HashAccess');
        assert.strictEqual(stmt.base.type, 'Variable');
        assert.strictEqual((stmt.base as VariableNode).name, '$hash');
        assert.strictEqual(stmt.key.type, 'String');
        assert.strictEqual((stmt.key as StringNode).value, 'key');
    });

    test('parses bareword hash key in assignment', async () => {
        const stmts = await parse('my $value = $hash{name};');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.initializer?.type, 'HashAccess');
        const access = stmt.initializer as HashAccessNode;
        assert.strictEqual((access.base as VariableNode).name, '$hash');
        assert.strictEqual(access.key.type, 'String');
        assert.strictEqual((access.key as StringNode).value, 'name');
    });

    test('parses bareword key with hash reference dereference', async () => {
        const stmts = await parse('$href->{key};');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as HashAccessNode;
        assert.strictEqual(stmt.type, 'HashAccess');
        assert.strictEqual(stmt.base.type, 'Variable');
        assert.strictEqual((stmt.base as VariableNode).name, '$href');
        assert.strictEqual(stmt.key.type, 'String');
        assert.strictEqual((stmt.key as StringNode).value, 'key');
    });

    test('parses mixed quoted and bareword keys in chain', async () => {
        const stmts = await parse('$hash{foo}{"bar"}{baz};');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as HashAccessNode;
        assert.strictEqual(stmt.type, 'HashAccess');
        assert.strictEqual(stmt.key.type, 'String');
        assert.strictEqual((stmt.key as StringNode).value, 'baz');

        const middle = stmt.base as HashAccessNode;
        assert.strictEqual(middle.type, 'HashAccess');
        assert.strictEqual((middle.key as StringNode).value, '"bar"');

        const base = middle.base as HashAccessNode;
        assert.strictEqual(base.type, 'HashAccess');
        assert.strictEqual((base.key as StringNode).value, 'foo');
    });

    // Hash Slice Tests
    test('parses hash slice with list of keys', async () => {
        const stmts = await parse('@hash{"a", "b", "c"};');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as HashSliceNode;
        assert.strictEqual(stmt.type, 'HashSlice');
        assert.strictEqual(stmt.base.type, 'Variable');
        assert.strictEqual((stmt.base as VariableNode).name, '@hash');
        assert.strictEqual(stmt.keys.type, 'List');
        const keysList = stmt.keys as ListNode;
        assert.strictEqual(keysList.elements.length, 3);
        assert.strictEqual((keysList.elements[0] as StringNode).value, '"a"');
        assert.strictEqual((keysList.elements[1] as StringNode).value, '"b"');
        assert.strictEqual((keysList.elements[2] as StringNode).value, '"c"');
    });

    test('parses hash slice with bareword keys', async () => {
        const stmts = await parse('@hash{foo, bar, baz};');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as HashSliceNode;
        assert.strictEqual(stmt.type, 'HashSlice');
        assert.strictEqual(stmt.base.type, 'Variable');
        assert.strictEqual((stmt.base as VariableNode).name, '@hash');
        assert.strictEqual(stmt.keys.type, 'List');
        const keysList = stmt.keys as ListNode;
        assert.strictEqual(keysList.elements.length, 3);
        assert.strictEqual((keysList.elements[0] as StringNode).value, 'foo');
        assert.strictEqual((keysList.elements[1] as StringNode).value, 'bar');
        assert.strictEqual((keysList.elements[2] as StringNode).value, 'baz');
    });

    test('parses hash slice with array variable', async () => {
        const stmts = await parse('@hash{@keys};');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as HashSliceNode;
        assert.strictEqual(stmt.type, 'HashSlice');
        assert.strictEqual(stmt.base.type, 'Variable');
        assert.strictEqual((stmt.base as VariableNode).name, '@hash');
        assert.strictEqual(stmt.keys.type, 'Variable');
        assert.strictEqual((stmt.keys as VariableNode).name, '@keys');
    });

    test('parses hash slice in assignment', async () => {
        const stmts = await parse('my @values = @config{"host", "port"};');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.type, 'Declaration');
        assert.strictEqual(stmt.variable.name, '@values');
        assert.strictEqual(stmt.initializer?.type, 'HashSlice');
        const slice = stmt.initializer as HashSliceNode;
        assert.strictEqual((slice.base as VariableNode).name, '@config');
        assert.strictEqual(slice.keys.type, 'List');
    });

    // Chained Access Tests
    test('parses chained array then hash access', async () => {
        const stmts = await parse('$data->[0]{"key"};');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as HashAccessNode;
        assert.strictEqual(stmt.type, 'HashAccess');
        assert.strictEqual(stmt.base.type, 'ArrayAccess');
        const arrayAccess = stmt.base as ArrayAccessNode;
        assert.strictEqual(arrayAccess.base.type, 'Variable');
        assert.strictEqual((arrayAccess.base as VariableNode).name, '$data');
    });

    test('parses chained hash then array access', async () => {
        const stmts = await parse('$data->{"key"}[0];');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as ArrayAccessNode;
        assert.strictEqual(stmt.type, 'ArrayAccess');
        assert.strictEqual(stmt.base.type, 'HashAccess');
        const hashAccess = stmt.base as HashAccessNode;
        assert.strictEqual(hashAccess.base.type, 'Variable');
    });

    test('parses deeply chained access', async () => {
        const stmts = await parse('$data->[0]{"users"}[1]{"name"};');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as HashAccessNode;
        assert.strictEqual(stmt.type, 'HashAccess');
        assert.strictEqual(stmt.key.type, 'String');

        // Should be nested: HashAccess -> ArrayAccess -> HashAccess -> ArrayAccess -> Variable
        assert.strictEqual(stmt.base.type, 'ArrayAccess');
        const arr1 = stmt.base as ArrayAccessNode;
        assert.strictEqual(arr1.base.type, 'HashAccess');
        const hash1 = arr1.base as HashAccessNode;
        assert.strictEqual(hash1.base.type, 'ArrayAccess');
    });

    test('parses array access in expression', async () => {
        const stmts = await parse('my $sum = $array[0] + $array[1];');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.initializer?.type, 'BinaryOp');
        const binop = stmt.initializer as BinaryOpNode;
        assert.strictEqual(binop.left.type, 'ArrayAccess');
        assert.strictEqual(binop.right.type, 'ArrayAccess');
    });

    test('parses hash access in expression', async () => {
        const stmts = await parse('my $full = $person{"first"} . $person{"last"};');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.initializer?.type, 'BinaryOp');
        const binop = stmt.initializer as BinaryOpNode;
        assert.strictEqual(binop.left.type, 'HashAccess');
        assert.strictEqual(binop.right.type, 'HashAccess');
    });

    // Unary Operator Tests
    test('parses unary minus with literal', async () => {
        const stmts = await parse('-5;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'UnaryOp');
    });

    test('parses unary minus with variable', async () => {
        const stmts = await parse('-$x;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'UnaryOp');
    });

    test('parses unary minus with parenthesized expression', async () => {
        const stmts = await parse('-($a + $b);');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'UnaryOp');
    });

    test('parses unary plus', async () => {
        const stmts = await parse('+10;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'UnaryOp');
    });

    test('parses logical not with variable', async () => {
        const stmts = await parse('!$flag;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'UnaryOp');
    });

    test('parses logical not with expression', async () => {
        const stmts = await parse('!($x > 5);');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'UnaryOp');
    });

    test('parses unary minus in expression', async () => {
        const stmts = await parse('my $result = -$x + 10;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.type, 'Declaration');
        assert.strictEqual(stmt.initializer?.type, 'BinaryOp');
        const binop = stmt.initializer as BinaryOpNode;
        assert.strictEqual(binop.operator, '+');
        assert.strictEqual(binop.left.type, 'UnaryOp');
    });

    test('parses double negation', async () => {
        const stmts = await parse('!!$value;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'UnaryOp');
    });

    test('parses multiple unary operators', async () => {
        const stmts = await parse('-+$x;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'UnaryOp');
    });

    test('parses unary not in boolean expression', async () => {
        const stmts = await parse('my $result = !$valid && $ready;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.type, 'Declaration');
        assert.strictEqual(stmt.initializer?.type, 'BinaryOp');
        const binop = stmt.initializer as BinaryOpNode;
        assert.strictEqual(binop.operator, '&&');
        assert.strictEqual(binop.left.type, 'UnaryOp');
    });

    test('parses unary minus with binary subtraction disambiguation', async () => {
        const stmts = await parse('my $result = 10 - -5;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.initializer?.type, 'BinaryOp');
        const binop = stmt.initializer as BinaryOpNode;
        assert.strictEqual(binop.operator, '-');
        assert.strictEqual(binop.right.type, 'UnaryOp');
    });

    test('parses negative number in variable declaration', async () => {
        const stmts = await parse('my $negative = -5;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.type, 'Declaration');
        assert.strictEqual(stmt.initializer?.type, 'UnaryOp');
    });

    test('parses unary operators preserve precedence with multiplication', async () => {
        const stmts = await parse('my $result = -$x * 2;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.initializer?.type, 'BinaryOp');
        const binop = stmt.initializer as BinaryOpNode;
        assert.strictEqual(binop.operator, '*');
        assert.strictEqual(binop.left.type, 'UnaryOp');
    });

    test('ensures hash literal still works with +{ }', async () => {
        const stmts = await parse('my $hash = +{ "key" => "value" };');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.type, 'Declaration');
        assert.strictEqual(stmt.initializer?.type, 'HashLiteral');
    });

    // Ternary Operator Tests
    test('parses simple ternary operator', async () => {
        const stmts = await parse('my $result = $x > 5 ? 10 : 20;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.type, 'Declaration');
        assert.strictEqual(stmt.initializer?.type, 'Ternary');
        const ternary = stmt.initializer as TernaryNode;
        assert.strictEqual(ternary.condition.type, 'BinaryOp');
        assert.strictEqual(ternary.trueExpr.type, 'Number');
        assert.strictEqual(ternary.falseExpr.type, 'Number');
    });

    test('parses ternary with variable expressions', async () => {
        const stmts = await parse('my $value = $condition ? $a : $b;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.initializer?.type, 'Ternary');
        const ternary = stmt.initializer as TernaryNode;
        assert.strictEqual(ternary.condition.type, 'Variable');
        assert.strictEqual((ternary.condition as VariableNode).name, '$condition');
        assert.strictEqual(ternary.trueExpr.type, 'Variable');
        assert.strictEqual((ternary.trueExpr as VariableNode).name, '$a');
        assert.strictEqual(ternary.falseExpr.type, 'Variable');
        assert.strictEqual((ternary.falseExpr as VariableNode).name, '$b');
    });

    test('parses ternary with complex expressions', async () => {
        const stmts = await parse('my $result = $x > 10 ? $x * 2 : $x + 1;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.initializer?.type, 'Ternary');
        const ternary = stmt.initializer as TernaryNode;
        assert.strictEqual(ternary.trueExpr.type, 'BinaryOp');
        assert.strictEqual((ternary.trueExpr as BinaryOpNode).operator, '*');
        assert.strictEqual(ternary.falseExpr.type, 'BinaryOp');
        assert.strictEqual((ternary.falseExpr as BinaryOpNode).operator, '+');
    });

    test('parses nested ternary operators (right associative)', async () => {
        const stmts = await parse('my $value = $a ? $b : $c ? $d : $e;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.initializer?.type, 'Ternary');
        const ternary = stmt.initializer as TernaryNode;
        assert.strictEqual(ternary.condition.type, 'Variable');
        assert.strictEqual((ternary.condition as VariableNode).name, '$a');
        assert.strictEqual(ternary.trueExpr.type, 'Variable');
        assert.strictEqual((ternary.trueExpr as VariableNode).name, '$b');
        // False expression should be another ternary
        assert.strictEqual(ternary.falseExpr.type, 'Ternary');
        const nestedTernary = ternary.falseExpr as TernaryNode;
        assert.strictEqual((nestedTernary.condition as VariableNode).name, '$c');
        assert.strictEqual((nestedTernary.trueExpr as VariableNode).name, '$d');
        assert.strictEqual((nestedTernary.falseExpr as VariableNode).name, '$e');
    });

    test('parses ternary in function call', async () => {
        const stmts = await parse('print($x > 5 ? "big" : "small");');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as CallNode;
        assert.strictEqual(stmt.type, 'Call');
        assert.strictEqual(stmt.arguments.length, 1);
        assert.strictEqual(stmt.arguments[0].type, 'Ternary');
    });

    test('parses ternary with function calls', async () => {
        const stmts = await parse('my $result = $flag ? get_a() : get_b();');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.initializer?.type, 'Ternary');
        const ternary = stmt.initializer as TernaryNode;
        assert.strictEqual(ternary.trueExpr.type, 'Call');
        assert.strictEqual((ternary.trueExpr as CallNode).name, 'get_a');
        assert.strictEqual(ternary.falseExpr.type, 'Call');
        assert.strictEqual((ternary.falseExpr as CallNode).name, 'get_b');
    });

    test('parses ternary operator standalone', async () => {
        const stmts = await parse('$x ? $a : $b;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as TernaryNode;
        assert.strictEqual(stmt.type, 'Ternary');
    });

    test('parses ternary with unary operators', async () => {
        const stmts = await parse('my $result = !$flag ? -10 : +20;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as DeclarationNode;
        assert.strictEqual(stmt.initializer?.type, 'Ternary');
        const ternary = stmt.initializer as TernaryNode;
        assert.strictEqual(ternary.condition.type, 'UnaryOp');
        assert.strictEqual(ternary.trueExpr.type, 'UnaryOp');
        assert.strictEqual((ternary.trueExpr as UnaryOpNode).operator, '-');
        assert.strictEqual(ternary.falseExpr.type, 'UnaryOp');
        assert.strictEqual((ternary.falseExpr as UnaryOpNode).operator, '+');
    });

    // Method Call Tests
    test('parses simple method call with no arguments', async () => {
        const stmts = await parse('$obj->get_value();');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'MethodCall');
    });

    test('parses method call with one argument', async () => {
        const stmts = await parse('$obj->set($value);');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'MethodCall');
    });

    test('parses method call with multiple arguments', async () => {
        const stmts = await parse('$obj->calculate($a, $b, $c);');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'MethodCall');
    });

    test('parses class method call (static method)', async () => {
        const stmts = await parse('Point->new();');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'MethodCall');
    });

    test('parses class method call with arguments', async () => {
        const stmts = await parse('Math->sqrt(16);');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'MethodCall');
    });

    test('parses chained method calls', async () => {
        const stmts = await parse('$obj->method1()->method2()->method3();');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'MethodCall');
    });

    test('parses method call after array access', async () => {
        const stmts = await parse('$array->[0]->get_name();');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'MethodCall');
    });

    test('parses method call after hash access', async () => {
        const stmts = await parse('$hash{"key"}->get_value();');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'MethodCall');
    });

    test('parses mixed chain: array access, method, hash access', async () => {
        const stmts = await parse('$data->[0]->get_profile()->{"name"};');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'HashAccess');
    });

    test('parses method call in expression', async () => {
        const stmts = await parse('my $result = $obj->calculate() + 10;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'Declaration');
    });

    test('parses method call with expression arguments', async () => {
        const stmts = await parse('$obj->process($a + 1, $b * 2);');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'MethodCall');
    });

    test('parses method call in assignment', async () => {
        const stmts = await parse('my $name = $person->get_name();');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'Declaration');
    });

    test('parses method call in return statement', async () => {
        const stmts = await parse('return $obj->compute();');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'Return');
    });

    test('parses method call with nested method call in argument', async () => {
        const stmts = await parse('$outer->process($inner->get_value());');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'MethodCall');
    });

    test('parses method call on function call result', async () => {
        const stmts = await parse('get_object()->do_something();');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'MethodCall');
    });

    // Assignment to Elements Tests
    test('parses simple variable assignment', async () => {
        const stmts = await parse('$x = 42;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'Assignment');
    });

    test('parses array element assignment', async () => {
        const stmts = await parse('$array[0] = 42;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'Assignment');
    });

    test('parses array reference element assignment', async () => {
        const stmts = await parse('$aref->[1] = "hello";');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'Assignment');
    });

    test('parses hash element assignment', async () => {
        const stmts = await parse('$hash{"key"} = "value";');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'Assignment');
    });

    test('parses hash reference element assignment', async () => {
        const stmts = await parse('$href->{"name"} = "Alice";');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'Assignment');
    });

    test('parses chained access assignment', async () => {
        const stmts = await parse('$data->[0]{"key"} = 100;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'Assignment');
    });

    test('parses assignment with expression on right side', async () => {
        const stmts = await parse('$array[$i] = $x + $y;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'Assignment');
    });

    test('parses compound assignment +=', async () => {
        const stmts = await parse('$count += 1;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'Assignment');
    });

    test('parses compound assignment on array element', async () => {
        const stmts = await parse('$scores[$i] += 10;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'Assignment');
    });

    test('parses string concatenation assignment', async () => {
        const stmts = await parse('$str .= " world";');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'Assignment');
    });

    test('parses assignment with function call on right', async () => {
        const stmts = await parse('$result[0] = calculate($x);');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'Assignment');
    });

    test('parses assignment with method call on right', async () => {
        const stmts = await parse('$config{"timeout"} = $obj->get_timeout();');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0];
        assert.strictEqual(stmt.type, 'Assignment');
    });

    // List Assignment Tests
    test('parses simple list assignment', async () => {
        const stmts = await parse('($x, $y) = (1, 2);');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as AssignmentNode;
        assert.strictEqual(stmt.type, 'Assignment');
        assert.strictEqual(stmt.operator, '=');
        assert.strictEqual(stmt.left.type, 'List');
        const leftList = stmt.left as ListNode;
        assert.strictEqual(leftList.elements.length, 2);
        assert.strictEqual(leftList.elements[0].type, 'Variable');
        assert.strictEqual((leftList.elements[0] as VariableNode).name, '$x');
        assert.strictEqual(leftList.elements[1].type, 'Variable');
        assert.strictEqual((leftList.elements[1] as VariableNode).name, '$y');

        assert.strictEqual(stmt.right.type, 'List');
        const rightList = stmt.right as ListNode;
        assert.strictEqual(rightList.elements.length, 2);
        assert.strictEqual(rightList.elements[0].type, 'Number');
        assert.strictEqual((rightList.elements[0] as NumberNode).value, '1');
        assert.strictEqual(rightList.elements[1].type, 'Number');
        assert.strictEqual((rightList.elements[1] as NumberNode).value, '2');
    });

    test('parses list assignment from array variable', async () => {
        const stmts = await parse('($first, $second) = @array;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as AssignmentNode;
        assert.strictEqual(stmt.type, 'Assignment');
        assert.strictEqual(stmt.left.type, 'List');
        const leftList = stmt.left as ListNode;
        assert.strictEqual(leftList.elements.length, 2);

        assert.strictEqual(stmt.right.type, 'Variable');
        assert.strictEqual((stmt.right as VariableNode).name, '@array');
    });

    test('parses list assignment with three variables', async () => {
        const stmts = await parse('($a, $b, $c) = (10, 20, 30);');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as AssignmentNode;
        assert.strictEqual(stmt.type, 'Assignment');
        const leftList = stmt.left as ListNode;
        assert.strictEqual(leftList.elements.length, 3);
        assert.strictEqual((leftList.elements[0] as VariableNode).name, '$a');
        assert.strictEqual((leftList.elements[1] as VariableNode).name, '$b');
        assert.strictEqual((leftList.elements[2] as VariableNode).name, '$c');
    });

    test('parses list assignment with mixed variable types', async () => {
        const stmts = await parse('($scalar, @array, %hash) = (1, 2, 3);');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as AssignmentNode;
        assert.strictEqual(stmt.type, 'Assignment');
        const leftList = stmt.left as ListNode;
        assert.strictEqual(leftList.elements.length, 3);
        assert.strictEqual((leftList.elements[0] as VariableNode).name, '$scalar');
        assert.strictEqual((leftList.elements[1] as VariableNode).name, '@array');
        assert.strictEqual((leftList.elements[2] as VariableNode).name, '%hash');
    });

    // Special variables tests
    test('parses $ENV{key} hash element access', async () => {
        const stmts = await parse('$ENV{PATH};');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as HashAccessNode;
        assert.strictEqual(stmt.type, 'HashAccess');
        assert.strictEqual(stmt.base.type, 'Variable');
        assert.strictEqual((stmt.base as VariableNode).name, '$ENV');
        assert.strictEqual(stmt.key.type, 'String');
    });

    test('parses $ARGV[index] array element access', async () => {
        const stmts = await parse('my $first = $ARGV[0];');

        assert.strictEqual(stmts.length, 1);
        const decl = stmts[0] as DeclarationNode;
        assert.strictEqual(decl.type, 'Declaration');
        const access = decl.initializer as ArrayAccessNode;
        assert.strictEqual(access.type, 'ArrayAccess');
        assert.strictEqual(access.base.type, 'Variable');
        assert.strictEqual((access.base as VariableNode).name, '$ARGV');
    });

    test('parses @ARGV in foreach loop', async () => {
        const stmts = await parse('for my $arg (@ARGV) { say $arg; }');

        assert.strictEqual(stmts.length, 1);
        const foreachStmt = stmts[0] as ForeachNode;
        assert.strictEqual(foreachStmt.type, 'Foreach');
        assert.strictEqual(foreachStmt.listExpr.type, 'Variable');
        assert.strictEqual((foreachStmt.listExpr as VariableNode).name, '@ARGV');
    });

    test('parses %ENV as hash variable', async () => {
        const stmts = await parse('my %copy = %ENV;');

        assert.strictEqual(stmts.length, 1);
        const decl = stmts[0] as DeclarationNode;
        assert.strictEqual(decl.type, 'Declaration');
        assert.strictEqual(decl.variable.name, '%copy');
        assert.strictEqual(decl.initializer?.type, 'Variable');
        assert.strictEqual((decl.initializer as VariableNode).name, '%ENV');
    });

    test('parses $_ default variable', async () => {
        const stmts = await parse('print $_;');

        assert.strictEqual(stmts.length, 1);
        const printStmt = stmts[0] as PrintNode;
        assert.strictEqual(printStmt.type, 'Print');
        assert.strictEqual(printStmt.arguments.length, 1);
        assert.strictEqual(printStmt.arguments[0].type, 'Variable');
        assert.strictEqual((printStmt.arguments[0] as VariableNode).name, '$_');
    });

    test('parses $_ in expression', async () => {
        const stmts = await parse('my $result = $_ + 10;');

        assert.strictEqual(stmts.length, 1);
        const decl = stmts[0] as DeclarationNode;
        assert.strictEqual(decl.type, 'Declaration');
        const binOp = decl.initializer as BinaryOpNode;
        assert.strictEqual(binOp.type, 'BinaryOp');
        assert.strictEqual(binOp.left.type, 'Variable');
        assert.strictEqual((binOp.left as VariableNode).name, '$_');
    });

    test('parses $ENV{key} assignment', async () => {
        const stmts = await parse('$ENV{DEBUG} = 1;');

        assert.strictEqual(stmts.length, 1);
        const stmt = stmts[0] as AssignmentNode;
        assert.strictEqual(stmt.type, 'Assignment');
        const hashAccess = stmt.left as HashAccessNode;
        assert.strictEqual(hashAccess.type, 'HashAccess');
        assert.strictEqual((hashAccess.base as VariableNode).name, '$ENV');
    });

    // qw// quote-word operator tests
    test('parses qw() with parentheses', async () => {
        const stmts = await parse('my @words = qw(foo bar baz);');

        assert.strictEqual(stmts.length, 1);
        const decl = stmts[0] as DeclarationNode;
        assert.strictEqual(decl.type, 'Declaration');
        const list = decl.initializer as ListNode;
        assert.strictEqual(list.type, 'List');
        assert.strictEqual(list.elements.length, 3);
        assert.strictEqual((list.elements[0] as StringNode).value, 'foo');
        assert.strictEqual((list.elements[1] as StringNode).value, 'bar');
        assert.strictEqual((list.elements[2] as StringNode).value, 'baz');
    });

    test('parses qw/ / with slashes', async () => {
        const stmts = await parse('my @list = qw/one two three/;');

        assert.strictEqual(stmts.length, 1);
        const decl = stmts[0] as DeclarationNode;
        const list = decl.initializer as ListNode;
        assert.strictEqual(list.type, 'List');
        assert.strictEqual(list.elements.length, 3);
        assert.strictEqual((list.elements[0] as StringNode).value, 'one');
        assert.strictEqual((list.elements[1] as StringNode).value, 'two');
        assert.strictEqual((list.elements[2] as StringNode).value, 'three');
    });

    test('parses qw[] with square brackets', async () => {
        const stmts = await parse('qw[alpha beta gamma];');

        assert.strictEqual(stmts.length, 1);
        const list = stmts[0] as ListNode;
        assert.strictEqual(list.type, 'List');
        assert.strictEqual(list.elements.length, 3);
    });

    test('parses qw{} with curly braces', async () => {
        const stmts = await parse('my @nums = qw{1 2 3};');

        assert.strictEqual(stmts.length, 1);
        const decl = stmts[0] as DeclarationNode;
        const list = decl.initializer as ListNode;
        assert.strictEqual(list.elements.length, 3);
        assert.strictEqual((list.elements[0] as StringNode).value, '1');
    });

    test('parses qw() with multiple spaces', async () => {
        const stmts = await parse('qw(a    b     c);');

        assert.strictEqual(stmts.length, 1);
        const list = stmts[0] as ListNode;
        assert.strictEqual(list.elements.length, 3);
        assert.strictEqual((list.elements[0] as StringNode).value, 'a');
        assert.strictEqual((list.elements[1] as StringNode).value, 'b');
        assert.strictEqual((list.elements[2] as StringNode).value, 'c');
    });

    test('parses qw() in function call', async () => {
        const stmts = await parse('process(qw(foo bar));');

        assert.strictEqual(stmts.length, 1);
        const call = stmts[0] as CallNode;
        assert.strictEqual(call.type, 'Call');
        assert.strictEqual(call.name, 'process');
        assert.strictEqual(call.arguments.length, 1);
        const list = call.arguments[0] as ListNode;
        assert.strictEqual(list.type, 'List');
        assert.strictEqual(list.elements.length, 2);
    });
});
