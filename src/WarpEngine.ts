
import {
    OpIndex,
    FrameIndex,
    ProgramIndex,
    Opcode,
    Op,
    Program,
    Instruction,
    HALT,
} from './Core'

import { Opcodes } from './InstructionSet'

import * as FramePool   from './FramePool'
import * as ProgramPool from './ProgramPool'
import * as PCBPool     from './PCBPool'
import * as DEBUG       from './Debugger'

// -----------------------------------------------------------------------------
// Warp Engine
// -----------------------------------------------------------------------------

export type Queue  = FrameIndex[];
export type Warp   = (q : Queue) => FrameIndex[];
export type Kernel = PCBPool.PCB[];

export type KernelIndex = number;

export const Queues  : Queue[] = [];
export const Warps   : Warp[]  = [];
export const Kernels : Kernel[] = [];

// -----------------------------------------------------------------------------
// Allocating
// -----------------------------------------------------------------------------

export function loadWarpCores () : void {
    DEBUG.warpLogHeader('LOADING -> Warp Core(s)');
    for (let i = 0; i < Opcodes.length; i++) {
        DEBUG.warpLogInfo(`... allocating Warp[${i}] for ${DEBUG.getOpcodeName(i)}`);
        Queues[i] = [];
        Warps[i]  = compileWarp( Opcodes[i] as Opcode );
    }
    DEBUG.warpLogFooter(`LOADED // (${Warps.length}) Warps Core(s)`);
}

function compileWarp (opcode : Opcode) : Warp {
    return (q : Queue) : FrameIndex[] => {
        return q.map((frameIndex : FrameIndex) => {
            let frame   = FramePool.getFrame(frameIndex);
            let program = ProgramPool.getProgram(frame.pid);
            let op      = program[frame.ip] as Op;

            DEBUG.logCall(frame, op);

            frame.ip = opcode(frame, op) as OpIndex;
            frame.pc++;

            return frameIndex;
        })
    };
}

// -----------------------------------------------------------------------------
// Compiling
// -----------------------------------------------------------------------------

export function compileKernel (programIndex : ProgramIndex, copies : number = 1) : Kernel {
    DEBUG.warpLogHeader(`COMPILING -> Program(${programIndex}) to Kernel( n: ${copies} )`);
    let kernel : Kernel = [];
    while (copies > 0) {
        let pcb = PCBPool.allocatePCB(programIndex);
        DEBUG.warpLogInfo(`... allocating PCB[${pcb.pid}] for Program(${programIndex})`);
        kernel.push(pcb);
        copies--;
    }
    DEBUG.warpLogFooter(`COMPILED // Kernel( n: ${kernel.length} )`);
    return kernel;
}

// -----------------------------------------------------------------------------
// Loading
// -----------------------------------------------------------------------------

export function loadKernel (kernel : Kernel) : void {
    DEBUG.warpLogHeader(`LOADING -> Kernel( n: ${kernel.length} )`);
    let queue = Queues[Instruction.ENTER] as Queue;
    DEBUG.warpLogInfo(`... loading ENTER Queue ${queue.length}`);
    kernel.forEach((pcb : PCBPool.PCB) => queue.push(pcb.frameIndex));
    DEBUG.warpLogInfo(`... loaded ENTER Queue ${queue.length}`);
    Kernels.push(kernel);
    DEBUG.warpLogFooter(`LOADED // (${Kernels.length}) are loaded`);
}

// -----------------------------------------------------------------------------
// Running
// -----------------------------------------------------------------------------

export function isRunning () : boolean {
    //console.log('... we running?', Queues);
    return Queues.filter((q) => q.length > 0).length > 0
}

export function engage () : void {
    DEBUG.dumpQueues(Queues);
    DEBUG.callLogHeader()

    let results = [];
    for (let i = 0; i < Warps.length; i++) {
        let warp  = Warps[i]  as Warp;
        let queue = Queues[i] as Queue;

        results.push(...warp(queue.splice(0)));
    }

    DEBUG.resultLogHeader();

    results.forEach((frameIndex : FrameIndex) : void => {
        let frame   = FramePool.getFrame( frameIndex );
        let program = ProgramPool.getProgram(frame.pid);

        DEBUG.dumpFrame(frame);

        let addr = frame.ip as OpIndex;
        if (addr == HALT) return;

        let next  = program[addr] as Op;
        let queue = Queues[next.inst] as Queue;

        queue.push(frameIndex);

        return;
    })
}


