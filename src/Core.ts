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

