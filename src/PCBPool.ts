
import {
    FrameIndex,
    ProgramIndex,
} from './Core'

import * as FramePool from './FramePool'

export type PID = number;

export enum ProcessState {
    PAUSED,
    WAITING,
    RUNNING,
    EXITED,
}

export class PCB {
    public state : ProcessState;

    constructor(
        public pid          : PID,
        public programIndex : ProgramIndex,
        public frameIndex   : FrameIndex,
        public inputBuffer  : any[] = [],
        public outputBuffer : any[] = [],
    ) {
        this.state = ProcessState.PAUSED
    }
}

export const PCBPool : PCB[] = [];

export function allocatePCB (programIndex : ProgramIndex) : PCB {
    let frameIndex = FramePool.allocateFrame(programIndex);

    let pid = PCBPool.length;
    let pcb = new PCB(
        pid,
        programIndex,
        frameIndex
    );
    PCBPool[pid] = pcb;
    return pcb;
}

export function getPCB (pid : PID) : PCB {
    return PCBPool[pid] as PCB;
}
