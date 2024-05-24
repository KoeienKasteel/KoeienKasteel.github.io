import mysql from 'mysql';
import rtlog from '../rtlog.js'

class dbhandler {
    constructor(ws) {
        this.ws=ws
        this.pool = mysql.createPool({
            connectionLimit: 10,
            host: 'localhost',
            database: 'rtconnectx',
            user: 'rtconnectx',
            password: '0%qt5uB98',
        });
        this.queries = {
            newGame: 'INSERT INTO boards (boardID,boardType,players,playerlimit,boardState) VALUES (?,?,?,?,?)',

            getMoves : 'SELECT move FROM moves where boardID = ? ',
            showconnectxdata: 'SELECT * FROM cxdata',

            deleteGame: 'DELETE FROM boards WHERE boardID = ?',
        }
    }

    log(message){
        rtlog.logdo(message,this.ws)
    }

    doquery()
    {
    this.log(`doquery1`)
    const somedata=[1,2,3]
    console.log(this)
    somedata.forEach(function each (data) {
        // console.log(this)
        this.log(data)}
    ,this)
    try{
        this.log(`doquery2`)
        this.query(this.queries.showconnectxdata,(results,fields) => {
          this.log(`results: ${JSON.stringify(results)}`)
          results.forEach(function each(result) {
            // this.log(JSON.stringify(result))
          })
          this.log(`fields: ${JSON.stringify(fields)}`)
        })  
      }
      catch(error){
        this.log(JSON.stringify(error))
      }
    }

    query(query, callback) {
        this.log(`query`)
        this.pool.query(query, (error, results, fields) => {
            if (error){
                this.log('mysql error:' + JSON.stringify(error))
                throw error;
            }
            else{
                callback(results,fields);
            }
        });
    }
}

export default dbhandler
