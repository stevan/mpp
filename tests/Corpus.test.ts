import { describe, test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
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

// Check if we should update snapshots
const UPDATE_SNAPSHOTS = process.env['UPDATE_SNAPSHOTS'] === 'true';

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

            if (UPDATE_SNAPSHOTS) {
                // Update mode: write the JSON file
                // Ensure directory exists
                const dir = dirname(expectedPath);
                mkdirSync(dir, { recursive: true });

                writeFileSync(expectedPath, actualJson, 'utf-8');
                console.log(`✓ Updated ${expectedPath}`);
                assert.ok(true);
            } else {
                // Test mode: compare against expected
                let expectedJson: string;
                try {
                    expectedJson = readFileSync(expectedPath, 'utf-8');
                } catch (err) {
                    throw new Error(
                        `Expected file not found: ${expectedPath}\n` +
                        `Run with UPDATE_SNAPSHOTS=true to generate it:\n` +
                        `  UPDATE_SNAPSHOTS=true npm test`
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
                    console.error(`\n   To update snapshot: UPDATE_SNAPSHOTS=true npm test\n`);
                    throw err;
                }
            }
        });
    }
});
