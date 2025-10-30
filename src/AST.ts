// AST Node types

export interface ASTNode {
    type: string;
}

// Error node for parse/tokenization errors
export interface ErrorNode extends ASTNode {
    type: 'Error';
    message: string;      // Description of the error
    value: string;        // The problematic token/text
    line: number;         // Line number where error occurred
    column: number;       // Column number where error occurred
}

export interface NumberNode extends ASTNode {
    type: 'Number';
    value: string;
}

export interface StringNode extends ASTNode {
    type: 'String';
    value: string;
}

export interface BooleanNode extends ASTNode {
    type: 'Boolean';
    value: boolean;
}

export interface RegexLiteralNode extends ASTNode {
    type: 'RegexLiteral';
    pattern: string;  // The regex pattern as a string
    flags: string;    // Modifier flags (gimsx)
}

export interface VariableNode extends ASTNode {
    type: 'Variable';
    name: string;
}

export interface BinaryOpNode extends ASTNode {
    type: 'BinaryOp';
    operator: string;
    left: ASTNode;
    right: ASTNode;
}

export interface UnaryOpNode extends ASTNode {
    type: 'UnaryOp';
    operator: string;
    operand: ASTNode;
}

export interface PrefixOpNode extends ASTNode {
    type: 'PrefixOp';
    operator: string;  // '++' or '--'
    operand: ASTNode;
}

export interface PostfixOpNode extends ASTNode {
    type: 'PostfixOp';
    operator: string;  // '++' or '--'
    operand: ASTNode;
}

export interface TernaryNode extends ASTNode {
    type: 'Ternary';
    condition: ASTNode;
    trueExpr: ASTNode;
    falseExpr: ASTNode;
}

export interface DeclarationNode extends ASTNode {
    type: 'Declaration';
    declarator: string; // 'my', 'our', 'state', 'const'
    variable: VariableNode | SubNode;
    initializer?: ASTNode;
}

export interface ElseIfClause {
    condition: ASTNode;
    block: ASTNode[];
}

export interface IfNode extends ASTNode {
    type: 'If';
    condition: ASTNode;
    thenBlock: ASTNode[];
    elseIfClauses: ElseIfClause[];
    elseBlock?: ASTNode[];
}

export interface UnlessNode extends ASTNode {
    type: 'Unless';
    condition: ASTNode;
    thenBlock: ASTNode[];
    elseBlock?: ASTNode[];
}

export interface WhileNode extends ASTNode {
    type: 'While';
    condition: ASTNode;
    block: ASTNode[];
    label?: string;
}

export interface UntilNode extends ASTNode {
    type: 'Until';
    condition: ASTNode;
    block: ASTNode[];
    label?: string;
}

export interface ForeachNode extends ASTNode {
    type: 'Foreach';
    variable: VariableNode;
    declarator?: string; // 'my', 'our', 'state' if variable is declared inline
    listExpr: ASTNode;
    block: ASTNode[];
    label?: string;
}

export interface BlockNode extends ASTNode {
    type: 'Block';
    statements: ASTNode[];
}

export interface DoBlockNode extends ASTNode {
    type: 'DoBlock';
    statements: ASTNode[];
}

export interface DeferNode extends ASTNode {
    type: 'Defer';
    block: ASTNode[];
}

export interface CatchClause {
    parameter?: VariableNode;  // Optional for anonymous catch blocks
    block: ASTNode[];
}

export interface TryNode extends ASTNode {
    type: 'Try';
    tryBlock: ASTNode[];
    catchClauses: CatchClause[];
    finallyBlock?: ASTNode[];
}

export interface ThrowNode extends ASTNode {
    type: 'Throw';
    value?: ASTNode;  // Optional, can throw without a value
}

export interface CallNode extends ASTNode {
    type: 'Call';
    name: string;
    arguments: ASTNode[];
}

export interface ReturnNode extends ASTNode {
    type: 'Return';
    value?: ASTNode;
}

export interface LastNode extends ASTNode {
    type: 'Last';
    label?: string;
}

export interface NextNode extends ASTNode {
    type: 'Next';
    label?: string;
}

export interface RedoNode extends ASTNode {
    type: 'Redo';
    label?: string;
}

export interface BreakNode extends ASTNode {
    type: 'Break';
    label?: string;
}

export interface ContinueNode extends ASTNode {
    type: 'Continue';
    label?: string;
}

export interface WhenClause {
    condition: ASTNode;  // The value or expression to match against
    block: ASTNode[];     // The statements to execute if matched
}

export interface GivenNode extends ASTNode {
    type: 'Given';
    expression: ASTNode;  // The expression to match against
    whenClauses: WhenClause[];
    defaultBlock?: ASTNode[];  // Optional default block
}

export interface CaseClause {
    pattern: ASTNode;  // The pattern to match (can be value, regex, range, etc.)
    block: ASTNode[];   // The statements to execute if matched
}

export interface MatchNode extends ASTNode {
    type: 'Match';
    expression: ASTNode;  // The expression to match against
    caseClauses: CaseClause[];
    elseBlock?: ASTNode[];  // Optional else block
}

export interface DieNode extends ASTNode {
    type: 'Die';
    message?: ASTNode;
}

export interface WarnNode extends ASTNode {
    type: 'Warn';
    message?: ASTNode;
}

export interface PrintNode extends ASTNode {
    type: 'Print';
    arguments: ASTNode[];
}

export interface SayNode extends ASTNode {
    type: 'Say';
    arguments: ASTNode[];
}

export interface ParameterNode extends ASTNode {
    type: 'Parameter';
    variable: VariableNode;
    defaultValue?: ASTNode;
}

export interface SubNode extends ASTNode {
    type: 'Sub';
    name?: string;  // Optional for anonymous subs
    parameters: ParameterNode[];
    body: ASTNode[];
}

export interface ArrayLiteralNode extends ASTNode {
    type: 'ArrayLiteral';
    elements: ASTNode[];
}

export interface HashLiteralNode extends ASTNode {
    type: 'HashLiteral';
    pairs: Array<{ key: ASTNode; value: ASTNode }>;
}

export interface ListNode extends ASTNode {
    type: 'List';
    elements: ASTNode[];
}

export interface ArrayAccessNode extends ASTNode {
    type: 'ArrayAccess';
    base: ASTNode;  // The array variable or expression
    index: ASTNode; // The index expression
}

export interface ArraySliceNode extends ASTNode {
    type: 'ArraySlice';
    base: ASTNode;    // The array variable (with @ sigil)
    indices: ASTNode; // The index expression (often a range or list)
}

export interface HashAccessNode extends ASTNode {
    type: 'HashAccess';
    base: ASTNode;  // The hash variable or expression
    key: ASTNode;   // The key expression
}

export interface HashSliceNode extends ASTNode {
    type: 'HashSlice';
    base: ASTNode;    // The hash variable (with @ sigil)
    keys: ASTNode;    // The keys expression (often a list)
}

export interface MethodCallNode extends ASTNode {
    type: 'MethodCall';
    object: ASTNode;      // The object/class expression ($obj, ClassName, or any expression)
    method: string;       // Method name (identifier)
    arguments: ASTNode[]; // Argument list (can be empty)
}

export interface AssignmentNode extends ASTNode {
    type: 'Assignment';
    left: ASTNode;        // Variable, ArrayAccess, or HashAccess
    operator: string;     // =, +=, -=, *=, /=, etc.
    right: ASTNode;       // Expression to assign
}

// Modern postfix dereferencing (Perl 5.20+)
export interface PostfixDerefNode extends ASTNode {
    type: 'PostfixDeref';
    base: ASTNode;        // The reference expression
    derefType: string;    // '@' for array, '%' for hash, '$' for scalar
}

export interface PostfixDerefSliceNode extends ASTNode {
    type: 'PostfixDerefSlice';
    base: ASTNode;        // The reference expression
    sliceType: string;    // '@' for array slice, '@' for hash slice
    indices: ASTNode;     // The indices/keys expression (for array: range or list, for hash: list)
    indexType: string;    // '[' for array slice, '{' for hash slice
}

// Package system
export interface PackageNode extends ASTNode {
    type: 'Package';
    name: string;         // Package name (e.g., "Foo::Bar")
    body?: ASTNode[];     // Optional package body for package blocks
}

export interface UseNode extends ASTNode {
    type: 'Use';
    module?: string;      // Module name (e.g., "strict", "List::Util")
    version?: string;     // Version string (e.g., "v5.40", "5.040")
    imports?: ASTNode;    // Optional import list (e.g., qw(max min))
}

// Modern OO (Perl 5.38+)
export interface ClassNode extends ASTNode {
    type: 'Class';
    name: string;         // Class name (e.g., "Point", "Point::3D")
    parent?: string;      // Parent class name for :isa() (e.g., "Animal", "My::Base")
    body: ASTNode[];      // Class body (fields, methods, etc.)
}

export interface FieldNode extends ASTNode {
    type: 'Field';
    variable: VariableNode;  // The field variable (e.g., $x, @items)
    attributes?: string[];    // Attributes like 'param', 'reader', 'writer'
}

export interface MethodNode extends ASTNode {
    type: 'Method';
    name: string;           // Method name
    parameters: ParameterNode[];  // Parameters (automatic $self not included)
    body: ASTNode[];        // Method body
}
