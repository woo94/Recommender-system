import * as ps from '../process_scheduler'

interface Processor {
    TAG: string;
    caller: string;
    scheduled_process: Array<string>;
    process_counter: number;
    error_process: string;
    error_message: string;
}

export class ProcessWorker {
    private P: Processor;

    constructor(TAG: string, caller: string='background-trigger') {
        this.P = {
            TAG: TAG,
            caller: caller,
            scheduled_process: ps.scheduler[TAG],
            process_counter: 0,
            error_process: '',
            error_message: ''
        }
    }

    public inc_counter() {
        this.P.process_counter++;
    }

    public setProcessor(message: string) {
        this.P.error_message = message
        this.P.error_process = this.P.scheduled_process[this.P.process_counter]
    }

    public getProcessor(): Processor {
        return this.P
    }
}