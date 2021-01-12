import { filterOption } from '../interface/recommendation'
import { solo_user, group_user } from '../interface/mongodb'

export class Criteria {
    protected myInfo: solo_user & filterOption
    protected myGroup: Array<group_user>
    protected numberOfRecommendation: number
    protected numberOfGroup: number

    protected solo_fo1: Map<number, number>
    protected solo_fo2: Map<number, number>
    protected solo_fo3: Map<number, number>

    protected t_Exponent_solo: number
    protected d_Exponent_solo: number
    protected maxCoefficient_solo: number
    protected maxBase_solo: number;

    protected t_Exponent_group: number;
    protected d_Exponent_group: number;

    protected constructor(myInfo: solo_user, filterOption: filterOption, myGroup: Array<group_user>) {
        this.myInfo = Object.assign(myInfo, filterOption)
        this.myGroup = myGroup
        this.numberOfRecommendation = 20
        this.numberOfGroup = 4

        this.solo_fo1 = new Map()
        this.solo_fo2 = new Map()
        this.solo_fo3 = new Map()

        this.t_Exponent_solo = 0
        this.d_Exponent_solo = 0
        this.maxCoefficient_solo = 0
        this.maxBase_solo = 0

        this.t_Exponent_group = 1 / 2
        this.d_Exponent_group = 1 / 2

        this.setBasedOnSolo_fo4()
        this.setBasedOnSolo_fo1()
        this.defineMaxCoefficient_solo()
        this.defineNumberOfGroup()
    }

    private upsertMap(mapName: 'solo_fo1' | 'solo_fo2' | 'solo_fo3', ...keys: Array<number>): void {
        for(const key of keys) {
            const map = this[mapName]
            const value = map.get(key)
            if(value) {
                map.set(key, value+1)
            }
            else {
                map.set(key, 1);
            }
        }
    }

    private setBasedOnSolo_fo4(): void {
        switch(this.myInfo.fo4) {
            case 0:
                this.upsertMap('solo_fo1', 2, 4)
                this.upsertMap('solo_fo2', 2, 4, 7)
                break;
            case 1:
                this.upsertMap('solo_fo2', 0, 5, 8)
                break;
            case 2:
                this.upsertMap('solo_fo2', 4, 7)
                break;
            case 3:
                this.upsertMap('solo_fo1', 5, 6, 7, 8)
                break;
            case 4:
                this.upsertMap('solo_fo1', 8)
                this.upsertMap('solo_fo1', 8)
                break;
            case 5:
                this.upsertMap('solo_fo2', 4)
                this.upsertMap('solo_fo3', 2, 3, 8)
                break;
            case 6:
                this.upsertMap('solo_fo2', this.myInfo.fo2)
                this.upsertMap('solo_fo3', this.myInfo.fo3)
                break;
            case 7:
                switch(this.myInfo.fo2) {
                    case 0:
                        this.upsertMap('solo_fo2', 3, 4, 7)
                        break;
                    case 1:
                        this.upsertMap('solo_fo2', 2, 3)
                        break;
                    case 2:
                        this.upsertMap('solo_fo2', 1, 5)
                        break;
                    case 3:
                        this.upsertMap('solo_fo2', 1, 4, 7)
                        break;
                    case 4:
                        this.upsertMap('solo_fo2', 0, 3, 5)
                        break;
                    case 5:
                        this.upsertMap('solo_fo2', 2, 4)
                        break;
                    case 6:
                        this.upsertMap('solo_fo2', 8)
                        break;
                    case 7:
                        this.upsertMap('solo_fo2', 0, 3)
                        break;
                    case 8:
                        this.upsertMap('solo_fo2', 6, 1);
                        break;
                }
        }
    }

    private setBasedOnSolo_fo1():void {
        switch(this.myInfo.fo1) {
            case 0: 
                this.upsertMap('solo_fo1', 0)
                this.t_Exponent_solo = parseFloat((1/3).toFixed(2))
                this.d_Exponent_solo = parseFloat((2/3).toFixed(2))
                break;
            case 1:
                this.upsertMap('solo_fo1', 1)
                this.t_Exponent_solo = 0.99;
                this.d_Exponent_solo = 0.01;
                break;           
            case 2:
                this.upsertMap('solo_fo1', 2)
                this.t_Exponent_solo = parseFloat((1/3).toFixed(2))
                this.d_Exponent_solo = parseFloat((2/3).toFixed(2))
                break;
            case 3:
                this.upsertMap('solo_fo3', this.myInfo.fo3);
                this.t_Exponent_solo = 0.99;
                this.d_Exponent_solo = 0.01;
                break;
            case 4:
                this.t_Exponent_solo = 0.99;
                this.d_Exponent_solo = 0.01
                break;
            case 5:
                this.upsertMap('solo_fo1', 5);
                this.upsertMap('solo_fo3', this.myInfo.fo3)
                this.t_Exponent_solo = 0.99;
                this.d_Exponent_solo = 0.01;
                break;
            case 6:
                this.upsertMap('solo_fo1', 6);
                this.t_Exponent_solo = parseFloat((1/3).toFixed(2))
                this.d_Exponent_solo = parseFloat((2/3).toFixed(2))
                break;
            case 7:
                this.upsertMap('solo_fo1', 7);
                this.upsertMap('solo_fo3', this.myInfo.fo3)
                this.t_Exponent_solo = 0.99;
                this.d_Exponent_solo = 0.01;
                break;
            case 8:
                this.upsertMap('solo_fo1', 8)
                this.upsertMap('solo_fo3', this.myInfo.fo3)
                this.t_Exponent_solo = parseFloat((1/3).toFixed(2))
                this.d_Exponent_solo = parseFloat((2/3).toFixed(2))
                break;
        }
    }

    private defineMaxCoefficient_solo(): void {
        let totalVal: number = 1;

        totalVal += Array.from(this.solo_fo1.values()).reduce((accumVal: number, currVal: number): number => {
            if(currVal > accumVal) return currVal
            else return accumVal
        }, 0)

        totalVal += Array.from(this.solo_fo2.values()).reduce((accumVal: number, currVal: number): number => {
            if(currVal > accumVal) return currVal
            else return accumVal
        }, 0)

        totalVal += Array.from(this.solo_fo3.values()).reduce((accumVal: number, currVal: number): number => {
            if(currVal > accumVal) return currVal
            else return accumVal
        }, 0)
        
        this.maxCoefficient_solo = totalVal
        this.maxBase_solo = Math.floor(10000 / this.maxCoefficient_solo)
    }

    private defineNumberOfGroup():void {
        if([1, 3, 5, 7].includes(this.myInfo.fo1)) {
            this.numberOfGroup++
            if(this.myInfo.fo1 === 1) {
                this.numberOfGroup++   
            }
        }
        
        if([3, 5, 8].includes(this.myInfo.fo2)) {
            this.numberOfGroup++   
        }
        
        if([0, 1, 5].includes(this.myInfo.fo3)) {
            this.numberOfGroup++   
        }
    }
}
