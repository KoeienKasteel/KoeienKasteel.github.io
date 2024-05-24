
import connectXSocket from './rtconnectxsocket.js'

const gwDown = 1
const gwUp = -1
const gwRight = 1
const gwLeft = -1
const gwStay = 0

class connectXApp {
  constructor() {
    this._ismultiplayer = false
    this._hasWinner = false
    this._hasDraw = false
    this._isWaiting = false
    this.boardList = undefined
    this.tokens = ['🐄', '🏰', '🧀', '🐇']
  }

  // some constants to make calls to the gridwalker easier
  static get gwDown() {
    return gwDown
  }

  static get gwUp() {
    return gwDown
  }

  static get gwRight() {
    return gwDown
  }

  static get gwLeft() {
    return gwDown
  }

  static get gwStay() {
    return gwStay
  }

  get playFieldData() {
    return this._playFieldData
  }

  set playFieldData(value) {
    this._playFieldData = value
  }

  get startPlayer() {
    return this._startPlayer
  }

  set startPlayer(value) {
    this._startPlayer = value
  }

  get player() {
    return this._player
  }

  set player(value) {
    this._player = value
  }

  get players() {
    return this._players
  }

  set players(value) {
    this._players = value
  }

  get connectCount() {
    return this._connectCount
  }

  set connectCount(value) {
    this._connectCount = value
  }

  get webSocket() {
    return this._webSocket
  }

  set webSocket(value) {
    this._webSocket = value // TBD: check for undefined and close socket?
  }

  get boardId() {
    return this._boardId
  }

  set boardId(value) {
    this._boardId = value
  }

  get netPlayer() {
    return this._playerId
  }

  set netPlayer(value) {
    this._playerId = value
  }

  get isMultiPlayer() {
    return this._ismultiplayer
  }

  set isMultiPlayer(value) {
    this._ismultiplayer = value
  }

  get hasWinner() {
    return this._hasWinner
  }
  set hasWinner(value) {
    this._hasWinner = value
  }
  get hasDraw() {
    return this._isDraw
  }
  set hasDraw(value) {
    this._isDraw = value
  }

  connectXMain() {
    const doDebug = true
    this.addEventListeners()
    this.resetField(true, doDebug, false) // silent,doDebug,multiPlayer
  }

  moveDataToGrid(playField) {
    for (let rowCounter = 0; rowCounter < this.rows; rowCounter++) {
      for (let colCounter = 0; colCounter < this.cols; colCounter++) {
        const element = this.getElementByRowCol(playField, rowCounter, colCounter)
        const fieldData = this.playFieldData[rowCounter][colCounter]
        if (fieldData !== 0)
          element.innerText = this.tokens[fieldData - 1]
        else
          element.innerText = ''
      }
    }
  }

  displayStatus(message) {
    document.getElementById('result').innerText = message
  }

  displayInputStatus(message) {
    document.getElementById('inputstatus').innerText = message
  }

  clearStatus() {
    document.getElementById('result').innerText = ''
  }

  initTestData() {
    // feel free to set up your own test data overhere
    this.playFieldData[this.rows - 6] = [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1]
    this.playFieldData[this.rows - 5] = [0, 0, 0, 4, 0, 0, 0, 3, 0, 0, 0, 4]
    this.playFieldData[this.rows - 4] = [0, 0, 0, 3, 4, 1, 3, 4, 3, 3, 1, 1]
    this.playFieldData[this.rows - 3] = [0, 4, 1, 3, 4, 2, 1, 3, 4, 2, 2, 1]
    this.playFieldData[this.rows - 2] = [0, 3, 1, 3, 2, 2, 1, 2, 4, 2, 4, 4]
    this.playFieldData[this.rows - 1] = [4, 1, 3, 1, 2, 1, 2, 2, 1, 2, 3, 3]
  }

  addEventListeners() {
    let element
    element = document.getElementById('updateplayfield')
    element.addEventListener('click', e => this.resetLocal(e))
    element = document.getElementById('multiplayer')
    element.addEventListener('click', e => this.startMultiPlayer(e))
    window.addEventListener('resize', e => this.onResizeWindow(e))
    window.addEventListener('beforeunload', e => this.onBeforeUnload(e));
  }

  addFieldEventListeners(playField) {
    const playData = playField.getElementsByClassName('playdata')
    for (const element of playData) {
      element.addEventListener('click', e => this.fieldClick(e))
    }
  }

  initData() {
    this.playFieldData = []

    const container = document.getElementById('maincontainer')
    container.innerHTML = ''
    const playField = document.createElement('div')
    playField.id = 'playfield'
    container.append(playField)
    playField.style.setProperty('grid-template-columns', `repeat(${this.cols}, auto)`)
    for (let rowCounter = 0; rowCounter < this.rows; rowCounter++) {
      let rowData = [];
      for (let colCounter = 0; colCounter < this.cols; colCounter++) {
        rowData.push(0)
        const element = document.createElement('div')
        element.setAttribute('data-col', colCounter)
        element.setAttribute('data-row', rowCounter)
        element.classList.add('playdata')
        if (rowCounter === 0) {
          element.classList.add('playdatatop')
        }
        if (colCounter === this.cols - 1) {
          element.classList.add('playdataright')
        }
        playField.append(element)
      }
      this.playFieldData.push(rowData)
    }
    this.addFieldEventListeners(playField)
    this.player = this.startPlayer = Math.floor(Math.random() * this.players) + 1 // between 1 and 4, not zero based
    this.updatePlayerUp()

    return this.playFieldData
  }

  checkBounds(rowPos, colPos) {
    if (rowPos >= 0 && colPos >= 0 && rowPos < this.rows && colPos < this.cols)
      return true
    else
      return false
  }

  doGridWalk(player, rowStart, colStart, rowIncrement, colIncrement) {
    let rowPos, colPos
    let fieldData, matchCount

    player = this.playFieldData[rowStart][colStart]
    if (+player > 0) { // Regular player
      matchCount = 0
    }
    else if (player === 0) { // player 0 is a special case for counting empty fields when dropping a token
      matchCount = 1
    }
    else {
      // this indicates an invalid value in the playFieldData
      return 0
    }
    rowPos = rowStart
    colPos = colStart
    do {
      rowPos += rowIncrement
      colPos += colIncrement
      if (this.checkBounds(rowPos, colPos)) { // when still on the grid
        fieldData = this.playFieldData[rowPos][colPos]
        if (player === fieldData) {  // current field belongs to current player
          matchCount++;
        }
      }
      // check field belongs to current player and is within bounds
    } while (this.checkBounds(rowPos, colPos) && fieldData === player)

    return matchCount;
  }

  gridWalker(player, rowStart, colStart, rowIncrement1, colIncrement1, rowIncrement2, colIncrement2) {
    let winner = 0

    // always walk in two directions
    const i = this.doGridWalk(player, rowStart, colStart, rowIncrement1, colIncrement1)
    const j = this.doGridWalk(player, rowStart, colStart, rowIncrement2, colIncrement2)
    if (i + j + 1 >= this.connectCount) { // +1 for current field
      winner = this.player
    }

    return winner;
  }

  isWinner(currentPlayer, rowStart, colStart) {
    let winner = 0

    // const player = this.playFieldData[rowStart][colStart]
    winner = this.gridWalker(currentPlayer, rowStart, colStart, gwDown, gwStay, gwUp, gwStay) // Walk down, then walk up
    if (winner === 0) {
      winner = this.gridWalker(currentPlayer, rowStart, colStart, gwStay, gwRight, gwStay, gwLeft) // Walk right, then walk left
    }
    if (winner === 0) {
      winner = this.gridWalker(currentPlayer, rowStart, colStart, gwDown, gwRight, gwUp, gwLeft) // Walk down right, then walk up left
    }
    if (winner === 0) {
      winner = this.gridWalker(currentPlayer, rowStart, colStart, gwUp, gwRight, gwDown, gwLeft) // Walk up right, then walk down left
    }

    if(winner!==0){
      this.hasWinner=true // global status to indicate there is no active game
    }

    return winner;
  }

  updatePlayerUp() {
    document.getElementById('result').innerText = 'Player ' + this.tokens[this.player - 1] + ' up';
  }

  nextPlayer() {
    this.player++
    if (this.player > this.players) {
      this.player = 1
    }
    this.updatePlayerUp()
  }

  getElementByRowCol(playField, row, col) {
    // querySelectorAll should always return a single element since it uses pseudo selectors on row and col data attributes
    const elements = playField.querySelectorAll('[data-row=\'' + row + '\'][data-col=\'' + col + '\']')
    if (elements.length === 1)
      return elements[0]
    else
      return undefined
  }

  insertToken(playField, currentPlayer, row, col) {
    // insert a token in the current column
    this.playFieldData[row][col] = currentPlayer
    const element = this.getElementByRowCol(playField, row, col)
    element.innerText = this.tokens[currentPlayer - 1]
    const result = this.updatePlayField(currentPlayer, row, col)
    return result
  }

  checkWinner(currentPlayer, row, col) {
    // now check from (!) current field for a winner
    const winner = this.isWinner(currentPlayer, row, col);
    if (winner !== 0) {
      this.displayStatus('Player ' + this.tokens[winner - 1] + ' wins')
    }
    return winner
  }

  isDraw() {
    // walk upper row to determine if we have a draw, break if we find an empty field
    let colCount
    for (colCount = this.cols - 1; colCount >= 0; colCount--) {
      if (this.playFieldData[0][colCount] === 0) // if upper row is empty
        break
    }
    if (colCount === -1) { // no colums left
      // row 0 completely full, it's a draw
      this.displayStatus('It\' a draw!')
    }

    if (colCount === -1){
      this.hasDraw=true
      return true
    }
    else{
      return false
    }
  }

  disableColumn(playField, col) {
    // alter css to disable pointer-events for entire col
    for (let rowCount = 0; rowCount < this.rows; rowCount++) {
      const element = this.getElementByRowCol(playField, rowCount, col)
      element.style.setProperty('pointer-events', 'none')
    }
  }

  updatePlayField(currentPlayer, row, col) {
    // let emptyFields
    const playField = document.getElementById('playfield')
    const winner = this.checkWinner(currentPlayer, row, col)
    let isDraw = false
    if (winner === 0) {
      if (row === 0) {
        // last field added completes col, disable col now
        this.disableColumn(playField, col)
      }
      isDraw = this.isDraw()
      if (!isDraw && !this.isMultiPlayer) {
        this.nextPlayer()
      }
    }
    else {
      // we have a winner! disable entire grid
      for (let colCounter = 0; colCounter < this.cols; colCounter++)
        this.disableColumn(playField, colCounter)
    }

    return { winner, isDraw }
  }

  getCurrentRow(col) {
    const emptyFields = this.doGridWalk('', 0, col, gwDown, gwStay)
    return emptyFields - 1
  }

  playFieldClick(col, currentPlayer) {
    const playField = document.getElementById('playfield')
    // const emptyFields = this.doGridWalk('', 0, col, gwDown, gwStay)
    const row = this.getCurrentRow(col)

    if (row >= 0) {
      // row = emptyFields - 1
      this.insertToken(playField, currentPlayer, row, col)
    }
    // else this column is full and should have been disabled earlier on  
  }

  fieldClick(e) {
    const col = +e.currentTarget.getAttribute('data-col')
    // let row = +e.currentTarget.getAttribute('data-row')
    const row = this.getCurrentRow(col)

    if (this.isMultiPlayer) {
      if (this.netPlayer === this.player) {
        this.sendMoveMade(row, col)
      }
      // else ignore the message cause it's not our turn
    }
    else {
      this.playFieldClick(col, this.player)
    }
  }

  doRestart(e) {
    if (confirm('Restart game?')) {
      // const element = document.getElementById('restart')
      // let playFieldData = element.playFieldData
      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          this.playFieldData[row][col] = 0;
        }
      }
      const playField = document.getElementById('playfield')
      for (const element of playField.children) {
        element.style.removeProperty('pointer-events')
      }
      this.moveDataToGrid(playField)
      player = this.startPlayer // previous starter
      nextPlayer()
      this.startPlayer = player // current starter
    }
  }

  decimalSeparator() { // SO solution
    var n = 1.1;
    n = n.toLocaleString().substring(1, 2);
    return n;
  }

  isPositiveInt(str) { // SO stuff ahead, with some additional checks
    if (typeof str != 'string')
      return false // we only process strings!  
    if (isNaN(str) || // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
      isNaN(parseInt(str))) // ...and ensure strings of whitespace fail
      return false
    else if (parseInt(str) < 0 || str.indexOf(this.decimalSeparator()) !== -1)
      return false
    return true
  }

  checkFields(strColumns, strRows, strPlayers, strConnectCount) {
    if (!this.isPositiveInt(strColumns)) {
      this.displayInputStatus('Enter an integer number for columns')
    }
    else if (!this.isPositiveInt(strRows)) {
      this.displayInputStatus('Enter an integer number for rows')
    }
    else if (!this.isPositiveInt(strPlayers)) {
      this.displayInputStatus('Enter an integer number for players')
    }
    else if (!this.isPositiveInt(strConnectCount)) {
      this.displayInputStatus('Enter an integer number for connect count')
    }
    else {
      return true
    }
    return false
  }

  checkValues(numRows, numColumns, numPlayers, numConnectCount) {
    if (numRows < 3 || numRows > 16) {
      this.displayInputStatus('Enter a number of rows between 3 and 16')
    }
    else if (numColumns < 3 || numColumns > 32) { // max value is arbitrary, but you probably don't like it any larger
      this.displayInputStatus('Enter a number of columns between 3 and 32')
    } else if (numPlayers < 2 || numPlayers > 4) { // this is actually limited by the number of symbols in the token array, though more than four doesn't make much sense
      this.displayInputStatus('Enter a number of players between 2 and 4')
    } else if (numConnectCount < 2 || numConnectCount > 6) { // this is the number of connected tokens for win (i.e, set it to 3 for connect3 or 5 for connect 5)
      this.displayInputStatus('Enter a connect count between 3 and 6') // upper limit is kind of artificial, though more than six doesn't make much sense
    } else if (numConnectCount > numColumns || numConnectCount > numRows) {
      this.displayInputStatus('Connect count cannot be larger than boardsize') // upper limit is kind of artificial, though more than six doesn't make much sense
    }
    else {
      return true
    }
    return false
  }

  resetLocal(e) {
    this.resetField(false, false, false) // silent, doDebug, multiPlayer
  }

  resetField(silent, doDebug, isMultiPlayer) {
    let result = false

    const strColumns = document.getElementById('columns').value
    const strRows = document.getElementById('rows').value
    const strPlayers = document.getElementById('players').value
    const strConnectCount = document.getElementById('connectcount').value
    if (this.checkFields(strColumns, strRows, strPlayers, strConnectCount)) {
      const numColumns = parseInt(strColumns)
      const numRows = parseInt(strRows)
      const numPlayers = parseInt(strPlayers)
      const numConnectCount = parseInt(strConnectCount)

      if (this.checkValues(numRows, numColumns, numPlayers, numConnectCount)) {
        if (silent || confirm('Restart with updated parameters?')) {
          // we're good to go!
          result = true
          this.displayInputStatus('')
          this.checkQuitBoard()
          this.hasWinner=false
          this.hasDraw=false
          this.cols = numColumns
          this.rows = numRows
          this.players = numPlayers
          this.isMultiPlayer = isMultiPlayer
          this.connectCount = numConnectCount
          this.playFieldData = this.initData()
          const playField = document.getElementById('playfield')
          if (doDebug) {
            this.displayInputStatus('Showing demo data! Press local or multi to start a new game!')
            this.initTestData()
          }
          this.moveDataToGrid(playField)
          this.doResizeWindow(playField)
        }
      }
    }

    return result
  }

  onResizeWindow(e) {
    this.doResizeWindow()
  }

  doResizeWindow() {
    let cellSize
    const playField = document.getElementById('playfield')
    if (playField !== null) { // only resize when displaying the board
      // const border = 2
      const cellWidth = Math.floor((window.innerWidth - this.cols * 2 - 40) / this.cols)
      let cellHeight = Math.floor((window.innerHeight - 200) / this.rows) // 200 is about the size of status messages and buttons
      const paddingBottom = Math.round(cellHeight / 10) // slightly lift characters for better fit
      cellHeight -= paddingBottom
      cellSize = cellHeight < cellWidth ? cellHeight : cellWidth // pick the smallest one for both height and width
      const bodyContainer = document.getElementById('bodycontainer')
      bodyContainer.style.height = window.innerHeight + 'px'
      bodyContainer.style.width = window.innerWidth + 'px'
      const mainContainer = document.getElementById('maincontainer')
      mainContainer.style.height = (cellSize + paddingBottom) * rows + 'px' //+ 2 * border
      mainContainer.style.width = (cellSize) * this.cols + 'px' // + 2 * border
      const fontSize = Math.round(cellSize / 1.4) // 1.4 look like a nice fit
      const playData = playField.getElementsByClassName('playdata')
      for (const element of playData) {
        element.style.width = cellSize + 'px'
        element.style.height = cellSize + 'px'
        element.style.fontSize = fontSize + 'px'
        element.style.paddingBottom = paddingBottom + 'px'
      }
    }
  }

  sendQuitBoard()
  {
    console.log('sendQuitBoard')
    const message = { boardId: this.boardId, player: this.netPlayer }
    this.sendMessage('quitBoard', message)
  }

  quitBoard(e)
  {
    if(this.boardId===e.detail.boardId){ // check if this message is for me, should never fail as long as boards and sockets match
      if(e.detail.player!==this.netPlayer){ // do not show game over status for myself
        this.displayStatus(`Game over! Player ${e.detail.player} has left the game!`)
      }
    }
    // TBD: disable the entire board because we can not continue with less players than we started with
  }
 
  onBeforeUnload(e){
    console.log('onBeforeUnload')
    if(this.isMultiPlayer && !this.hasWinner && !this.hasDraw){
      this.sendQuitBoard()
    }

    // uncomment to show the 'Leave Page' confirmation dialog
    // this is kind of useless since we might have sent the quitBoard message already
    // e.preventDefault()
    // return true
  }

  serverLog(e) { // log message sent by server, for diagnostic purposes only
    console.log('nodejs - ' + e.detail.message)
  }

  joinBoard(e) { // this message is sent after the required player count is reached. Remark: server will send message makeMove as a follow up to joinBoard
    this.isWaiting = false
    this.boardId = e.detail.boardId
    this.netPlayer = e.detail.playerId
    this.displayStatus(`Joined board '${this.boardId}' as player '${this.playerId}'.`)
    // this.resetField(true, false, true) // (silent, doDebug, multiPlayer)
  }

  waitBoard(e) { // indicates there is either one board waiting for an additional player or a board selected by Id is waiting for an additional player
    // We basically don't care for any of the parameters, all we need to know is we have to wait
    this.isWaiting=true
    this.boardId = e.detail.boardId; // the board we're waiting for
    const playersNeeded = e.detail.playersNeeded // the number of additional players we need, for display purposes only
    this.displayStatus(playersNeeded > 1 ? `Waiting for ${playersNeeded} more players to join` : 'Waiting for another player to join')
  }

  boardButtonClick(e) {
    console.log(`click `, e.target.nodeName)
    if (e.target.nodeName == `BUTTON`) {
      this.sendJoinBoardById(e.target.id, 'Mario'); // TBD pass actual name as parameter
    }
  }

  multiPlayerSelector(clearContainer) { // Show create/join and board list buttons
    this.displayInputStatus('')
    this.displayStatus('Select auto join/create to join or create, select get board list for a list of boards')
    const container = document.getElementById('maincontainer')
    if(clearContainer){
      container.innerHTML=''
    }
    const selector = document.createElement('div')
    selector.id = 'multiselector'
    const buttonJoinCreate = document.createElement('button')
    buttonJoinCreate.innerHTML = 'Auto Join/Create'
    buttonJoinCreate.classList.add('footerbutton')
    buttonJoinCreate.addEventListener('click', e => this.sendJoinBoard(e))
    const buttonBoardList = document.createElement('button')
    buttonBoardList.innerHTML = 'Get Board List'
    buttonBoardList.classList.add('footerbutton')
    buttonBoardList.addEventListener('click', e => this.sendBoardList(e))
    selector.append(buttonJoinCreate, buttonBoardList)
    container.append(selector)
  }

  addDiv(element, content) {
    const div = document.createElement('div')
    div.innerHTML = content
    element.append(div)
  }

  addButton(element, id, content, styles=[]) {
    const button = document.createElement('button')
    button.id = id
    button.innerHTML = content
    styles.forEach(style => {
      button.classList.add(style)
    })
    element.append(button)
  }

  makeBoardList(e) { // Indicates the client should display a boardlist so the player can select a board to join
    this.boardList = e.detail.boards

    const container = document.getElementById('maincontainer')
    container.innerHTML = ''
    const boardList = document.createElement('div')
    boardList.id = 'boardlist'
    // header
    this.addDiv(boardList, 'Id')
    this.addDiv(boardList, 'Rows')
    this.addDiv(boardList, 'Columns')
    this.addDiv(boardList, 'Players Joined')
    this.addDiv(boardList, 'Players Required')
    this.addDiv(boardList, 'Connect Count')
    this.addDiv(boardList, 'Player Names')
    this.addDiv(boardList, '') // button
    // boards
    e.detail.boards.forEach(board => {
      this.addDiv(boardList, board.boardId)
      this.addDiv(boardList, board.rows)
      this.addDiv(boardList, board.cols)
      this.addDiv(boardList, board.players.length)
      this.addDiv(boardList, board.maxPlayerCount)
      this.addDiv(boardList, board.connectCount)
      this.addDiv(boardList, board.players.map(player => player.name).join())
      this.addButton(boardList, board.boardId, 'Join',['joinbutton'])
    }
    )
    container.append(boardList)
    this.multiPlayerSelector(false)

    this.displayInputStatus('')
    if (e.detail.boards.length > 0) {
      this.displayStatus('Select a board from the list')
    }
    else {
      this.displayStatus('There are no boards available')
      // ToDo: insert button to retry or return or something?
    }
    boardList.addEventListener('click', e => this.boardButtonClick(e)) // was container.addEventListener
  }

  makeMove(e) { // sent to all clients. Client that matches playerid should wait for player to make a move, other clients should show waiting message
    this.player = e.detail.player
    if (this.player === this.netPlayer) {
      this.displayStatus(`It's your turn to make a move, player ${this.tokens[e.detail.player - 1]}`)
    }
    else {
      this.displayStatus(`Waiting for player ${e.detail.player} (${this.tokens[e.detail.player - 1]}) to make a move`)
    }
  }

  moveMade(e) { // is sent to all clients after a move has been made
    // const data=JSON.parse(e.data)
    const playfield = document.getElementById('playfield')
    const result = this.insertToken(playfield, e.detail.player, e.detail.row, e.detail.col)
    if (result.winner === 0 && result.isDraw === false) {
      this.displayStatus('Waiting for server...')
    }
    if (e.detail.player === this.netPlayer) {
      this.sendMakeMove(this.boardId, result.winner, result.isDraw) // if it was my turn kick the server now
    }
    else {
      // game over!
    }
  }

  addCustomEventListeners() {
    const key = 'rx' // create event handlers for messages received (rx)
    document.addEventListener(key + '-log', e => this.serverLog(e)) // got a log message from the server
    document.addEventListener(key + '-joinBoard', e => this.joinBoard(e)) // joined a board. This message should include boardId and playerId
    document.addEventListener(key + '-waitBoard', e => this.waitBoard(e)) // board does not have enough players, show message 'waiting for another/more players'
    document.addEventListener(key + '-boardList', e => this.makeBoardList(e)) // got list of boards waiting for a player/more players
    document.addEventListener(key + '-makeMove', e => this.makeMove(e)) // indicates who's turn it is to make a move, client should compare playerId and either wait for input or moveMade message
    document.addEventListener(key + '-moveMade', e => this.moveMade(e)) // indicates a player has made a move (either me or someone else)
    document.addEventListener(key + '-quitBoard', e => this.quitBoard(e)) // indicates a player has left the board
  }

  checkQuitBoard()
  {
    if(this.isMultiPlayer){ // if we're already in an active multiplayer game...
      const playField = document.getElementById('playfield')
      if(playField!==null && !this.hasWinner && !this.hasDraw){ // ...and showing the playfield and the game is not over
        this.sendQuitBoard()
      }
    }
  }

  startMultiPlayer(e) {
    // TBD: see if we can move this code to rtconnectxsocket instead
    if (this.webSocket === undefined) {
      this.webSocket = new connectXSocket(this)
      this.webSocket.startMultiPlayer()
      this.addCustomEventListeners() // here or maybe somewhere earlier on?
      this.displayStatus('Connecting to server...')
    }
    else {
      if (this.webSocket.isSocketOpen()) {
        this.checkQuitBoard()
        this.multiPlayerSelector(true)
      }
      // else
      //   try to sleep a bit, reconnect or just ignore when already connecting?
    }
  }

  onSocketConnect() {
    console.log('onSocketConnect, now joining board.')
    this.multiPlayerSelector(true)
  }

  onSocketError() {
    console.log('Socket error, cannot connect to server.')
    this.displayStatus('Error connecting to server')
  }

  onSocketClose() {
    console.log('Socket error, disconnected from server.')
  }

  sendMoveMade(row, col) {
    const message = { boardId: this.boardId, row, col, player: this.player }
    this.sendMessage('moveMade', message)
  }

  sendJoinBoard(e) {
    const playerName = `Mario` // TBD get name from UI
    if (this.resetField(true, false, true)) { // validate inputs
      // this is the autojoin message, either join existing board or create new one
      const message = { playerName, players: this.players, rows: this.rows, cols: this.cols, connectCount: this.connectCount }
      this.sendMessage('joinBoard', message) // at the moment this will create a board when no board matching parameters exists, auto join if it does exist
    }
  }

  sendJoinBoardById(boardId, playerName) {

    const boards = this.boardList.filter(board => board.boardId === boardId) // this should naturally always return a single board
    const board = boards[0]
    // push values from boardarray to UI
    let element
    element = document.getElementById('columns')
    element.value = board.cols
    element = document.getElementById('rows')
    element.value = board.rows
    element = document.getElementById('players')
    element.value = board.maxPlayerCount
    element = document.getElementById('connectcount')
    element.value = board.connectCount

    if (this.resetField(true, false, true)) { // this should never fail since it only checks the parameters we just set
      const message = { boardId, playerName }
      this.sendMessage('joinBoardById', message)
    }
  }

  sendMakeMove(boardId, winner, isDraw) {
    const message = { boardId, winner, isDraw }
    this.sendMessage('makeMove', message)
  }

  sendBoardList(playerName) {
    const message = { playerName }
    this.sendMessage('boardList', message)
  }

  sendMessage(action, message = {}) {
    const key = 'tx'
    message.action = action
    const data = JSON.stringify(message);
    console.log(`sending '${data}' to host`)
    const customEvent = new CustomEvent(key + '-' + action, { detail: data });
    document.dispatchEvent(customEvent);
  }
}

export default connectXApp
