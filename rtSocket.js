
class rtSocket{
    constructor()
    {

    }

    get ws()
    {
        return this._ws
    }
    
    set ws(value)
    {
        this._ws=value // check for/close existing ws here?
    }
    
    openSocket(path) {
        const host = window.location.host
        const hostname = window.location.hostname
        const port = 8080 // only for local servers, plesk uses passenger for apache wich will alway use port 443
    
        try
        {
            if (host==='' || hostname==='localhost') { // host will be empty when opened from file:drive, warning: probably not be empty when opening from UNC path
                this.ws = new WebSocket(`ws://localhost:${port}${path}`)
            }
            else {
                this.ws = new WebSocket(`wss://${host}${path}`) // connect to plesk which always listens on port 443
            }
        }
        catch(e)
        {
            // not happening, it was worth a try I suppose
            e
            this.onSocketError() // create separate call for this exception?
        }
    
        this.ws.binaryType = "blob" // either 'blob' or 'arraybuffer', see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/binaryType
    
        // Log socket opening and closing
        this.ws.addEventListener("open", e => {
            console.log("Websocket connection opened")
            this.onSocketConnect()
        })
        this.ws.addEventListener("close", e => {
            console.log("Websocket connection closed")
            this.onSocketClose()
        })
        this.ws.addEventListener("error", e => {
            console.error("WebSocket error:", e);
            // Handle the error, display a message, retry connection etc.
            this.onSocketError()
        })
        this.ws.addEventListener('message', (e, ws) => { this.receiveMessage(e, ws) })
    }    
}

export default rtSocket
