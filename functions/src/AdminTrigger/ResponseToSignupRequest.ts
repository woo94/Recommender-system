import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as moment from 'moment'
import { ClientSession, MongoClient } from 'mongodb'

import { onCallReturn } from '../common/interface/cloudFunction'

import { UtilityFunction } from '../common/class/UtilityFunction'
import { RecommendationHandler } from '../common/class/RecommendationHandler'
import { ProcessWorker } from '../common/class/ProcessWorker'
import { config } from '../common/config'
import { peer_connection_string } from '../common/mongo_connection'
import { create_solo_user, create_mmlist, create_mlist_detail } from '../common/function/createMongoDoc'
import { UserDictionary } from '../common/function/firestoreDictionary'
import { handleAbortion, runCommitWithRetry, runTransaction } from '../common/function/customTransaction'
import * as f from '../common/interface/firestore'
import * as m from '../common/interface/mongodb'
import * as r from '../common/interface/recommendation'


admin.initializeApp()
const db = admin.firestore()
const FieldValue = admin.firestore.FieldValue

const TAG = 'RequestToSignupRequest'

export const ResponseToSignupRequest = functions.https.onCall(async (data,_context): Promise<onCallReturn>=>{

    let requestData: f.RequestDictionary = RequestDictionary(data)

    let checkWork = readUserDoc(requestData)
    let findBlockUsersWork = findBlockUsers(requestData.uid)

    let userDocSnapshot, blockUserDocs;
    try {
        [userDocSnapshot, blockUserDocs] = await Promise.all([checkWork,findBlockUsersWork])
    }
    catch(e) {
        console.log(e)
        return {
            type: 'error',
            error: e.message
        }
    }
    
    if(userDocSnapshot.ind1 === 301) {
        return {
            type: 'alreadyPassed'
        }
    }

    let userData: f.UserDictionary = UserDictionary(userDocSnapshot, userDocSnapshot.id);
    let uidArr: Array<string> = []

    blockUserDocs.forEach(doc => {
        uidArr.push(doc.data().id)
    })

    if(requestData.resIndex !== 301) {
        let updateWork = updateUserDoc(requestData)
        let realDBWork = pushToRealDB(requestData)
        try {
            await Promise.all([updateWork, realDBWork])
            return {
                type: 'success'
            }
        }
        catch(e) {
            console.log(e.message)
            return {
                type: 'error',
                error: e.message
            }
        }
    }

    let cashWork = createCashItem(requestData)
    let phWork = createPhDoc(requestData)
    
    try {
        await Promise.all([cashWork, phWork])
    }
    catch(e) {
        console.log(e.message)
        return {
            type: 'error',
            error: e.message
        }
    }

    let ret_rHandler: r.recommendation;
    try {
        const mongoResult = await MongoFunc(userData, uidArr)
        if(mongoResult instanceof ProcessWorker) {
            const worker = mongoResult.getProcessor()
            console.log(worker)
            return {
                type: 'error',
                error: worker.error_message
            }
        }
        ret_rHandler = mongoResult.retrieve()
    }
    catch(e) {
        console.log(e)
        return {
            type: 'error',
            error: e.message
        }
    } 

    // 여기서부터 시작하시면 됩니다!!
    // 임시로 return { type: 'success' }로 해놨읍니다 
    console.log(ret_rHandler)
    console.log('start!')
    
        

    return {
        type: 'success'
    }
    
})

async function MongoFunc(userData: f.UserDictionary, uidArr: Array<string>): Promise<ProcessWorker | RecommendationHandler> {
    const m_userDoc = create_solo_user(userData)

    const msx = userData.sx
    const psx = !msx
    const myId = m_userDoc.id
    
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

    const session = client.startSession()
    session.startTransaction({
        readPreference: 'primary',
        readConcern: { level: 'majority' },
        writeConcern: { w: 'majority' }
    })

    async function insert_user(client: MongoClient, session: ClientSession) {
        const insertResult = await client.db(config.user).collection(msx ? 'male' : 'female').insertOne(m_userDoc, {
            session: session
        })
        
        if(insertResult.insertedCount !== 1) {
            throw new Error(`db('user').collection(${msx ? 'male' : 'female'}) insert failed`)
        }
    }

    async function insert_mmlist(client: MongoClient, session: ClientSession) {
        const insertResult = await client.db(config.mlist).collection(config.mmlist).insertOne(create_mmlist(myId, 's'), {
            session: session
        })

        if(insertResult.insertedCount !== 1) {
            throw new Error(`db('mlist').collection('mmlist') insert failed`)
        }
    }

    try {
        await Promise.all([runTransaction(insert_user, client, session), runTransaction(insert_mmlist, client, session)])

        worker.inc_counter()
    }
    catch(e) {
        worker.setProcessor(e.message)
        await handleAbortion(client, session)
        return worker
    }

    if(uidArr.length !== 0) {
        const earlyBlockMlistDetail: Array<m.mlist_detail> = uidArr.map(blockUid => {
            return create_mlist_detail(blockUid, myId, 3, 's', -1)
        })

        async function insert_early_block_mlist_detail(client: MongoClient, session: ClientSession) {
            const insertManyResult = await client.db(config.mlist).collection(config.mlist_detail).insertMany(earlyBlockMlistDetail, {
                session: session
            })
            if(insertManyResult.insertedCount !== earlyBlockMlistDetail.length) {
                throw new Error(`db('mlist').collection('mlist_detail') insertMany failed`)
            }
        }

        try {
            await runTransaction(insert_early_block_mlist_detail, client, session)
            worker.inc_counter()
        }
        catch(e) {
            worker.setProcessor(e.message)
            await handleAbortion(client, session)
            return worker
        }
    }
    else {
        worker.inc_counter()
    }

    const optionalProperties = {
        boundary: 30000,
        maxBt: (Math.floor(m_userDoc.bt / 10000) + 11) * 10000,
        minBt: (Math.floor(m_userDoc.bt / 10000) - 11) * 10000
    }

    const _Util = new UtilityFunction(m_userDoc, optionalProperties, [])

    let queryResult: Array<r.compound_user> = []
    async function aggregateFunc(client: MongoClient, session: ClientSession) {
        queryResult = await client.db(config.user).collection(psx ? 'male' : 'female').aggregate([
            {
                $geoNear: {
                    near: m_userDoc.location,
                    distanceField: "distance",
                    key: "location",
                    query: {
                        status: true,
                        lt: { $gt: m_userDoc.lt - (86400 * 14)},
                        bt: { $gt: m_userDoc.bt - (4* 10000), $lt: m_userDoc.bt + (5 * 10000) }
                    }
                }
            },
            { $limit: 800 },
            { $set: { distance: { $floor: "$distance" } } },
            { $unset: "_ct" }
        ], {
            session: session
        }).toArray()
    }

    try {
        await runTransaction(aggregateFunc, client, session)
        worker.inc_counter()
    }
    catch(e) {
        worker.setProcessor(e.message)
        await handleAbortion(client, session)
        return worker
    }

    let soloArr: Array<r.solo_user> = []
    let groupArr: Array<r.group_user> = []

    queryResult.forEach(doc => {
        if(doc.type === 's') {
            soloArr.push(doc)
        }
        else {
            groupArr.push(doc)
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

    const _rHandler = new RecommendationHandler(psx, _Util.quantitative)
    
    soloArr.forEach(doc => {
        _rHandler.setSolo(doc)
    })

    groupArr.forEach(doc => {
        _rHandler.setGroup(doc)
    }) 

    const ret_rHandler = _rHandler.retrieve()

    const soloMlistDetail: Array<m.mlist_detail> = []
    const groupMlistDetail: Array<m.mlist_detail> = []
    
    ret_rHandler.soloDocs.forEach((val: r._entity, key: string) => {
        soloMlistDetail.push(create_mlist_detail(myId, key, 1, 's', val.cdit))
    })

    ret_rHandler.groupDocs.forEach((val: r._entity, key: string) => {
        groupMlistDetail.push(create_mlist_detail(myId, key, 1, 'g', val.cdit))
    })

    async function insert_recommend_mlist_detail(client: MongoClient, session: ClientSession) {
        const insertManyResult = await client.db(config.mlist).collection(config.mlist_detail).insertMany([...soloMlistDetail, ...groupMlistDetail], {
            session: session
        })
        if(insertManyResult.insertedCount !== (soloMlistDetail.length + groupMlistDetail.length)) {
            throw new Error(`db('mlist').collection('mlist_detail') insertMany failed`)
        }
    }

    try {
        await runTransaction(insert_recommend_mlist_detail, client, session)

        worker.inc_counter()
    }
    catch(e) {
        worker.setProcessor(e.message)
        await handleAbortion(client, session)
        return worker
    }
    
    try {
        await runCommitWithRetry(session)
        await session.endSession()
        return _rHandler
    }
    catch(e) {
        worker.setProcessor(e.message)
        await handleAbortion(client, session)
        return worker;
    }
    finally {
        await client.close()
    }
}

function firestoreMListDictionary(data: FirebaseFirestore.DocumentData): f.MlistDictionary{
    return {
        cdit : data.cdit,
        in1 : data.in1, // 100 (최초값)
        in2 : data.in2, // 100 (최초값)
        ind1 : data.ind1, // 0 (현재버전에서 사용안하거나 추가적으로 사용할 예정)
        mid : data.mid, // 빈배열 (현재버전에서 사용안하거나 추가적으로 사용할 예정)
        num : data.num, // 솔로, 그룹명수에 따라 1~4
        pid : data.pid, // 문서를 소유한 유저에게 소개된 유저 또는 그룹의 식별자
        psx : data.psx, // 문서를 소유한 유저에게 소개되 유저 또는 그룹의 성별 (남성true / 여성false)
        tp : FieldValue.serverTimestamp(),
        r : false, // 유저의 문서 확인 유무 (최초생성이므로 false)
        type : data.type, // 문서를 소유한 유저에게 소개된 타입 (솔로 101 / 그룹 201 / 광고 30x )
        uid : data.uid // 문서를 소유한 유저의 uid
    }
}

function RequestDictionary(data={uid:'',resIndex:0,isMan:true,date:'',name:'',manager:''}): f.RequestDictionary{
    return {
        uid : data.uid,
        resIndex : data.resIndex,
        isMan : data.isMan,
        name : data.name,
        date : data.date,
        manager: data.manager
    }
}


function findBlockUsers(uid: string){
    let mySiRef = db.collection('si1').doc(uid).collection('si2').doc('step')
    let getMySiWork = mySiRef.get()
    const getWork = getMySiWork.then(doc => {
        const snapshot = doc.data()
        if(!snapshot) throw new Error(`No document in findBlockUsers for ${uid}`)

        let phStr: string = snapshot.ph
        let pbRef = db.collectionGroup('pblist').where('ph', '==', phStr)
        return pbRef.get()
        .then(querySnapshot => querySnapshot.docs)
        .catch(err => {
            console.log(err)
            throw new Error(`Query.get() for ${uid} failed`)
        })
    })

    return getWork
}

function readUserDoc(data: f.RequestDictionary){
    let ref = db.collection('user1').doc(data.uid).collection('user2').doc(data.uid)
    let getRef = ref.get()
    const checkWork = getRef.then(doc => {
        const snapshot = doc.data()
        if(!snapshot) throw new Error(`No document in readUserDoc for ${data.uid}`)
        else return snapshot
    }).catch(err => {
        console.log(err)
        throw new Error(`DocumentReference.get() for ${data.uid} failed`)
    })
    return checkWork
}

function updateUserDoc(data: f.RequestDictionary){
    let ref = db.collection('user1').doc(data.uid).collection('user2').doc(data.uid)
    let updateObj = {
        ind1 : data.resIndex,
        ut : FieldValue.serverTimestamp()
    }
    let updateWork = ref.update(updateObj)
    return updateWork.catch(err => {
        console.log(err)
        throw new Error(`Document not updated in updateUserDoc for ${data.uid}`)
    })
}

function createCashItem(data: f.RequestDictionary){
    let ref = db.collection('cash').doc(data.uid).collection('chlist').doc('uch')
    let createObj = {
        btr : 0,
        deli : 2,
        deli2 : 0,
        dltp : FieldValue.serverTimestamp(),
        like : (data.isMan) ? 10 : 15,
        litp : FieldValue.serverTimestamp(),
        log : 3,
        logtp : FieldValue.serverTimestamp(),
        plus : false
    }
    const createWork = ref.set(createObj)
    return createWork.catch(err => {
        console.log(err)
        throw new Error(`Document not created in createCashItem for ${data.uid}`)
    })
}
function createPhDoc(data: f.RequestDictionary){
    let siRef = db.collection('si1').doc(data.uid).collection('si2').doc('step')
    let getSiWork = siRef.get()

    let phWork = getSiWork
    .then(siDoc=>{
        let siData = siDoc.data()
        let phStr: string;

        if(siData) {
            phStr = siData.ph
        }
        else throw new Error(`No document found in createPhDoc for ${data.uid}`)

        let phRef = db.collection('ph').doc(data.uid).collection('phlist').doc()
        let phObj = {
            ph : phStr,
            uid : data.uid,
            tp : FieldValue.serverTimestamp()
        }
        const createWork = phRef.set(phObj)
        return createWork.catch(err => {
            console.log(err)
            throw new Error(`Document not created in createPhDoc for ${data.uid}`)
        })
    })

    return phWork
}
function pushToRealDB(data=RequestDictionary()){
    let app = admin.app()
    let realDB = app.database(`https://delius-46aa7-dbstats0${Math.floor(Math.random()*5+1)}.firebaseio.com/`)
    let ref = realDB.ref().child('Request').child(data.date)
    let pushObj = {
        index : data.resIndex,
        name : data.name,
        tp : nowSeconds(),
        uid : data.uid,
        isUser : false,
        manager : data.manager
    }
    let pushWork = ref.push(pushObj)
    return pushWork
}
function nowSeconds(){
    let seconds = Date.now()
    return seconds
}
function convertToTodayString(){
    let koreaMoment = moment().utcOffset(9)
    let year = koreaMoment.year()
    let month = koreaMoment.month() + 1
    let date = koreaMoment.date()
    let monthStr = ''
    if (month < 10){
        monthStr = `0${month}`
    }else{
        monthStr = `${month}`
    }
    let dateStr = ''
    if (date < 10){
        dateStr = `0${date}`
    }else{
        dateStr = `${date}`
    }
    let todayStr = `${year}${monthStr}${dateStr}`
    return todayStr
}

// function createMListInFirestore(result:r.recommendation,rData=RequestDictionary()){
//     let collectionRef = db.collection('mlist').doc(rData.uid).collection('mmlist')
//     let promises : Array<Promise<FirebaseFirestore.WriteResult>> = []



//     let soloMatchMap = result.matchDocs.soloDocs
//     let groupMatchMap = result.matchDocs.groupDocs
//     let soloCloseMap = result.closeDocs.soloDocs
//     let groupCloseMap = result.closeDocs.groupDocs

//     soloMatchMap.forEach((solo,id)=>{
//         let partnerRef = db.collection('mlist').doc().collection('mmlist').doc(rData.uid)
//         let myRef = collectionRef.doc(id)

//         let partnerObj = {
//             cdit : solo.cdit,
//             in1 : 100,
//             in2 : 100,
//             ind1 : 0,
//             mid : [],
//             num : 1,
//             pid : rData.uid,
//             psx : rData.isMan,
//             tp : FieldValue.serverTimestamp(),
//             r : false,
//             type : 101,
//             uid : id
//         }
//         let myObj = {
//             cdit : solo.cdit,
//             in1 : 100,
//             in2 : 100,
//             ind1 : 0,
//             mid : [],
//             num : 1,
//             pid : id,
//             psx : solo.sex,
//             tp : FieldValue.serverTimestamp(),
//             r : false,
//             type : 101,
//             uid : id
//         }

//         let partnerWork = partnerRef.set(partnerObj)
//         let myWork = myRef.set(myObj)
//         promises.push(myWork)
//         promises.push(partnerWork)
//     })
//     soloCloseMap.forEach((solo,id)=>{
//         let partnerRef = db.collection('mlist').doc().collection('mmlist').doc(rData.uid)
//         let myRef = collectionRef.doc(id)

//         let partnerObj = {
//             cdit : solo.cdit,
//             in1 : 100,
//             in2 : 100,
//             ind1 : 0,
//             mid : [],
//             num : 1,
//             pid : rData.uid,
//             psx : rData.isMan,
//             tp : FieldValue.serverTimestamp(),
//             r : false,
//             type : 101,
//             uid : id
//         }
//         let myObj = {
//             cdit : solo.cdit,
//             in1 : 100,
//             in2 : 100,
//             ind1 : 0,
//             mid : [],
//             num : 1,
//             pid : id,
//             psx : solo.sex,
//             tp : FieldValue.serverTimestamp(),
//             r : false,
//             type : 101,
//             uid : id
//         }

//         let partnerWork = partnerRef.set(partnerObj)
//         let myWork = myRef.set(myObj)
//         promises.push(myWork)
//         promises.push(partnerWork)
//     })
//     groupMatchMap.forEach((group,id)=>{
//         let myRef = collectionRef.doc(id)
//         let setObj = {
//             cdit : group.cdit,
//             in1 : 100,
//             in2 : 100,
//             ind1 : 0,
//             mid : [],
//             num : 1,
//             pid : id,
//             psx : group.sex,
//             tp : FieldValue.serverTimestamp(),
//             r : false,
//             type : 101,
//             uid : rData.uid
//         }
//         let setWork = myRef.set(setObj)
//         promises.push(setWork)
//     })
//     groupCloseMap.forEach((group,id)=>{
//         let myRef = collectionRef.doc(id)
//         let setObj = {
//             cdit : group.cdit,
//             in1 : 100,
//             in2 : 100,
//             ind1 : 0,
//             mid : [],
//             num : 1,
//             pid : id,
//             psx : group.sex,
//             tp : FieldValue.serverTimestamp(),
//             r : false,
//             type : 101,
//             uid : rData.uid
//         }
//         let setWork = myRef.set(setObj)
//         promises.push(setWork)
//     })

//     return Promise.all(promises)
//     .then(()=>{
//         return 'success'
//     })
//     .catch((err)=>{
//         return 'error'
//     })
// }


