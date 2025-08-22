
import {
    OpIndex,
    FrameIndex,
    Opcode,
} from './Core'

import { Op, Program } from './Program'

import {
    HALT,
    Instruction,
    Opcodes,
    OpcodeNames,
} from './InstructionSet'

import * as Assembler   from './Assembler'
import * as FramePool   from './FramePool'
import * as ProgramPool from './ProgramPool'

// -----------------------------------------------------------------------------
// The Opcode Warps
// -----------------------------------------------------------------------------

export type Queue = FrameIndex[];
export type Warp  = (q : Queue) => FrameIndex[];

export const Queues : Queue[] = [];
export const Warps : Warp[] = [];

for (let i = 0; i < Opcodes.length; i++) {
    Queues[i] = [];
    Warps[i]  = compileWarp( Opcodes[i] as Opcode );
}

function compileWarp (opcode : Opcode) : Warp {
    return (q : Queue) : FrameIndex[] => {
        return q.map((frameIndex : FrameIndex) => {
            let frame   = FramePool.getFrame(frameIndex);
            let program = ProgramPool.getProgram(frame.program);

            let op   = program[frame.ip] as Op;
            frame.ip = opcode(frame, op) as OpIndex;
            frame.pc++;

            return frameIndex;
        })
    };
}

// -----------------------------------------------------------------------------

function compileProgram(source : Assembler.Source, copies : number = 1) : void {
    let program : Program = Assembler.assemble(source);
    let queue   : Queue   = Queues[Instruction.ENTER] as Queue;

    while (queue.length < copies) {
        let programIndex = ProgramPool.allocateProgram(program);
        let frameIndex   = FramePool.allocateFrame(programIndex);
        queue.push(frameIndex);
    }
}

function returnResults (results : FrameIndex[]) : void {
    results.forEach((frameIndex : FrameIndex) : void => {
        let frame   = FramePool.getFrame( frameIndex );
        let program = ProgramPool.getProgram(frame.program);

        let addr = frame.ip as OpIndex;
        if (addr == HALT) return;

        let next  = program[addr] as Op;
        let queue = Queues[next.inst] as Queue;

        queue.push(frameIndex);

        return;
    })
}


function executeWarps () : void {
    let results = [];
    for (let i = 0; i < Warps.length; i++) {
        let warp  = Warps[i] as Warp;
        let queue = Queues[i] as Queue;

        results.push(...warp(queue.splice(0)));
    }

    returnResults(results);
}

function queuesAreEmpty () : boolean {
    return Queues.filter((q) => q.length != 0).length == 0
}

function debugQueues () : void {
    for (let i = 0; i < OpcodeNames.length; i++) {
        console.log(`: ${OpcodeNames[i]?.toUpperCase().padStart(5, ' ')}->Q`, Queues[i]);
    }
}

export function interpret (source : Assembler.Source, copies : number = 1) : void {
    compileProgram(source, copies);

    console.group('START ->');
    let tick = 0;
    while (true) {
        tick++;
        console.log(`-- ${tick} -------------------------------------------------`);

        console.group(`tick(${tick}) @ QUEUES`);
        debugQueues();
        console.groupEnd();

        console.group(`tick(${tick}) @ RUN`);
        executeWarps();
        console.groupEnd();

        if (queuesAreEmpty()) {
            console.groupEnd();
            console.log('HALT!');
            break;
        }
    }

}




