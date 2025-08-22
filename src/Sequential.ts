
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

import {
    OpcodeNames,
    Opcodes,
} from './InstructionSet'

import * as Assembler   from './Assembler'
import * as FramePool   from './FramePool'
import * as ProgramPool from './ProgramPool'

// -----------------------------------------------------------------------------
// Sequential Compiler
// -----------------------------------------------------------------------------

export type Thread = {
    programIndex : ProgramIndex,
    frameIndex   : FrameIndex,
}

export function newThread (programIndex : ProgramIndex) : Thread {
    let frameIndex = FramePool.allocateFrame(programIndex);
    return { programIndex, frameIndex } as Thread
}

let formatNum = (n : number, x : number) : string => n.toString().padStart(x, '0');

function execute (thread : Thread) : void {
    let frame   = FramePool.getFrame(thread.frameIndex);
    let program = ProgramPool.getProgram(thread.programIndex);

    console.group('START ->');
    console.log('pid | pcounter | opcode   | stack');
    while (true) {
        let op     = program[frame.ip] as Op;      // fetch
        let opcode = Opcodes[op.inst]  as Opcode;  // decode

        console.log(`${formatNum(frame.pid, 3)} | ${formatNum(frame.pc, 8)} | ${OpcodeNames[op.inst]?.padEnd(8, ' ')} | ${frame.stack.join(', ')}`);

        frame.ip   = opcode(frame, op) as OpIndex; // execute
        frame.pc++;
        // see if we should halt
        if (frame.ip == HALT) {
            console.groupEnd();
            console.log('HALT!');
            break;
        }
    }

    console.log(`RESULT: [ ${frame.stack.join(', ')} ]`);
}

export function interpret (source : Assembler.Source) : void {
    let program      = Assembler.assemble(source);
    let programIndex = ProgramPool.allocateProgram(program);

    execute(newThread(programIndex));
}



