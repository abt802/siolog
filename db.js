"use strict";

const fs = require('fs');
const PW = require('./chk_pass');
const sqlite3 = require('sqlite3');
const db_file = './db/app.db';

const db = new sqlite3.Database(db_file);

const init = () => {
 fs.stat(db_file, (e) => {if(!e) return;});
 db.serialize(function(){
  db.run(`
   CREATE TABLE IF NOT EXISTS system (
   passwd TEXT
   ,account_opt INTEGER
   ,log_opt TEXT
   )
  `);
  db.get(`SELECT * FROM system`, (err, row) => {
   if(!row){
    db.run(`INSERT INTO system VALUES ('',1,'{"days":"0","h":"0","m":"0"}')`);
   }
  });

  db.run(`
   CREATE TABLE IF NOT EXISTS users (
    uid INTEGER PRIMARY KEY AUTOINCREMENT
   ,id TEXT
   ,passwd TEXT
   ,rtoken TEXT
   ,wtoken TEXT
   ,vtoken TEXT
   ,secret TEXT
   ,tag_opt INTEGER DEFAULT 1
   ,secret_opt INTEGER DEFAULT 1
   )
  `);

  db.run(`
   CREATE TABLE IF NOT EXISTS tags (
    tid INTEGER PRIMARY KEY AUTOINCREMENT
   ,uid INTEGER
   ,tag TEXT
   ,tag_name TEXT
   ,od INTEGER
   )
  `);

  db.run(`
   CREATE TABLE IF NOT EXISTS logs (
    lid INTEGER PRIMARY KEY AUTOINCREMENT
   ,uid INTEGER
   ,tag TEXT
   ,msg TEXT
   ,rdate INTEGER
   )
  `);

  db.run(`
   CREATE TABLE IF NOT EXISTS access_log (
   id TEXT
   ,ip TEXT
   ,rdate DATETIME DEFAULT (DATETIME('now', 'localtime'))
   )
  `);

  db.run(`
   CREATE VIEW IF NOT EXISTS logs_v AS
    SELECT lid
          ,uid
          ,msg
          ,strftime('%Y/%m/%d %H:%M:%S',datetime(rdate/1000,'unixepoch','localtime')) AS rdate
          ,tag
          ,(SELECT tags.tag_name FROM tags WHERE tags.tag = logs.tag AND tags.uid = logs.uid) AS tag_name
          ,(SELECT tags.tid FROM tags WHERE tags.tag = logs.tag AND tags.uid = logs.uid) AS tid
    FROM logs
  `);

  db.run(`
   CREATE TABLE IF NOT EXISTS match_data (
   mid INTEGER PRIMARY KEY AUTOINCREMENT
   ,uid INTEGER
   ,key_str TEXT
   ,color TEXT
   ,push INTEGER DEFAULT 0
   ,od INTEGER
   )
  `);

  db.run(`
   CREATE TABLE IF NOT EXISTS devices (
   dev_id TEXT
   ,uid INTEGER
   )
  `);

  db.run(`
   CREATE TABLE IF NOT EXISTS notifies (
   uid INTEGER
   ,type TEXT
   ,tokens TEXT
   ,active INTEGER DEFAULT 0
   )
  `);
 });
};

const get_user = (params) => {
 return new Promise((resolve, reject) => {
  const sql = `SELECT uid,id,passwd,rtoken,wtoken,vtoken,secret,tag_opt,secret_opt FROM users WHERE `;
  let cond,param;
  if(params.uid){
   cond = `uid = ?`;
   param = [params.uid];
  }else if(params.wtoken){
   cond = `wtoken = ?`;
   param = [params.wtoken];
  }else if(params.rtoken){
   cond = `rtoken = ?`;
   param = [params.rtoken];
  }else if(params.vtoken){
   cond = `vtoken = ?`;
   param = [params.vtoken];
  }else{
   cond = `id = ?`;
   param = [params.id];
  }
  db.get(sql+cond, param, (error, row) => {
   if(error || !row){
    reject(error);
   }else{
    resolve(row);
   }
  });
 });
}

const add_user = (params) => {
 const id = params.id;
 const pw_txt = params.pw;
 const pw = PW.mkHash(pw_txt);
 const sql = `INSERT INTO users (id,passwd,rtoken,wtoken,vtoken,secret) VALUES (?,?,?,?,?,?)`;
 const query = [id,pw,randomStr(),randomStr(),randomStr(16),randomStr()];
 return new Promise((resolve, reject) => {
  db.run(sql, query, (error, rows) => {
   if(error){
    reject(error);
   }else{
    resolve(rows);
   }
  });
 });
}

const delete_user = (params) => {
 const uid = params.uid;
 const tables = ['users','tags','logs'];
 const query = [uid];
 let sql;
 return new Promise((resolve, reject) => {
  db.serialize(() => {
   for(let table of tables){
    sql = `DELETE FROM `+table+` WHERE uid = ?`;
    db.run(sql, query, (error, rows) => {
     if(error){
      reject(error);
     }else{
      resolve(rows);
     }
    });
   }
  });
 });
}

const update_id = (params) => {
 const uid = params.uid;
 const id = params.id;
 const sql = `UPDATE users SET id = ? WHERE uid = ?`;
 const query = [id,uid];
 return new Promise((resolve, reject) => {
  db.run(sql, query, (error, rows) => {
   if(error){
    reject(error);
   }else{
    resolve(rows);
   }
  });
 });
}

const update_passwd = (params) => {
 const uid = params.uid;
 const passwd_txt = params.passwd;
 const passwd = PW.mkHash(passwd_txt);
 const sql = `UPDATE users SET passwd = ? WHERE uid = ?`;
 const query = [passwd,uid];
 return new Promise((resolve, reject) => {
  db.run(sql, query, (error, rows) => {
   if(error){
    reject(error);
   }else{
    resolve(rows);
   }
  });
 });
}

const get_tag = (uid) => {
 return new Promise((resolve, reject) => {
  const sql = `SELECT tid,tag,tag_name FROM tags WHERE uid =? ORDER BY od isNull,od`;
  db.all(sql, [uid], (error, rows) => {
   if(error){
    reject(error);
   }else{
    resolve(rows);
   }
  });
 });
}

const get_match_data = (uid) => {
 return new Promise((resolve, reject) => {
  const sql = `SELECT mid,key_str,color,push FROM match_data WHERE uid = ?  ORDER BY od isNull,od`;
  db.all(sql, [uid], (error, rows) => {
   if(error){
    reject(error);
   }else{
    resolve(rows);
   }
  });
 });
}

const get_system = () => {
 return new Promise((resolve, reject) => {
  const sql = `SELECT * FROM system`;
  db.get(sql, (error, rows) => {
   if(error){
    reject(error);
   }else{
    resolve(rows);
   }
  });
 });
}

const update_system = (params) => {
 const action = params.action;
 let data = params.data;
 if(action == 'passwd'){
  data = PW.mkHash(data);
 }
 const sql = `UPDATE system SET `+action+` = ?`;
 const query = [data];
 return new Promise((resolve, reject) => {
  db.run(sql, query, (error, rows) => {
   if(error){
    reject(error);
   }else{
    resolve(rows);
   }
  });
 });
}

const randomStr = (length) => {
  let s = '';
  length = length || 32;
  for (let i = 0; i < length; i++) {
   let random = Math.random() * 16 | 0;
   s += (i == 12 ? 4 : (i == 16 ? (random & 3 | 8) : random)).toString(16);
  }
  return s;
}

module.exports = {
 'db': db,
 'init': init,
 'get_user': get_user,
 'add_user': add_user,
 'delete_user': delete_user,
 'update_id': update_id,
 'update_passwd': update_passwd,
 'get_tag': get_tag,
 'get_match_data': get_match_data,
 'get_system': get_system,
 'update_system': update_system,
};
