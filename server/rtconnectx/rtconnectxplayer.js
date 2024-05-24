import rtlog from '../rtlog.js'
// import rtbroadcast from '../rtbroadcast.js'

// import rtdbhandler from './rtdbhandler.js'
// import uuidv4 from '../rtuuid.js'

class connectxplayer
{
    constructor(ws,boardId,playerId,name) {
        this._ws = ws
        this._boardId=boardId
        this._playerId=playerId
        this._name=name
    };

    get ws()
    {
        return this._ws
    }

    get boardId()
    {
        return this._boardId
    }

    get playerId()
    {
        return this._playerId
    }

    get name()
    {
        return this._name
    }

    log(message,send=true){
        rtlog.logdo(message,this.ws,send)
    }

    // doquery(){
    //     const rtdb = new rtdbhandler()
    //     rtdb.doquery()
    // }

    sendObject(data)
    {
        // data.playerId=this.playerId
        const message=JSON.stringify(Object.assign(data, { playerId: this.playerId}))
        this.log(`connectxplayer.sendMessage ${message}`)
        this.ws.send(message)
    }

    // static sayhello()
    // {
    //    return "Hello, World!"
    // }
}

// export default { rtconnectx, etcetera } // for multiple default exports
export default connectxplayer
