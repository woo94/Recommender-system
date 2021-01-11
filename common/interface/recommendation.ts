import * as m from './mongodb'

export interface _entity {
    cdit: number;
    sex: boolean;
    
    uidArr?: Array<string>;
    num?: number;
}

export interface filterOption {
    boundary: number;
    maxBt: number;
    minBt: number;
}

export interface recommendation {
    isEmpty: boolean;

    metadata: {
        sex: boolean;

        totalNum: number;

        soloNum: number;
        groupNum: number;
    }

    soloDocs: Map<string, _entity>;
    groupDocs: Map<string, _entity>;
}

export interface solo_user extends m.solo_user {
    distance: number; 
    cdit?: number;
}

export interface group_user extends m.group_user {
    distance: number;
    cdit?: number;
}

export type compound_user = solo_user | group_user