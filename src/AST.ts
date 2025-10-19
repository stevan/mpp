// AST Node types

export interface ASTNode {
    type: string;
}

export interface NumberNode extends ASTNode {
    type: 'Number';
    value: string;
}

export interface StringNode extends ASTNode {
    type: 'String';
    value: string;
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

export interface TernaryNode extends ASTNode {
    type: 'Ternary';
    condition: ASTNode;
    trueExpr: ASTNode;
    falseExpr: ASTNode;
}

export interface DeclarationNode extends ASTNode {
    type: 'Declaration';
    declarator: string; // 'my', 'our', 'state', 'const'
    variable: VariableNode;
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
}

export interface UntilNode extends ASTNode {
    type: 'Until';
    condition: ASTNode;
    block: ASTNode[];
}

export interface ForeachNode extends ASTNode {
    type: 'Foreach';
    variable: VariableNode;
    declarator?: string; // 'my', 'our', 'state' if variable is declared inline
    listExpr: ASTNode;
    block: ASTNode[];
}

export interface BlockNode extends ASTNode {
    type: 'Block';
    statements: ASTNode[];
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
