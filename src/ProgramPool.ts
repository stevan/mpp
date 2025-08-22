
import {
    ProgramIndex,
} from './Core'

import {
    Program
} from './Program'

export const ProgramPool : Program[] = [];

export function allocateProgram (program : Program) : ProgramIndex {
    let index = ProgramPool.length;
    ProgramPool[index] = program;
    return index as ProgramIndex;
}

export function getProgram (index : ProgramIndex) : Program {
    return ProgramPool[index] as Program;
}
