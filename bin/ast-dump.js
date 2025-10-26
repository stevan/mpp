#!/usr/bin/env node

import { readFileSync } from 'fs';
import { Tokenizer } from '../js/src/Tokenizer.js';
import { Lexer } from '../js/src/Lexer.js';
import { Parser } from '../js/src/Parser.js';
import { PrettyPrinter } from '../js/src/PrettyPrinter.js';

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

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        console.log('Usage: ast-dump <file.mpp>');
        console.log('');
        console.log('Parses an MPP source file and outputs the AST as S-expressions.');
        console.log('');
        console.log('Examples:');
        console.log('  ast-dump corpus/input/basics/001-scalar-variable.mpp');
        console.log('  ast-dump my-script.mpp');
        process.exit(args.length === 0 ? 1 : 0);
    }

    const filePath = args[0];

    try {
        // Read source file
        const source = readFileSync(filePath, 'utf-8');

        // Parse it
        const ast = await parseSource(source);

        // Print as S-expressions
        const printer = new PrettyPrinter();
        console.log(printer.print(ast));

    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`Error: File not found: ${filePath}`);
            process.exit(1);
        } else if (error.code === 'EISDIR') {
            console.error(`Error: ${filePath} is a directory, not a file`);
            process.exit(1);
        } else {
            console.error(`Error parsing ${filePath}:`);
            console.error(error.message);
            process.exit(1);
        }
    }
}

main();
