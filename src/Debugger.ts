
import {
    Frame,
    Op,
} from './Core'

import {
    OpcodeNames,
} from './InstructionSet'


let formatNum = (n : number, x : number) : string => n.toString().padStart(x, '0');

// ...

export function callLogHeader (msg : string = 'RUN:') {
    if (msg.length > 0) console.log(msg);
    console.log('pid | pcounter | opcode   | stack');
}

export function callLogFooter (msg : string) {
    if (msg.length > 0) console.log(msg);
}

export function logCall (frame : Frame, op : Op) {
    let name = OpcodeNames[op.inst] as string;
    console.log(`${formatNum(frame.pid, 3)} | ${formatNum(frame.pc, 8)} | ${name.padEnd(8, ' ')} | ${frame.stack.join(', ')}`);
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
    console.log(`FRAME @ pid: ${formatNum(frame.pid, 3)} pc: ${formatNum(frame.pc, 8)} stack: [ ${frame.stack.length == 0 ? '~' : frame.stack.join(', ')} ]`);
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
