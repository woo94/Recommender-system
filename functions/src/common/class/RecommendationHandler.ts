import { _documentWithOptions } from 'firebase-functions/lib/providers/firestore'
import * as r from '../interface/recommendation'

export class RecommendationHandler {
    private soloDocs: Map<string, r._entity>;
    private groupDocs: Map<string, r._entity>;
    private isEmpty: boolean;

    readonly quantitative: {
        total: number;
        solo: number;
        group: number;
    }

    private metadata: {        
        sex: boolean;

        totalNum: number;
        // totalNum = soloNum + groupNum
        soloNum: number;
        groupNum: number;
    }

    constructor(sx: boolean, quantitative: {total: number; solo: number; group: number}) {
        this.isEmpty = true
        this.quantitative = quantitative
        this.soloDocs = new Map()
        this.groupDocs = new Map()
        this.metadata = {
            sex: sx,
            totalNum: 0,
            soloNum: 0,
            groupNum: 0
        }
    }

    public setSolo(solo: r.solo_user) {
        const _k = solo.id
        const _v: r._entity = {
            cdit: 0,
            sex: this.metadata.sex
        }
        if(solo.cdit) {
            _v.cdit = solo.cdit
        }

        if(this.soloDocs.size < this.quantitative.solo) {
            this.soloDocs.set(_k, _v)
            this.metadata.totalNum++
            this.metadata.soloNum++
        }
    }

    public setGroup(group: r.group_user) {
        const _k = group.id
        const _v: r._entity = {
            cdit: 0,
            sex: this.metadata.sex,
            uidArr: group.member_id,
            num: group.member_id.length
        }
        if(group.cdit) {
            _v.cdit = group.cdit
        }

        if(this.groupDocs.size < this.quantitative.group) {
            this.groupDocs.set(_k, _v)
            this.metadata.totalNum++
            this.metadata.groupNum++
        }
    }

    public retrieve(): r.recommendation {
        if(this.soloDocs.size !== 0 || this.groupDocs.size !== 0) {
            this.isEmpty = false
        }

        return {
            isEmpty: this.isEmpty,
            metadata: this.metadata,
            soloDocs: this.soloDocs,
            groupDocs: this.groupDocs
        }
    }
}