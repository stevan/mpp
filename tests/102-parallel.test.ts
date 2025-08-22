
import { Source } from '../src/Assembler'
import { Instruction } from '../src/Core'
import { interpret } from '../src/Parallel'

// 10 BEGIN DUP 1 - DUP 0 == UNTIL
let Countdown : Source = [
    [ Instruction.ENTER, [] ],
    [ Instruction.CONST, [ 10 ] ],
// TOP OF LOOP
    [ Instruction.DUP,   []    ],
    [ Instruction.CONST, [ 1 ] ],
    [ Instruction.SUB,   []    ],

    [ Instruction.DUP,   []    ],
    [ Instruction.CONST, [ 1 ] ],
    [ Instruction.EQ,    []    ],

    [ Instruction.JWZ,   [ 2 ] ], // jump to TOP OF LOOP

    [ Instruction.LEAVE, [] ],
];

interpret(Countdown, 10);
