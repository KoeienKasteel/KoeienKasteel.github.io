import rtlog from './rtlog.js'

// session represents a login session for a user identified by a sessionId

class session {
    constructor(sessionId, userName) { // userId?
        this.sessionId = sessionId
        this._userName = userName
    }

    log(message,send=true){
        rtlog.logdo(message,undefined,send)
    }

    get userName()
    {
        return this._userName
    }

    set userName(value)
    {
        this._userName=value
    }
}

export default session
