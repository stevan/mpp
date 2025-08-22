
import { OpIndex } from './Core'
import { Instruction } from './InstructionSet'

// -----------------------------------------------------------------------------
// Programs
// -----------------------------------------------------------------------------

export type Op = {
    addr : OpIndex,
    inst : Instruction,
    next : OpIndex,
    data : any[]
};

export const NOOP = -1; // Halt instruction

export type Program = Op[]

// -----------------------------------------------------------------------------

export const OpPool : Op[] = [];

export function allocateOp (inst : Instruction, data : any[] = []) : Op {
    let opIndex = OpPool.length;

    let op : Op = {
        addr : opIndex,
        inst : inst,
        next : NOOP,
        data : data
    } as Op;

    OpPool.push(op)

    return op;
}

export function linkProgram (program : Program) : Program {
    let i = 1;
    while (i < program.length) {
        let prev = program[i - 1] as Op;
        let next = program[i]     as Op;
        prev.next = next.addr;
        i++;
    }
    return program;
}

// -----------------------------------------------------------------------------
