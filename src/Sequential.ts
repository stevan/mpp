
import {
    OpIndex,
    FrameIndex,
    ProgramIndex,
    Opcode,
    Op,
    Program,
    HALT,
    Instruction,
} from './Core'

import { Opcodes } from './InstructionSet'

import * as Assembler   from './Assembler'
import * as FramePool   from './FramePool'
import * as ProgramPool from './ProgramPool'

import * as DEBUG from './Debugger'

// -----------------------------------------------------------------------------
// Hmmm ...

export type ProcessControlBlock = {
    programIndex : ProgramIndex,
    frameIndex   : FrameIndex,
    // should also have ...
    // - input/output channels
    // - state (RUNNING, WAITING, etc)
    // - and more
}

export function newProcessControlBlock (programIndex : ProgramIndex) : ProcessControlBlock {
    let frameIndex = FramePool.allocateFrame(programIndex);
    return { programIndex, frameIndex } as ProcessControlBlock
}

// -----------------------------------------------------------------------------
// Sequential Compiler
// -----------------------------------------------------------------------------

function execute (thread : ProcessControlBlock) : void {
    let frame   = FramePool.getFrame(thread.frameIndex);
    let program = ProgramPool.getProgram(thread.programIndex);

    DEBUG.callLogHeader('START ->');
    while (true) {
        let op     = program[frame.ip] as Op;      // fetch
        let opcode = Opcodes[op.inst]  as Opcode;  // decode

        DEBUG.logCall(frame, op);

        frame.ip   = opcode(frame, op) as OpIndex; // execute
        frame.pc++;
        // see if we should halt
        if (frame.ip == HALT) {
            DEBUG.callLogFooter('HALT!');
            break;
        }
    }

    DEBUG.dumpFrame(frame);
}

export function interpret (source : Assembler.Source) : void {
    let program      = Assembler.assemble(source);
    let programIndex = ProgramPool.allocateProgram(program);

    execute(newProcessControlBlock(programIndex));
}



