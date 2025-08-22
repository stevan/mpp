
import { Op, Program, Instruction } from './Core'
import { OpAllocator } from '../src/OpPool'

export type Code   = [ Instruction, any[] ]
export type Source = Code[];

export function assemble (source : Source) : Program {
    let opAlloc = new OpAllocator();
    let program = source.map((c) => opAlloc.alloc(...c));

    let i = 1;
    while (i < program.length) {
        let prev = program[i - 1] as Op;
        let next = program[i]     as Op;
        prev.next = next.addr;
        i++;
    }

    return program;
}
