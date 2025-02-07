import rtconnectxboard from './rtconnectxboard.js'
import rtconnectxplayer from './rtconnectxplayer.js'
import rtlog from '../rtlog.js'

// connectxapp holds reference to all connectx boards for the node app running

class connectxapp {
    constructor(wss) {
        this._wss = wss
        this.connectxboards = []
        this.boardId=1
    }

    get wss() {
        return this._wss
    }

    log(message, ws, send = true) {
        rtlog.logdo(message, ws, send)
    }

    // get an array of boards waiting matching the playercount/rows/cols/connectCount
    getMatchingBoardsWaiting(ws, players, rows, cols, connectCount) {
        // get boards with room available for more players and a matching player/rows/cols/connect count
        const filteredarray = this.connectxboards.filter(board => board.playerCount < board.maxPlayerCount && board.maxPlayerCount===players && board.rows === rows && board.cols === cols && board.connectCount === connectCount && !board.deadBoard)
        return filteredarray
    }

    getSingleBoard(ws,players, rows, cols, connectCount) {
        const boardsWaiting = this.getMatchingBoardsWaiting(ws, players, rows, cols, connectCount)
        return boardsWaiting.length > 0 ? boardsWaiting[0] : undefined
    }

    addPlayer(ws, connectxboard, userName, playerId) {
        const connectxplayer = new rtconnectxplayer(ws, connectxboard.boardId, playerId, userName)
        connectxboard.addPlayer(connectxplayer)
        this.log('addPlayer finished', ws)
        return connectxplayer
    }

    getBoardById(ws,boardId) {
        const cxboardbyid = this.connectxboards.filter(board => board.boardId === boardId)
        return cxboardbyid.length === 1 ? cxboardbyid[0] : undefined
    }

    joinBoardById(ws,boardId, userName, playerId) {
        const connectxboard = this.getBoardById(ws,boardId)
        let connectxplayer=undefined
        if(connectxboard!==undefined){ // if board exists
            connectxplayer=this.addPlayer(ws,connectxboard, userName, playerId)
            if(connectxplayer!==undefined){ // if player could be added to board
                this.sendBoardStatus(ws, connectxboard, connectxplayer)
            }
            else{
                this.log('addPlayer returned undefined',ws)
            }
        }
        else{
            this.log('getBoardById returned undefined',ws)
        }

        return connectxplayer
    }

    createBoard(ws,players,rows,cols,connectCount)
    {
        // const boardId = uuidv4() // maybe use a common sequence number instead of a uuid?
        
        this.boardId++
        this.log('boardId: ' + this.boardId,ws)
        this.log('create board for '  + players + ' players',ws)
        const connectxboard = new rtconnectxboard(ws, this.boardId.toString(), players, rows, cols, connectCount)
        this.connectxboards.push(connectxboard)
        return connectxboard
    }

    deleteBoard(ws, cxboard)
    {
        let boardIndex=-1
        this.connectxboards.forEach((board,index) => board.Id===cxboard.Id && boardIndex===-1 ? boardIndex=index : -1)
        // we will now splice the array to remove the element
        if(boardIndex>=0){
            this.log('Remove element ' + boardIndex + ' with boardId ' + cxboard.boardId + ' from connectxboards',ws)
            this.connectxboards.splice(boardIndex,1)
        }
    }

    createJoinBoard(ws, players, rows, cols,connectCount, userName, playerId) {
        let connectxboard = this.getSingleBoard(ws, players, rows, cols, connectCount)
        if (connectxboard === undefined) { // no board waiting for player(s)
            connectxboard=this.createBoard(ws,players,rows,cols,connectCount)
        }
        const connectxplayer = this.addPlayer(ws,connectxboard, userName, playerId)
        this.log('board '+ connectxboard.boardId + ' now has ' + connectxboard.playerCount + ' players' ,ws)

        return { connectxboard, connectxplayer }
    }

    sendBoardStatus(ws, cxboard,connectxplayer)
    {
        if (cxboard.isComplete) {
            // is app required here? sockets are tied to app already
            const data = { app: 'connectx', action: 'joinBoard', boardId: cxboard.boardId, playerId: connectxplayer.playerId }
            this.log('Board '+ cxboard.boardId + ' is complete, now broadcasting joinBoard data ' + JSON.stringify(data),ws)
            cxboard.boardBroadcast(data) //, playerId: connectxplayer.playerId
            cxboard.randomCurrentPlayer() // we will now randomly pick a player to start (cause we have no way of knowing who previously started)
            this.log('cxboard.currentPlayerId=' + cxboard.currentPlayerId,ws)
            cxboard.boardBroadcast({ app: 'connectx', action: 'makeMove', playerId: cxboard.currentPlayerId, boardId: cxboard.boardId, playerIndex: cxboard.currentPlayer })
        }
        else {
            // use broadcast to update status of each and any client waiting
            this.log('Board ' + cxboard.boardId + ' is waiting for more players, now broadcasting waitBoard message',ws)
            cxboard.boardBroadcast({ app: 'connectx', action: 'waitBoard', boardId: cxboard.boardId, players: cxboard.maxPlayerCount, playersNeeded: cxboard.maxPlayerCount - cxboard.playerCount })
            // ws.send(JSON.stringify({ app: 'connectx', action: 'waitBoard', boardId: cxboard.boardId, playersNeeded: cxboard.maxPlayerCount-cxboard.playerCount}))
        }

    }

    sendBoardsWaiting(ws)
    {
       // console.log(this.connectxboards,ws)
       // dead boards are boards lingering after a player has left the game. We may somehow revive them in the future
       const filteredarray = this.connectxboards.filter(board => board.playerCount < board.maxPlayerCount && !board.deadBoard)
       const boards = filteredarray.map(board => {return {boardId: board.boardId, 
                                                          rows: board.rows,
                                                          cols: board.cols,
                                                          maxPlayerCount: board.maxPlayerCount,
                                                          connectCount: board.connectCount,
                                                          players: board.players.map(player => { return { playerId: player.playerId, name: player.name}})
                                                        }});
       // this.log(JSON.stringify({action: 'boardList', boards}))
       ws.send(JSON.stringify({action: 'boardList', boards}))
    }

    joinBoard(ws, players,rows,cols,connectCount, userName, playerId) {
        const res=this.createJoinBoard(ws, players,rows,cols,connectCount, userName, playerId)
        this.sendBoardStatus(ws,res.connectxboard, res.connectxplayer)
    }
    
    quitBoard(ws, boardId,playerId)
    {
        // TBD: determine if boardIds belonging to previous instances can be submitted on current instance
        // if this is true it could be prevented by using a UUID instead of the sequence number 
        const cxboard = this.getBoardById(ws,boardId)
        if(cxboard!==undefined){
            this.log('in quitBoard for board '+ boardId,ws)
            const wasComplete=cxboard.isComplete
            const playerIndex = cxboard.getPlayerIndex(playerId)
            cxboard.removePlayer(playerId)
            if(wasComplete){ // board with an active game
                this.log('player has quit an active game',ws)
                cxboard.deadBoard=true // removed a player from an active board, for the moment flag the board as a zombie
                this.log('quitBoard playerIndex=' + playerIndex)
                cxboard.boardBroadcast({ app: 'connectx', action: 'quitBoard', playerId, boardId, playerIndex }) // where player is the culprit
            }
            else if(cxboard.playerCount===0){
                this.log('last player waiting has quit',ws)
                // no more players, so clean up the empty board
                this.deleteBoard(ws,cxboard)
            }
            else{
                this.log('player has quit while waiting for more players',ws)
                // TBD: we will now resend the waitboard message with the update 'joined' count
            }
            cxboard.removePlayer(playerId)
        }
        else{
            this.log('got quitBoard for unknown board ' + boardId,ws)
        }
    }

    onMessage(ws, data) {
        this.log('Client has sent rtconnectxapp: ' + data)
        const msg = JSON.parse(data);
        let cxboard

        switch (msg.action) {
            case 'broadcastMessage': // for test purposes only
                this.log('got action broadcastMessage')
                const rtbc = new rtbroadcast(this.wss)
                rtbc.broadcast(ws,data, this.ws.app, msg.boardId)
                break
            case 'joinBoard':
                this.log('got action joinBoard')
                this.log('joinBoard ' + JSON.stringify(msg))
                this.joinBoard(ws, msg.players, msg.rows, msg.cols, msg.connectCount, msg.userName, msg.playerId) // userName to be used for auto join/create
                break
            case 'joinBoardById':
                // this message is used by the lobby browser after a board has been selected
                // the client should set players/rows/cols/connectCount according to parameters of the selected board
                const cxplayer=this.joinBoardById(ws, msg.boardId, msg.userName, msg.playerId)
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
              this.log('action boardList')
              this.sendBoardsWaiting(ws) // send a list of boards with room available for more players
              break
            case 'makeMove':
                // current player indicates we should move on to the next
                cxboard = this.getBoardById(ws, msg.boardId)
                if (msg.winner === 0 && !msg.isDraw) {
                    cxboard.nextPlayer()
                    cxboard.boardBroadcast({ app: 'connectx', action: 'makeMove', playerId: cxboard.currentPlayerId, boardId: cxboard.boardId, playerIndex: cxboard.currentPlayer})
                }
                // else game over, cleanup/remove board or something?
                break
            case 'quitBoard': // when client disconnecting? When/where to send?
              this.log('received quitboard for board ' + msg.boardId + ', playerId ' + msg.playerId,ws)
              this.quitBoard(ws,msg.boardId,msg.playerId)
              break
            default:
                if (msg.action !== undefined)
                    this.log('Received message with unknown action ' + msg.action,ws)
                else
                    this.log('Received message without action',ws)
        }
    }
}

export default connectxapp
