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
// Instruction set
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
Opcodes[Instruction.ENTER] = (frame : Frame, op : Op) : OpIndex => { console.log('->enter', frame); return op[ADDR]; };
Opcodes[Instruction.LEAVE] = (frame : Frame, op : Op) : OpIndex => { console.log('->leave', frame); return op[ADDR]; };
Opcodes[Instruction.PRINT] = (frame : Frame, op : Op) : OpIndex => { console.log('->print', frame); console.log('<OUT>', frame.stack.pop()); return op[ADDR]; };
Opcodes[Instruction.CONST] = (frame : Frame, op : Op) : OpIndex => { console.log('->const', frame); frame.stack.push(op[DATA][0]); return op[ADDR]; };

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
// Sequential Compiler
// -----------------------------------------------------------------------------

function execute (frameIndex : FrameIndex) : Frame {
    let frame   = getFrame(frameIndex);
    let program = getProgram(frame.program);

    console.group('START ->');
    while (true) {
        let op     = program[frame.ip] as Op;      // fetch
        let opcode = Opcodes[op[INST]] as Opcode;  // decode
        frame.ip   = opcode(frame, op) as OpIndex; // execute
        frame.pc++;
        // see if we should halt
        if (frame.ip == HALT) {
            console.groupEnd();
            console.log('HALT!');
            break;
        }
    }

    return frame;
}

export function interpret (program : Program) : void {
    let programIndex = allocateProgram(program);
    let frameIndex   = allocateFrame(programIndex);
    let frame        = execute(frameIndex);
    console.log('FRAME', frame);
}



