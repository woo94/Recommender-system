interface Config {
    readonly user: string;
    readonly mlist: string;
    readonly mmlist: string;
    readonly mlist_detail: string;
}

const config: Config = {
    user: 'user',
    mlist: 'mlist',
    mmlist: 'mmlist',
    mlist_detail: 'mlist_detail'
}

const dev_config: Config= {
    user: 'user_dev',
    mlist: 'mlist_dev',
    mmlist: 'mmlist_dev',
    mlist_detail: 'mlist_detail_dev'
}

export {config, dev_config}