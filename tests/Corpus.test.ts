import { describe, test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { Tokenizer } from '../src/Tokenizer.js';
import { Lexer } from '../src/Lexer.js';
import { Parser } from '../src/Parser.js';
import { ASTNode } from '../src/AST.js';

// Helper to parse source code into AST
async function parse(source: string): Promise<ASTNode[]> {
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

// Helper to deserialize JSON back to AST
function deserializeAST(json: string): ASTNode[] {
    return JSON.parse(json) as ASTNode[];
}

// Helper to deeply compare two AST structures
function compareAST(ast1: ASTNode[], ast2: ASTNode[]): boolean {
    return JSON.stringify(ast1) === JSON.stringify(ast2);
}

// Helper to perform detailed AST comparison with helpful error messages
function assertASTEqual(ast1: ASTNode[], ast2: ASTNode[], context: string = 'root'): void {
    const json1 = JSON.stringify(ast1, null, 2);
    const json2 = JSON.stringify(ast2, null, 2);

    if (json1 !== json2) {
        throw new Error(
            `AST mismatch at ${context}\n` +
            `Expected:\n${json1}\n\n` +
            `Actual:\n${json2}`
        );
    }
}

// Helper to recursively find all .mpp files
function findMppFiles(dir: string, baseDir: string = dir): string[] {
    const files: string[] = [];

    try {
        const entries = readdirSync(dir);

        for (const entry of entries) {
            const fullPath = join(dir, entry);
            const stat = statSync(fullPath);

            if (stat.isDirectory()) {
                // Recursively search subdirectories
                files.push(...findMppFiles(fullPath, baseDir));
            } else if (entry.endsWith('.mpp')) {
                // Return relative path from base directory
                files.push(relative(baseDir, fullPath));
            }
        }
    } catch (err) {
        // Directory doesn't exist
        return [];
    }

    return files.sort();
}

// Paths
const CORPUS_INPUT = 'corpus/input';
const CORPUS_EXPECTED = 'corpus/expected';

describe('Corpus Tests', () => {
    // Find all .mpp files recursively in corpus/input
    const inputFiles = findMppFiles(CORPUS_INPUT);

    if (inputFiles.length === 0) {
        test('no corpus files yet', () => {
            assert.ok(true, 'Corpus directory is empty - this is expected for initial setup');
        });
        return;
    }

    // Create a test for each corpus file
    for (const inputFile of inputFiles) {
        const testName = inputFile.replace('.mpp', '').replace(/\\/g, '/');
        const inputPath = join(CORPUS_INPUT, inputFile);
        const expectedPath = join(CORPUS_EXPECTED, `${testName}.json`);

        test(`parses ${testName}`, async () => {
            // Read input file
            const source = readFileSync(inputPath, 'utf-8');

            // Parse it
            const ast = await parse(source);

            // Convert to formatted JSON
            const actualJson = JSON.stringify(ast, null, 2);

            // Compare against expected
            let expectedJson: string;
            try {
                expectedJson = readFileSync(expectedPath, 'utf-8');
            } catch (err) {
                throw new Error(
                    `Expected file not found: ${expectedPath}\n` +
                    `Run update-snapshots to generate it:\n` +
                    `  npm run build && node bin/update-snapshots.js`
                );
            }

            // Compare
            try {
                assert.strictEqual(actualJson, expectedJson);
            } catch (err) {
                // Show a helpful diff message
                console.error(`\n❌ AST mismatch for ${testName}`);
                console.error(`   Input: ${inputPath}`);
                console.error(`   Expected: ${expectedPath}`);
                console.error(`\n   To update snapshot: npm run build && node bin/update-snapshots.js\n`);
                throw err;
            }
        });

        // Roundtrip test: Parse → Serialize → Deserialize → Compare
        test(`roundtrips ${testName}`, async () => {
            // Read input file
            const source = readFileSync(inputPath, 'utf-8');

            // Parse source to AST (first pass)
            const originalAST = await parse(source);

            // Serialize to JSON
            const jsonString = JSON.stringify(originalAST, null, 2);

            // Deserialize back to AST (second pass)
            const roundtrippedAST = deserializeAST(jsonString);

            // Compare original and roundtripped ASTs
            try {
                assertASTEqual(originalAST, roundtrippedAST, testName);
            } catch (err) {
                console.error(`\n❌ Roundtrip failed for ${testName}`);
                console.error(`   Input: ${inputPath}`);
                console.error(`   Original and roundtripped ASTs differ\n`);
                throw err;
            }

            // Additional verification: ensure roundtripped AST can be serialized again
            const reserializedJson = JSON.stringify(roundtrippedAST, null, 2);
            assert.strictEqual(
                jsonString,
                reserializedJson,
                `Reserialization of roundtripped AST should be identical for ${testName}`
            );
        });
    }
});
