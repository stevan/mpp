
import { Instruction } from './InstructionSet'
import { Op, Program } from './Program'

import * as OpPool from '../src/OpPool'

export type Code   = [ Instruction, any[] ]
export type Source = Code[];

export function assemble (source : Source) : Program {
    let program = source.map((c) => OpPool.allocateOp(...c));

    let i = 1;
    while (i < program.length) {
        let prev = program[i - 1] as Op;
        let next = program[i]     as Op;
        prev.next = next.addr;
        i++;
    }
    return program;
}
