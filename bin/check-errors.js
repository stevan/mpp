#!/usr/bin/env node

/**
 * Tool to detect Error nodes in corpus files
 *
 * Usage:
 *   node bin/check-errors.js           # List all files with errors
 *   node bin/check-errors.js --detail  # Show detailed error information
 *   node bin/check-errors.js --verbose # Show progress while checking
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Tokenizer } from '../js/src/Tokenizer.js';
import { Lexer } from '../js/src/Lexer.js';
import { Parser } from '../js/src/Parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const showDetail = args.includes('--detail');
const verbose = args.includes('--verbose');

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

function hasErrorNode(node) {
    if (!node) return false;
    if (node.type === 'Error') return true;

    // Check all properties recursively
    for (const key in node) {
        if (key === 'type') continue;
        const value = node[key];
        if (Array.isArray(value)) {
            if (value.some(hasErrorNode)) return true;
        } else if (typeof value === 'object' && value !== null) {
            if (hasErrorNode(value)) return true;
        }
    }
    return false;
}

function findErrorNodes(node, path = '') {
    const errors = [];

    if (!node) return errors;
    if (node.type === 'Error') {
        errors.push({
            path: path || 'root',
            error: node
        });
    }

    // Check all properties recursively
    for (const key in node) {
        if (key === 'type') continue;
        const value = node[key];
        const newPath = path ? `${path}.${key}` : key;

        if (Array.isArray(value)) {
            value.forEach((item, i) => {
                if (typeof item === 'object' && item !== null) {
                    errors.push(...findErrorNodes(item, `${newPath}[${i}]`));
                }
            });
        } else if (typeof value === 'object' && value !== null) {
            errors.push(...findErrorNodes(value, newPath));
        }
    }
    return errors;
}

async function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const results = {
        file: filePath,
        errors: [],
        hasErrors: false
    };

    try {
        const ast = await parseSource(content);

        // Find all error nodes in the AST
        for (const statement of ast) {
            const errors = findErrorNodes(statement);
            if (errors.length > 0) {
                results.hasErrors = true;
                results.errors.push(...errors);
            }
        }
    } catch (e) {
        // Parse error - entire file failed to parse
        results.hasErrors = true;
        results.errors.push({
            path: 'parse',
            error: {
                message: e.message
            }
        });
    }

    return results;
}

async function findCorpusFiles() {
    const corpusDir = path.join(__dirname, '..', 'corpus', 'input');
    const files = [];

    function walkDir(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walkDir(fullPath);
            } else if (entry.name.endsWith('.mpp')) {
                files.push(fullPath);
            }
        }
    }

    walkDir(corpusDir);
    return files.sort();
}


async function main() {
    console.log('Checking corpus files for Error nodes...\n');

    const files = await findCorpusFiles();
    const filesWithErrors = [];
    let totalErrorNodes = 0;

    for (const file of files) {
        if (verbose) {
            process.stdout.write(`Checking ${path.basename(file)}...`);
        }

        const results = await checkFile(file);

        if (results.hasErrors) {
            filesWithErrors.push(results);
            totalErrorNodes += results.errors.length;

            if (verbose) {
                console.log(` ❌ ${results.errors.length} error nodes`);
            }
        } else if (verbose) {
            console.log(' ✓');
        }
    }

    // Report summary
    console.log('\n' + '='.repeat(80));
    console.log(`Summary: ${filesWithErrors.length} files with Error nodes (${totalErrorNodes} total error nodes)`);
    console.log('='.repeat(80) + '\n');

    // Show details if requested
    if (showDetail && filesWithErrors.length > 0) {
        console.log('Detailed Error Report:');
        console.log('='.repeat(80));

        for (const results of filesWithErrors) {
            const relPath = path.relative(path.join(__dirname, '..'), results.file);
            console.log(`\n${relPath}:`);
            console.log('-'.repeat(relPath.length + 1));

            for (const err of results.errors) {
                console.log(`  ${err.path}:`);
                if (err.error.message) {
                    console.log(`    Message: ${err.error.message}`);
                }
                if (err.error.value) {
                    console.log(`    Value: ${err.error.value}`);
                }
                if (err.error.line) {
                    console.log(`    Line: ${err.error.line}, Column: ${err.error.column}`);
                }
            }
        }
    } else if (filesWithErrors.length > 0) {
        // Just list files
        console.log('Files with Error nodes:');
        for (const results of filesWithErrors) {
            const relPath = path.relative(path.join(__dirname, '..'), results.file);
            console.log(`  ${relPath} (${results.errors.length} error nodes)`);
        }
        console.log('\nRun with --detail to see specific error information');
        console.log('\nTo fix these errors, you can:');
        console.log('  1. Fix the syntax errors in the files');
        console.log('  2. Move entire files with unsupported features to corpus/missing/');
        console.log('  3. Create working versions with supported features only');
    }
}

main().catch(console.error);