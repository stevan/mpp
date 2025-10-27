#!/usr/bin/env node

import { readFileSync, readdirSync, writeFileSync, statSync, mkdirSync } from 'fs';
import { join, relative, dirname } from 'path';
import { Tokenizer } from '../js/src/Tokenizer.js';
import { Lexer } from '../js/src/Lexer.js';
import { Parser } from '../js/src/Parser.js';

// Parse source code into AST
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

// Recursively find all .mpp files
function findMppFiles(dir, baseDir = dir) {
    const files = [];

    try {
        const entries = readdirSync(dir);

        for (const entry of entries) {
            const fullPath = join(dir, entry);
            const stat = statSync(fullPath);

            if (stat.isDirectory()) {
                files.push(...findMppFiles(fullPath, baseDir));
            } else if (entry.endsWith('.mpp')) {
                files.push(relative(baseDir, fullPath));
            }
        }
    } catch (err) {
        return [];
    }

    return files.sort();
}

async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log('Usage: update-snapshots [options]');
        console.log('');
        console.log('Updates corpus snapshot files by parsing all .mpp files in corpus/input');
        console.log('and writing the AST JSON to corpus/expected.');
        console.log('');
        console.log('Options:');
        console.log('  -h, --help     Show this help message');
        console.log('');
        console.log('Examples:');
        console.log('  update-snapshots');
        process.exit(0);
    }

    const CORPUS_INPUT = 'corpus/input';
    const CORPUS_EXPECTED = 'corpus/expected';

    console.log('Finding .mpp files in corpus/input...');
    const inputFiles = findMppFiles(CORPUS_INPUT);

    if (inputFiles.length === 0) {
        console.log('No .mpp files found in corpus/input');
        process.exit(0);
    }

    console.log(`Found ${inputFiles.length} file(s)\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const inputFile of inputFiles) {
        const testName = inputFile.replace('.mpp', '').replace(/\\/g, '/');
        const inputPath = join(CORPUS_INPUT, inputFile);
        const expectedPath = join(CORPUS_EXPECTED, `${testName}.json`);

        try {
            // Read input file
            const source = readFileSync(inputPath, 'utf-8');

            // Parse it
            const ast = await parseSource(source);

            // Convert to formatted JSON
            const jsonOutput = JSON.stringify(ast, null, 2);

            // Ensure directory exists
            const dir = dirname(expectedPath);
            mkdirSync(dir, { recursive: true });

            // Write JSON file
            writeFileSync(expectedPath, jsonOutput, 'utf-8');

            console.log(`✓ ${expectedPath}`);
            successCount++;
        } catch (error) {
            console.error(`✗ ${inputPath}`);
            console.error(`  Error: ${error.message}`);
            errorCount++;
        }
    }

    console.log('');
    console.log(`Updated ${successCount} snapshot(s)`);
    if (errorCount > 0) {
        console.log(`Failed to update ${errorCount} snapshot(s)`);
        process.exit(1);
    }
}

main();
