import rtlog from '../rtlog.js'

class connectxplayer
{
    constructor(ws, boardId,playerId,name) {
        this._ws=ws
        this._boardId=boardId
        this._playerId=playerId
        this._name=name
    }

    get ws ()
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

    log(message,ws,send=true){
        rtlog.logdo(message,ws,send)
    }

    sendObject(data, withPlayerId=false)
    {
        let message
        if (withPlayerId) {
            data.playerId = this.playerId
            message = JSON.stringify(Object.assign(data, { playerId: this.playerId }))
        }
        else {
            message = JSON.stringify(data)
        }
        this.log('connectxplayer.sendMessage ' + message)
        this.ws.send(message)
    }
}

// export default { rtconnectx, etcetera } // for multiple default exports
export default connectxplayer
