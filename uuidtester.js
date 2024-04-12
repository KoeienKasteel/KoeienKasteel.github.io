function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
})
}

const c1={id:1, app: 'connectx', boardId: uuidv4()}
const c2={id:2, app: 'connectx', boardId: c1.boardId}
const c3={id:3, app: 'connectx', boardId: c1.boardId}
const c4={id:4, app: 'connecty', boardId: uuidv4()}
const c5={id:5, app: 'connecty', boardId: c4.boardId}
const c6={id:6, app: 'connecty', boardId: c4.boardId}
const c7={id:7, app: 'connectz', boardId: uuidv4()}
const c8={id:8, app: undefined, boardId: c7.boardId}
const c9={id:9, app: 'connectz', boardId: c7.boardId}

const clients=[c1,c2,c3,c4,c5,c6,c7,c8,c9]
let boardId=c4.boardId
console.log('filter with anonymous function')
const clientsByBoardId=clients.filter(function(client){return client.boardId===boardId})
console.log(clientsByBoardId)

console.log('forEach with lambda')
clients.forEach(client => (client.boardId===boardId || client.app===undefined) && console.log(client))

console.log('forEach with double lambda')
const app='connecty'
boardId=undefined
/* this.wss. */ clients.forEach(client => (app===undefined || client.app===app) && (boardId===undefined || client.boardID===/* msg. */ boardId) && /* client.send */ console.log(JSON.stringify(/*message*/ client)))
