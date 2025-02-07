import mysql from 'mysql';
import rtlog from './rtlog.js'
import dbconnection from './rtdbconnection.js'

class dbhandler {
    constructor(ws) {
        this.ws=ws
        this.pool = mysql.createPool({
            connectionLimit: dbconnection.connectionLimit,
            host: dbconnection.host,
            database: dbconnection.database,
            user: dbconnection.user,
            password: dbconnection.password,
        });
        this.queries = {
            createUser: 'INSERT INTO users (userName, password) VALUES (?,?)', // Id is auto increment, password is password hash
            getUserByName : 'SELECT * FROM users where userName = ?',
            getUser: 'SELECT * FROM users where id = ?',
            updateUserPassword: 'UPDATE users SET password = ? where Id = ?',
            deleteUser: 'DELETE FROM users WHERE id = ?',
        }
    }

    log(message){
        rtlog.logdo(message,this.ws)
    }

    doQuery()
    {
    // ?
    try{
        this.query(this.queries.showconnectxdata,(results,fields) => {
          })
      }
      catch(error){
        this.log(JSON.stringify(error))
      }
    }

    getUserByName(userName,callback){
      this.escapeQuery(
        this.queries.getUserByName,
        userName,
        (response) => {
          callback(response);
        });
    }

    createUser(arr, callback) {
      //send a createboard query to the database return a okpacket object
      this.escapeQuery(
        this.queries.createUser,
        arr,
        (response) => {
          callback(response);
        });
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

    escapeQuery(query, arr, callback) {
        this.pool.query(query, arr, (error, results, fields) => {
          if (error) throw error;
          callback(results);
        });
      };

    close() {
        this.pool.end((err) => { });
    }    
}

export default dbhandler
