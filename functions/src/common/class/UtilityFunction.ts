import { Criteria } from './Criteria'

import * as r from '../interface/recommendation'
import * as m from '../interface/mongodb'

export class UtilityFunction extends Criteria {
    private maxTimeDiff: number
    // private quantitative: {total: number; solo: number; group: number;}

    public constructor(myInfo: m.solo_user, filterOption: r.filterOption, myGroup: Array<m.group_user>) {
        super(myInfo, filterOption, myGroup);
        this.maxTimeDiff = 86400 * 14
    }

    get quantitative() {
        return {
            total: this.numberOfRecommendation,
            solo: this.numberOfRecommendation - this.numberOfGroup,
            group: this.numberOfGroup,
        }
    }

    private scoreSolo(partnerInfo: r.solo_user): number {
        const timeDiff: number = this.myInfo.lt - partnerInfo.lt

        const distance: number = partnerInfo.distance

        const fo1_suit: number = (() => {
            const val: number | undefined = this.solo_fo1.get(partnerInfo.fo1)
            if (val) return val
            else return 0
        })()
        const fo2_suit: number = (() => {
            const val: number | undefined = this.solo_fo2.get(partnerInfo.fo2)
            if (val) return val
            else return 0
        })()
        const fo3_suit: number = (() => {
            const val: number | undefined = this.solo_fo3.get(partnerInfo.fo3)
            if (val) return val
            else return 0
        })()

        const userCoefficient: number = 1 + fo1_suit + fo2_suit + fo3_suit

        const t_base: number = (() => {
            if (timeDiff > this.maxTimeDiff) {
                return 0;
            }
            else {
                return this.maxBase_solo * (1 - (timeDiff / this.maxTimeDiff))
            }
        })()

        const d_base: number = (() => {
            if (distance > this.myInfo.boundary) {
                return 0;
            }
            else {
                return this.maxBase_solo * (1 - (distance / this.myInfo.boundary))
            }
        })()
        

        return Math.floor(userCoefficient * Math.pow(t_base, this.t_Exponent_solo) * Math.pow(d_base, this.d_Exponent_solo))
    }

    private scoreGroup(groupInfo: r.group_user): number {
        const timeDiff: number = this.myInfo.lt - groupInfo.lt

        const distance: number = groupInfo.distance

        const t_base: number = (() => {
            if (timeDiff > this.maxTimeDiff) {
                return 0
            }
            else {
                return 10000 * (1 - (timeDiff / this.maxTimeDiff))
            }
        })()

        const d_base: number = (() => {
            if (distance > this.myInfo.boundary) {
                return 0;
            }
            else {
                return 10000 * (1 - (distance / this.myInfo.boundary))
            }
        })()

        return Math.floor(Math.pow(t_base, this.t_Exponent_group) * Math.pow(d_base, this.d_Exponent_group))
    }

    public scoreCdit(entity: r.solo_user | r.group_user): number {
        if (entity.type === 's') {
            return this.scoreSolo(entity)
        }
        else {
            return this.scoreGroup(entity)
        }
    }
}
