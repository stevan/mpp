// -----------------------------------------------------------------------------
//
// -----------------------------------------------------------------------------

export type Address = number;

export enum Instruction {
    ENTER,
    LEAVE,
    PRINT,
    CONST,
}

export type Frame = { ip : number, pc : number, stack : any[] }

export type Opcode = (frame : Frame, op : Op) => Address;

export const HALT = -1;

const INST = 0;
const ADDR = 1;
const DATA = 2;

export type Op = [
    Instruction, // self
    Address,     // next
    any[]
];

export type Program = Op[]

export const OpcodeNames : string[] = []
OpcodeNames[Instruction.ENTER] = 'enter';
OpcodeNames[Instruction.LEAVE] = 'leave';
OpcodeNames[Instruction.PRINT] = 'print';
OpcodeNames[Instruction.CONST] = 'const';

export const Opcodes : Opcode[] = []
Opcodes[Instruction.ENTER] = (frame : Frame, op : Op) : Address => { console.log('->enter', frame); return op[ADDR]; };
Opcodes[Instruction.LEAVE] = (frame : Frame, op : Op) : Address => { console.log('->leave', frame); return op[ADDR]; };
Opcodes[Instruction.PRINT] = (frame : Frame, op : Op) : Address => { console.log('->print', frame); console.log('<OUT>', frame.stack.pop()); return op[ADDR]; };
Opcodes[Instruction.CONST] = (frame : Frame, op : Op) : Address => { console.log('->const', frame); frame.stack.push(op[DATA][0]); return op[ADDR]; };

// -----------------------------------------------------------------------------
// Sequential Compiler
// -----------------------------------------------------------------------------

export type CompiledProgram = (frame : Frame) => void;

export function compile (program : Program) : CompiledProgram {
    return (frame : Frame) => {
        console.group('START ->');
        while (true) {
            let op     = program[frame.ip] as Op;      // fetch
            let opcode = Opcodes[op[INST]] as Opcode;  // decode
            frame.ip   = opcode(frame, op) as Address; // execute
            frame.pc++;
            // see if we should halt
            if (frame.ip == HALT) {
                console.groupEnd();
                console.log('HALT!');
                break;
            }
        }
    }
}

export function run (program : CompiledProgram) : Frame {
    let frame : Frame = { ip : 0, pc : 0, stack : [] };
    program(frame);
    return frame;
}

export function interpret (program : Program) : void {
    let frame = run(compile(program));
    console.log('FRAME', frame);
}



