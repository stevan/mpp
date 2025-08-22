
import {
    OpIndex, Frame, Opcode
} from './Core'

import { Op } from './Program'


// -----------------------------------------------------------------------------
// Instruction set
// -----------------------------------------------------------------------------

export enum Instruction {
    ENTER,
    LEAVE,

    JWZ,

    PRINT,

    CONST,

    DUP,

    EQ,

    ADD,
    SUB,
}

export const HALT = -1; // Halt instruction

export const OpcodeNames : string[] = []
OpcodeNames[Instruction.ENTER] = 'enter';
OpcodeNames[Instruction.LEAVE] = 'leave';

OpcodeNames[Instruction.JWZ] = '(J)ump(W)hen(Z)ero';

OpcodeNames[Instruction.PRINT] = 'print';

OpcodeNames[Instruction.CONST] = 'const';

OpcodeNames[Instruction.DUP] = 'dup';

OpcodeNames[Instruction.EQ] = 'eq';

OpcodeNames[Instruction.ADD] = 'add';
OpcodeNames[Instruction.SUB] = 'sub';

export const Opcodes : Opcode[] = []
Opcodes[Instruction.ENTER] = (frame : Frame, op : Op) : OpIndex => {
    console.log('->enter', frame);
    return op.next;
};

Opcodes[Instruction.LEAVE] = (frame : Frame, op : Op) : OpIndex => {
    console.log('->leave', frame);
    return op.next;
};

Opcodes[Instruction.PRINT] = (frame : Frame, op : Op) : OpIndex => {
    console.log('->print', frame);
    console.log('<OUT>', frame.stack.pop());
    return op.next;
};

Opcodes[Instruction.CONST] = (frame : Frame, op : Op) : OpIndex => {
    console.log('->const', frame);
    frame.stack.push( op.data[0] );
    return op.next;
};

Opcodes[Instruction.DUP] = (frame : Frame, op : Op) : OpIndex => {
    console.log('->dup', frame);
    frame.stack.push( frame.stack.at(-1) );
    return op.next;
};

Opcodes[Instruction.JWZ] = (frame : Frame, op : Op) : OpIndex => {
    console.log('->jump_when_zero', frame);
    let cond = frame.stack.pop();
    if (cond) return op.next; // if true, just keep going
    return op.data[0] as OpIndex; // or jump to the address we specified
};

Opcodes[Instruction.EQ] = (frame : Frame, op : Op) : OpIndex => {
    console.log('->add', frame);
    let rhs = frame.stack.pop();
    let lhs = frame.stack.pop();
    frame.stack.push(lhs == rhs ? 1 : 0);
    return op.next;
};

Opcodes[Instruction.ADD] = (frame : Frame, op : Op) : OpIndex => {
    console.log('->add', frame);
    let rhs = frame.stack.pop();
    let lhs = frame.stack.pop();
    frame.stack.push(lhs + rhs);
    return op.next;
};

Opcodes[Instruction.SUB] = (frame : Frame, op : Op) : OpIndex => {
    console.log('->add', frame);
    let rhs = frame.stack.pop();
    let lhs = frame.stack.pop();
    frame.stack.push(lhs - rhs);
    return op.next;
};

