import uuidv4 from './rtuuid.js'
import rtlog from './rtlog.js'
import dbhandler from './rtdbhandler.js'
import session from './rtsession.js'
import bcrypt from 'bcrypt'

// connectxapp holds reference to all connectx boards for the node app running

class sessionhandler {
    constructor(wss) {
        this._wss = wss
        this._ws = undefined
        this.sessions = []
        this.saltRounds = 10 // used when generating password hash
    }

    get wss() {
        return this._wss
    }

    log(message, ws = undefined, send = true) {
        rtlog.logdo(message, ws, send)
    }

    getUserBySessionId(sessionId) {
        const filteredArray = this.sessions.filter(session => session.sessionId === sessionId)
        return filteredArray
    }

    getUserByName(userName) {
        const filteredArray = this.sessions.filter(session => session.userName === userName)
        return filteredArray
    }

    deleteSession(sessionId){
        this.sessions.forEach((element, index) => {
            if(element.sessionId===sessionId){
              delete this.sessions[index]
            }
        })
        this.sessions=this.sessions.filter(element => element!==undefined)
    }

    onMessage(ws, data) {
        // do not log JSON string here because it may contain the password
        // this.log(`Client sent message to 'sessionHandler': ${data}`)
        const msg = JSON.parse(data);
        const dbHandler = new dbhandler()

        if(msg.password){
            this.log('got action ' + msg.action + ' with userName ' + msg.userName + ' and password ******')
        }
        else{
            this.log('got action ' + msg.action + ' with userName ' + msg.userName)
        }
        switch (msg.action) {
            case 'login':
                this.log(`action=${msg.action}`)
                // length should always be 0 or 1 since userName is a unique key (TBD: Check this in the database)
                if (msg.userName.length > 0) {
                    dbHandler.getUserByName(msg.userName, (response) => {
                        if (response.length > 0) {
                            const userName = response[0].username // this will make sure we use the right capitalization
                            bcrypt.compare(msg.password, response[0].password, (err, result) => {
                                if (err) {
                                    throw new Error(err)
                                }
                                if (result === true) {
                                    let sessionId = ''
                                    const user = this.getUserByName(msg.userName) // this should prevent different sessions for a single user
                                    if (user.length) {
                                        // user already logged in, perhaps reply with empty session Id to prevent duplicate logins?
                                        sessionId = user[0].sessionId
                                    }
                                    else { // create a new session
                                        sessionId = uuidv4()
                                        const userSession = new session(sessionId, userName)
                                        this.sessions.push(userSession)
                                    }
                                    // now add the newly created session object to the session array
                                    const loginMsg=JSON.stringify({ 'app': 'session', 'action': 'login', session: sessionId, userName, playerId: response[0].id })
                                    this.log(`Sending ${loginMsg}`)
                                    ws.send(loginMsg);
                                }
                                else {
                                    // wrong password, signal login failed by sending a message without session
                                    this.log('Invalid password')
                                    ws.send(JSON.stringify({ 'app': 'session', 'action': 'login', session: '', 'userName': msg.userName  }));
                                }
                            });
                        }
                        else {
                            // user not found, signal login failed by sending a message without session
                            this.log(`User ${msg.userName} not found`)
                            ws.send(JSON.stringify({ 'app': 'session', 'action': 'login', session: '', 'userName': msg.userName  }));
                        }
                    })
                }
                else {
                    // no user name, signal login failed by sending a message without session
                    this.log(`User name missing`)
                    ws.send(JSON.stringify({ 'app': 'session', 'action': 'login', session: ''}));
                }
                break
            case 'createUser':
                if (msg.userName.length > 0) {
                    dbHandler.getUserByName(msg.userName, (response) => {
                        // response.length should always be 1 or 0 since we made username unique (well actually TBD)
                        if (response.length === 0) {
                            this.log('getUserByName returned 0 items')
                            // we will now create a user with the specified username and password (hash)
                            if (msg.password.length > 0) {
                                this.log(`generateSalt`)
                                // first generate the salt
                                bcrypt.genSalt(this.saltRounds, (err, salt) => {
                                    // now generate the actual hash
                                    this.log(`hashPassword, salt=${salt}`)
                                    bcrypt.hash(msg.password, salt, (err, hash) => {
                                        // store user with username and password hash
                                        this.log(`createUser`)
                                        dbHandler.createUser(
                                            [msg.userName, hash],
                                            (response) => { // what response for insert statement?
                                                this.log(`in createUser response`)
                                                // now add the newly created session object to the session array
                                                const sessionId = uuidv4()
                                                const userSession = new session(sessionId, msg.userName)
                                                this.sessions.push(userSession)
                                                ws.send(JSON.stringify({ 'app': 'session', 'action': 'createUser', session: sessionId, 'userName': msg.userName }));
                                            }
                                        )
                                    })
                                })
                            }
                            else {
                                // no password specified
                                this.log('No password specified')
                                ws.send(JSON.stringify({ 'app': 'session', 'action': 'createUser', session: '', 'userName': msg.userName }));
                            }
                        }
                        else {
                            // user already exists
                            this.log('User already exists')
                            ws.send(JSON.stringify({ 'app': 'session', 'action': 'createUser', session: '', 'userName': msg.userName }));
                        }
                    })
                }
                else {
                    // no user name, signal login failed by sending a message without session
                    this.log(`User ${msg.userName} not found`)
                    ws.send(JSON.stringify({ 'app': 'session', 'action': 'login', session: '' }));
                }
                break
            case 'changePassword':
                break
            case 'logout':
                if(msg.session && msg.session.length){
                  // destroy the specified session
                  this.log(`delete session ${msg.session}`)
                  this.deleteSession(msg.session)                  
                }
                else{
                    this.log(`got logout message without session (?)`)
                }
                break
            case 'deleteUser':
                // remove user from the database
                // TBD: check password first of accept sessionid instead?
                break
            default:
                if (msg.action !== undefined)
                    this.log(`Received message with unknown action ${msg.action}`)
                else
                    this.log(`Received message without action`)
        }
    }
}

export default sessionhandler
