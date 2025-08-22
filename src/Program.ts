
import { OpIndex } from './Core'
import { Instruction } from './InstructionSet'

// -----------------------------------------------------------------------------
// Programs
// -----------------------------------------------------------------------------

export const INST = 0;
export const ADDR = 1;
export const DATA = 2;

export type Op = [
    Instruction, // self
    OpIndex,     // next
    any[]
];

export const HALT = -1; // Halt instruction

export type Program = Op[]
