// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

export type OpIndex      = number;
export type FrameIndex   = number;
export type ProgramIndex = number;

export type Frame = {
    ip      : OpIndex,
    pc      : number,
    stack   : any[],
    program : ProgramIndex,
}

export type Opcode = (frame : Frame, op : Op) => OpIndex;

// -----------------------------------------------------------------------------
// Programs
// -----------------------------------------------------------------------------

const INST = 0;
const ADDR = 1;
const DATA = 2;

export type Op = [
    Instruction, // self
    OpIndex,     // next
    any[]
];

export const HALT = -1; // Halt instruction

export type Program = Op[]

// -----------------------------------------------------------------------------

export type POp   = [ FrameIndex, Op ];      // parallel op
export type PAddr = [ FrameIndex, OpIndex ]; // parallel Addr

export type Queue = POp[];
export type Warp  = (q : Queue) => PAddr[];

// -----------------------------------------------------------------------------
// setting up the Instruction set
// -----------------------------------------------------------------------------

export enum Instruction {
    ENTER,
    LEAVE,
    PRINT,
    CONST,
}

export const OpcodeNames : string[] = []
OpcodeNames[Instruction.ENTER] = 'enter';
OpcodeNames[Instruction.LEAVE] = 'leave';
OpcodeNames[Instruction.PRINT] = 'print';
OpcodeNames[Instruction.CONST] = 'const';

export const Opcodes : Opcode[] = []
Opcodes[Instruction.ENTER] = (frame : Frame, op : Op) : OpIndex => { return op[ADDR]; };
Opcodes[Instruction.LEAVE] = (frame : Frame, op : Op) : OpIndex => { return op[ADDR]; };
Opcodes[Instruction.PRINT] = (frame : Frame, op : Op) : OpIndex => { console.log('<OUT>', frame.stack.pop()); return op[ADDR]; };
Opcodes[Instruction.CONST] = (frame : Frame, op : Op) : OpIndex => { frame.stack.push(op[DATA][0]);           return op[ADDR]; };

// -----------------------------------------------------------------------------
// The Opcode Warps
// -----------------------------------------------------------------------------

export const Warps : Warp[] = [];
Warps[Instruction.ENTER] = (q : Queue) : PAddr[] => { return q.map((pop : POp) => { return [ pop[0] as FrameIndex, (Opcodes[Instruction.ENTER] as Opcode)(getFrame(pop[0] as FrameIndex), pop[1] as Op) ] }) };
Warps[Instruction.LEAVE] = (q : Queue) : PAddr[] => { return q.map((pop : POp) => { return [ pop[0] as FrameIndex, (Opcodes[Instruction.LEAVE] as Opcode)(getFrame(pop[0] as FrameIndex), pop[1] as Op) ] }) };
Warps[Instruction.PRINT] = (q : Queue) : PAddr[] => { return q.map((pop : POp) => { return [ pop[0] as FrameIndex, (Opcodes[Instruction.PRINT] as Opcode)(getFrame(pop[0] as FrameIndex), pop[1] as Op) ] }) };
Warps[Instruction.CONST] = (q : Queue) : PAddr[] => { return q.map((pop : POp) => { return [ pop[0] as FrameIndex, (Opcodes[Instruction.CONST] as Opcode)(getFrame(pop[0] as FrameIndex), pop[1] as Op) ] }) };

// -----------------------------------------------------------------------------
// The Work Queues
// -----------------------------------------------------------------------------

export const Queues : Queue[] = []
Queues[Instruction.ENTER] = [];
Queues[Instruction.LEAVE] = [];
Queues[Instruction.PRINT] = [];
Queues[Instruction.CONST] = [];

// -----------------------------------------------------------------------------
// The Heap
// -----------------------------------------------------------------------------

export const FramePool : Frame[] = [];

function allocateFrame (programIndex : ProgramIndex) : FrameIndex {
    let frame = { ip : 0, pc : 0, stack : [], program : programIndex };
    let index = FramePool.length;
    FramePool[index] = frame as Frame;
    return index as FrameIndex;
}

function getFrame (index : FrameIndex) : Frame {
    return FramePool[index] as Frame;
}

export const ProgramPool : Program[] = [];

function allocateProgram (program : Program) : ProgramIndex {
    let index = ProgramPool.length;
    ProgramPool[index] = program;
    return index as ProgramIndex;
}

function getProgram (index : ProgramIndex) : Program {
    return ProgramPool[index] as Program;
}

// -----------------------------------------------------------------------------

function processResults (program : Program, results : PAddr[]) : void {
    results.forEach((a : PAddr) : void => {
        let index = a[0] as FrameIndex;
        let frame = getFrame( index );
        let addr  = a[1] as OpIndex;
        if (addr == HALT) return;

        let next  = program[addr] as Op;
        frame.ip = addr;
        frame.pc++;
        (Queues[next[INST]] as Queue).push([ index, next ]);
        return;
    })
}

function loadProgram(program : Program, copies : number = 1) : void {
    let queue : Queue = Queues[Instruction.ENTER] as Queue;
    while (queue.length < copies) {
        let programIndex = allocateProgram(program);
        let frameIndex   = allocateFrame(programIndex);
        queue.push([ frameIndex, program[0] as Op ]);
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
        let E_results : PAddr[] = E_Warp(E_queue.splice(0));
        let L_results : PAddr[] = L_Warp(L_queue.splice(0));
        let P_results : PAddr[] = P_Warp(P_queue.splice(0));
        let C_results : PAddr[] = C_Warp(C_queue.splice(0));
        console.groupEnd();

        console.group(`tick(${tick}) = RESULTS`);
        console.log('ENTER->R', E_results);
        console.log('LEAVE->R', L_results);
        console.log('PRINT->R', P_results);
        console.log('CONST->R', C_results);
        console.groupEnd();

        processResults(program, E_results);
        processResults(program, L_results);
        processResults(program, P_results);
        processResults(program, C_results);

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




