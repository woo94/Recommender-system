import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { MongoClient } from 'mongodb'
import { config } from '../common/config'
import { peer_connection_string } from '../common/mongo_connection'
import { UserDictionary } from '../common/function/firestoreDictionary'
import { parseFilterOption } from '../common/function/firestoreDictionary'
import { UtilityFunction } from '../common/class/UtilityFunction'
import { RecommendationHandler } from '../common/class/RecommendationHandler'
import { create_solo_user, create_mlist_detail } from '../common/function/createMongoDoc'

import * as f from '../common/interface/firestore'
import * as m from '../common/interface/mongodb'
import * as r from '../common/interface/recommendation'
import { ProcessWorker } from '../common/class/ProcessWorker'
import { onCallReturn } from '../common/interface/cloudFunction'

const FieldValue = admin.firestore.FieldValue
const TAG = 'ShotUserLog'

export const ShotUserLog = functions.https.onCall(async (data, context): Promise<onCallReturn> => {
    let userData;
    if(context.auth) {
        userData = UserDictionary(data.userData, context.auth.uid)
    }
    else {
        // Context error
        return {
            type: 'error',
            error: 'No context.auth'
        }
    }
    let filterData: f.FilterDictionary = data.filterData
    
    let ret_rHandler: r.recommendation
    try {
        const mongoResult = await MongoFunc(userData, filterData)
        if(mongoResult instanceof RecommendationHandler) {
            ret_rHandler = mongoResult.retrieve()
        }
        else {
            const worker = mongoResult.getProcessor()
            console.log(worker)
            return {
                type: 'error',
                error: worker.error_message
            }
        }
    }
    catch(e) {
        console.log(e)
        return {
            type: 'error',
            error: e.message
        }
    }

    console.log(ret_rHandler)
    // ret_rHandler로부터 시이작. delcared at line 35. assigned at line 39
    console.log('start!')




    return {
        type: 'success'
    }
})

async function MongoFunc(userData: f.UserDictionary, filterData: f.FilterDictionary): Promise< ProcessWorker | RecommendationHandler> {
    const myId = userData.uid
    const psx = filterData.sx
    const m_userDoc = create_solo_user(userData)
    const filterOption = parseFilterOption(filterData)

    const worker = new ProcessWorker(TAG, myId)

    const client = new MongoClient(peer_connection_string, { useNewUrlParser: true, useUnifiedTopology: true })
    try {
        await client.connect()
        worker.inc_counter()
    }
    catch(e) {
        worker.setProcessor(e.message)
        return worker
    }

    const dlist_solo: Array<string> = []
    const dlist_group: Array<string> = []
    try {
        const my_mmlist = await client.db(config.mlist).collection(config.mmlist).findOne(
            {
            id: myId
            },
            {
                projection: {
                    dlist_solo: 1,
                    dlist_group: 1
                }
            }
        )
        if(!my_mmlist) {
            throw new Error(`id of ${myId} not exists in db('mlist').collection('mmlist')`)
        }

        my_mmlist.dlist_solo.forEach((doc: any) => {
            dlist_solo.push(doc.id)
        })

        my_mmlist.dlist_group.forEach((doc: any) => {
            dlist_group.push(doc.id)
        })

        worker.inc_counter()
    }
    catch(e) {
        worker.setProcessor(e.message)
        await client.close()
        return worker
    }
    
    const _Util = new UtilityFunction(m_userDoc, filterOption, [])
    const _rHandler = new RecommendationHandler(psx, _Util.quantitative)

    let queryResult;
    try {
        queryResult = await client.db(config.user).collection(psx ? 'male' : 'female').aggregate([
            {
                $geoNear: {
                    near: m_userDoc.location,
                    distanceField: "distance",
                    key: "location",
                    maxDistance: filterOption.boundary * 2,
                    query: {
                        status: true,
                        id: { $nin: [myId, ...dlist_solo, ...dlist_group] },
                        lt: { $gt: m_userDoc.lt - (86400 * 14) },
                        bt: { $gt: filterOption.minBt - (2 * 10000), $lt: filterOption.maxBt + (2 * 10000)}
                    }
                }
            },
            { $limit: 800 },
            {
                $group: {
                    _id: "$type",
                    docs: {
                        $push: {
                            id: "$id",
                            member_id: "$member_id",
                            type: "$type",
                            fo1: "$fo1",
                            fo2: "$fo2",
                            fo3: "$fo3",
                            fo4: "$fo4",
                            lt: "$lt",
                            bt: "$bt",
                            status: "$status",
                            location: "$location",
                            distance: { $floor: "$distance" }
                        }
                    }
                }
            }
        ]).toArray()
        worker.inc_counter()
    }
    catch(e) {
        worker.setProcessor(e.message)
        await client.close()
        return worker
    }

    let soloArr: Array<r.solo_user> = []
    let groupArr: Array<r.group_user> = []

    queryResult.forEach(doc => {
        if(doc._id === 's') {
            soloArr = doc.docs
        }
        else {
            groupArr = doc.docs
        }
    })

    soloArr.forEach(doc => {
        doc.cdit = _Util.scoreCdit(doc)
    })

    groupArr.forEach(doc => {
        doc.cdit = _Util.scoreCdit(doc)
    })

    soloArr = soloArr.sort((a,b) => {
        if(a.cdit && b.cdit) {
            return b.cdit - a.cdit
        }
        else {
            return 0
        }
    }).slice(0, _Util.quantitative.solo)

    groupArr = groupArr.sort((a,b) => {
        if(a.cdit && b.cdit) {
            return b.cdit - a.cdit
        }
        else {
            return 0
        }
    }).slice(0, _Util.quantitative.group)

    soloArr.forEach(doc => {
        _rHandler.setSolo(doc)
    })
    groupArr.forEach(doc => {
        _rHandler.setGroup(doc)
    })

    const ret_rHandler = _rHandler.retrieve()

    if(ret_rHandler.isEmpty) {
        await client.close()
        return _rHandler
    }

    const soloMlistDetail: Array<m.mlist_detail> = []
    const groupMlistDetail: Array<m.mlist_detail> = []

    ret_rHandler.soloDocs.forEach((val: r._entity, key: string) => {
        soloMlistDetail.push(create_mlist_detail(myId, key, 1, 's', val.cdit))
    })

    ret_rHandler.groupDocs.forEach((val: r._entity, key: string) => {
        groupMlistDetail.push(create_mlist_detail(myId, key, 1, 'g', val.cdit))
    })

    try {
        const insertManyResult = await client.db(config.mlist).collection(config.mlist_detail).insertMany([...soloMlistDetail, ...groupMlistDetail])
        if(insertManyResult.insertedCount !== (soloMlistDetail.length + groupMlistDetail.length)) {
            throw new Error(`db('mlist').collection('mlist_detail') insertMany failed`)
        }
        return _rHandler;
    }
    catch(e) {
        worker.setProcessor(e.message)
        return worker
    }
    finally {
        await client.close()
    }
}
