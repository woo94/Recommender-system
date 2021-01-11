import * as f from '../interface/firestore'
import * as r from '../interface/recommendation'
import {firestore} from 'firebase-admin'

export function GroupDictionary(data: FirebaseFirestore.DocumentData): f.GroupDictionary {
	return {
		bt: data.bt,
		ex: data.ex,
		fo1: data.fo1,
		fo2: data.fo2,
		fo3: data.fo3,
		gid: data.gid,
		ind1: data.ind1,
		ind2: data.ind2,
		lo: data.lo,
		lo1: data.lo1,
		lo2: data.lo2,
		ltp: data.ltp,
		ms: data.ms,
		na: data.na,
		num: data.num,
		ps: data.ps,
		st: data.st,
		tp: data.tp,
		uid1: data.uid1,
		uid2: data.uid2,
		uid3: data.uid3,
		uid4: data.uid4
	}
}

export function UserDictionary(data: FirebaseFirestore.DocumentData, uid: string): f.UserDictionary {
    return {
        uid : uid,
        bt : data.bt,
        ex : data.ex,
        fo1 : data.fo1,
        fo2 : data.fo2,
        fo3 : data.fo3,
        fo4 : data.fo4,
        lo1 : data.lo1,
        lo2 : data.lo2,
        sx : data.sx,
        ut : data.ut
    }
}

export function parseFilterOption(filterData: f.FilterDictionary): r.filterOption{
	const today = new Date();
	const t_year = today.getFullYear();
	const t_month = today.getMonth() + 1;
	const t_date = today.getDate();

	const todayBt = t_year * 10000 + t_month * 100 + t_date

	return {
		boundary: filterData.loDev * 1000,
		minBt: todayBt - ((filterData.maxAge + 1) * 10000),
		maxBt: todayBt - ((filterData.minAge) * 10000)
	}
}

export function PbDictionary(data: FirebaseFirestore.DocumentData): f.PbDictionary{
    return {
        na : data.na,
        ph : data.ph,
        uid : data.uid,
        tp : data.tp
    }
}