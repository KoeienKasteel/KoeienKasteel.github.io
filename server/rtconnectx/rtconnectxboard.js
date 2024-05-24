import rtlog from '../rtlog.js'

// connectxboard represents a board with various players

class connectxboard {
    constructor(boardId, maxPlayerCount,rows,cols,connectCount) {
        this._boardId = boardId
        this._maxPlayerCount = maxPlayerCount
        this._currentplayer = 1 // should not be necessary because it should be randomized at start of game
        // ideally we should increment the startplayer from one game to another because starting means winning for classic connect4
        // how to do this? have client sent it's previous start position/status when calling joinboard?
        this._rows=rows
        this._cols=cols
        this._connectCount=connectCount
        this.players = []
        console.log(`connectxboard ${JSON.stringify(this)}`)
    }

    log(message,send=true){
        rtlog.logdo(message,undefined,send)
    }

    get currentPlayer()
    {
        return this._currentplayer
    }

    set currentPlayer(value)
    {
        this._currentplayer=value
    }

    boardBroadcast(data)
    {
        this.players.forEach(player => player.sendObject(data))
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

    nextPlayer()
    {
        this._currentplayer++
        if(this._currentplayer>maxPlayerCount)
          this._currentplayer=1
    }

    randomCurrentPlayer()
    {
        this._currentplayer = Math.floor(Math.random()*this.maxPlayerCount)+1
    }
    
    getNextPlayerId(){
        if(this.players.length===this.maxPlayerCount){ 
          return 0
        }
        else{
          return this.players.length+1
        }
    }

    addPlayer(connectxplayer)
    {
        this.players.push(connectxplayer)
    }

    isComplete()
    {
        return this.players.length===this.maxPlayerCount
    }

    nextPlayer() {
        this.currentPlayer++
        if (this.currentPlayer > this.maxPlayerCount) {
          this.currentPlayer = 1
        }
      }    
}

export default connectxboard
