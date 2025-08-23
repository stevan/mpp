
import {
    OpIndex,
    FrameIndex,
    Opcode,
    Op,
    Program,
    Instruction,
    HALT,
} from './Core'

import { Opcodes } from './InstructionSet'

import * as Assembler   from './Assembler'
import * as FramePool   from './FramePool'
import * as ProgramPool from './ProgramPool'
import * as PCBPool     from './PCBPool'
import * as DEBUG       from './Debugger'
import * as WarpEngine  from './WarpEngine'

// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------

export function interpret (source : Assembler.Source, copies : number = 1) : void {
    let program      = Assembler.assemble(source);
    let programIndex = ProgramPool.allocateProgram(program);

    WarpEngine.loadWarpCores();

    let kernel = WarpEngine.compileKernel(programIndex, copies);
    WarpEngine.loadKernel(kernel);

    DEBUG.warpLogFooter('ENGAGE!!');
    let tick = 0;
    while (WarpEngine.isRunning()) {
        DEBUG.tickLine(tick++);
        WarpEngine.engage();
    }

    DEBUG.warpLogFooter('<- EXITING');
}






