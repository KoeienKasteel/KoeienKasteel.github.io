
import './connectxapp.js'
import rtSocket from './rtSocket.js'

class connectXSocket extends rtSocket {
    constructor(connectxapp) {
        super()

        this._connectxapp = connectxapp
        this._boardId = ''
        this._playerId = 0
    }

    get connectXApp() {
        return this._connectxapp
    }

    addCustomEventListeners() {
        const key = 'tx' // create event handlers for transmitting messages (tx)
        document.addEventListener(key + '-joinBoard', e => this.joinBoard(e)) // join a board. This message has no parameters since the server will either reply with boardId/playerId or a boardList
        document.addEventListener(key + '-joinBoardById', e => this.joinBoardById(e)) // join a specific board. This message should include boardId, server will return the playerId
        document.addEventListener(key + '-moveMade', e => this.moveMade(e)) // indicates the player has made a move, should only be sent by current player
        document.addEventListener(key + '-makeMove', e => this.makeMove(e)) // indicates the server should send the next makeMove call
        document.addEventListener(key + '-boardList', e => this.makeBoardList(e)) // indicates the server should send a list of boards waiting for players
        document.addEventListener(key + '-quitBoard', e => this.quitBoard(e)) // indicates the user has quit the board, either by closing the window or joining another board
    }

    isSocketOpen() {
        return this.ws.readyState === WebSocket.OPEN // false for all others, includes CONNECTING, CLOSED and CLOSING
    }

    startMultiPlayer() {
        const path='/app/connectx'

        this.openSocket(path)
        this.addCustomEventListeners()
    }

    joinBoard(e) { // ,rows,cols,players,connectcount
        const data = JSON.parse(e.detail)
        // join any existing board waiting for one or more players or create a new one when none present
        this.ws.send(JSON.stringify(Object.assign({ 'action': 'joinBoard'}, data)))
    }

    joinBoardById(e) {
        const data = JSON.parse(e.detail)
        // used by boardlist UI element to indicate we want to join a particular board
        this.ws.send(JSON.stringify(Object.assign({ 'action': 'joinBoardyId'}, data)))
    }

    moveMade(e) {
        const data = JSON.parse(e.detail)
        this.ws.send(JSON.stringify(Object.assign({'action': 'moveMade'}, data)))
    }

    makeMove(e) {
        const data = JSON.parse(e.detail)
        this.ws.send(JSON.stringify(Object.assign({'action': 'makeMove'}, data)))
    }

    makeBoardList(e){
        const data = JSON.parse(e.detail)
        this.ws.send(JSON.stringify(Object.assign({'action': 'boardList'}, data)))
    }

    quitBoard(e) {
        const data = JSON.parse(e.detail)
        this.ws.send(JSON.stringify(Object.assign({'action': 'quitBoard'}, data)))
    }

    receiveMessage(e) {
        const key = 'rx'
        const data = JSON.parse(e.data);
        if (data.action !== 'log') { // prevent duplicate log messages
            console.log(`received message '${e.data}' from server`)
        }
        const customEvent = new CustomEvent(key + '-' + data.action, { detail: data });
        customEvent.ws = this
        document.dispatchEvent(customEvent);
    }

    onSocketConnect(e) {
        this.connectXApp.onSocketConnect(e)
    }

    onSocketClose(e) {
        this.connectXApp.onSocketClose(e)
    }

    onSocketError(e) {
        this.connectXApp.onSocketError(e)
    }
}

export default connectXSocket
