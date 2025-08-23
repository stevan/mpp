
// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

export type OpIndex      = number;
export type FrameIndex   = number;
export type ProgramIndex = number;

// -----------------------------------------------------------------------------

export const HALT = -1; // Halt instruction

export enum Instruction {
    ENTER,
    LEAVE,

    JWZ,

    PRINT,

    CONST,

    DUP,

    EQ,

    ADD,
    SUB,
}

// -----------------------------------------------------------------------------

export type Opcode = (frame : Frame, op : Op) => OpIndex;

export type Op = {
    addr : OpIndex,
    inst : Instruction,
    next : OpIndex,
    data : any[]
};

export type Program = Op[]

// -----------------------------------------------------------------------------

export type Frame = {
    ip    : OpIndex,
    pc    : number,
    stack : any[],
    prog  : ProgramIndex,
    pid   : PID,
}

export type PID = number;

export enum PCBState {
    PAUSED,
    WAITING,
    RUNNING,
    EXITED,
}

export class PCB {
    public state : PCBState;

    constructor(
        public pid          : PID,
        public programIndex : ProgramIndex,
        public frameIndex   : FrameIndex,
        public inputBuffer  : any[] = [],
        public outputBuffer : any[] = [],
    ) {
        this.state = PCBState.PAUSED
    }
}

// -----------------------------------------------------------------------------
