// PrettyPrinter - Converts AST to S-expression format for readability

import { ASTNode } from './AST.js';

export class PrettyPrinter {
    private indentSize: number;

    constructor(indentSize: number = 2) {
        this.indentSize = indentSize;
    }

    /**
     * Convert an AST node to an S-expression string
     */
    print(node: ASTNode | ASTNode[]): string {
        if (Array.isArray(node)) {
            if (node.length === 0) {
                return '()';
            }
            if (node.length === 1) {
                return this.printNode(node[0]);
            }
            // Multiple statements - print as a sequence
            return node.map(n => this.printNode(n)).join('\n\n');
        }
        return this.printNode(node);
    }

    private printNode(node: ASTNode): string {
        const type = node.type;

        switch (type) {
            // Literals
            case 'Number':
                return this.printNumber(node as any);
            case 'String':
                return this.printString(node as any);
            case 'Variable':
                return this.printVariable(node as any);

            // Operators
            case 'BinaryOp':
                return this.printBinaryOp(node as any);
            case 'UnaryOp':
                return this.printUnaryOp(node as any);
            case 'Ternary':
                return this.printTernary(node as any);

            // Declarations and Assignments
            case 'Declaration':
                return this.printDeclaration(node as any);
            case 'Assignment':
                return this.printAssignment(node as any);

            // Control Flow
            case 'If':
                return this.printIf(node as any);
            case 'Unless':
                return this.printUnless(node as any);
            case 'While':
                return this.printWhile(node as any);
            case 'Until':
                return this.printUntil(node as any);
            case 'Foreach':
                return this.printForeach(node as any);

            // Blocks
            case 'Block':
                return this.printBlock(node as any);
            case 'DoBlock':
                return this.printDoBlock(node as any);

            // Functions and Calls
            case 'Call':
                return this.printCall(node as any);
            case 'Sub':
                return this.printSub(node as any);
            case 'Parameter':
                return this.printParameter(node as any);
            case 'Return':
                return this.printReturn(node as any);

            // Loop Control
            case 'Last':
                return this.printLast(node as any);
            case 'Next':
                return this.printNext(node as any);
            case 'Redo':
                return this.printRedo(node as any);

            // Built-ins
            case 'Print':
                return this.printPrint(node as any);
            case 'Say':
                return this.printSay(node as any);
            case 'Die':
                return this.printDie(node as any);
            case 'Warn':
                return this.printWarn(node as any);

            // Data Structures
            case 'ArrayLiteral':
                return this.printArrayLiteral(node as any);
            case 'HashLiteral':
                return this.printHashLiteral(node as any);
            case 'List':
                return this.printList(node as any);
            case 'ArrayAccess':
                return this.printArrayAccess(node as any);
            case 'ArraySlice':
                return this.printArraySlice(node as any);
            case 'HashAccess':
                return this.printHashAccess(node as any);
            case 'HashSlice':
                return this.printHashSlice(node as any);

            // Dereferencing
            case 'PostfixDeref':
                return this.printPostfixDeref(node as any);
            case 'PostfixDerefSlice':
                return this.printPostfixDerefSlice(node as any);

            // OO
            case 'MethodCall':
                return this.printMethodCall(node as any);
            case 'Class':
                return this.printClass(node as any);
            case 'Field':
                return this.printField(node as any);
            case 'Method':
                return this.printMethod(node as any);

            // Modules
            case 'Package':
                return this.printPackage(node as any);
            case 'Use':
                return this.printUse(node as any);

            default:
                return `(Unknown ${type})`;
        }
    }

    private printNumber(node: { value: string }): string {
        return `(Number ${node.value})`;
    }

    private printString(node: { value: string }): string {
        return `(String ${JSON.stringify(node.value)})`;
    }

    private printVariable(node: { name: string }): string {
        return `(Variable ${node.name})`;
    }

    private printBinaryOp(node: { operator: string; left: ASTNode; right: ASTNode }): string {
        const left = this.printNode(node.left);
        const right = this.printNode(node.right);

        // Simple case: both children fit on one line
        if (!left.includes('\n') && !right.includes('\n') &&
            left.length + right.length + node.operator.length < 60) {
            return `(BinaryOp ${node.operator} ${left} ${right})`;
        }

        // Complex case: use multiple lines
        return `(BinaryOp ${node.operator}\n${this.indent(left)}\n${this.indent(right)})`;
    }

    private printUnaryOp(node: { operator: string; operand: ASTNode }): string {
        const operand = this.printNode(node.operand);
        if (!operand.includes('\n')) {
            return `(UnaryOp ${node.operator} ${operand})`;
        }
        return `(UnaryOp ${node.operator}\n${this.indent(operand)})`;
    }

    private printTernary(node: { condition: ASTNode; trueExpr: ASTNode; falseExpr: ASTNode }): string {
        return `(Ternary\n` +
            `${this.indent(this.printNode(node.condition))}\n` +
            `${this.indent(this.printNode(node.trueExpr))}\n` +
            `${this.indent(this.printNode(node.falseExpr))})`;
    }

    private printDeclaration(node: { declarator: string; variable: ASTNode; initializer?: ASTNode }): string {
        const variable = this.printNode(node.variable);
        if (node.initializer) {
            const initializer = this.printNode(node.initializer);
            if (!initializer.includes('\n') && variable.length + initializer.length < 50) {
                return `(Declaration ${node.declarator} ${variable} ${initializer})`;
            }
            return `(Declaration ${node.declarator}\n${this.indent(variable)}\n${this.indent(initializer)})`;
        }
        return `(Declaration ${node.declarator} ${variable})`;
    }

    private printAssignment(node: { operator: string; left: ASTNode; right: ASTNode }): string {
        const left = this.printNode(node.left);
        const right = this.printNode(node.right);

        if (!left.includes('\n') && !right.includes('\n') &&
            left.length + right.length + node.operator.length < 60) {
            return `(Assignment ${node.operator} ${left} ${right})`;
        }

        return `(Assignment ${node.operator}\n${this.indent(left)}\n${this.indent(right)})`;
    }

    private printIf(node: { condition: ASTNode; thenBlock: ASTNode[]; elseIfClauses: any[]; elseBlock?: ASTNode[] }): string {
        let result = `(If\n`;
        result += this.indent(`${this.printNode(node.condition)}\n`);
        result += this.indent(`(thenBlock\n${this.indent(this.printBlockNodes(node.thenBlock))})`);

        for (const elseIf of node.elseIfClauses) {
            result += '\n' + this.indent(`(elsif\n`);
            result += this.indent(this.indent(this.printNode(elseIf.condition)) + '\n');
            result += this.indent(this.indent(`(thenBlock\n${this.indent(this.printBlockNodes(elseIf.block))})`)) + ')';
        }

        if (node.elseBlock) {
            result += '\n' + this.indent(`(elseBlock\n${this.indent(this.printBlockNodes(node.elseBlock))})`);
        }

        return result + ')';
    }

    private printUnless(node: { condition: ASTNode; thenBlock: ASTNode[]; elseBlock?: ASTNode[] }): string {
        let result = `(Unless\n`;
        result += this.indent(`${this.printNode(node.condition)}\n`);
        result += this.indent(`(thenBlock\n${this.indent(this.printBlockNodes(node.thenBlock))})`);

        if (node.elseBlock) {
            result += '\n' + this.indent(`(elseBlock\n${this.indent(this.printBlockNodes(node.elseBlock))})`);
        }

        return result + ')';
    }

    private printWhile(node: { condition: ASTNode; block: ASTNode[]; label?: string }): string {
        let result = `(While\n`;
        if (node.label) {
            result += this.indent(`(label ${JSON.stringify(node.label)})\n`);
        }
        result += this.indent(this.printNode(node.condition) + '\n');
        result += this.indent(`(block\n${this.indent(this.printBlockNodes(node.block))})`);
        return result + ')';
    }

    private printUntil(node: { condition: ASTNode; block: ASTNode[]; label?: string }): string {
        let result = `(Until\n`;
        if (node.label) {
            result += this.indent(`(label ${JSON.stringify(node.label)})\n`);
        }
        result += this.indent(this.printNode(node.condition) + '\n');
        result += this.indent(`(block\n${this.indent(this.printBlockNodes(node.block))})`);
        return result + ')';
    }

    private printForeach(node: { variable: ASTNode; declarator?: string; listExpr: ASTNode; block: ASTNode[]; label?: string }): string {
        let result = `(Foreach\n`;
        if (node.label) {
            result += this.indent(`(label ${JSON.stringify(node.label)})\n`);
        }
        if (node.declarator) {
            result += this.indent(`(declarator ${JSON.stringify(node.declarator)})\n`);
        }
        result += this.indent(this.printNode(node.variable) + '\n');
        result += this.indent(this.printNode(node.listExpr) + '\n');
        result += this.indent(`(block\n${this.indent(this.printBlockNodes(node.block))})`);
        return result + ')';
    }

    private printBlockNodes(nodes: ASTNode[]): string {
        if (nodes.length === 0) return '';
        return nodes.map(n => this.printNode(n)).join('\n');
    }

    private printBlock(node: { statements: ASTNode[] }): string {
        return `(Block\n${this.indent(this.printBlockNodes(node.statements))})`;
    }

    private printDoBlock(node: { statements: ASTNode[] }): string {
        return `(DoBlock\n${this.indent(this.printBlockNodes(node.statements))})`;
    }

    private printCall(node: { name: string; arguments: ASTNode[] }): string {
        if (node.arguments.length === 0) {
            return `(Call ${JSON.stringify(node.name)})`;
        }

        const args = node.arguments.map(a => this.printNode(a));
        const allSimple = args.every(a => !a.includes('\n'));

        if (allSimple && args.join(' ').length < 50) {
            return `(Call ${JSON.stringify(node.name)} ${args.join(' ')})`;
        }

        return `(Call ${JSON.stringify(node.name)}\n${this.indent(args.join('\n'))})`;
    }

    private printSub(node: { name?: string; parameters: ASTNode[]; body: ASTNode[] }): string {
        let result = `(Sub\n`;
        if (node.name) {
            result += this.indent(`(name ${JSON.stringify(node.name)})\n`);
        }
        if (node.parameters.length > 0) {
            result += this.indent(`(parameters\n${this.indent(node.parameters.map(p => this.printNode(p)).join('\n'))})\n`);
        }
        result += this.indent(`(body\n${this.indent(this.printBlockNodes(node.body))})`);
        return result + ')';
    }

    private printParameter(node: { variable: ASTNode; defaultValue?: ASTNode }): string {
        if (node.defaultValue) {
            return `(Parameter\n${this.indent(this.printNode(node.variable))}\n${this.indent(this.printNode(node.defaultValue))})`;
        }
        return `(Parameter ${this.printNode(node.variable)})`;
    }

    private printReturn(node: { value?: ASTNode }): string {
        if (node.value) {
            const val = this.printNode(node.value);
            if (!val.includes('\n')) {
                return `(Return ${val})`;
            }
            return `(Return\n${this.indent(val)})`;
        }
        return '(Return)';
    }

    private printLast(node: { label?: string }): string {
        return node.label ? `(Last ${JSON.stringify(node.label)})` : '(Last)';
    }

    private printNext(node: { label?: string }): string {
        return node.label ? `(Next ${JSON.stringify(node.label)})` : '(Next)';
    }

    private printRedo(node: { label?: string }): string {
        return node.label ? `(Redo ${JSON.stringify(node.label)})` : '(Redo)';
    }

    private printDie(node: { message?: ASTNode }): string {
        if (node.message) {
            return `(Die ${this.printNode(node.message)})`;
        }
        return '(Die)';
    }

    private printWarn(node: { message?: ASTNode }): string {
        if (node.message) {
            return `(Warn ${this.printNode(node.message)})`;
        }
        return '(Warn)';
    }

    private printPrint(node: { arguments: ASTNode[] }): string {
        if (node.arguments.length === 0) {
            return '(Print)';
        }

        const args = node.arguments.map(a => this.printNode(a));
        if (args.every(a => !a.includes('\n')) && args.join(' ').length < 50) {
            return `(Print ${args.join(' ')})`;
        }

        return `(Print\n${this.indent(args.join('\n'))})`;
    }

    private printSay(node: { arguments: ASTNode[] }): string {
        if (node.arguments.length === 0) {
            return '(Say)';
        }

        const args = node.arguments.map(a => this.printNode(a));
        if (args.every(a => !a.includes('\n')) && args.join(' ').length < 50) {
            return `(Say ${args.join(' ')})`;
        }

        return `(Say\n${this.indent(args.join('\n'))})`;
    }

    private printArrayLiteral(node: { elements: ASTNode[] }): string {
        if (node.elements.length === 0) {
            return '(ArrayLiteral)';
        }

        const elements = node.elements.map(e => this.printNode(e));
        if (elements.every(e => !e.includes('\n')) && elements.join(' ').length < 50) {
            return `(ArrayLiteral ${elements.join(' ')})`;
        }

        return `(ArrayLiteral\n${this.indent(elements.join('\n'))})`;
    }

    private printHashLiteral(node: { pairs: Array<{ key: ASTNode; value: ASTNode }> }): string {
        if (node.pairs.length === 0) {
            return '(HashLiteral)';
        }

        const pairs = node.pairs.map(p =>
            `(pair ${this.printNode(p.key)} ${this.printNode(p.value)})`
        );

        return `(HashLiteral\n${this.indent(pairs.join('\n'))})`;
    }

    private printList(node: { elements: ASTNode[] }): string {
        if (node.elements.length === 0) {
            return '(List)';
        }

        const elements = node.elements.map(e => this.printNode(e));
        if (elements.every(e => !e.includes('\n')) && elements.join(' ').length < 50) {
            return `(List ${elements.join(' ')})`;
        }

        return `(List\n${this.indent(elements.join('\n'))})`;
    }

    private printArrayAccess(node: { base: ASTNode; index: ASTNode }): string {
        const base = this.printNode(node.base);
        const index = this.printNode(node.index);

        if (!base.includes('\n') && !index.includes('\n') && base.length + index.length < 50) {
            return `(ArrayAccess ${base} ${index})`;
        }

        return `(ArrayAccess\n${this.indent(base)}\n${this.indent(index)})`;
    }

    private printArraySlice(node: { base: ASTNode; indices: ASTNode }): string {
        return `(ArraySlice\n${this.indent(this.printNode(node.base))}\n${this.indent(this.printNode(node.indices))})`;
    }

    private printHashAccess(node: { base: ASTNode; key: ASTNode }): string {
        const base = this.printNode(node.base);
        const key = this.printNode(node.key);

        if (!base.includes('\n') && !key.includes('\n') && base.length + key.length < 50) {
            return `(HashAccess ${base} ${key})`;
        }

        return `(HashAccess\n${this.indent(base)}\n${this.indent(key)})`;
    }

    private printHashSlice(node: { base: ASTNode; keys: ASTNode }): string {
        return `(HashSlice\n${this.indent(this.printNode(node.base))}\n${this.indent(this.printNode(node.keys))})`;
    }

    private printPostfixDeref(node: { base: ASTNode; derefType: string }): string {
        return `(PostfixDeref ${JSON.stringify(node.derefType)}\n${this.indent(this.printNode(node.base))})`;
    }

    private printPostfixDerefSlice(node: { base: ASTNode; sliceType: string; indices: ASTNode; indexType: string }): string {
        return `(PostfixDerefSlice\n` +
            `${this.indent(`(sliceType ${JSON.stringify(node.sliceType)})\n`)}` +
            `${this.indent(`(indexType ${JSON.stringify(node.indexType)})\n`)}` +
            `${this.indent(this.printNode(node.base))}\n` +
            `${this.indent(this.printNode(node.indices))})`;
    }

    private printMethodCall(node: { object: ASTNode; method: string; arguments: ASTNode[] }): string {
        let result = `(MethodCall\n`;
        result += this.indent(`(method ${JSON.stringify(node.method)})\n`);
        result += this.indent(this.printNode(node.object));

        if (node.arguments.length > 0) {
            result += '\n' + this.indent(`(arguments\n${this.indent(node.arguments.map(a => this.printNode(a)).join('\n'))})`);
        }

        return result + ')';
    }

    private printClass(node: { name: string; body: ASTNode[] }): string {
        return `(Class ${JSON.stringify(node.name)}\n${this.indent(this.printBlockNodes(node.body))})`;
    }

    private printField(node: { variable: ASTNode; attributes?: string[] }): string {
        let result = `(Field\n${this.indent(this.printNode(node.variable))}`;

        if (node.attributes && node.attributes.length > 0) {
            result += '\n' + this.indent(`(attributes ${node.attributes.map(a => JSON.stringify(a)).join(' ')})`);
        }

        return result + ')';
    }

    private printMethod(node: { name: string; parameters: ASTNode[]; body: ASTNode[] }): string {
        let result = `(Method ${JSON.stringify(node.name)}\n`;

        if (node.parameters.length > 0) {
            result += this.indent(`(parameters\n${this.indent(node.parameters.map(p => this.printNode(p)).join('\n'))})\n`);
        }

        result += this.indent(`(body\n${this.indent(this.printBlockNodes(node.body))})`);
        return result + ')';
    }

    private printPackage(node: { name: string }): string {
        return `(Package ${JSON.stringify(node.name)})`;
    }

    private printUse(node: { module: string; imports?: ASTNode }): string {
        if (node.imports) {
            return `(Use ${JSON.stringify(node.module)}\n${this.indent(this.printNode(node.imports))})`;
        }
        return `(Use ${JSON.stringify(node.module)})`;
    }

    private indent(text: string): string {
        const spaces = ' '.repeat(this.indentSize);
        return text.split('\n').map(line => spaces + line).join('\n');
    }
}
