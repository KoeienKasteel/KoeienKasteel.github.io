import rtlog from '../rtlog.js'

// connectxboard represents a board with various players

class connectxboard {
    constructor(ws,boardId, maxPlayerCount,rows,cols,connectCount) {
        this._boardId = boardId
        this._maxPlayerCount = maxPlayerCount
        this._isComplete = false
        this.currentPlayer = 0 // should not be necessary because it should be randomized at start of game
        // ideally we should increment the startplayer from one game to another because starting means winning for classic connect4
        // how to do this? have client sent it's previous start position/status when calling joinboard?
        this._rows=rows
        this._cols=cols
        this._connectCount=connectCount
        this.players = []
        console.log(`connectxboard ${JSON.stringify(this)}`)
        this._ws=ws
    }

    log(message,ws=undefined,send=true){
        rtlog.logdo(message,ws,send)
    }

    get currentPlayer()
    {
        return this._currentPlayer
    }

    set currentPlayer(value)
    {
        this._currentPlayer=value
    }

    get currentPlayerId()
    {
       return this.players[this.currentPlayer].playerId
    }

    boardBroadcast(data, withPlayerId=false)
    {
        this.players.forEach(player => player.sendObject(data,withPlayerId))
    }

    get boardId(){
        return this._boardId
    }

    get maxPlayerCount() {
        return this._maxPlayerCount
    }

    get playerCount(){
        return this.players.length
    }

    get rows()
    {
        return this._rows
    }

    set rows(value)
    {
        this._rows=value
    }

    get cols()
    {
        return this._cols
    }

    set cols(value)
    {
        this._cols=value
    }

    get connectCount()
    {
        return this._connectCount
    }

    set connectCount(value)
    {
        this._connectCount=value
    }

    get isComplete()
    {
        return this._isComplete
    }

    nextPlayer() {
        this.log('nextPlayer for playerId ' + this.currentPlayerId + ' with index ' + this.currentPlayer,this._ws)
        let playerIndex = -1
        this.players.forEach((player, index) => playerIndex = player.playerId === this.currentPlayerId ? index : playerIndex)
        if (playerIndex >= 0) {
            playerIndex++
            if (playerIndex >= this.players.length) {
                playerIndex = 0
            }
            this.currentPlayer=playerIndex
        }
        else{
            this.log('nextPlayer failed with -1',this._ws)
        }
    }

    randomCurrentPlayer()
    {
        this.log('randomCurrentPlayer',this._ws)
        const index = Math.floor(Math.random()*this.maxPlayerCount)
        this.currentPlayer = index
        this.log('randomCurrentPlayer now ' + this.currentPlayer,this._ws)
    }
    
    addPlayer(connectxplayer)
    {
        this.players.push(connectxplayer)
        if(this.players.length===this.maxPlayerCount){
            this._isComplete=true
        }
    }

    removePlayer(playerId)
    {
        // this removes a player from the board.
        this.log('players: ' + this.players,this._ws)
        this.log('RemovePlayer ' + playerId + ' count in = ' + this.players.length, this._ws)
        this.players=this.players.filter(player => player.playerId!==playerId,this._ws)
        this.log('RemovePlayer count out = ' + this.players.length,this._ws)
    }

    getPlayerIndex(playerId) {
        let playerIndex = -1
        this.log('getPlayerIndex for ' + playerId,this._ws)
        this.players.forEach((player, index) => {
            playerIndex = player.playerId === playerId ? index : playerIndex
            this.log('player.playerId=' + player.playerId + ' playerId=' + playerId + ' playerIndex is now '+ playerIndex,this._ws)
        })
        return playerIndex !== -1 ? playerIndex : undefined
    }
}

export default connectxboard
