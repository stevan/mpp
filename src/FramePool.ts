
import {
    FrameIndex,
    ProgramIndex,
    Frame,
} from './Core'

export const FramePool : Frame[] = [];

export function allocateFrame (programIndex : ProgramIndex) : FrameIndex {
    let frame = { ip : 0, pc : 0, stack : [], program : programIndex };
    let index = FramePool.length;
    FramePool[index] = frame as Frame;
    return index as FrameIndex;
}

export function getFrame (index : FrameIndex) : Frame {
    return FramePool[index] as Frame;
}
