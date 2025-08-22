
import { Op, Instruction, HALT } from './Core'

export class OpAllocator {
    public pool : Op[] = [];

    alloc (inst : Instruction, data : any[] = []) : Op {
        let opIndex = this.pool.length;

        let op : Op = {
            addr : opIndex,
            inst : inst,
            next : HALT,
            data : data
        } as Op;

        this.pool.push(op)

        return op;
    }
}



