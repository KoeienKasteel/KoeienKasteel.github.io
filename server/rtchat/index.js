// import myhello from './myhello.js'
// import * as myhello2 from './myhello2.js'
import rtlog from '../rtlog.js'
import rtbroadcast from '../rtbroadcast.js'

// console.log(myhello.getfullname('John', 'Doe')); // My fullname is John Doe
// console.log(myhello2.getfullname('Jane', 'Doh')); // My fullname is Jane Doh

class rtchat {
    constructor(wss, ws) {
        this.wss = wss
        this.ws = ws
    };

    log(message, send = true) {
        rtlog.logdo(message, this.ws, send)
    }

    onMessage(data) {
        this.log(`chat.onmessage`)
        const rtbc = new rtbroadcast(this.wss)
        const msg=JSON.parse(data)
        rtbc.broadcast(msg,undefined,this.ws.app)
    }

    // static sayhello() {
    //     return myhello.sayhello()
    // }
}

export default rtchat;
