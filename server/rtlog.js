import * as fs from 'fs'

class rtlog{

  constructor() {
  };

  static logdo(message,ws=undefined,send=true,writefile=true)
  {
    const date = new Date();
    console.log()
    const datestring=String(date.getDate()).padStart(2, '0')+ '/' +String(date.getMonth()+1).padStart(2, '0')+'/' + date.getFullYear()
    const timestring=String(date.getHours()).padStart(2,'0')+ ':'+String(date.getMinutes()).padStart(2,'0')+ ':'+String(date.getSeconds()).padStart(2,'0')+ '.' +String(date.getMilliseconds()).padStart(3,'0')
    message=`${datestring} ${timestring} `+message
    // message=date.toLocaleString() + ' ' + message

    console.log(message);
    if(send && ws!==undefined){
      ws.send(JSON.stringify({ action: 'log',message}))
    }
  
    if(writefile)
    {
      let filename
      if(process.platform==='win32'){
        filename='c:\\users\\public\\documents\\nodejs.log'
      }
      else{ // we're probably on some sort of *nix
        filename='/var/log/nodejs.log' // warning: this file needs to exist and allow writing (preferable 0666) by the webserver
      }
      
      fs.appendFile(filename, message + "\n", err => {
        if (err) {
          console.error(err);
        } else {
          // done!
        }
      })
    }
  }
}
  
export default rtlog
