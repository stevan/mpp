#!/usr/bin/env node

/**
 * Tool to find and handle Error nodes in corpus files
 *
 * Usage:
 *   node bin/check-errors.js           # List all files with errors
 *   node bin/check-errors.js --detail  # Show detailed error information
 *   node bin/check-errors.js --split   # Split error lines to corpus/missing/
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
const doSplit = args.includes('--split');
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
    const lines = content.split('\n');
    const results = {
        file: filePath,
        totalLines: lines.length,
        errorLines: [],
        cleanLines: []
    };

    // Test each line individually
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip empty lines and comments
        if (!line.trim() || line.trim().startsWith('#')) {
            results.cleanLines.push({ lineNum: i + 1, content: line });
            continue;
        }

        try {
            const ast = await parseSource(line);
            const hasError = ast.some(hasErrorNode);

            if (hasError) {
                const errors = [];
                ast.forEach(node => errors.push(...findErrorNodes(node)));
                results.errorLines.push({
                    lineNum: i + 1,
                    content: line,
                    errors: errors
                });
            } else {
                results.cleanLines.push({ lineNum: i + 1, content: line });
            }
        } catch (e) {
            // Parse error - treat as error line
            results.errorLines.push({
                lineNum: i + 1,
                content: line,
                errors: [{ path: 'parse', error: { message: e.message } }]
            });
        }
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

function splitFile(results, outputDir) {
    const relPath = path.relative(path.join(__dirname, '..', 'corpus', 'input'), results.file);
    const cleanPath = results.file;
    const errorPath = path.join(__dirname, '..', 'corpus', 'missing', relPath);

    // Ensure directory exists
    const errorDir = path.dirname(errorPath);
    if (!fs.existsSync(errorDir)) {
        fs.mkdirSync(errorDir, { recursive: true });
    }

    // Write clean lines back to original file
    const cleanContent = results.cleanLines.map(l => l.content).join('\n');
    fs.writeFileSync(cleanPath, cleanContent);

    // Write error lines to missing directory
    if (results.errorLines.length > 0) {
        const errorContent = results.errorLines.map(l => l.content).join('\n');
        fs.writeFileSync(errorPath, errorContent);
        return errorPath;
    }

    return null;
}

async function main() {
    console.log('Checking corpus files for Error nodes...\n');

    const files = await findCorpusFiles();
    const filesWithErrors = [];
    let totalErrors = 0;

    for (const file of files) {
        if (verbose) {
            process.stdout.write(`Checking ${path.basename(file)}...`);
        }

        const results = await checkFile(file);

        if (results.errorLines.length > 0) {
            filesWithErrors.push(results);
            totalErrors += results.errorLines.length;

            if (verbose) {
                console.log(` ❌ ${results.errorLines.length} errors`);
            }
        } else if (verbose) {
            console.log(' ✓');
        }
    }

    // Report summary
    console.log('\n' + '='.repeat(80));
    console.log(`Summary: ${filesWithErrors.length} files with errors (${totalErrors} total error lines)`);
    console.log('='.repeat(80) + '\n');

    // Show details if requested
    if (showDetail || doSplit) {
        for (const results of filesWithErrors) {
            const relPath = path.relative(path.join(__dirname, '..'), results.file);
            console.log(`\n${relPath}:`);
            console.log('-'.repeat(relPath.length + 1));

            for (const errorLine of results.errorLines) {
                console.log(`  Line ${errorLine.lineNum}: ${errorLine.content.trim()}`);
                if (showDetail) {
                    for (const err of errorLine.errors) {
                        console.log(`    └─ ${err.path}: ${err.error.message || 'Error node'}`);
                    }
                }
            }
        }
    } else if (filesWithErrors.length > 0) {
        // Just list files
        console.log('Files with errors:');
        for (const results of filesWithErrors) {
            const relPath = path.relative(path.join(__dirname, '..'), results.file);
            console.log(`  ${relPath} (${results.errorLines.length} error lines)`);
        }
        console.log('\nRun with --detail to see specific errors');
        console.log('Run with --split to move error lines to corpus/missing/');
    }

    // Split files if requested
    if (doSplit && filesWithErrors.length > 0) {
        console.log('\n' + '='.repeat(80));
        console.log('Splitting files...');
        console.log('='.repeat(80));

        const createdFiles = [];
        for (const results of filesWithErrors) {
            const errorPath = splitFile(results);
            if (errorPath) {
                const relPath = path.relative(path.join(__dirname, '..'), errorPath);
                createdFiles.push(relPath);
                console.log(`  Created: ${relPath}`);
            }
        }

        console.log(`\n✅ Split ${filesWithErrors.length} files`);
        console.log('   Error lines moved to corpus/missing/');
        console.log('   Clean lines remain in corpus/input/');
        console.log('\nRemember to run: node bin/update-snapshots.js');
    }
}

main().catch(console.error);