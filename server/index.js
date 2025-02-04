import rtchatapp from './rtchat/index.js'
import connectxapp from './rtconnectx/rtconnectxapp.js'
import sessionhandler from './rtsessionhandler.js'
import bcrypt from 'bcrypt'
import rtlog from './rtlog.js'
import { WebSocketServer } from 'ws';

const port = 8080 // only for local servers, plesk uses passenger for apache wich will alway use port 443

const wss = new WebSocketServer({ port })

wss.on("connection", (ws, req) => {
  function log(message, send = true) {
    rtlog.logdo(message, ws, send)
  }

  log("new client connected")
  log(`url=${req.url}`)

  var path = req.url.split('/');
  if (path[1] === 'app') // zero is empty because path starts with a /
  {
    if(wss.sessionhandler===undefined){
      log(`creating new sessionhandler object for server.`) // ${JSON.stringify(wss)}`)
      wss.sessionhandler=new sessionhandler(wss)  
    }

    ws.app = path[2]
    switch(ws.app)
    {
      case 'connectx':
        if(wss.cxapp===undefined){
          log(`creating new connectx application object for server.`) // ${JSON.stringify(wss)}`)
          wss.cxapp=new connectxapp(wss,ws)  
        }
        break;
      case 'session':
        if(wss.session===undefined){
          log(`creating new connectx application object for server.`) // ${JSON.stringify(wss)}`)
          wss.sesionhandler=new sessionhandler(wss)
        }
        break;
      default:
    }
  }

  //on message from client
  ws.on("message", data => {
    console.log(`onmessage`)
    log(`Client has sent us: ${data}`)
    // const msg = JSON.parse(data);
    log(`got message for '${ws.app}'`)
    switch (ws.app) {
      case 'chat':
        const chat = new rtchatapp(wss, ws)
        chat.onMessage(data)
        break;
      case 'connectx':
        log(`message for connectx`)
        wss.cxapp.onMessage(ws,data)
        break;
      case 'session':
        log(`message for sessionHandler`)
        wss.sessionhandler.onMessage(ws,data)
        break
      default:
        log(`Not processing message for unknown app '${app}'.`);
    }
  })

  // handling what to do when clients disconnects from server
  ws.on("close", () => {
    log("the client has disconnected")
    //todo remove user from data
    //todo send user quited to others on the same board
  });

  // handling client connection error
  ws.onerror = function () {
    log("Some Error occurred")
  }
})

// ToDo: indicate a connection on port 443 when running on plesk
rtlog.logdo(`The WebSocket server is running on port ${port}`);
