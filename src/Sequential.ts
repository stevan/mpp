
import {
    OpIndex,
    FrameIndex,
    Opcode,
} from './Core'

import { Op, Program } from './Program'

import {
    HALT,
    Instruction,
    OpcodeNames,
    Opcodes,
} from './InstructionSet'

import * as Assembler   from './Assembler'
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

export function interpret (source : Assembler.Source) : void {
    let program      = Assembler.assemble(source);
    let programIndex = ProgramPool.allocateProgram(program);
    let frameIndex   = FramePool.allocateFrame(programIndex);
    let frame        = FramePool.getFrame(execute(frameIndex));
    console.log('FRAME', frame);
}



