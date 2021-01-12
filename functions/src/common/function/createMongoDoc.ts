import { UserDictionary, GroupDictionary } from '../interface/firestore'
import * as m from '../interface/mongodb'

export function create_solo_user(userData: UserDictionary): m.solo_user {
    return {
        id: userData.uid,
        type: 's',
        fo1: userData.fo1,
        fo2: userData.fo2,
        fo3: userData.fo3,
        fo4: userData.fo4,
        lt: userData.ut.seconds,
        bt: userData.bt,
        status: true,
        location: {
            type: 'Point',
            coordinates: [userData.lo2/1000000, userData.lo1/1000000],
        },
        _ct: new Date(),
    }
}

export function create_group_user(groupData: GroupDictionary): m.group_user {
    const member_id: Array<string> = []
    
    switch(groupData.num) {
        case 2:
            member_id.push(groupData.uid1, groupData.uid2)
            break;
        case 3:
            member_id.push(groupData.uid1, groupData.uid2, groupData.uid3)
            break;
        case 4:
            member_id.push(groupData.uid1, groupData.uid2, groupData.uid3, groupData.uid4)
            break;
    }
    
    return {
        id: groupData.gid,
        member_id: member_id,
        type: 'g',
        fo1: groupData.fo1,
        fo2: groupData.fo2,
        fo3: groupData.fo3,
        lt: groupData.tp.seconds,
        bt: groupData.bt,
        status: true,
        location: {
            type: "Point",
            coordinates: [groupData.lo2/1000000, groupData.lo1/1000000],
        },
        _ct: new Date(),
    }
}


export function create_mmlist(id: string, type: 's' | 'g'): m.mmlist {
    return {
        id: id,
        type: type,
        dlist_solo: [],
        dlist_group: [],
        _ct: new Date(),
    }
}

export function create_mlist_detail(triggBy: string, destTo: string, code: number, type: 's' | 'g', cdit: number): m.mlist_detail {

    return {
        ids: [triggBy, destTo],
        cdit: cdit,
        type: type,
        logs: [
            m._logGen(triggBy, destTo, code),
        ],
        _ct: new Date(),
    }
}


export function create_mlist_detail_log(triggBy: string, destTo: string, code: number) {
    return m._logGen(triggBy, destTo, code)
}