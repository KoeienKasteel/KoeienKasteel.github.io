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

    // get an array of boards waiting matching the playercount (rows,cols,connectCount)
    getMatchingBoardsWaiting(ws,players) {
        // get boards with a matching player count and room available for more players
        const filteredarray = this.connectxboards.filter(board => board.playerCount < board.maxPlayerCount && board.maxPlayerCount === players)
        return filteredarray
    }

    getSingleBoard(ws,players) {
        const boardsWaiting = this.getMatchingBoardsWaiting(ws,players)
        return boardsWaiting.length === 1 ? boardsWaiting[0] : undefined
    }

    // returns all boards with less than the required number of players. Used by lobby browser
    getBoardsWaiting(ws) {
        const filteredarray = this.connectxboards.filter(board => board.playerCount < board.maxPlayerCount)
        return filteredarray
    }

    addPlayer(ws, connectxboard) {
        const playerId = connectxboard.getNextPlayerId()
        if (playerId > 0) {
            const connectxplayer = new rtconnectxplayer(ws, connectxboard.boardId, playerId)
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

    joinBoardById(ws, boardId) {
        const connectxboard = this.getBoardById(ws, boardId)
        if(connectxboard!==undefined)
        {
            const connectxplayer=addplayer(ws, connectxboard)
            this.sendBoardStatus(ws, cxboard, connectxplayer)
        }

        return cxplayer // does anyone care?
    }

    createBoard(ws,players)
    {
        const boardId = uuidv4() // maybe use a common sequence number instead of a uuid?
        this.log(`create board players: ${players}`,ws)
        const connectxboard = new rtconnectxboard(boardId, players) // (rows, columns, connectcount)
        this.connectxboards.push(connectxboard)
        return connectxboard
    }

    createJoinBoard(ws, players) { // (rows, columns, connectcount)
        // remark: this function should only be called when either zero boards or one board is waiting, otherwise the player should pick one from a list
        // const maxplayercount=2 // for the moment being
        let connectxboard = this.getSingleBoard(ws, players) //,rows,cols,connectCount
        if (connectxboard === undefined) { // no board waiting for player(s)
            connectxboard=this.createBoard(ws,players)
        }
        const connectxplayer = this.addPlayer(ws, connectxboard)

        return { connectxboard, connectxplayer }
    }

    sendBoardStatus(ws,cxboard,connectxplayer)
    {
        if (cxboard.isComplete()) {
            const data = { app: 'connectx', action: 'joinBoard', boardId: cxboard.boardId, playerId: connectxplayer.playerId }
            this.log(`Board ${cxboard.boardId} is complete, now broadcasting joinBoard data '${JSON.stringify(data)}'`, ws)
            // is app required here? sockets are tied to app already
            cxboard.boardBroadcast(data) //, playerId: connectxplayer.playerId
            cxboard.randomCurrentPlayer() // we will now randomly pick a player to start (cause we have no way of knowing who previously started)
            cxboard.boardBroadcast({ app: 'connectx', action: 'makeMove', player: cxboard.currentPlayer, boardId: cxboard.boardId })
        }
        else {
            // use broadcast to update status of each and any client waiting
            this.log(`Board ${cxboard.boardId} is waiting for more players, now broadcasting waitBoard message`, ws)
            cxboard.boardBroadcast({ app: 'connectx', action: 'waitBoard', boardId: cxboard.boardId, playersNeeded: cxboard.maxPlayerCount - cxboard.playerCount })
            // ws.send(JSON.stringify({ app: 'connectx', action: 'waitBoard', boardId: cxboard.boardId, playersNeeded: cxboard.maxPlayerCount-cxboard.playerCount}))
        }

    }

    sendBoardsWaiting(ws)
    {
       const filteredarray = this.connectxboards.filter(board => board.playerCount < board.maxPlayerCount)
       const boards = filteredarray.map(board => {return {boardId: board.boardId, maxPlayerCount: board.maxPlayerCount}});
       ws.send(JSON.stringify({action: 'createBoardBrowser', boards}))
    }

    joinBoard(ws, players) { // (rows, columns, connectcount)
        if (this.getMatchingBoardsWaiting(ws,players).length <= 1) { // autojoin/create if one or zero boards match parameters
            const res=this.createJoinBoard(ws, players)
            this.sendBoardStatus(ws, res.connectxboard, res.connectxplayer)
        }
        else {
            // ws.send({ action: 'createBoardBrowser' })
            // respond with boardlist
            if(this.getMatchingBoardsWaiting(ws,players).length===0){ // when no board matching parameter(s)
                const connectxboard=this.createBoard(ws,players)
                this.addPlayer(ws, connectxboard)
            }
            this.sendBoardsWaiting(ws)
        }
    }

    onMessage(ws, data) {
        this.log(`Client has sent us: ${data}`)
        const msg = JSON.parse(data);
        let cxboard

        switch (msg.action) {
            case 'broadcastMessage':
                this.log('got action broadcastMessage')
                const rtbc = new rtbroadcast(this.wss)
                rtbc.broadcast(data, this.ws.app, msg.boardId)
                break
            case 'joinBoard':
                this.log('got action joinBoard', ws)
                this.joinBoard(ws,msg.players)
                break
            case 'joinBoardById':
                // this message is used by the lobby browser after a board was selected
                // the client should set players/rows/cols/connectCount according to parameters of the selected board
                this.joinBoardById(ws, msg.boardId)
                break
            case 'moveMade':
                // sent by client after a move has been made, broadcast to all players
                cxboard = this.getBoardById(ws, msg.boardId)
                cxboard.boardBroadcast(msg)
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
            // case 'quitBoard': // when client disconnecting? When/where to send?
            //   this.quitBoard(msg.boardId,msg.playerId)
            default:
                if (msg.action !== undefined)
                    this.log(`Received message with unknown action ${msg.action}`)
                else
                    this.log(`Received message without action`)
        }
    }
}

export default connectxapp
