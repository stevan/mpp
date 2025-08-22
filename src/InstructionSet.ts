
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
    PRINT,
    CONST,
}

export const HALT = -1; // Halt instruction

export const OpcodeNames : string[] = []
OpcodeNames[Instruction.ENTER] = 'enter';
OpcodeNames[Instruction.LEAVE] = 'leave';
OpcodeNames[Instruction.PRINT] = 'print';
OpcodeNames[Instruction.CONST] = 'const';

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
