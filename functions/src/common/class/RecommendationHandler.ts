import { _documentWithOptions } from 'firebase-functions/lib/providers/firestore'
import * as r from '../interface/recommendation'

export class RecommendationHandler {
    private isSufficient: boolean
    readonly quantitative: {
        total: number;
        solo: number;
        group: number;
    }
    private soloDocs: Map<string, r._entity>;
    private groupDocs: Map<string, r._entity>;
    private metadata: {        
        sex: boolean;
        totalNum: number;
        // totalNum = soloNum + groupNum
        soloNum: number;
        groupNum: number;
    }

    constructor(sx: boolean, quantitative: {total: number; solo: number; group: number}) {
        // this.isEmpty = true
        this.isSufficient = false
        this.quantitative = quantitative
        this.soloDocs = new Map()
        this.groupDocs = new Map()
        this.metadata = {
            sex: sx,
            totalNum: 0,
            soloNum: 0,
            groupNum: 0,
        }
    }

    public updateMetadata(updateObject: { totalNum?: number, soloNum?: number, groupNum?: number}) {
        if(updateObject.totalNum) {
            this.metadata.totalNum = updateObject.totalNum
        }
        if(updateObject.soloNum) {
            this.metadata.soloNum = updateObject.soloNum
        }
        if(updateObject.groupNum) {
            this.metadata.groupNum = updateObject.groupNum
        }
    }

    public setSolo(solo: r.solo_user) {
        const _k = solo.id
        const _v: r._entity = {
            cdit: 0,
            sex: this.metadata.sex,
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
            num: group.member_id.length,
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
        if(this.metadata.totalNum < 3) {
            this.isSufficient = false
        }
        else {
            this.isSufficient = true
        }

        return {
            isSufficient: this.isSufficient,
            metadata: this.metadata,
            soloDocs: this.soloDocs,
            groupDocs: this.groupDocs,
        }
    }
}