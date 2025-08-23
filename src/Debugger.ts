
import {
    Frame,
    Op,
    Instruction,
} from './Core'

// =============================================================================

const ESC    = '\x1b[';

const RESET  = ESC + '0m';
const BOLD   = ESC + '1m';
const DIM    = ESC + '2m';
const UNDER  = ESC + '4m';
const INVERT = ESC + '7m';
const STRIKE = ESC + '9m';

/*

## 8-16 colors

        NORMAL | BRIGHT
        FG  BG | FG  BG
Black   30  40 | 90  100
Red     31  41 | 91  101
Green   32  42 | 92  102
Yellow  33  43 | 93  103
Blue    34  44 | 94  104
Magenta 35  45 | 95  105
Cyan    36  46 | 96  106
White   37  47 | 97  107
Default 39  49 | --  ---

# Set style to bold, red foreground.
\x1b[1;31mHello

# Set style to dimmed white foreground with red background.
\x1b[2;37;41mWorld

## 256

ESC[38;5;{ID}m  Set foreground color.
ESC[48;5;{ID}m  Set background color.

ID = 0 - 255

  0-7   : standard colors (as in ESC [ 30–37 m)
  8–15  : high intensity colors (as in ESC [ 90–97 m)
 16-231 : 6 × 6 × 6 cube (216 colors)
232-255 : grayscale from dark to light in 24 steps.

## RGB

ESC[38;2;{r};{g};{b}m   Set foreground color as RGB.
ESC[48;2;{r};{g};{b}m   Set background color as RGB.

*/

let formatNum = (n : number, x : number) : string => n.toString().padStart(x, '0');

// =============================================================================

export enum OpcodeGroup {
    STRUCTURAL,
    BRANCHING,
    INPUT_OUTPUT,
    CONSTANTS,
    STACK_OPS,
    OPERATORS,
};

export const OpcodeGroupNames  : string[] = []
OpcodeGroupNames[ OpcodeGroup.STRUCTURAL   ] = 'structural',
OpcodeGroupNames[ OpcodeGroup.BRANCHING    ] = 'branching',
OpcodeGroupNames[ OpcodeGroup.INPUT_OUTPUT ] = 'I/O',
OpcodeGroupNames[ OpcodeGroup.CONSTANTS    ] = 'const',
OpcodeGroupNames[ OpcodeGroup.STACK_OPS    ] = 'stackops'
OpcodeGroupNames[ OpcodeGroup.OPERATORS    ] = 'operators'

export const OpcodeGroupColors : string[] = [];
OpcodeGroupColors[ OpcodeGroup.STRUCTURAL   ] = ESC + 41 + 'm';
OpcodeGroupColors[ OpcodeGroup.BRANCHING    ] = ESC + 42 + 'm';
OpcodeGroupColors[ OpcodeGroup.INPUT_OUTPUT ] = ESC + 43 + 'm';
OpcodeGroupColors[ OpcodeGroup.CONSTANTS    ] = ESC + 44 + 'm';
OpcodeGroupColors[ OpcodeGroup.STACK_OPS    ] = ESC + 45 + 'm';
OpcodeGroupColors[ OpcodeGroup.OPERATORS    ] = ESC + 46 + 'm';

export const OpcodeNames : string[] = []
OpcodeNames[ Instruction.ENTER ] = 'enter';
OpcodeNames[ Instruction.LEAVE ] = 'leave';
OpcodeNames[ Instruction.JWZ   ] = 'jwz';
OpcodeNames[ Instruction.PRINT ] = 'print';
OpcodeNames[ Instruction.CONST ] = 'const';
OpcodeNames[ Instruction.DUP   ] = 'dup';
OpcodeNames[ Instruction.EQ    ] = 'eq';
OpcodeNames[ Instruction.ADD   ] = 'add';
OpcodeNames[ Instruction.SUB   ] = 'sub';

export const OpcodeGroups : number[] = []
OpcodeGroups[ Instruction.ENTER ] = OpcodeGroup.STRUCTURAL;
OpcodeGroups[ Instruction.LEAVE ] = OpcodeGroup.STRUCTURAL;
OpcodeGroups[ Instruction.JWZ   ] = OpcodeGroup.BRANCHING;
OpcodeGroups[ Instruction.PRINT ] = OpcodeGroup.INPUT_OUTPUT;
OpcodeGroups[ Instruction.CONST ] = OpcodeGroup.CONSTANTS;
OpcodeGroups[ Instruction.DUP   ] = OpcodeGroup.STACK_OPS;
OpcodeGroups[ Instruction.EQ    ] = OpcodeGroup.OPERATORS;
OpcodeGroups[ Instruction.ADD   ] = OpcodeGroup.OPERATORS;
OpcodeGroups[ Instruction.SUB   ] = OpcodeGroup.OPERATORS;

// =============================================================================

export function callLogHeader (msg : string = 'RUN:') {
    if (msg.length > 0) console.log(msg);
    console.log(ESC + '38;5;244;4;1mpid | pcounter | opcode   | stack' + RESET);
}

export function callLogFooter (msg : string) {
    if (msg.length > 0) console.log(msg);
}

export function logCall (frame : Frame, op : Op) {
    let name  = OpcodeNames[op.inst]  as string;

    let group      = OpcodeGroups[op.inst]    as number;
    let groupName  = OpcodeGroupNames[group]  as string;
    let groupColor = OpcodeGroupColors[group] as string;

    console.log(`${formatNum(frame.pid, 3)} | ${formatNum(frame.pc, 8)} | ${groupColor + name.padEnd(8, ' ') + RESET} | ${frame.stack.join(', ')}`);
}

// ...

export function warpLogHeader (msg : string) {
    if (msg.length > 0) console.log(msg);
}

export function warpLogFooter (msg : string) {
    if (msg.length > 0) console.log(msg);
}

// ...

export function resultLogHeader (msg : string = 'RESULTS:') {
    if (msg.length > 0) console.log(msg);
}

export function dumpFrame (frame : Frame) {
    console.log(`F @ pid: ${formatNum(frame.pid, 3)} ip: ${formatNum(frame.ip, 3)} pc: ${formatNum(frame.pc, 8)} stack: [ ${frame.stack.length == 0 ? '~' : frame.stack.join(', ')} ]`);
}

export function tickLine (tick : number) {
    console.log(`-- tick(${tick}) -------------------------------------------------`);
}

export function dumpQueues (queues : any[][]) : void {
    console.log(`QUEUES:`);
    for (let i = 0; i < OpcodeNames.length; i++) {
        let name  = OpcodeNames[i] as string;
        let queue = queues[i] as any[];
        console.log(`${queue.length > 0 ? '+' : '-'} ${name.toUpperCase().padEnd(8, ' ')} | ${queue.join(' | ')} `);
    }
}
