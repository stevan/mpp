
import {
    OpIndex, Frame, Opcode
} from './Core'

import {
    INST, ADDR, DATA, Op, HALT
} from './Program'


// -----------------------------------------------------------------------------
// Instruction set
// -----------------------------------------------------------------------------

export enum Instruction {
    ENTER,
    LEAVE,
    PRINT,
    CONST,
}

export const OpcodeNames : string[] = []
OpcodeNames[Instruction.ENTER] = 'enter';
OpcodeNames[Instruction.LEAVE] = 'leave';
OpcodeNames[Instruction.PRINT] = 'print';
OpcodeNames[Instruction.CONST] = 'const';

export const Opcodes : Opcode[] = []
Opcodes[Instruction.ENTER] = (frame : Frame, op : Op) : OpIndex => { console.log('->enter', frame); return op[ADDR]; };
Opcodes[Instruction.LEAVE] = (frame : Frame, op : Op) : OpIndex => { console.log('->leave', frame); return op[ADDR]; };
Opcodes[Instruction.PRINT] = (frame : Frame, op : Op) : OpIndex => { console.log('->print', frame); console.log('<OUT>', frame.stack.pop()); return op[ADDR]; };
Opcodes[Instruction.CONST] = (frame : Frame, op : Op) : OpIndex => { console.log('->const', frame); frame.stack.push(op[DATA][0]); return op[ADDR]; };
