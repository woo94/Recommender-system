import * as functions from 'firebase-functions'
import { MongoClient } from 'mongodb'

import { RecommendationHandler } from '../common/class/RecommendationHandler'
import { ProcessWorker } from '../common/class/ProcessWorker'

import { config } from '../common/config'
import { peer_connection_string } from '../common/mongo_connection'

import * as f from '../common/interface/firestore'
import * as m from '../common/interface/mongodb'
import * as r from '../common/interface/recommendation'
import { onCallReturn } from '../common/interface/cloudFunction'

import { create_solo_user, create_mlist_detail } from '../common/function/createMongoDoc'
import { parseFilterOption, UserDictionary } from '../common/function/firestoreDictionary'
import { getRandomNumMinToMax } from '../common/function/general'


const TAG  = 'ShotBoosterLog'

export const ShotBoosterLog = functions.https.onCall(async (data, context): Promise<onCallReturn> => {
    let userData;
    if(context.auth) {
        userData = UserDictionary(data.userData, context.auth.uid)
    }
    else {
        return {
            type: 'error',
            error: 'No context.auth',
        }
    }
    const filterData: f.FilterDictionary = data.filterData

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
                error: worker.error_message,
            }
        }
    }
    catch(e) {
        console.log(e)
        return {
            type: 'error',
            error: e.message,
        }
    }

    console.log(ret_rHandler)
    // ret_rHandler로부터 시이작 declared at line 35, assigned at line 39
    console.log('start!')




    return {
        type: 'success',
    }
})

async function MongoFunc(userData:f.UserDictionary, filterData: f.FilterDictionary): Promise< ProcessWorker | RecommendationHandler> {
    const m_userDoc = create_solo_user(userData)
    const filterOption = parseFilterOption(filterData)

    const myId = m_userDoc.id
    const psx = filterData.sx

    const worker = new ProcessWorker(TAG, m_userDoc.id)
    const client = new MongoClient(peer_connection_string, {useNewUrlParser: true, useUnifiedTopology: true})
    try {
        await client.connect()
        worker.inc_counter()
    }
    catch(e) {
        worker.setProcessor(e.message)
        return worker
    }

    const dlist_solo: Array<string> = [];
    try {
        const my_mmlist = await client.db(config.mlist).collection(config.mmlist).findOne(
            { id: myId },
            { projection: { dlist_solo: 1 } }
        )

        if(!my_mmlist) {
            throw new Error(`No mmlist for ${myId}`)
        }
        my_mmlist.dlist_solo.forEach((doc: any) => {
            dlist_solo.push(doc.id)
        })
        worker.inc_counter()
    }
    catch(e) {
        worker.setProcessor(e.message)
        await client.close()
        return worker
    }

    let queryResult: Array<r.solo_user>
    try {
        queryResult = await client.db(config.user).collection(psx ? 'male' : 'female').aggregate([
            {
                $geoNear: {
                    near: m_userDoc.location,
                    distanceField: "distance",
                    key: "location",
                    query: {
                        status: true,
                        type: 's',
                        id: { $nin: [myId, ...dlist_solo] },
                        lt: { $gt: m_userDoc.lt - (86400 * 14) },
                        bt: { $gt: filterOption.minBt - (2 * 10000), $lt: filterOption.maxBt + (2 * 10000)},
                    },
                },
            },
            { $limit: 20 },
            { $unset: "_ct" },
        ]).toArray()

        worker.inc_counter()
    }
    catch(e) {
        worker.setProcessor(e.message)
        await client.close()
        return worker
    }

    const _rHandler = new RecommendationHandler(psx, {total: 20, solo: 20, group: 0})

    queryResult.forEach(doc => {
        doc.cdit = getRandomNumMinToMax(9000, 9999)
        _rHandler.setSolo(doc)
    })
    
    const ret_rHandler = _rHandler.retrieve()
    
    const soloMlistDetail: Array<m.mlist_detail> = []
    ret_rHandler.soloDocs.forEach((val: r._entity, key: string) => {
        soloMlistDetail.push(create_mlist_detail(myId, key, 1, 's', val.cdit))
    })

    try {
        const insertManyResult = await client.db(config.mlist).collection(config.mlist_detail).insertMany(soloMlistDetail)
        if(insertManyResult.insertedCount !== soloMlistDetail.length) {
            throw new Error(`db('mlist').collection('mlist_detail') insertMany failed`)
        }
        return _rHandler
    }
    catch(e) {
        worker.setProcessor(e.message)
        return worker
    }
    finally {
        await client.close()
    }
}