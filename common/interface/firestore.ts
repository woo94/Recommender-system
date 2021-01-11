export interface UserDictionary {
    uid: string;
    bt: number;
    ex: string;
    fo1: number;
    fo2: number;
    fo3: number;
    fo4: number;
    lo1: number;
    lo2: number;
    sx: boolean;
    ut: {
        seconds: number;
        nanoseconds: number;
    }
}

export interface FilterDictionary {
    sx: boolean;
    minAge: number;
    maxAge: number;
    lo1: number;
    lo2: number;
    loDev: number;
    sFo1: number;
    sFo2: number;
    sFo3: number;
    sFo4: number;
    gFo1: number;
    gFo2: number;
    gFo3: number;
}

export interface RequestDictionary {
    uid: string;
    resIndex: number;
    isMan: boolean;
    name: string;
    date: string;
    manager: string;
}

export interface MlistDictionary {
    cdit: number;
    in1: number;
    in2: number;
    ind1: number;
    mid: Array<string>;
    num: number;
    pid: string;
    psx: boolean;
    tp: any;
    r: boolean;
    type: number;
    uid: string;
}

export interface GroupDictionary {
    bt: number;
    ex: string;
    fo1: number;
    fo2: number;
    fo3: number;
    gid: string;
    ind1: boolean;
    ind2: boolean;
    lo: string;
    lo1: number;
    lo2: number;
    ltp: number;
    ms: boolean;
    na: string;
    num: number;
    ps: boolean;
    st: string;
    tp: {
        seconds: number;
        nanoseconds: number;
    }
    uid1: string;
    uid2: string;
    uid3: string;
    uid4: string;
}

export interface PbDictionary {
    na: string;
    ph: string;
    uid: string;
    tp: {
        seconds: number;
        nanoseconds: number;
    }
}