
import { Program, linkProgram, allocateOp } from '../src/Program'
import { Instruction } from '../src/InstructionSet'
import { interpret } from '../src/Parallel'

let HelloWorld : Program = linkProgram([
    allocateOp(Instruction.ENTER),
    allocateOp(Instruction.CONST, [ "Hello World" ]),
    allocateOp(Instruction.PRINT),
    allocateOp(Instruction.LEAVE),
] as Program);

interpret(HelloWorld, 4);

