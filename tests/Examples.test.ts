import { describe, test } from 'node:test';
import assert from 'node:assert';
import { Tokenizer } from '../src/Tokenizer.js';
import { Lexer } from '../src/Lexer.js';
import { Parser } from '../src/Parser.js';
import { SubNode, ForeachNode, PackageNode, UseNode, CallNode, DeclarationNode, ClassNode, FieldNode, MethodNode } from '../src/AST.js';

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

describe('Complete Program Examples', () => {
    test('parses fibonacci function with recursive calls', async () => {
        const code = `sub fibonacci($n) {
    return 0 if $n == 0;
    return 1 if $n == 1;
    return fibonacci($n - 1) + fibonacci($n - 2);
}`;

        const stmts = await parse(code);

        assert.strictEqual(stmts.length, 1);
        const subStmt = stmts[0] as SubNode;
        assert.strictEqual(subStmt.type, 'Sub');
        assert.strictEqual(subStmt.name, 'fibonacci');
        assert.strictEqual(subStmt.parameters.length, 1);
        assert.strictEqual(subStmt.parameters[0].variable.name, '$n');
        assert.strictEqual(subStmt.body.length, 3);
    });

    test('parses complete fibonacci program with function and loop', async () => {
        const code = `sub fibonacci($n) {
    return 0 if $n == 0;
    return 1 if $n == 1;
    return fibonacci($n - 1) + fibonacci($n - 2);
}

for my $i (1..10) {
    print(fibonacci($i));
}`;

        const stmts = await parse(code);

        assert.strictEqual(stmts.length, 2);

        // Check fibonacci function
        const subStmt = stmts[0] as SubNode;
        assert.strictEqual(subStmt.type, 'Sub');
        assert.strictEqual(subStmt.name, 'fibonacci');
        assert.strictEqual(subStmt.parameters.length, 1);
        assert.strictEqual(subStmt.body.length, 3);

        // Check for loop
        const forStmt = stmts[1] as ForeachNode;
        assert.strictEqual(forStmt.type, 'Foreach');
        assert.strictEqual(forStmt.variable.name, '$i');
        assert.strictEqual(forStmt.declarator, 'my');
        assert.strictEqual(forStmt.block.length, 1);
    });

    test('parses factorial function with default parameter', async () => {
        const code = `sub factorial($n, $acc = 1) {
    return $acc if $n <= 1;
    return factorial($n - 1, $n * $acc);
}`;

        const stmts = await parse(code);

        assert.strictEqual(stmts.length, 1);
        const subStmt = stmts[0] as SubNode;
        assert.strictEqual(subStmt.type, 'Sub');
        assert.strictEqual(subStmt.name, 'factorial');
        assert.strictEqual(subStmt.parameters.length, 2);
        assert.strictEqual(subStmt.parameters[0].variable.name, '$n');
        assert.strictEqual(subStmt.parameters[0].defaultValue, undefined);
        assert.strictEqual(subStmt.parameters[1].variable.name, '$acc');
        assert.strictEqual(subStmt.parameters[1].defaultValue?.type, 'Number');
        assert.strictEqual(subStmt.body.length, 2);
    });

    test('parses multiple function definitions', async () => {
        const code = `sub add($x, $y) {
    return $x + $y;
}

sub multiply($x, $y) {
    return $x * $y;
}

sub calculate($a, $b) {
    my $sum = add($a, $b);
    my $product = multiply($a, $b);
    return $sum + $product;
}`;

        const stmts = await parse(code);

        assert.strictEqual(stmts.length, 3);
        assert.strictEqual((stmts[0] as SubNode).type, 'Sub');
        assert.strictEqual((stmts[0] as SubNode).name, 'add');
        assert.strictEqual((stmts[1] as SubNode).type, 'Sub');
        assert.strictEqual((stmts[1] as SubNode).name, 'multiply');
        assert.strictEqual((stmts[2] as SubNode).type, 'Sub');
        assert.strictEqual((stmts[2] as SubNode).name, 'calculate');
    });

    test('parses nested control flow in function', async () => {
        const code = `sub process($x) {
    if ($x > 10) {
        for my $i (1..$x) {
            my $result = calculate($i, $x);
            return $result if $result > 100;
        }
    } elsif ($x > 0) {
        return $x * 2;
    }
    return 0;
}`;

        const stmts = await parse(code);

        assert.strictEqual(stmts.length, 1);
        const subStmt = stmts[0] as SubNode;
        assert.strictEqual(subStmt.type, 'Sub');
        assert.strictEqual(subStmt.name, 'process');
        assert.strictEqual(subStmt.parameters.length, 1);
        assert.strictEqual(subStmt.body.length, 2); // if statement and return
    });

    test('parses module with package and use statements', async () => {
        const code = `package MyApp::Utils;
use strict;
use List::Util qw(max min sum);

sub calculate_stats(@numbers) {
    my $max = List::Util::max(@numbers);
    my $min = List::Util::min(@numbers);
    my $sum = List::Util::sum(@numbers);
    return { max => $max, min => $min, sum => $sum };
}`;

        const stmts = await parse(code);

        assert.strictEqual(stmts.length, 4);

        // Check package declaration
        const pkgStmt = stmts[0] as PackageNode;
        assert.strictEqual(pkgStmt.type, 'Package');
        assert.strictEqual(pkgStmt.name, 'MyApp::Utils');

        // Check use strict
        const useStrict = stmts[1] as UseNode;
        assert.strictEqual(useStrict.type, 'Use');
        assert.strictEqual(useStrict.module, 'strict');

        // Check use with imports
        const useListUtil = stmts[2] as UseNode;
        assert.strictEqual(useListUtil.type, 'Use');
        assert.strictEqual(useListUtil.module, 'List::Util');
        assert.strictEqual(useListUtil.imports?.type, 'List');

        // Check function
        const subStmt = stmts[3] as SubNode;
        assert.strictEqual(subStmt.type, 'Sub');
        assert.strictEqual(subStmt.name, 'calculate_stats');
    });

    test('parses script with environment and command-line args', async () => {
        const code = `use strict;

my $config_file = $ENV{CONFIG_FILE};
my $debug = $ENV{DEBUG};

for my $arg (@ARGV) {
    say "Processing: $arg";
    process_file($arg) if -f $arg;
}

sub process_file($filename) {
    warn "Processing $filename" if $debug;
    my $data = read_file($filename);
    return transform($data);
}`;

        const stmts = await parse(code);

        // 1 use, 2 variable declarations, 1 for loop, 1 sub = 5 statements
        assert.strictEqual(stmts.length, 5);

        // Check use statement
        assert.strictEqual(stmts[0].type, 'Use');

        // Check variable declarations accessing ENV
        const configDecl = stmts[1] as DeclarationNode;
        assert.strictEqual(configDecl.type, 'Declaration');
        const debugDecl = stmts[2] as DeclarationNode;
        assert.strictEqual(debugDecl.type, 'Declaration');

        // Check foreach loop with ARGV
        const forStmt = stmts[3] as ForeachNode;
        assert.strictEqual(forStmt.type, 'Foreach');
        assert.strictEqual(forStmt.variable.name, '$arg');

        // Check function definition
        const subStmt = stmts[4] as SubNode;
        assert.strictEqual(subStmt.type, 'Sub');
        assert.strictEqual(subStmt.name, 'process_file');
    });

    test('parses data processing pipeline with modern syntax', async () => {
        const code = `package DataPipeline;
use strict;

sub filter_and_map($data_ref, $filter_fn, $map_fn) {
    my @items = $data_ref->@*;
    my @filtered = ();

    FILTER: for my $item (@items) {
        next FILTER unless $filter_fn->($item);
        my $transformed = $map_fn->($item);
        push @filtered, $transformed;
    }

    return \\@filtered;
}

sub process_batch($items_ref) {
    my @results = ();
    for my $item ($items_ref->@*) {
        my $result = do {
            my $x = $item * 2;
            my $y = $x + 10;
            $x + $y;
        };
        push @results, $result;
    }
    return \\@results;
}`;

        const stmts = await parse(code);

        // 1 package, 1 use, 2 subs = 4 statements
        assert.strictEqual(stmts.length, 4);

        // Check package
        const pkgStmt = stmts[0] as PackageNode;
        assert.strictEqual(pkgStmt.type, 'Package');
        assert.strictEqual(pkgStmt.name, 'DataPipeline');

        // Check use
        const useStmt = stmts[1] as UseNode;
        assert.strictEqual(useStmt.type, 'Use');
        assert.strictEqual(useStmt.module, 'strict');

        // Check both functions
        const filterMap = stmts[2] as SubNode;
        assert.strictEqual(filterMap.type, 'Sub');
        assert.strictEqual(filterMap.name, 'filter_and_map');
        assert.strictEqual(filterMap.parameters.length, 3);

        const processBatch = stmts[3] as SubNode;
        assert.strictEqual(processBatch.type, 'Sub');
        assert.strictEqual(processBatch.name, 'process_batch');
        assert.strictEqual(processBatch.parameters.length, 1);
    });

    test('parses configuration module with qualified variables', async () => {
        const code = `package MyApp::Config;
use strict;

our $VERSION = "1.0.0";
our $DEBUG = $ENV{DEBUG};
our %SETTINGS = (
    host => "localhost",
    port => 8080,
    timeout => 30
);

sub get_setting($key) {
    return $MyApp::Config::SETTINGS{$key};
}

sub get_version() {
    return $MyApp::Config::VERSION;
}`;

        const stmts = await parse(code);

        // 1 package, 1 use, 3 our declarations, 2 subs = 7 statements
        assert.strictEqual(stmts.length, 7);

        // Check package
        const pkgStmt = stmts[0] as PackageNode;
        assert.strictEqual(pkgStmt.type, 'Package');
        assert.strictEqual(pkgStmt.name, 'MyApp::Config');

        // Check use
        const useStmt = stmts[1] as UseNode;
        assert.strictEqual(useStmt.type, 'Use');

        // Check our variables
        const versionDecl = stmts[2] as DeclarationNode;
        assert.strictEqual(versionDecl.type, 'Declaration');
        assert.strictEqual(versionDecl.declarator, 'our');

        // Check functions exist
        const getSetting = stmts[5] as SubNode;
        assert.strictEqual(getSetting.type, 'Sub');
        assert.strictEqual(getSetting.name, 'get_setting');

        const getVersion = stmts[6] as SubNode;
        assert.strictEqual(getVersion.type, 'Sub');
        assert.strictEqual(getVersion.name, 'get_version');
    });

    test('parses utility module with multiple imports', async () => {
        const code = `package Utils::Text;
use strict;
use warnings;
use List::Util qw(max min);
use Data::Dumper qw(Dumper);

sub trim($str) {
    $str =~ s/^\\s+//;
    $str =~ s/\\s+$//;
    return $str;
}

sub truncate($str, $length = 50) {
    return $str if length($str) <= $length;
    return substr($str, 0, $length) . "...";
}

sub word_count($text) {
    my @words = split /\\s+/, $text;
    return scalar @words;
}`;

        const stmts = await parse(code);

        // 1 package, 4 use statements, 3 subs = 8 statements
        assert.strictEqual(stmts.length, 8);

        // Verify package
        const pkgStmt = stmts[0] as PackageNode;
        assert.strictEqual(pkgStmt.type, 'Package');
        assert.strictEqual(pkgStmt.name, 'Utils::Text');

        // Verify use statements
        assert.strictEqual((stmts[1] as UseNode).type, 'Use');
        assert.strictEqual((stmts[1] as UseNode).module, 'strict');
        assert.strictEqual((stmts[2] as UseNode).type, 'Use');
        assert.strictEqual((stmts[2] as UseNode).module, 'warnings');
        assert.strictEqual((stmts[3] as UseNode).type, 'Use');
        assert.strictEqual((stmts[3] as UseNode).module, 'List::Util');
        assert.strictEqual((stmts[4] as UseNode).type, 'Use');
        assert.strictEqual((stmts[4] as UseNode).module, 'Data::Dumper');

        // Verify functions
        assert.strictEqual((stmts[5] as SubNode).name, 'trim');
        assert.strictEqual((stmts[6] as SubNode).name, 'truncate');
    });

    test('parses modern OO class with fields and methods', async () => {
        const code = `package Geometry;
use strict;

class Point {
    field $x :param;
    field $y :param;

    method move($dx, $dy) {
        $x += $dx;
        $y += $dy;
    }

    method distance_from_origin() {
        return sqrt($x * $x + $y * $y);
    }

    method coordinates() {
        return ($x, $y);
    }
}

class Circle {
    has $center :param :reader;
    has $radius :param :reader :writer;

    method area() {
        return 3.14159 * $radius * $radius;
    }

    method circumference() {
        return 2 * 3.14159 * $radius;
    }

    method contains($point) {
        my $dist = $point->distance_from_origin();
        return $dist <= $radius;
    }
}`;

        const stmts = await parse(code);

        // 1 package, 1 use, 2 classes = 4 statements
        assert.strictEqual(stmts.length, 4);

        // Check package
        const pkgStmt = stmts[0] as PackageNode;
        assert.strictEqual(pkgStmt.type, 'Package');
        assert.strictEqual(pkgStmt.name, 'Geometry');

        // Check use
        const useStmt = stmts[1] as UseNode;
        assert.strictEqual(useStmt.type, 'Use');
        assert.strictEqual(useStmt.module, 'strict');

        // Check Point class
        const pointClass = stmts[2] as ClassNode;
        assert.strictEqual(pointClass.type, 'Class');
        assert.strictEqual(pointClass.name, 'Point');
        assert.strictEqual(pointClass.body.length, 5); // 2 fields + 3 methods

        // Check Point fields
        const pointField1 = pointClass.body[0] as FieldNode;
        assert.strictEqual(pointField1.type, 'Field');
        assert.strictEqual(pointField1.variable.name, '$x');
        assert.strictEqual(pointField1.attributes?.length, 1);
        assert.strictEqual(pointField1.attributes?.[0], 'param');

        const pointField2 = pointClass.body[1] as FieldNode;
        assert.strictEqual(pointField2.type, 'Field');
        assert.strictEqual(pointField2.variable.name, '$y');

        // Check Point methods
        const moveMethod = pointClass.body[2] as MethodNode;
        assert.strictEqual(moveMethod.type, 'Method');
        assert.strictEqual(moveMethod.name, 'move');
        assert.strictEqual(moveMethod.parameters.length, 2);

        const distMethod = pointClass.body[3] as MethodNode;
        assert.strictEqual(distMethod.type, 'Method');
        assert.strictEqual(distMethod.name, 'distance_from_origin');
        assert.strictEqual(distMethod.parameters.length, 0);

        const coordsMethod = pointClass.body[4] as MethodNode;
        assert.strictEqual(coordsMethod.type, 'Method');
        assert.strictEqual(coordsMethod.name, 'coordinates');

        // Check Circle class
        const circleClass = stmts[3] as ClassNode;
        assert.strictEqual(circleClass.type, 'Class');
        assert.strictEqual(circleClass.name, 'Circle');
        assert.strictEqual(circleClass.body.length, 5); // 2 has fields + 3 methods

        // Check Circle has fields
        const centerField = circleClass.body[0] as FieldNode;
        assert.strictEqual(centerField.type, 'Field');
        assert.strictEqual(centerField.variable.name, '$center');
        assert.strictEqual(centerField.attributes?.length, 2);
        assert.strictEqual(centerField.attributes?.[0], 'param');
        assert.strictEqual(centerField.attributes?.[1], 'reader');

        const radiusField = circleClass.body[1] as FieldNode;
        assert.strictEqual(radiusField.type, 'Field');
        assert.strictEqual(radiusField.variable.name, '$radius');
        assert.strictEqual(radiusField.attributes?.length, 3);
        assert.strictEqual(radiusField.attributes?.[0], 'param');
        assert.strictEqual(radiusField.attributes?.[1], 'reader');
        assert.strictEqual(radiusField.attributes?.[2], 'writer');

        // Check Circle methods
        const areaMethod = circleClass.body[2] as MethodNode;
        assert.strictEqual(areaMethod.type, 'Method');
        assert.strictEqual(areaMethod.name, 'area');

        const circumMethod = circleClass.body[3] as MethodNode;
        assert.strictEqual(circumMethod.type, 'Method');
        assert.strictEqual(circumMethod.name, 'circumference');

        const containsMethod = circleClass.body[4] as MethodNode;
        assert.strictEqual(containsMethod.type, 'Method');
        assert.strictEqual(containsMethod.name, 'contains');
        assert.strictEqual(containsMethod.parameters.length, 1);
    });
});
