
// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

export type OpIndex      = number;
export type FrameIndex   = number;
export type ProgramIndex = number;

export const HALT = -1; // Halt instruction

export type Frame = {
    ip    : OpIndex,
    pc    : number,
    stack : any[],
    pid   : ProgramIndex,
}

export type Opcode = (frame : Frame, op : Op) => OpIndex;

export type Op = {
    addr : OpIndex,
    inst : Instruction,
    next : OpIndex,
    data : any[]
};

export type Program = Op[]

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
