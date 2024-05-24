import rtconnectxboard from './rtconnectxboard.js'
import rtconnectxplayer from './rtconnectxplayer.js'
import uuidv4 from '../rtuuid.js'
import rtlog from '../rtlog.js'

// connectxapp holds reference to all connectx boards for the node app running

class connectxapp {
    constructor(wss) {
        this._wss = wss
        this._ws = undefined
        this.connectxboards = []
    }

    get wss() {
        return this._wss
    }

    log(message, ws = undefined, send = true) {
        rtlog.logdo(message, ws, send)
    }

    // get an array of boards waiting matching the playercount/rows/cols/connectCount
    getMatchingBoardsWaiting(ws, players, rows, cols, connectCount) {
        // get boards with room available for more players and a matching player/rows/cols/connect count
        const filteredarray = this.connectxboards.filter(board => board.playerCount < board.maxPlayerCount && board.maxPlayerCount===players && board.rows === rows && board.cols === cols && board.connectCount === connectCount)
        return filteredarray
    }

    getSingleBoard(ws, players, rows, cols, connectCount) {
        const boardsWaiting = this.getMatchingBoardsWaiting(ws, players, rows, cols, connectCount)
        return boardsWaiting.length === 1 ? boardsWaiting[0] : undefined
    }

    addPlayer(ws, connectxboard, playerName) {
        const playerId = connectxboard.getNextPlayerId()
        if (playerId > 0) {
            const connectxplayer = new rtconnectxplayer(ws, connectxboard.boardId, playerId, playerName)
            connectxboard.addPlayer(connectxplayer)
            return connectxplayer
        }
        else {  // this happens when we're refused a new player number, this can happen if another client has already joined. Rinse and repeat?
            return undefined
        }
    }

    getBoardById(ws, boardId) {
        const cxboardbyid = this.connectxboards.filter(board => board.boardId === boardId)
        return cxboardbyid.length === 1 ? cxboardbyid[0] : undefined
    }

    joinBoardById(ws, boardId, playerName) {
        const connectxboard = this.getBoardById(ws, boardId)
        let connectxplayer=undefined
        if(connectxboard!==undefined){ // if board exists
            connectxplayer=this.addPlayer(ws, connectxboard, playerName)
            if(connectxplayer!==undefined){ // if player could be added to board
                this.log(`connectxplayerid = ${connectxplayer.playerId}`)
                this.sendBoardStatus(ws, connectxboard, connectxplayer)
            }
            else{
                this.log("addPlayer returned undefined")
            }
        }
        else{
            this.log("getBoardById returned undefined")
        }

        return connectxplayer
    }

    createBoard(ws,players,rows,cols,connectCount)
    {
        // const boardId = uuidv4() // maybe use a common sequence number instead of a uuid?
        let boardId
        if(this.connectxboards.length>0){
            boardId=(Math.max(...this.connectxboards.map(board => parseInt(board.boardId)))+1).toString() // better than length of array, also allows for removing boards
        }
        else{
            boardId='1' // this may be a re-issue if all previous boards have been removed... (problem?)
        }
        this.log(`boardId: ${boardId}`)
        this.log(`create board players: ${players}`,ws)
        const connectxboard = new rtconnectxboard(boardId, players, rows, cols, connectCount)
        this.connectxboards.push(connectxboard)
        return connectxboard
    }

    createJoinBoard(ws, players, rows, cols,connectCount, playerName) {
        // remark: this function should only be called when either zero boards or one board is waiting, otherwise the player should pick one from a list
        // const maxplayercount=2 // for the moment being
        let connectxboard = this.getSingleBoard(ws, players, rows, cols, connectCount)
        if (connectxboard === undefined) { // no board waiting for player(s)
            connectxboard=this.createBoard(ws,players,rows,cols,connectCount)
        }
        const connectxplayer = this.addPlayer(ws, connectxboard,playerName)

        return { connectxboard, connectxplayer }
    }

    sendBoardStatus(ws,cxboard,connectxplayer)
    {
        if (cxboard.isComplete()) {
            // is app required here? sockets are tied to app already
            const data = { app: 'connectx', action: 'joinBoard', boardId: cxboard.boardId, playerId: connectxplayer.playerId }
            this.log(`Board ${cxboard.boardId} is complete, now broadcasting joinBoard data '${JSON.stringify(data)}'`, ws)
            cxboard.boardBroadcast(data) //, playerId: connectxplayer.playerId
            cxboard.randomCurrentPlayer() // we will now randomly pick a player to start (cause we have no way of knowing who previously started)
            cxboard.boardBroadcast({ app: 'connectx', action: 'makeMove', player: cxboard.currentPlayer, boardId: cxboard.boardId })
        }
        else {
            // use broadcast to update status of each and any client waiting
            this.log(`Board ${cxboard.boardId} is waiting for more players, now broadcasting waitBoard message`, ws)
            cxboard.boardBroadcast({ app: 'connectx', action: 'waitBoard', boardId: cxboard.boardId, players: cxboard.maxPlayerCount, playersNeeded: cxboard.maxPlayerCount - cxboard.playerCount })
            // ws.send(JSON.stringify({ app: 'connectx', action: 'waitBoard', boardId: cxboard.boardId, playersNeeded: cxboard.maxPlayerCount-cxboard.playerCount}))
        }

    }

    sendBoardsWaiting(ws)
    {
       const filteredarray = this.connectxboards.filter(board => board.playerCount < board.maxPlayerCount)
       const boards = filteredarray.map(board => {return {boardId: board.boardId, 
                                                          rows: board.rows,
                                                          cols: board.cols,
                                                          maxPlayerCount: board.maxPlayerCount,
                                                          connectCount: board.connectCount,
                                                          players: board.players.map(player => { return { playerId: player.playerId, name: player.name}})                                                        
                                                        }});
       this.log(JSON.stringify({action: 'boardList', boards}))
       ws.send(JSON.stringify({action: 'boardList', boards}))
    }

    joinBoard(ws, players,rows,cols,connectCount, playerName) {
        if (this.getMatchingBoardsWaiting(ws,players).length <= 1) { // autojoin/create if one or zero boards match parameters
            const res=this.createJoinBoard(ws, players,rows,cols,connectCount, playerName)
            this.sendBoardStatus(ws, res.connectxboard, res.connectxplayer)
        }
        else {
            // ws.send({ action: 'createBoardBrowser' })
            // respond with boardlist
            if(this.getMatchingBoardsWaiting(ws,players,rows,cols,connectCount).length===0){ // when no board matching parameter(s)
                const connectxboard=this.createBoard(ws,players,rows,cols,connectCount)
                this.addPlayer(ws, connectxboard, playerName)
            }
            this.sendBoardsWaiting(ws)
        }
    }
    
    quitBoard(ws,boardId,player)
    {
        // TBD: determine if boardIds belonging to previous instances can be submitted on current instance
        // if this is true it could be prevented by using a UUID instead of the sequence number 
        const cxboard = this.getBoardById(ws, boardId)
        if(cxboard!==undefined){
            cxboard.deadBoard=true
            // flag the player as a zombie now?
            cxboard.boardBroadcast({ app: 'connectx', action: 'quitBoard', player, boardId }) // where player is the culprit
        }
        // else board does not exist
    }

    onMessage(ws, data) {
        this.log(`Client has sent us: ${data}`)
        const msg = JSON.parse(data);
        let cxboard

        switch (msg.action) {
            case 'broadcastMessage': // for test purposes only
                this.log('got action broadcastMessage')
                const rtbc = new rtbroadcast(this.wss)
                rtbc.broadcast(data, this.ws.app, msg.boardId)
                break
            case 'joinBoard':
                this.log('got action joinBoard', ws)
                this.log(`joinBoard ${JSON.stringify(msg)}`)
                this.joinBoard(ws,msg.players,msg.rows,msg.cols,msg.connectCount, msg.playerName) // playerName to be used for auto join/create
                break
            case 'joinBoardById':
                // this message is used by the lobby browser after a board has been selected
                // the client should set players/rows/cols/connectCount according to parameters of the selected board
                const cxplayer=this.joinBoardById(ws, msg.boardId, msg.name)
                if(cxplayer!==undefined){
                    cxboard = this.getBoardById(ws, msg.boardId)
                    this.sendBoardStatus(ws,cxboard,cxplayer)    
                }
                // else we failed to join, either because board does not(no longer) exist or is already complete
                // send error message or simply respond with an updated board list?
                break
            case 'moveMade':
                // sent by client after a move has been made, broadcast to all players
                cxboard = this.getBoardById(ws, msg.boardId)
                cxboard.boardBroadcast(msg)
                break
            case 'boardList': // client requests a boardlist in order to show the board/lobby browser
              this.sendBoardsWaiting(ws) // send a list of boards with room available for more players
              break
            case 'makeMove':
                // current player indicates we should move on to the next
                cxboard = this.getBoardById(ws, msg.boardId)
                if (msg.winner === 0 && !msg.isDraw) {
                    cxboard.nextPlayer()
                    cxboard.boardBroadcast({ app: 'connectx', action: 'makeMove', player: cxboard.currentPlayer, boardId: cxboard.boardId })
                }
                // else game over, cleanup/trash the board or something?
                break
            case 'quitBoard': // when client disconnecting? When/where to send?
              this.quitBoard(ws,msg.boardId,msg.player)
              break
            default:
                if (msg.action !== undefined)
                    this.log(`Received message with unknown action ${msg.action}`)
                else
                    this.log(`Received message without action`)
        }
    }
}

export default connectxapp
