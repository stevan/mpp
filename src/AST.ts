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
