
import {
    Program, Instruction, HALT, interpret,
} from '../src/Parallel'

let HelloWorld : Program = [
    [ Instruction.ENTER,    1, [] ],
    [ Instruction.CONST,    2, [ "Hello World" ] ],
    [ Instruction.PRINT,    3, [] ],
    [ Instruction.LEAVE, HALT, [] ],
];

interpret(HelloWorld, 4);

