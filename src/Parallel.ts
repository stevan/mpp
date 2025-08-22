
import {
    OpIndex,
    FrameIndex,
    Opcode,
    Op,
    Program,
    Instruction,
    HALT,
} from './Core'

import {
    Opcodes,
    OpcodeNames,
} from './InstructionSet'

import * as Assembler   from './Assembler'
import * as FramePool   from './FramePool'
import * as ProgramPool from './ProgramPool'

let formatNum = (n : number, x : number) : string => n.toString().padStart(x, '0');

// -----------------------------------------------------------------------------
// The Opcode Warps
// -----------------------------------------------------------------------------

export type Queue = FrameIndex[];
export type Warp  = (q : Queue) => FrameIndex[];

export const Queues : Queue[] = [];
export const Warps  : Warp[] = [];

for (let i = 0; i < Opcodes.length; i++) {
    Queues[i] = [];
    Warps[i]  = compileWarp( Opcodes[i] as Opcode );
}

function compileWarp (opcode : Opcode) : Warp {
    return (q : Queue) : FrameIndex[] => {
        return q.map((frameIndex : FrameIndex) => {
            let frame   = FramePool.getFrame(frameIndex);
            let program = ProgramPool.getProgram(frame.pid);
            let op      = program[frame.ip] as Op;

            console.log(`${formatNum(frame.pid, 3)} | ${formatNum(frame.pc, 8)} | ${OpcodeNames[op.inst]?.padEnd(8, ' ')} | ${frame.stack.join(', ')}`);

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

// -----------------------------------------------------------------------------

function returnResults (results : FrameIndex[]) : void {
    results.forEach((frameIndex : FrameIndex) : void => {
        let frame   = FramePool.getFrame( frameIndex );
        let program = ProgramPool.getProgram(frame.pid);

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

// -----------------------------------------------------------------------------

export function interpret (source : Assembler.Source, copies : number = 1) : void {
    compileProgram(source, copies);

    console.log('START ->');
    let tick = 0;
    while (true) {
        tick++;
        console.log(`-- tick(${tick}) -------------------------------------------------`);

        console.group(`QUEUES:`);
        debugQueues();
        console.groupEnd();

        console.group(`RUN:`);
        executeWarps();
        console.groupEnd();

        if (queuesAreEmpty()) {
            console.log('HALT!');
            break;
        }
    }

}

// -----------------------------------------------------------------------------

function debugQueues () : void {
    for (let i = 0; i < OpcodeNames.length; i++) {
        let name  = OpcodeNames[i] as string;
        let queue = Queues[i]      as Queue;
        console.log(`${queue.length > 0 ? '+' : '-'} ${name.toUpperCase().padEnd(8, ' ')} | ${queue.join(', ')} `);
    }
}


// -----------------------------------------------------------------------------




