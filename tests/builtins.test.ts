import test from 'node:test';
import assert from 'node:assert';
import { Tokenizer } from '../src/Tokenizer.js';
import { Lexer } from '../src/Lexer.js';
import { Parser } from '../src/Parser.js';

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

test('Builtin Functions', async (t) => {
    await t.test('type checking functions', async () => {
        const code = `
            my $type = ref($obj);
            my $blessed = blessed($obj);
            my $addr = refaddr($ref);
            my $rtype = reftype($ref);
            if (defined($value)) { }
            undef($var);
            if (is_bool($flag)) { }
            weaken($ref);
        `;
        const ast = await parse(code);

        assert.strictEqual(ast.length, 8);

        // ref($obj)
        assert.strictEqual(ast[0].type, 'Declaration');
        const ref = (ast[0] as any).initializer;
        assert.strictEqual(ref.type, 'Call');
        assert.strictEqual(ref.name, 'ref');
        assert.strictEqual(ref.arguments.length, 1);

        // blessed($obj)
        assert.strictEqual(ast[1].type, 'Declaration');
        const blessed = (ast[1] as any).initializer;
        assert.strictEqual(blessed.type, 'Call');
        assert.strictEqual(blessed.name, 'blessed');
        assert.strictEqual(blessed.arguments.length, 1);

        // defined($value) in if
        const ifNode = ast[4] as any;
        assert.strictEqual(ifNode.type, 'If');
        assert.strictEqual(ifNode.condition.type, 'Call');
        assert.strictEqual(ifNode.condition.name, 'defined');

        // undef($var)
        assert.strictEqual(ast[5].type, 'Call');
        assert.strictEqual((ast[5] as any).name, 'undef');

        // is_bool($flag) in if
        const ifBool = ast[6] as any;
        assert.strictEqual(ifBool.type, 'If');
        assert.strictEqual(ifBool.condition.type, 'Call');
        assert.strictEqual(ifBool.condition.name, 'is_bool');

        // weaken($ref)
        assert.strictEqual(ast[7].type, 'Call');
        assert.strictEqual((ast[7] as any).name, 'weaken');
    });

    await t.test('string functions', async () => {
        const code = `
            my $len = length($str);
            my $sub = substr($str, 0, 5);
            my $pos = index($str, "foo");
            my $rpos = rindex($str, "bar");
            my $fmt = sprintf("%s %d", $name, $age);
            my @words = split(/\s+/, $text);
            my $joined = join(", ", @array);
            chomp($line);
            chop($str);
            my $trimmed = trim($input);
            my $lower = lc($text);
            my $upper = uc($text);
        `;
        const ast = await parse(code);

        assert.strictEqual(ast.length, 12);

        // length($str)
        const len = (ast[0] as any).initializer;
        assert.strictEqual(len.type, 'Call');
        assert.strictEqual(len.name, 'length');
        assert.strictEqual(len.arguments.length, 1);

        // substr($str, 0, 5)
        const sub = (ast[1] as any).initializer;
        assert.strictEqual(sub.type, 'Call');
        assert.strictEqual(sub.name, 'substr');
        assert.strictEqual(sub.arguments.length, 3);

        // split(/\s+/, $text)
        const split = (ast[5] as any).initializer;
        assert.strictEqual(split.type, 'Call');
        assert.strictEqual(split.name, 'split');
        assert.strictEqual(split.arguments.length, 2);
        assert.strictEqual(split.arguments[0].type, 'RegexLiteral');

        // join(", ", @array)
        const joined = (ast[6] as any).initializer;
        assert.strictEqual(joined.type, 'Call');
        assert.strictEqual(joined.name, 'join');
        assert.strictEqual(joined.arguments.length, 2);

        // chomp($line)
        assert.strictEqual(ast[7].type, 'Call');
        assert.strictEqual((ast[7] as any).name, 'chomp');

        // trim($input)
        const trimmed = (ast[9] as any).initializer;
        assert.strictEqual(trimmed.type, 'Call');
        assert.strictEqual(trimmed.name, 'trim');
    });

    await t.test('array functions', async () => {
        const code = `
            push(@array, $item);
            my $last = pop(@array);
            my $first = shift(@array);
            unshift(@array, $item);
            splice(@array, 1, 2, $new1, $new2);
            my @rev = reverse(@array);
            my @sorted = sort(@array);
        `;
        const ast = await parse(code);

        assert.strictEqual(ast.length, 7);

        // push(@array, $item)
        assert.strictEqual(ast[0].type, 'Call');
        const push = ast[0] as any;
        assert.strictEqual(push.name, 'push');
        assert.strictEqual(push.arguments.length, 2);
        assert.strictEqual(push.arguments[0].type, 'Variable');
        assert.strictEqual(push.arguments[0].name, '@array');

        // pop(@array)
        const pop = (ast[1] as any).initializer;
        assert.strictEqual(pop.type, 'Call');
        assert.strictEqual(pop.name, 'pop');

        // shift(@array)
        const shift = (ast[2] as any).initializer;
        assert.strictEqual(shift.type, 'Call');
        assert.strictEqual(shift.name, 'shift');

        // splice(@array, 1, 2, $new1, $new2)
        const splice = ast[4] as any;
        assert.strictEqual(splice.type, 'Call');
        assert.strictEqual(splice.name, 'splice');
        assert.strictEqual(splice.arguments.length, 5);

        // sort(@array)
        const sorted = (ast[6] as any).initializer;
        assert.strictEqual(sorted.type, 'Call');
        assert.strictEqual(sorted.name, 'sort');
    });

    await t.test('hash functions', async () => {
        const code = `
            my @k = keys(%hash);
            my @v = values(%hash);
            my @pairs = each(%hash);
            my $exists = exists($value);
            my $deleted = delete($value);
        `;
        const ast = await parse(code);

        assert.strictEqual(ast.length, 5);

        // keys(%hash)
        const keys = (ast[0] as any).initializer;
        assert.strictEqual(keys.type, 'Call');
        assert.strictEqual(keys.name, 'keys');
        assert.strictEqual(keys.arguments.length, 1);
        assert.strictEqual(keys.arguments[0].type, 'Variable');
        assert.strictEqual(keys.arguments[0].name, '%hash');

        // values(%hash)
        const values = (ast[1] as any).initializer;
        assert.strictEqual(values.type, 'Call');
        assert.strictEqual(values.name, 'values');

        // each(%hash)
        const each = (ast[2] as any).initializer;
        assert.strictEqual(each.type, 'Call');
        assert.strictEqual(each.name, 'each');
        assert.strictEqual(each.arguments.length, 1);

        // exists($value)
        const exists = (ast[3] as any).initializer;
        assert.strictEqual(exists.type, 'Call');
        assert.strictEqual(exists.name, 'exists');

        // delete($value)
        const deleted = (ast[4] as any).initializer;
        assert.strictEqual(deleted.type, 'Call');
        assert.strictEqual(deleted.name, 'delete');
    });

    await t.test('list functions', async () => {
        const code = `
            my @filtered = grep($_ > 10, @numbers);
            my @doubled = map($_ * 2, @numbers);
            my $count = scalar(@array);
            if (wantarray()) { }
        `;
        const ast = await parse(code);

        assert.strictEqual(ast.length, 4);

        // grep($_ > 10, @numbers)
        const grep = (ast[0] as any).initializer;
        assert.strictEqual(grep.type, 'Call');
        assert.strictEqual(grep.name, 'grep');
        assert.strictEqual(grep.arguments.length, 2);
        assert.strictEqual(grep.arguments[0].type, 'BinaryOp');

        // map($_ * 2, @numbers)
        const map = (ast[1] as any).initializer;
        assert.strictEqual(map.type, 'Call');
        assert.strictEqual(map.name, 'map');
        assert.strictEqual(map.arguments.length, 2);
        assert.strictEqual(map.arguments[0].type, 'BinaryOp');

        // scalar(@array)
        const scalar = (ast[2] as any).initializer;
        assert.strictEqual(scalar.type, 'Call');
        assert.strictEqual(scalar.name, 'scalar');

        // wantarray()
        const ifNode = ast[3] as any;
        assert.strictEqual(ifNode.type, 'If');
        assert.strictEqual(ifNode.condition.type, 'Call');
        assert.strictEqual(ifNode.condition.name, 'wantarray');
        assert.strictEqual(ifNode.condition.arguments.length, 0);
    });

    await t.test('math functions', async () => {
        const code = `
            my $absolute = abs($num);
            my $root = sqrt($num);
            my $integer = int($float);
            my $random = rand(100);
            srand(42);
        `;
        const ast = await parse(code);

        assert.strictEqual(ast.length, 5);

        // abs($num)
        const abs = (ast[0] as any).initializer;
        assert.strictEqual(abs.type, 'Call');
        assert.strictEqual(abs.name, 'abs');

        // sqrt($num)
        const sqrt = (ast[1] as any).initializer;
        assert.strictEqual(sqrt.type, 'Call');
        assert.strictEqual(sqrt.name, 'sqrt');

        // int($float)
        const int = (ast[2] as any).initializer;
        assert.strictEqual(int.type, 'Call');
        assert.strictEqual(int.name, 'int');

        // rand(100)
        const rand = (ast[3] as any).initializer;
        assert.strictEqual(rand.type, 'Call');
        assert.strictEqual(rand.name, 'rand');
        assert.strictEqual(rand.arguments.length, 1);
        assert.strictEqual(rand.arguments[0].type, 'Number');
        assert.strictEqual(rand.arguments[0].value, '100');

        // srand(42)
        assert.strictEqual(ast[4].type, 'Call');
        assert.strictEqual((ast[4] as any).name, 'srand');
    });

    await t.test('file I/O functions', async () => {
        const code = `
            open($fh, "<", $filename);
            close($fh);
            my $line = readline($fh);
            read($fh, $buffer, 1024);
            write($fh, $data, length($data));
        `;
        const ast = await parse(code);

        assert.strictEqual(ast.length, 5);

        // open($fh, "<", $filename)
        const open = ast[0] as any;
        assert.strictEqual(open.type, 'Call');
        assert.strictEqual(open.name, 'open');
        assert.strictEqual(open.arguments.length, 3);

        // close($fh)
        assert.strictEqual(ast[1].type, 'Call');
        assert.strictEqual((ast[1] as any).name, 'close');

        // readline($fh)
        const readline = (ast[2] as any).initializer;
        assert.strictEqual(readline.type, 'Call');
        assert.strictEqual(readline.name, 'readline');

        // read($fh, $buffer, 1024)
        const read = ast[3] as any;
        assert.strictEqual(read.type, 'Call');
        assert.strictEqual(read.name, 'read');
        assert.strictEqual(read.arguments.length, 3);

        // write($fh, $data, length($data))
        const write = ast[4] as any;
        assert.strictEqual(write.type, 'Call');
        assert.strictEqual(write.name, 'write');
        assert.strictEqual(write.arguments.length, 3);
        // Nested length() call
        assert.strictEqual(write.arguments[2].type, 'Call');
        assert.strictEqual(write.arguments[2].name, 'length');
    });

    await t.test('time functions', async () => {
        const code = `
            my $now = time();
            my @local = localtime($timestamp);
            my @gmt = gmtime($timestamp);
            sleep(5);
        `;
        const ast = await parse(code);

        assert.strictEqual(ast.length, 4);

        // time()
        const time = (ast[0] as any).initializer;
        assert.strictEqual(time.type, 'Call');
        assert.strictEqual(time.name, 'time');
        assert.strictEqual(time.arguments.length, 0);

        // localtime($timestamp)
        const localtime = (ast[1] as any).initializer;
        assert.strictEqual(localtime.type, 'Call');
        assert.strictEqual(localtime.name, 'localtime');

        // gmtime($timestamp)
        const gmtime = (ast[2] as any).initializer;
        assert.strictEqual(gmtime.type, 'Call');
        assert.strictEqual(gmtime.name, 'gmtime');

        // sleep(5)
        assert.strictEqual(ast[3].type, 'Call');
        assert.strictEqual((ast[3] as any).name, 'sleep');
        assert.strictEqual((ast[3] as any).arguments[0].value, '5');
    });

    await t.test('process functions', async () => {
        const code = `
            my $pid = fork();
            wait();
            waitpid($pid, 0);
            system("ls", "-l");
            exec("perl", $script);
            exit(0);
            kill(9, $pid);
        `;
        const ast = await parse(code);

        assert.strictEqual(ast.length, 7);

        // fork()
        const fork = (ast[0] as any).initializer;
        assert.strictEqual(fork.type, 'Call');
        assert.strictEqual(fork.name, 'fork');
        assert.strictEqual(fork.arguments.length, 0);

        // wait()
        assert.strictEqual(ast[1].type, 'Call');
        assert.strictEqual((ast[1] as any).name, 'wait');

        // system("ls", "-l")
        const system = ast[3] as any;
        assert.strictEqual(system.type, 'Call');
        assert.strictEqual(system.name, 'system');
        assert.strictEqual(system.arguments.length, 2);

        // exit(0)
        assert.strictEqual(ast[5].type, 'Call');
        assert.strictEqual((ast[5] as any).name, 'exit');

        // kill(9, $pid)
        assert.strictEqual(ast[6].type, 'Call');
        assert.strictEqual((ast[6] as any).name, 'kill');
        assert.strictEqual((ast[6] as any).arguments.length, 2);
    });

    await t.test('boolean literals as builtin keywords', async () => {
        const code = `
            my $yes = true;
            my $no = false;
            if ($flag == true) { }
            while ($running != false) { }
        `;
        const ast = await parse(code);

        assert.strictEqual(ast.length, 4);

        // true literal
        const yes = (ast[0] as any).initializer;
        assert.strictEqual(yes.type, 'Boolean');
        assert.strictEqual(yes.value, true);

        // false literal
        const no = (ast[1] as any).initializer;
        assert.strictEqual(no.type, 'Boolean');
        assert.strictEqual(no.value, false);

        // true in comparison
        const ifNode = ast[2] as any;
        assert.strictEqual(ifNode.condition.right.type, 'Boolean');
        assert.strictEqual(ifNode.condition.right.value, true);

        // false in comparison
        const whileNode = ast[3] as any;
        assert.strictEqual(whileNode.condition.right.type, 'Boolean');
        assert.strictEqual(whileNode.condition.right.value, false);
    });

    await t.test('special statement functions', async () => {
        const code = `
            print("Hello World");
            say("Hello World");
            die "Error occurred";
            warn "Warning message";
        `;
        const ast = await parse(code);

        assert.strictEqual(ast.length, 4);

        // print with parens is a Call
        assert.strictEqual(ast[0].type, 'Call');
        assert.strictEqual((ast[0] as any).name, 'print');
        assert.strictEqual((ast[0] as any).arguments.length, 1);
        assert.strictEqual((ast[0] as any).arguments[0].value, '"Hello World"');

        // say with parens is a Call
        assert.strictEqual(ast[1].type, 'Call');
        assert.strictEqual((ast[1] as any).name, 'say');
        assert.strictEqual((ast[1] as any).arguments.length, 1);

        // die without parens is a Die node
        assert.strictEqual(ast[2].type, 'Die');
        assert.strictEqual((ast[2] as any).message.value, '"Error occurred"');

        // warn without parens is a Warn node
        assert.strictEqual(ast[3].type, 'Warn');
        assert.strictEqual((ast[3] as any).message.value, '"Warning message"');
    });

    await t.test('nested builtin function calls', async () => {
        const code = `
            my $len = length(uc(trim($input)));
            my $formatted = sprintf("%d", int(sqrt(abs($num))));
            if (defined(ref(blessed($obj)))) { }
        `;
        const ast = await parse(code);

        assert.strictEqual(ast.length, 3);

        // length(uc(trim($input)))
        const len = (ast[0] as any).initializer;
        assert.strictEqual(len.type, 'Call');
        assert.strictEqual(len.name, 'length');
        assert.strictEqual(len.arguments[0].type, 'Call');
        assert.strictEqual(len.arguments[0].name, 'uc');
        assert.strictEqual(len.arguments[0].arguments[0].type, 'Call');
        assert.strictEqual(len.arguments[0].arguments[0].name, 'trim');

        // sprintf("%d", int(sqrt(abs($num))))
        const formatted = (ast[1] as any).initializer;
        assert.strictEqual(formatted.type, 'Call');
        assert.strictEqual(formatted.name, 'sprintf');
        assert.strictEqual(formatted.arguments[1].type, 'Call');
        assert.strictEqual(formatted.arguments[1].name, 'int');
        assert.strictEqual(formatted.arguments[1].arguments[0].type, 'Call');
        assert.strictEqual(formatted.arguments[1].arguments[0].name, 'sqrt');
        assert.strictEqual(formatted.arguments[1].arguments[0].arguments[0].type, 'Call');
        assert.strictEqual(formatted.arguments[1].arguments[0].arguments[0].name, 'abs');

        // defined(ref(blessed($obj)))
        const ifNode = ast[2] as any;
        assert.strictEqual(ifNode.condition.type, 'Call');
        assert.strictEqual(ifNode.condition.name, 'defined');
        assert.strictEqual(ifNode.condition.arguments[0].type, 'Call');
        assert.strictEqual(ifNode.condition.arguments[0].name, 'ref');
        assert.strictEqual(ifNode.condition.arguments[0].arguments[0].type, 'Call');
        assert.strictEqual(ifNode.condition.arguments[0].arguments[0].name, 'blessed');
    });
});