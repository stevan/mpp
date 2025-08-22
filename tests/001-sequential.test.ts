
import { Source } from '../src/Assembler'
import { Instruction } from '../src/InstructionSet'
import { interpret } from '../src/Sequential'

let HelloWorld : Source = [
    [ Instruction.ENTER, [] ],
    [ Instruction.CONST, [ "Hello World" ] ],
    [ Instruction.PRINT, [] ],
    [ Instruction.LEAVE, [] ],
];

interpret(HelloWorld);

