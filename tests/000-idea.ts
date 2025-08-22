// -----------------------------------------------------------------------------
//
// -----------------------------------------------------------------------------

type Address = number;

enum Instruction {
    ENTER,
    LEAVE,
    PRINT,
    CONST,
}

type Frame = { ip : number, pc : number, stack : any[] }

type Opcode = (frame : Frame, op : Op) => Address;

const HALT = -1;

const INST = 0;
const ADDR = 1;
const DATA = 2;

type Op = [
    Instruction, // self
    Address,     // next
    any[]
];

type Program = Op[]

// -----------------------------------------------------------------------------
// setting up the interpreter
// -----------------------------------------------------------------------------

const OpcodeNames : string[] = []
OpcodeNames[Instruction.ENTER] = 'enter';
OpcodeNames[Instruction.LEAVE] = 'leave';
OpcodeNames[Instruction.PRINT] = 'print';
OpcodeNames[Instruction.CONST] = 'const';

const Opcodes : Opcode[] = []
Opcodes[Instruction.ENTER] = (frame : Frame, op : Op) : Address => { console.log('->enter', frame); return op[ADDR]; };
Opcodes[Instruction.LEAVE] = (frame : Frame, op : Op) : Address => { console.log('->leave', frame); return op[ADDR]; };
Opcodes[Instruction.PRINT] = (frame : Frame, op : Op) : Address => { console.log('->print', frame); console.log('<OUT>', frame.stack.pop()); return op[ADDR]; };
Opcodes[Instruction.CONST] = (frame : Frame, op : Op) : Address => { console.log('->const', frame); frame.stack.push(op[DATA][0]); return op[ADDR]; };

// -----------------------------------------------------------------------------
// Sequential Compiler
// -----------------------------------------------------------------------------

namespace Sequential {

    type CompiledProgram = (frame : Frame) => void;

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
}

// -----------------------------------------------------------------------------
// setting up the program
// -----------------------------------------------------------------------------

let HelloWorld : Program = [
    [ Instruction.ENTER,    1, [] ],
    [ Instruction.CONST,    2, [ "Hello World" ] ],
    [ Instruction.PRINT,    3, [] ],
    [ Instruction.LEAVE, HALT, [] ],
];

//Sequential.interpret(HelloWorld);

// -----------------------------------------------------------------------------

// FIXME - these kinda suck
export type POp   = [ Frame, Op ];      // parallel op
export type PAddr = [ Frame, Address ]; // parallel Addr

export type Queue = POp[];
export type Warp  = (q : Queue) => PAddr[];

export const Queues : Queue[] = []
Queues[Instruction.ENTER] = [];
Queues[Instruction.LEAVE] = [];
Queues[Instruction.PRINT] = [];
Queues[Instruction.CONST] = [];

export const Warps : Warp[] = [];
Warps[Instruction.ENTER] = (q : Queue) : PAddr[] => { return q.map((pop : POp) => { return [ pop[0] as Frame, (Opcodes[Instruction.ENTER] as Opcode)(pop[0] as Frame, pop[1] as Op) ] }) };
Warps[Instruction.LEAVE] = (q : Queue) : PAddr[] => { return q.map((pop : POp) => { return [ pop[0] as Frame, (Opcodes[Instruction.LEAVE] as Opcode)(pop[0] as Frame, pop[1] as Op) ] }) };
Warps[Instruction.PRINT] = (q : Queue) : PAddr[] => { return q.map((pop : POp) => { return [ pop[0] as Frame, (Opcodes[Instruction.PRINT] as Opcode)(pop[0] as Frame, pop[1] as Op) ] }) };
Warps[Instruction.CONST] = (q : Queue) : PAddr[] => { return q.map((pop : POp) => { return [ pop[0] as Frame, (Opcodes[Instruction.CONST] as Opcode)(pop[0] as Frame, pop[1] as Op) ] }) };

// just cause typescript complains too much
let E_Warp : Warp = Warps[Instruction.ENTER] as Warp;
let L_Warp : Warp = Warps[Instruction.LEAVE] as Warp;
let P_Warp : Warp = Warps[Instruction.PRINT] as Warp;
let C_Warp : Warp = Warps[Instruction.CONST] as Warp;

let E_queue : Queue = Queues[Instruction.ENTER] as Queue;
let L_queue : Queue = Queues[Instruction.LEAVE] as Queue;
let P_queue : Queue = Queues[Instruction.PRINT] as Queue;
let C_queue : Queue = Queues[Instruction.CONST] as Queue;

// -----------------------------------------------------------------------------

function processResults (results : PAddr[]) : void {
    results.forEach((a : PAddr) : void => {
        let frame = a[0] as Frame;
        let addr  = a[1] as Address;
        if (addr == HALT) return;

        let next  = HelloWorld[addr] as Op;
        frame.ip = addr;
        frame.pc++;
        (Queues[next[INST]] as Queue).push([ frame, next ]);
        return;
    })
}

(Queues[Instruction.ENTER] as Queue).push(
    [ { ip : 0, pc : 0, stack : [] } as Frame, HelloWorld[0] as Op ] as POp,
    [ { ip : 0, pc : 0, stack : [] } as Frame, HelloWorld[0] as Op ] as POp,
    [ { ip : 0, pc : 0, stack : [] } as Frame, HelloWorld[0] as Op ] as POp,
    [ { ip : 0, pc : 0, stack : [] } as Frame, HelloWorld[0] as Op ] as POp,
);

console.group('START ->');
let tick = 0;
while (true) {
    tick++;
    console.log(`-- ${tick} -------------------------------------------------`);

    console.group(`tick(${tick}) @ BEFORE`);
    console.log('ENTER->Q', E_queue);
    console.log('LEAVE->Q', L_queue);
    console.log('PRINT->Q', P_queue);
    console.log('CONST->Q', C_queue);
    console.groupEnd();

    console.group(`tick(${tick}) @ RUN`);
    // fetch   - splice the queue
    // decode  - not needed, inherent to the warp
    // execute - the warp handles it
    let E_results : PAddr[] = E_Warp(E_queue.splice(0));
    let L_results : PAddr[] = L_Warp(L_queue.splice(0));
    let P_results : PAddr[] = P_Warp(P_queue.splice(0));
    let C_results : PAddr[] = C_Warp(C_queue.splice(0));
    console.groupEnd();

    console.group(`tick(${tick}) = RESULTS`);
    console.log('ENTER->R', E_results);
    console.log('LEAVE->R', L_results);
    console.log('PRINT->R', P_results);
    console.log('CONST->R', C_results);
    console.groupEnd();

    processResults(E_results);
    processResults(L_results);
    processResults(P_results);
    processResults(C_results);

    if (E_queue.length == 0 &&
        L_queue.length == 0 &&
        P_queue.length == 0 &&
        C_queue.length == 0 ) {
        console.groupEnd();
        console.log('HALT!');
        break;
    }
}

/*

NOTES:

- we have more than 4 warps available
    - we can allocate additional warps for heavily used opcodes
        - they can act as overflow

- this ends up becoming a scheduling problem
    - if we want to keep the warps saturated
        - which is probably impossible
    - but in a multi-user/time-share system ???
        - can we borrow old stuff here?

*/


