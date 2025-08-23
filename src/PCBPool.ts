
import {
    FrameIndex,
    ProgramIndex,
    PID,
    PCB,
} from './Core'

import * as FramePool from './FramePool'

export const PCBPool : PCB[] = [];

export function allocatePCB (programIndex : ProgramIndex) : PCB {
    let pid        = PCBPool.length;
    let frameIndex = FramePool.allocateFrame(pid, programIndex);
    let pcb        = new PCB(
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
