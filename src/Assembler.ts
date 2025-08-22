
import { Op, Program } from './Program'

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
