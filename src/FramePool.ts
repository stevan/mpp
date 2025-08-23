
import {
    FrameIndex,
    ProgramIndex,
    Frame,
    PID
} from './Core'

export const FramePool : Frame[] = [];

export function allocateFrame (pid : PID, programIndex : ProgramIndex) : FrameIndex {
    let frame = { ip : 0, pc : 0, stack : [], pid : pid, prog : programIndex };
    let index = FramePool.length;
    FramePool[index] = frame as Frame;
    return index as FrameIndex;
}

export function getFrame (index : FrameIndex) : Frame {
    return FramePool[index] as Frame;
}
