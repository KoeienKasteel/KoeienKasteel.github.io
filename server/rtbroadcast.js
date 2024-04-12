import rtlog from './rtlog.js'

class rtbroadcast{
    constructor(wss) {
        this.wss=wss
    };

    // wss.clients.forEach(client => client.boardID === msg.boardID && client.send(JSON.stringify(msg)))

    broadcast(message,boardId=undefined,app=undefined) {
      if(app!==undefined || boardId===undefined){
        rtlog.logdo(`Sending broadcast message '${message}' to app ${app} boardId ${boardId}`)
        this.wss.clients.forEach(client => (app===undefined || client.app===app) && (boardId===undefined || client.boardID===message.boardID) && client.send(JSON.stringify(message)))
      }
      else{
        // this is a fault in the parameters, we don't support sending a message to a specific board in any app
        rtlog.logdo(`Not sending global message'${message}' for boardId '${boardId}'`)
      }
    }
}

export default rtbroadcast
