
import chatSocket from './rtchatsocket.js'

const app = 'chat'

class chatApp {
    startChat() {
        const path = '/app/chat'

        if (this.webSocket === undefined) {
            this.webSocket = new chatSocket(this)
            this.webSocket.openSocket(path)
            this.webSocket.addCustomEventListeners()
            this.addCustomEventListeners() // here or maybe somewhere earlier on?
            this.addEventListeners()
        }
        // else { } // duplicate call to start chat?
    }

    addCustomEventListeners() {
        const key = 'rx' // create event handlers for messages received (rx)
        document.addEventListener(key + '-log', e => this.serverLog(e)) // got a log message from the server
        document.addEventListener(key + '-chatMessage', e => this.chatMessage(e)) // received a chatmessage
    }

    addEventListeners() {
        const form = document.getElementById('msgForm');
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const message = document.getElementById('inputBox').value;
            this.sendMessage('chatMessage', { app, chatMessage: message });
            document.getElementById('inputBox').value = ''
        })
    }

    serverLog(e) { // log message sent by server, for diagnostic purposes only
        console.log('nodejs - ' + e.detail.message)
    }

    chatMessage(e) { // received a chat message
        const msgDiv = document.createElement('div')
        msgDiv.classList.add('msgCtn')
        if (e.data instanceof Blob) {
            reader = new FileReader()
            reader.onload = () => {
                msgDiv.innerHTML = '>>' + reader.result
                document.getElementById('messages').appendChild(msgDiv)
            };
            reader.readAsText(e.data);
        } else {
            console.log("Result2: " + e.data)
            msgDiv.innerHTML = e.detail.chatMessage
            document.getElementById('messages').appendChild(msgDiv)
        }
    }

    onSocketConnect(e) {
        e
    }

    onSocketClose(e) {
        e
    }

    onSocketError(e) {
        e
    }

    sendMessage(action, message) {
        const key = 'tx'
        message.action = action
        const data = JSON.stringify(message);
        console.log(`sending '${data}' to host`)
        const customEvent = new CustomEvent(key + '-' + action, { detail: data });
        document.dispatchEvent(customEvent);
    }
}

export default chatApp
