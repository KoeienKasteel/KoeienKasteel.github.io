
import './rtchatapp.js'
import rtSocket from './rtSocket.js'

class chatSocket extends rtSocket {
    constructor(chatApp) {
        super()

        this._chatApp = chatApp
        this._boardId = ''
        this._playerId = 0
    }

    get chatApp() {
        return this._chatApp
    }

    addCustomEventListeners() {
        const key = 'tx' // create event handlers for transmitting messages (tx)
        document.addEventListener(key + '-chatMessage', e => this.chatMessage(e)) // transmit our message to the server
    }

    isSocketOpen() {
        return this.ws.readyState === WebSocket.OPEN // false for all others, includes CONNECTING, CLOSED and CLOSING
    }

    chatMessage(e) {
        const data = JSON.parse(e.detail)
        this.ws.send(JSON.stringify({ 'action': 'chatMessage', chatMessage: data.chatMessage }));
    }

    // startChat() {
    //     const path='/app/chat'
        
    //     this.openSocket(path)
    //     this.addCustomEventListeners()
    // }

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
        this.chatApp.onSocketConnect(e)
    }

    onSocketClose(e) {
        this.chatApp.onSocketClose(e)
    }

    onSocketError(e) {
        this.chatApp.onSocketError(e)
    }
}

export default chatSocket
