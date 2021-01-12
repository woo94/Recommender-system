import { ClientSession, MongoClient, MongoError } from 'mongodb'

interface TransactionResult {
    type: 'success' | 'fail';
    message?: string;
}

async function runTransactionWithRetry(func: (client: MongoClient, session:ClientSession) => Promise<void>, client: MongoClient, session: ClientSession ): Promise<TransactionResult> {
    // abort and commit is executed in the main caller function
    const retryLimit = 5;
    const result: TransactionResult = {
        type: 'fail',
    }
    
    let counter = 0;
    while(counter < retryLimit) {
        try {
            await func(client, session)
            result.type = 'success'
            break;
        }
        catch(e) {
            if(e instanceof MongoError && e.hasErrorLabel('TransientTransactionError')) {
                counter++;
            }
            else {
                throw e
            }
        }
    }

    if(counter === 5) {
        result.type = 'fail'
        result.message = 'TransientTransactionError'
    }

    return result
}

export async function runCommitWithRetry(session: ClientSession): Promise<TransactionResult> {
    const retryLimit = 5
    const result: TransactionResult = {
        type: 'fail',
    }
    
    let counter = 0
    while(counter < retryLimit) {
        try {
            await session.commitTransaction()
            result.type = 'success'
            break;
        }
        catch(e) {
            if(e instanceof MongoError && e.hasErrorLabel('UnknownTransactionCommitResult')) {
                counter++;
            }
            else {
                throw e
            }
        }
    }

    if(counter === 5) {
        result.type = 'fail'
        result.message = 'UnknownTransactionCommitResult'
    }

    return result
}

export async function handleAbortion(client: MongoClient, session: ClientSession): Promise<void> {
    await session.abortTransaction()
    await session.endSession()
    await client.close()
}



export async function runTransaction(f: (client: MongoClient, session: ClientSession) => Promise<void>, client: MongoClient, session: ClientSession){
    const result = await runTransactionWithRetry(f, client, session)
    if(result.type === 'fail') {
         throw new Error(result.message)
    }
}