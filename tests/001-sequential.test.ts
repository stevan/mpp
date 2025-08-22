
import { Program, HALT } from '../src/Program'
import { Instruction } from '../src/InstructionSet'
import { interpret } from '../src/Sequential'

let HelloWorld : Program = [
    [ Instruction.ENTER,    1, [] ],
    [ Instruction.CONST,    2, [ "Hello World" ] ],
    [ Instruction.PRINT,    3, [] ],
    [ Instruction.LEAVE, HALT, [] ],
];

interpret(HelloWorld);

