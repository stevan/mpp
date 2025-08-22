
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

export type Program = Op[]

// -----------------------------------------------------------------------------
