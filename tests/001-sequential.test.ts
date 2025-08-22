
import { allocateOp } from '../src/OpPool'
import { Program } from '../src/Program'
import { Instruction } from '../src/InstructionSet'
import { interpret } from '../src/Sequential'

let HelloWorld : Program = [
    allocateOp(Instruction.ENTER),
    allocateOp(Instruction.CONST, [ "Hello World" ]),
    allocateOp(Instruction.PRINT),
    allocateOp(Instruction.LEAVE),
];

interpret(HelloWorld);

