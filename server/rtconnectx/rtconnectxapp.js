import rtconnectxboard from './rtconnectxboard.js'
import rtconnectxplayer from './rtconnectxplayer.js'
import uuidv4 from '../rtuuid.js'
import rtlog from '../rtlog.js'
// import { get } from 'http'

// connectxapp holds reference to all connectx boards for the node app running

class connectxapp{
    constructor(wss)
    {
        this._wss=wss
        this.connectxboards=[]
    }

    get wss()
    {
        return this._wss
    }

    log(message,ws=undefined,send=true){
        rtlog.logdo(message,ws,send)
    }

    getBoardsWaiting()
    {
        const filteredarray=this.connectxboards.filter(board => board.playerCount<board.maxPlayerCount)
        return filteredarray
    }

    getSingleBoard()
    {
      const boardsWaiting=this.getBoardsWaiting()
      return boardsWaiting.length===1 ? boardsWaiting[0] : undefined
    }

    getNumberOfBoardsWaiting()
    {
        return this.getBoardsWaiting().length
    }

    addPlayer(ws,connectxboard)
    {
        const playerId=connectxboard.getNextPlayerId()
        if(playerId>0){
            const connectxplayer=new rtconnectxplayer(ws,connectxboard.boardId,playerId)
            connectxboard.addPlayer(connectxplayer)
            return connectxplayer
        }
        else{  // this happens when we're refused a new player number, this can happen if another client has already joined. Rinse and repeat?
            return undefined
        }
    }

    getBoardById(boardId)
    {
        const cxboardbyid=this.connectxboards.filter(board => board.boardId===boardId)
        return cxboardbyid.length===1 ? cxboardbyid[0] : undefined
    }

    joinBoardbyId(ws,boardId){
        const cxplayer=undefined
        const connectxboard=this.getBoardById(boardId)
        addplayer(ws,connectxboard)    
        return cxplayer
    }

    joinBoard(ws){ // (rows, columns, maxplayercount, connectcount)
        // remark: this function should only be called when either zero boards or one board is waiting, otherwise the player should pick one from a list
        const maxplayercount=2 // for the moment being
        let connectxboard=this.getSingleBoard()
        if (connectxboard===undefined){ // no board waiting for player(s)
            const boardId=uuidv4() // maybe use a common sequence number instead of a uuid?
            connectxboard=new rtconnectxboard(boardId,maxplayercount)
            this.connectxboards.push(connectxboard)
        }
        const connectxplayer=this.addPlayer(ws,connectxboard)

        return connectxplayer
    }

    onMessage(ws,data) {
        this.log(`Client has sent us: ${data}`)
        const msg = JSON.parse(data);
        let cxboard

        switch(msg.action){
            case 'broadcastMessage':
               this.log('got action broadcastMessage')
               const rtbc = new rtbroadcast(this.wss)
               rtbc.broadcast(data,this.ws.app,msg.boardId)
               break
            case 'joinBoard':
                this.log('got action joinBoard',ws)
                if (this.getNumberOfBoardsWaiting()<=1){
                    const connectxplayer=this.joinBoard(ws) // returns a player instead of a board because board is created as required
                    cxboard=this.getBoardById(connectxplayer.boardId)
                    if(cxboard.isComplete()){
                        const data={ app: 'connectx', action: 'joinBoard', boardId: cxboard.boardId, playerId: connectxplayer.playerId}
                        this.log(`Board ${cxboard.boardId} is complete, now broadcasting joinBoard data '${JSON.stringify(data)}'`,ws)
                         // is app required here? sockets are tied to app already
                        cxboard.boardBroadcast(data) //, playerId: connectxplayer.playerId
                        cxboard.randomCurrentPlayer() // we will now randomly pick a player to start
                        cxboard.boardBroadcast({ app: 'connectx', action: 'makeMove', player: cxboard.currentPlayer, boardId: cxboard.boardId})
                    }
                    else{
                        this.log(`Board ${cxboard.boardId} is waiting for more players, now sending waitBoard message`,ws)
                        ws.send(JSON.stringify({ app: 'connectx', action: 'waitBoard', boardId: cxboard.boardId, playersNeeded: cxboard.maxPlayerCount-cxboard.playerCount}))
                    }
                }
                else{
                    ws.send({ action: 'createBoardBrowser' })
                    // respond with boardlist
                }
                break
              case 'moveMade':
                // sent by client after a move has been made, broadcast to all players
                cxboard=this.getBoardById(msg.boardId)
                cxboard.boardBroadcast(msg)
                break
              case 'makeMove':
                // current player indicates we should move on to the next
                cxboard=this.getBoardById(msg.boardId)
                if(msg.winner===0 && !msg.isDraw){
                  cxboard.nextPlayer()
                  cxboard.boardBroadcast({ app: 'connectx', action: 'makeMove', player: cxboard.currentPlayer, boardId: cxboard.boardId})                
                }
                // else game over, cleanup/trash the board or something?
                break
              default:
                if(msg.action!==undefined)
                  this.log(`Received message with unknown action ${msg.action}`)
                else
                  this.log(`Received message without action`)
        }
    }
}

export default connectxapp
