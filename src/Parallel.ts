
import {
    OpIndex,
    FrameIndex,
    Opcode,
} from './Core'

import {
    Op, Program, linkProgram
} from './Program'

import {
    HALT,
    Instruction,
    OpcodeNames,
    Opcodes,
} from './InstructionSet'

import * as FramePool   from './FramePool'
import * as ProgramPool from './ProgramPool'

// -----------------------------------------------------------------------------
// The Opcode Warps
// -----------------------------------------------------------------------------

export type Queue = FrameIndex[];
export type Warp  = (q : Queue) => FrameIndex[];

/// the Work Queues
export const Queues : Queue[] = []
Queues[Instruction.ENTER] = [];
Queues[Instruction.LEAVE] = [];
Queues[Instruction.PRINT] = [];
Queues[Instruction.CONST] = [];

// the Opcode Warps
export const Warps : Warp[] = [];
Warps[Instruction.ENTER] = compileWarp(Opcodes[Instruction.ENTER] as Opcode)
Warps[Instruction.LEAVE] = compileWarp(Opcodes[Instruction.LEAVE] as Opcode)
Warps[Instruction.PRINT] = compileWarp(Opcodes[Instruction.PRINT] as Opcode)
Warps[Instruction.CONST] = compileWarp(Opcodes[Instruction.CONST] as Opcode)

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

function processResults (results : FrameIndex[]) : void {
    results.forEach((frameIndex : FrameIndex) : void => {
        let frame   = FramePool.getFrame( frameIndex );
        let program = ProgramPool.getProgram(frame.program);

        let addr = frame.ip as OpIndex;
        if (addr == HALT) return;

        let next = program[addr] as Op;
        (Queues[next.inst] as Queue).push(frameIndex);
        return;
    })
}

function loadProgram(program : Program, copies : number = 1) : void {
    let linked : Program = linkProgram(program);
    let queue  : Queue   = Queues[Instruction.ENTER] as Queue;

    while (queue.length < copies) {
        let programIndex = ProgramPool.allocateProgram(linked);
        let frameIndex   = FramePool.allocateFrame(programIndex);
        queue.push(frameIndex);
    }
}

export function interpret (program : Program, n : number = 1) : void {

    // just cause typescript complains too much
    let E_Warp : Warp = Warps[Instruction.ENTER] as Warp;
    let L_Warp : Warp = Warps[Instruction.LEAVE] as Warp;
    let P_Warp : Warp = Warps[Instruction.PRINT] as Warp;
    let C_Warp : Warp = Warps[Instruction.CONST] as Warp;

    let E_queue : Queue = Queues[Instruction.ENTER] as Queue;
    let L_queue : Queue = Queues[Instruction.LEAVE] as Queue;
    let P_queue : Queue = Queues[Instruction.PRINT] as Queue;
    let C_queue : Queue = Queues[Instruction.CONST] as Queue;

    loadProgram(program, n);

    console.group('START ->');
    let tick = 0;
    while (true) {
        tick++;
        console.log(`-- ${tick} -------------------------------------------------`);

        console.group(`tick(${tick}) @ BEFORE`);
        console.log('ENTER->Q', E_queue);
        console.log('LEAVE->Q', L_queue);
        console.log('PRINT->Q', P_queue);
        console.log('CONST->Q', C_queue);
        console.groupEnd();

        console.group(`tick(${tick}) @ RUN`);
        // fetch   - splice the queue
        // decode  - not needed, inherent to the warp
        // execute - the warp handles it
        let E_results : FrameIndex[] = E_Warp(E_queue.splice(0));
        let L_results : FrameIndex[] = L_Warp(L_queue.splice(0));
        let P_results : FrameIndex[] = P_Warp(P_queue.splice(0));
        let C_results : FrameIndex[] = C_Warp(C_queue.splice(0));
        console.groupEnd();

        console.group(`tick(${tick}) = RESULTS`);
        console.log('ENTER->R', E_results);
        console.log('LEAVE->R', L_results);
        console.log('PRINT->R', P_results);
        console.log('CONST->R', C_results);
        console.groupEnd();

        processResults(E_results);
        processResults(L_results);
        processResults(P_results);
        processResults(C_results);

        if (E_queue.length == 0 &&
            L_queue.length == 0 &&
            P_queue.length == 0 &&
            C_queue.length == 0 ) {
            console.groupEnd();
            console.log('HALT!');
            break;
        }
    }

}




