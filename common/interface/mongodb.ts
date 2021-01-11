import { ObjectId } from 'mongodb'

export interface solo_user {
    id: string;
    type: 's';
    fo1: number;
    fo2: number;
    fo3: number;
    fo4: number;
    lt: number;
    bt: number;
    status: boolean;
    location: Location;
    _ct?: Date;
}

export interface group_user {
    id: string;
    member_id: Array<string>;
    type: 'g';
    fo1: number;
    fo2: number;
    fo3: number;
    lt: number;
    bt: number;
    status: boolean;
    location: Location;
    _ct?: Date;
}

export interface dlist {
    id: string;
    docId: ObjectId;
    cdit: number
}

export interface mmlist{
    id: string;
    type: string;
    dlist_solo: Array<dlist>;
    dlist_group: Array<dlist>;
    _ct: Date;
}

interface _log {
    event: 'interaction' | 'block' | 'recommend' | '';
    tp: Date;
    triggBy: string;
    destTo: string;
    code: number;
    message: string;
}

export function _logGen(triggBy: string, destTo: string, code: number): _log {
    let event: 'recommend' | 'block' | 'interaction' | ''
        let message: string        

        switch (code) {
            case 1:
                event = 'recommend';
                message = `${destTo} is recommended to ${triggBy}`
                break;
            case 2:
                event = 'block';
                message = `${triggBy} blocks ${destTo}`;
                break;
            case 3:
                event = 'block';
                message = `Early block ${triggBy} to ${destTo} been applied due to ${destTo} sign up`;
                break;
            case 4:
                event = 'interaction'
                message = `${triggBy} encountered ${destTo} but send no signals`
                break;
            case 5:
                event = 'interaction';
                message = `${triggBy} sends like to ${destTo}`
                break;
            case 6:
                event = 'interaction';
                message = `${triggBy} sends deli to ${destTo}`;
                break;
            case 7:
                event = 'interaction';
                message = `Match accepted by ${triggBy}`
                break;
            case 8:
                event = 'interaction';
                message = `Match canceled by ${triggBy}`;
                break;
            default:
                event = '';
                message = ''
        }

        return {
            event: event,
            tp: new Date(),
            triggBy: triggBy,
            destTo: destTo,
            code: code,
            message: message
        }
}

export interface mlist_detail {
    ids: [id1: string, id2: string];
    cdit: number;
    type: 's' | 'g';
    logs: Array<_log>;
    _ct: Date;
}

export interface Location {
    type: "Point",
    coordinates: [number, number]
}