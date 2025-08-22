
import {
    OpIndex,
    FrameIndex,
    Opcode,
} from './Core'

import { Op, Program, linkProgram } from './Program'


import {
    HALT,
    Instruction,
    OpcodeNames,
    Opcodes,
} from './InstructionSet'

import * as FramePool   from './FramePool'
import * as ProgramPool from './ProgramPool'

// -----------------------------------------------------------------------------
// Sequential Compiler
// -----------------------------------------------------------------------------

function execute (frameIndex : FrameIndex) : FrameIndex {
    let frame   = FramePool.getFrame(frameIndex);
    let program = ProgramPool.getProgram(frame.program);

    console.group('START ->');
    while (true) {
        let op     = program[frame.ip] as Op;      // fetch
        let opcode = Opcodes[op.inst] as Opcode;  // decode
        frame.ip   = opcode(frame, op) as OpIndex; // execute
        frame.pc++;
        // see if we should halt
        if (frame.ip == HALT) {
            console.groupEnd();
            console.log('HALT!');
            break;
        }
    }

    return frameIndex;
}

export function interpret (program : Program) : void {
    let linked       = linkProgram(program);
    let programIndex = ProgramPool.allocateProgram(linked);
    let frameIndex   = FramePool.allocateFrame(programIndex);
    let frame        = FramePool.getFrame(execute(frameIndex));
    console.log('FRAME', frame);
}



