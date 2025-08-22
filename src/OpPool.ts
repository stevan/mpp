
import { Op } from './Program'
import { Instruction, HALT } from './InstructionSet'

export const OpPool : Op[] = [];

export function allocateOp (inst : Instruction, data : any[] = []) : Op {
    let opIndex = OpPool.length;

    let op : Op = {
        addr : opIndex,
        inst : inst,
        next : HALT,
        data : data
    } as Op;

    OpPool.push(op)

    return op;
}
