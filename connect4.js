"use strict";

let rows=6 // 6 for in original game
let cols=7 // 5 for in original game
let connectCount=4 // this is the number of connected fields you need to win
let players=2

// some constants to make calls to the gridwalker easier
const gwDown=1
const gwUp=-1
const gwRight=1
const gwLeft=-1
const gwStay=0
const tokens=['\uD83D\uDC04','\uD83C\uDFF0','\uD83E\uDDC0','\uD83D\uDC07'] // Unicode value for player tokens (cow, castle, cheese, rabbit)
let player

function connect4Main()
{
  const playField = document.getElementById("playfield")
  const playFieldData=initData(playField)
  const doDebug=false

  if(doDebug){
    initTestData(playFieldData)
  }
  moveDataToGrid(playField,playFieldData)
  resizeGrid()
}

function moveDataToGrid(playField,playFieldData)
{
  for (let rowCounter=0; rowCounter<rows; rowCounter++){
    for (let colCounter=0; colCounter<cols; colCounter++){
      const element=getElementByRowCol(playField,rowCounter,colCounter)
      const fieldData=playFieldData[rowCounter][colCounter]
      if(fieldData!==0)
        element.innerHTML=tokens[fieldData-1]
      else
        element.innerHTML=''
    }
  }
}

  function displayStatus(message)
  {
    console.log(message)
    document.getElementById("result").innerText=message
  }

  function displayInputStatus(message)
  {
    console.log(message)
    document.getElementById("inputstatus").innerText=message
  }

  function clearStatus()
  {
    document.getElementById("result").innerText=''
  }
  
  function initTestData(playFieldData)
  {
    // feel free to set up your own test data overhere
/*
    playFieldData[rows-5]=[0, 0, 0, 0, 0, 0]
    playFieldData[rows-4]=[0, 0, 1, 0, 0, 0]
    playFieldData[rows-3]=[0, 0, 1, 2, 0, 0]
    playFieldData[rows-2]=[0, 2, 2, 1, 2, 0]
    playFieldData[rows-1]=[1, 2, 1, 2, 2, 1]
*/
    playFieldData[rows-6]=[0, 0, 0, 0, 1, 0]
    playFieldData[rows-5]=[0, 0, 0, 0, 3, 0]
    playFieldData[rows-4]=[3, 4, 1, 3, 4, 3]
    playFieldData[rows-3]=[3, 4, 2, 1, 3, 4]
    playFieldData[rows-2]=[3, 2, 2, 1, 2, 4]
    playFieldData[rows-1]=[1, 2, 1, 2, 2, 1]
  }

  function addEventListeners(playField,playFieldData)
  {
    let element;
	
    const playData = playField.getElementsByClassName('playdata')
    for(const element of playData){
        element.addEventListener("click",function(e){
          fieldClick(e,playFieldData)
        })
    }
    element=document.getElementById("restart")
    element.addEventListener("click",function(e){
      doRestart(e,playFieldData)
    })
    element=document.getElementById("updateplayfield")
    element.addEventListener("click",function(e){
      updatePlayField(e,playField,playFieldData)
    })
  }

  function initData(playField)
  {
    let playFieldData=[]

    playField.innerHTML=''
    playField.style.setProperty("grid-template-columns","repeat(" + cols + ", auto)")
    for (let rowCounter=0; rowCounter<rows; rowCounter++){
      let rowData=[];
      for (let colCounter=0; colCounter<cols; colCounter++){
        rowData.push(0)
        const element=document.createElement("div")
        element.setAttribute('data-col',colCounter)
        element.setAttribute('data-row',rowCounter)
        element.classList.add('playdata')
        if(rowCounter===0){
          element.classList.add('playdatatop')
        }
        if(colCounter===cols-1){
          element.classList.add('playdataright')
        }
        playField.append(element)
      }
      playFieldData.push(rowData)
      console.log(playFieldData)
    }
    addEventListeners(playField,playFieldData)
    // TBD: find a way to alternate between players as starting player (random?)
    player=0 // invalid value used to update status through nextPlayer
    nextPlayer()

    return playFieldData
  }

  function checkBounds(rowPos,colPos)
  {
    if(rowPos>=0 && colPos>=0 && rowPos<rows && colPos<cols)
      return true
    else
      return false
  }
  
  function doGridWalk(playFieldData,player,rowStart,colStart,rowIncrement, colIncrement)
  {
    let rowPos,colPos
    let fieldData,matchCount
  
    player=playFieldData[rowStart][colStart]
    if(+player>0){ // Regular player
      matchCount=0
    }
    else if(player===0){ // player 0 is a special case for counting empty fields when dropping a token
      matchCount=1
    }
    else
    {
      // this indicates an invalid value in the playFieldData
      return 0
    }
    rowPos=rowStart
    colPos=colStart
    do{
      rowPos+=rowIncrement
      colPos+=colIncrement
      if(checkBounds(rowPos,colPos)){ // when still on the grid
        fieldData=playFieldData[rowPos][colPos]
        if(player===fieldData){  // current field belongs to current player
          matchCount++;
        }
      }
      // check field belongs to current player and is within bounds
    } while(checkBounds(rowPos,colPos) && fieldData===player)
  
    return matchCount;
  }
  
function gridWalker(playFieldData,player,rowStart,colStart,rowIncrement1, colIncrement1,rowIncrement2,colIncrement2)
{
  let i,j
  let winner=''

  // always walk in two directions
  i=doGridWalk(playFieldData,player,rowStart,colStart,rowIncrement1,colIncrement1)
  j=doGridWalk(playFieldData,player,rowStart,colStart,rowIncrement2,colIncrement2)
  if(i+j+1>=connectCount){ // +1 for current field
    winner=player
  }

  return winner;
}
  
  function hasWinner(playFieldData,rowStart,colStart)
  {
    let winner=0
  
    const player=playFieldData[rowStart][colStart]
    winner=gridWalker(playFieldData,player,rowStart,colStart,gwDown,gwStay,gwUp,gwStay) // Walk down, then walk up
    if(winner===0){
      winner=gridWalker(playFieldData,player,rowStart,colStart,gwStay,gwRight,gwStay,gwLeft) // Walk right, then walk left
    }
    if(winner===0){
      winner=gridWalker(playFieldData,player,rowStart,colStart,gwDown,gwRight,gwUp,gwLeft) // Walk down right, then walk up left
    }
    if(winner===0){
      winner=gridWalker(playFieldData,player,rowStart,colStart,gwUp,gwRight,gwDown,gwLeft) // Walk up right, then walk down left
    }
    if(winner!==0){
      document.getElementById("result").innerText='player '+ winner +' wins';
    }

    return winner;
  }

  function nextPlayer()
  {
    let playerNumber=+player
    playerNumber++
    if(playerNumber>players){
      playerNumber=1
    }
    player=playerNumber.toString();
    document.getElementById("result").innerText='player '+ player +' up';
  }

  function getElementByRowCol(playField,row,col)
  {
       // querySelectorAll should always return a single element since it uses pseudo selectors on row and col data attributes
       const elements=playField.querySelectorAll('[data-row=\''+row+'\'][data-col=\''+col+'\']')
     if(elements.length===1)
       return elements[0]
     else
       return undefined
  }

  function insertToken(playField,playFieldData,row,col)
  {
      // insert a token in the current column
      playFieldData[row][col]=player
      const element=getElementByRowCol(playField,row,col)
      element.innerHTML=tokens[player-1]
  }

  function checkWinner(playFieldData,row,col)
  {
    // now check from (!) current field for a winner
    const winner=hasWinner(playFieldData,row,col);
    if(winner!==0){
      displayStatus('Player '+winner+' wins') // TBD: show token here instead of number?
     }
     return winner
  }

  function checkDraw(playFieldData)
  {
    // walk upper row to determine if we have a draw, break if we find an empty field
    let colCount
    for(colCount=cols-1; colCount>=0; colCount--){
      if(playFieldData[0][colCount]===0)
        break
    }
    if(colCount===-1){ // no colums left
      // row 0 completely full, it's a draw
      displayStatus('It\' a draw!')  
    }

    if(colCount===-1)
      return true
    else
      return false
  }

function disableColumn(playField,col)
  {
    // alter css to disable pointer-events for entire col
    for(let rowCount=0; rowCount<rows; rowCount++){
      const element=getElementByRowCol(playField,rowCount,col)
      element.style.setProperty("pointer-events","none")
    }
  }

function fieldClick(e,playFieldData)
  {
    const col=+e.currentTarget.getAttribute('data-col')
    let row=+e.currentTarget.getAttribute('data-row')
    let emptyFields

    const playField = document.getElementById("playfield")
    emptyFields=doGridWalk(playFieldData,'',0,col,gwDown,gwStay)
    if(emptyFields>0){
      row=emptyFields-1
      insertToken(playField,playFieldData,row,col)
      const winner=checkWinner(playFieldData,row,col)
      if(winner===0){
        if(row===0){
          // last field added completes col, disable col now
          disableColumn(playField,col)
        }
        if(!checkDraw(playFieldData)){
          nextPlayer()
        }
      }
      else{
        // we have a winner! disable entire grid
        for(let colCounter=0; colCounter<cols; colCounter++)
          disableColumn(playField,colCounter)
      }
    }
    // else this column is full and should have been disabled earlier on
  }

function doRestart(e,playFieldData)
{
  for (let row=0; row<rows; row++){
    for (let col=0; col<cols; col++){
      playFieldData[row][col]=0;
    }
  }
  const playField = document.getElementById("playfield")
  for(const element of playField.children){
    element.style.removeProperty('pointer-events')
  }
  moveDataToGrid(playField,playFieldData)
  player=0 // used to update status through nextPlayer
  nextPlayer()
}

function decimalSeparator()
{ // SO solution
  var n = 1.1;
  n = n.toLocaleString().substring(1, 2);
  return n;
}

function isPositiveInt(str)
{ // SO stuff ahead, with some additional checks
  if (typeof str != "string")
    return false // we only process strings!  
  if(isNaN(str) || // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
     isNaN(parseInt(str))) // ...and ensure strings of whitespace fail
    return false
  else if(parseInt(str)<0 || str.indexOf(decimalSeparator())!==-1)
    return false
  return true
}

function checkFields()
{
if(!isPositiveInt(strColumns)){
  displayInputStatus("Enter an integer number for columns")
}
else if(!isPositiveInt(strRows)){
  displayInputStatus("Enter an integer number for rows")
}
else if(!isPositiveInt(strPlayers)){
  displayInputStatus("Enter an integer number for players")
}
else if(!isPositiveInt(strConnectCount)){
  displayInputStatus("Enter an integer number for connect count")
}
else{
  return true
}
return false
}

function checkValues()
{
  if(numColumns<3 || numColumns>16){ // max value is arbitrary, but you probably don't like it any larger
    displayInputStatus("Enter a number of columns between 3 and 16")
  } else if(numRows<3 || numRows>16){
    displayInputStatus("Enter a number of rows between 3 and 16")
  } else if(numPlayers<2 || numPlayers>4){ // this is actually limited by the number of symbols in the token array, though more than four doesn't make much sense
    displayInputStatus("Enter a number of players between 2 and 4")
  } else if(numConnectCount<2 || numConnectCount>6){ // this is the number of connected tokens for win (i.e, set it to 3 for connect3 or 5 for connect 5)
    displayInputStatus("Enter a connect count between 3 and 6") // upper limit is kind of artificial, though more than six doesn't make much sense
  } else if(numConnectCount>numColumns || numConnectCount>numRows){
    displayInputStatus("Connect count cannot be larger than boardsize") // upper limit is kind of artificial, though more than six doesn't make much sense
  }
  else{
    return true
  }
  return false
}

function updatePlayField(e,playField,playFieldData)
{
  // TBD: add dialog to ask user if they're sure
  const strColumns = document.getElementById("columns").value
  const strRows = document.getElementById("rows").value
  const strPlayers = document.getElementById("players").value
  const strConnectCount = document.getElementById("connectcount").value
  if(checkFields(strColums,strRows,strPlayers,strConnectCount)){
    const numColumns=parseInt(strColumns)
    const numRows=parseInt(strRows)
    const numPlayers=parseInt(strPlayers)
    const numConnectCount=parseInt(strConnectCount)

    if(checkValues){
      // we're good to go!
      displayInputStatus('')
      cols=numColumns
      rows=numRows
      players=numPlayers
      connectCount=numConnectCount
      playFieldData=initData(playField)
      moveDataToGrid(playField,playFieldData)
      resizeGrid()
    }
  }
}

function updateClassList(className)
{
  const elements=document.getElementsByClassName("playdata")
  for(let element of elements)
  {
    element.classList.remove('fieldlarge','fieldmedium','fieldsmall','fieldtiny')
    element.classList.add(className)
  }
}

function resizeGrid()
{
  const fieldWidth=window.innerWidth/cols
  const fieldHeight=(window.innerHeight-140)/rows // 140 is about the size of status messages and buttons
  let resizeClass

  console.log('fieldWith='+fieldWidth)
  console.log('fieldHeight='+fieldHeight)

  if(fieldWidth>125 && fieldHeight>125)
  {
    resizeClass='fieldlarge'
  }
  else if(fieldWidth>100 && fieldHeight>100)
  {
    resizeClass='fieldmedium'
  }
  else if(fieldWidth>80 && fieldHeight>80)
  {
    resizeClass='fieldmedium'
  }
  else // if(fieldWidth>60 && fieldHeight>60)
  {
    resizeClass='fieldtiny'
  }
  console.log(resizeClass)
  updateClassList(resizeClass)
  console.log('--')
}