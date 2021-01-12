const ShotUserLog = ['connect', 'read mmlist', 'aggregation pipeline', 'create mlist_details']
const ShotBoosterLog = ['connect', 'read mmlist', 'aggregation pipeline', 'create mlist_details']
const CreateTriggerPB = ['connect', 'read mmlists', 'update mmlists', 'update mlist_detail', 'commit', 'create mlist_detail']
const PauseUsers = ['connect', 'update male & female', 'commit']
const PauseGroups = ['connect', 'update male & female', 'commit']
const PauseGroupInstantly = ['connect', 'update user']
const UpdateTriggerUserProfile = ['connect', 'update user']
const UpdateTriggerGroupProfile = ['connect', 'update user']
const UpdateTriggerGroup = ['connect', 'create user & mmlist', 'aggregation pipeline', 'create mlist_details', 'commit' ]
const PauseUserInstantly = ['connect', 'update user']
const RequestToSignupRequest = ['connect', 'create user & mmist', 'create early block mlist_details', 'aggregation pipeline', 'create recommend mlist_details', 'commit']
const RecognizeGroupByLeader = ['connect', 'read mmlist', 'create mlist_detail']

interface indexableTAGlist {
    [index: string]: Array<string>
}

export const scheduler:indexableTAGlist = {
    RequestToSignupRequest: RequestToSignupRequest,
    ShotUserLog: ShotUserLog,
    ShotBoosterLog: ShotBoosterLog,
    CreateTriggerPB: CreateTriggerPB,
    PauseUsers: PauseUsers,
    PauseGroupInstantly: PauseGroupInstantly,
    UpdateTriggerUserProfile: UpdateTriggerUserProfile,
    UpdateTriggerGroupProfile: UpdateTriggerGroupProfile,
    UpdateTriggerGroup: UpdateTriggerGroup,
    PauseUserInstantly: PauseUserInstantly,
    PauseGroups: PauseGroups,
    RecognizeGroupByLeader: RecognizeGroupByLeader,
}