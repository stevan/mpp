
import {
    OpIndex, Frame, Opcode, Op, Instruction,
} from './Core'

// -----------------------------------------------------------------------------
// Instruction set
// -----------------------------------------------------------------------------

export const Opcodes : Opcode[] = []
Opcodes[Instruction.ENTER] = (frame : Frame, op : Op) : OpIndex => {
    return op.next;
};

Opcodes[Instruction.LEAVE] = (frame : Frame, op : Op) : OpIndex => {
    return op.next;
};

Opcodes[Instruction.PRINT] = (frame : Frame, op : Op) : OpIndex => {
    console.log('<OUT>', frame.stack.pop());
    return op.next;
};

Opcodes[Instruction.CONST] = (frame : Frame, op : Op) : OpIndex => {
    frame.stack.push( op.data[0] );
    return op.next;
};

Opcodes[Instruction.DUP] = (frame : Frame, op : Op) : OpIndex => {
    frame.stack.push( frame.stack.at(-1) );
    return op.next;
};

Opcodes[Instruction.JWZ] = (frame : Frame, op : Op) : OpIndex => {
    let cond = frame.stack.pop();
    if (cond) return op.next; // if true, just keep going
    return op.data[0] as OpIndex; // or jump to the address we specified
};

Opcodes[Instruction.EQ] = (frame : Frame, op : Op) : OpIndex => {
    let rhs = frame.stack.pop();
    let lhs = frame.stack.pop();
    frame.stack.push(lhs == rhs ? 1 : 0);
    return op.next;
};

Opcodes[Instruction.ADD] = (frame : Frame, op : Op) : OpIndex => {
    let rhs = frame.stack.pop();
    let lhs = frame.stack.pop();
    frame.stack.push(lhs + rhs);
    return op.next;
};

Opcodes[Instruction.SUB] = (frame : Frame, op : Op) : OpIndex => {
    let rhs = frame.stack.pop();
    let lhs = frame.stack.pop();
    frame.stack.push(lhs - rhs);
    return op.next;
};

