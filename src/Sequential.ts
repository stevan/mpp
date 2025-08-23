
import {
    OpIndex,
    FrameIndex,
    ProgramIndex,
    Opcode,
    Op,
    Program,
    HALT,
    Instruction,
    PCB,
} from './Core'

import { Opcodes } from './InstructionSet'

import * as Assembler   from './Assembler'
import * as FramePool   from './FramePool'
import * as ProgramPool from './ProgramPool'
import * as PCBPool     from './PCBPool'
import * as DEBUG       from './Debugger'

// -----------------------------------------------------------------------------
// Sequential Compiler
// -----------------------------------------------------------------------------

function execute (pcb : PCB) : void {
    let frame   = FramePool.getFrame(pcb.frameIndex);
    let program = ProgramPool.getProgram(pcb.programIndex);

    DEBUG.callLogHeader(`START -> pid(${pcb.pid})`);
    while (true) {
        let op     = program[frame.ip] as Op;      // fetch
        let opcode = Opcodes[op.inst]  as Opcode;  // decode

        DEBUG.logCall(frame, op);

        frame.ip   = opcode(frame, op) as OpIndex; // execute
        frame.pc++;
        // see if we should halt
        if (frame.ip == HALT) {
            DEBUG.callLogFooter(`HALT! -> pid(${pcb.pid})`);
            break;
        }
    }

    DEBUG.dumpFrame(frame);
}

export function interpret (source : Assembler.Source) : void {
    let program      = Assembler.assemble(source);
    let programIndex = ProgramPool.allocateProgram(program);
    let pcb          = PCBPool.allocatePCB(programIndex);
    execute(pcb);
}



