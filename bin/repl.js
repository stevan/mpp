#!/usr/bin/env node

import * as readline from 'readline';
import { Tokenizer } from '../js/src/Tokenizer.js';
import { Lexer } from '../js/src/Lexer.js';
import { Parser } from '../js/src/Parser.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'mpp> '
});

console.log('MPP AST Explorer');
console.log('Type Perl code to see its AST. Type .exit or .quit to quit.');
console.log('Type .help for help.\n');

async function parseSource(source) {
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

rl.prompt();

rl.on('line', async (line) => {
    const trimmed = line.trim();

    // Handle REPL commands
    if (trimmed === '.exit' || trimmed === '.quit') {
        console.log('Goodbye!');
        process.exit(0);
    }

    if (trimmed === '.help') {
        console.log('\nCommands:');
        console.log('  .help     - Show this help');
        console.log('  .exit     - Exit the REPL');
        console.log('  .quit     - Exit the REPL');
        console.log('\nExamples:');
        console.log('  my $x = 10;');
        console.log('  $x > 5 ? "big" : "small";');
        console.log('  sub add($a, $b) { return $a + $b; }');
        console.log('  $array->[0]{"key"};');
        console.log('');
        rl.prompt();
        return;
    }

    if (trimmed === '') {
        rl.prompt();
        return;
    }

    try {
        const ast = await parseSource(trimmed);

        if (ast.length === 0) {
            console.log('(no statements parsed)');
        } else if (ast.length === 1) {
            console.log(JSON.stringify(ast[0], null, 2));
        } else {
            console.log(`(${ast.length} statements)`);
            ast.forEach((stmt, i) => {
                console.log(`\n[${i}]:`);
                console.log(JSON.stringify(stmt, null, 2));
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }

    console.log('');
    rl.prompt();
});

rl.on('close', () => {
    console.log('\nGoodbye!');
    process.exit(0);
});
