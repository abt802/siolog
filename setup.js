"use strict";

const DB = require('./db');
const db = DB.db;
const express = require('express');
const router = express.Router();

router.use((req, res, next) => {
 const user = req.session.user;
 if(req.session.auth.view){
  res.status(500).end('Not Access.');
 }else{
  next();
 }
});

router.get('/' , function(req, res){
 const user = req.session.user;
 const uid = user.uid;
 const rtoken = user.rtoken;
 const wtoken = user.wtoken;
 const vtoken = user.vtoken;
 const secret = new Buffer.from(user.secret, 'utf8').toString('base64');
 const tag_opt = user.tag_opt;
 const secret_opt = user.secret_opt;
 const root_url = req.protocol + '://' + req.headers.host;
 const access_url = root_url + '/api';
 const view_url = root_url + '/login/' + vtoken;
 const post_url = root_url + '/post/' + vtoken + '?msg=メッセージ[&tag=タグ]';
 const login_url = root_url + '/login/' + rtoken;
 const token_src = {'url':access_url, 'token':wtoken};
 const access_token = new Buffer.from(JSON.stringify(token_src), 'utf8').toString('base64');
 const app_keys = module.parent.exports.get('app_keys');
 Promise.all([DB.get_tag(uid),DB.get_match_data(uid),getNotify(uid)]).then((data) => {
  res.render('setup', {'login_url':login_url, 'view_url':view_url, 'post_url':post_url, 'access_token':access_token, 'secret_key':secret, 'tag_opt':tag_opt, 'secret_opt':secret_opt, 'app_key':app_keys.publicKey, 'tags':data[0], 'match_data':data[1], 'notify_data':data[2]});
 }).catch((err) => {
  console.log(err);
  res.status(500).end();
 });
});

router.post('/tag' , function(req, res){
 const uid = req.session.user.uid;
 const data = req.body.data;
 const FuncList = [];
 JSON.parse(data).forEach(function(val, idx){
  let param = {};
  param.uid = uid;
  param.tid = val.tid;
  param.tag = val.tag;
  param.tag_name = val.tag_name;
  param.od = idx;
  FuncList.push = update_tag(param);
 });
 Promise.all(FuncList).then(() => {
  res.status(200).json({'status':true});
 }).catch((err) => {
  console.log(err);
  res.status(500).json({'status':false});
 });
});

router.delete('/tag/:tid' , function(req, res){
 const uid = req.session.user.uid;
 const tid = req.params.tid || '';
 delete_tag({'tid': tid,'uid': uid}).then(() => {
  res.status(200).json({'status':true});
 }).catch((err) => {
  console.log(err);
  res.status(200).json({'status':false});
  //res.status(500).json({'status':false});
 });
});

router.post('/match' , function(req, res){
 const uid = req.session.user.uid;
 const data = req.body.data;
 const FuncList = [];
 JSON.parse(data).forEach(function(val, idx){
  let param = {};
  param.uid = uid;
  param.mid = val.mid;
  param.key_str = val.key_str;
  param.color = val.color;
  param.push = val.push ? 1 : 0;
  param.od = idx;
  FuncList.push = update_match(param);
 });
 Promise.all(FuncList).then(() => {
  res.status(200).json({'status':true});
 }).catch((err) => {
  console.log(err);
  res.status(500).json({'status':false});
 });
});

router.delete('/match/:mid' , function(req, res){
 const uid = req.session.user.uid;
 const mid = req.params.mid || '';
 delete_match({'mid': mid,'uid': uid}).then(() => {
  res.status(200).json({'status':true});
 }).catch((err) => {
  console.log(err);
  res.status(200).json({'status':false});
 });
});

router.post('/token' , function(req, res){
 const action = req.body.action;
 let token = randomStr();
 if(action == 'vtoken') token = randomStr(16);
 const user_data = req.session.user;
 user_data[action] = token;
 update_token(user_data).then((rows) => {
  req.session.user = user_data;
  res.status(200).json({'status':true});
 }).catch((err) => {
  console.log(err);
  res.status(200).json({'status':false});
 });
});

router.put('/opt' , function(req, res){
 const uid = req.session.user.uid;
 const action = req.body.action;
 const data = req.body.data;
 const params = {'uid':uid, 'action':action, 'data':data};
 update_opt(params).then((rows) => {
  req.session.user[action] = data;
  res.status(200).json({'status':true});
 }).catch((err) => {
  console.log(err);
  res.status(200).json({'status':false});
 });
});

router.get('/id/:id' , function(req, res){
 const id = req.params.id || '';
 check_id({'id': id}).then(() => {
  res.status(200).json({'status':true});
 }).catch((err) => {
  res.status(200).json({'status':false});
 });
});

router.put('/id' , function(req, res){
 const uid = req.session.user.uid;
 const id = req.body.id;
 DB.update_id({'uid': uid, 'id': id}).then(() => {
  res.status(200).json({'status':true});
 }).catch((err) => {
  console.log(err);
  res.status(200).json({'status':false});
 });
});

router.post('/passwd' , function(req, res){
 const uid = req.session.user.uid;
 const passwd = req.body.passwd;
 DB.update_passwd({'uid': uid, 'passwd': passwd}).then(() => {
  res.status(200).json({'status':true});
 }).catch((err) => {
  console.log(err);
  res.status(200).json({'status':false});
 });
});

router.delete('/user' , function(req, res){
 const uid = req.session.user.uid;
 DB.delete_user({'uid': uid}).then(() => {
  res.status(200).json({'status':true});
  req.session.destroy();
 }).catch((err) => {
  console.log(err);
  res.status(200).json({'status':false});
 });
});

router.get('/log' , function(req, res){
 const uid = req.session.user.uid;
 get_log({'uid': uid}).then((data) => {
  const date = Object.values(getDate()).join('');
  const json2csv = require('json2csv').parse;
  const fields = ['rdate','tag','msg'];
  const opts = {fields, header:false, withBOM:true};
  const csv = json2csv(data, opts);
  res.setHeader('Content-disposition', 'attachment; filename=log_'+date+'.csv');
  res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
  res.status(200).send(csv);
 }).catch((err) => {
  console.log(err);
  res.status(500).end('Error');
 });
});

router.delete('/log' , function(req, res){
 const uid = req.session.user.uid;
 delete_log({'uid': uid}).then(() => {
  res.status(200).json({'status':true});
 }).catch((err) => {
  console.log(err);
  res.status(200).json({'status':false});
 });
});

router.get('/str_set/:type' , function(req, res){
 const type = req.params.type || '';
 const uid = req.session.user.uid;
 if(!type) return false;
 get_str_setting({'uid': uid, 'type': type}).then((data) => {
  const date = Object.values(getDate()).join('');
  let json_data = {type:type, data:data}
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-disposition', 'attachment; filename='+type+' set_'+date+'.json');
  res.status(200).json(json_data);
 }).catch((err) => {
  console.log(err);
  res.status(500).end('Error');
 });
});

//Functions
const check_id = (params) => {
 return new Promise((resolve, reject) => {
  let sql = `SELECT uid FROM users WHERE id = ?`;
  let param = [params.id];
  db.get(sql, param, (error, rows) => {
   if(error || rows){
    reject(error);
   }
   resolve(rows);
  });
 });
}

const update_tag = (params) => {
 const uid = params.uid;
 const tid = params.tid;
 const tag = params.tag;
 const tag_name = params.tag_name;
 const od = params.od;
 let sql,query;
 if(tid){
  sql = `UPDATE tags SET (tag,tag_name,od) = (?,?,?) WHERE uid = ? AND tid = ?`;
  query = [tag,tag_name,od,uid,tid];
 }else{
  sql = `INSERT INTO tags (uid,tag,tag_name,od) VALUES (?,?,?,?)`;
  query = [uid,tag,tag_name,od];
 }
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

const delete_tag = (params) => {
 const uid = params.uid;
 const tid = params.tid;
 let sql,query;
 if(tid == 'all'){
  sql = `DELETE FROM tags WHERE uid = ?`;
  query = [uid];
 }else{
  sql = `DELETE FROM tags WHERE tid = ? AND uid = ?`;
  query = [tid,uid];
 }
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

const update_match = (params) => {
 const uid = params.uid;
 const mid = params.mid;
 const key_str = params.key_str;
 const color = params.color;
 const push = params.push;
 const od = params.od;
 let sql,query;
 if(mid){
  sql = `UPDATE match_data SET (key_str,color,push,od) = (?,?,?,?) WHERE uid = ? AND mid = ?`;
  query = [key_str,color,push,od,uid,mid];
 }else{
  sql = `INSERT INTO match_data (uid,key_str,color,push,od) VALUES (?,?,?,?,?)`;
  query = [uid,key_str,color,push,od];
 }
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

const delete_match = (params) => {
 const uid = params.uid;
 const mid = params.mid;
 let sql,query;
 if(mid == 'all'){
  sql = `DELETE FROM match_data WHERE uid = ?`;
  query = [uid];
 }else{
  sql = `DELETE FROM match_data WHERE mid = ? AND uid = ?`;
  query = [mid,uid];
 }
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

const update_token = (params) => {
 const uid = params.uid;
 const rtoken = params.rtoken;
 const wtoken = params.wtoken;
 const vtoken = params.vtoken;
 const secret = params.secret;
 const sql = `UPDATE users SET (rtoken,wtoken,vtoken,secret) = (?,?,?,?) WHERE uid = ?`;
 const query = [rtoken,wtoken,vtoken,secret,uid];
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

const update_opt = (params) => {
 const uid = params.uid;
 const col = params.action;
 const data = params.data;
 const sql = `UPDATE users SET `+col+` = ? WHERE uid = ?`;
 const query = [data,uid];
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

const get_log = (params) => {
 const uid = params.uid;
 const sql = `SELECT rdate,tag,msg FROM logs_v WHERE uid = ?`;
 return new Promise((resolve, reject) => {
  db.all(sql, [uid], (error, rows) => {
   if(error){
    reject(error);
   }else{
    resolve(rows);
   }
  });
 });
}

const delete_log = (params) => {
 const uid = params.uid;
 const sql = `DELETE FROM logs WHERE uid = ?`;
 return new Promise((resolve, reject) => {
  db.run(sql, [uid], (error, rows) => {
   if(error){
    reject(error);
   }else{
    resolve(rows);
   }
  });
 });
}

const get_str_setting = (params) => {
 const uid = params.uid;
 const type = params.type;
 let sql = '';
 switch(type){
  case 'tag':
   sql = `SELECT tag,tag_name FROM tags WHERE uid = ?`;
   break;
  case 'match':
   sql = `SELECT key_str,color FROM match_data WHERE uid = ?`;
   break;
  default:
   return false;
 }
 return new Promise((resolve, reject) => {
  db.all(sql, [uid], (error, rows) => {
   if(error){
    reject(error);
   }else{
    resolve(rows);
   }
  });
 });
}

router.post('/setnotify' , function(req, res){
 const params = JSON.parse(req.body.data);
 params.uid = req.session.user.uid;
 params.active = params.active ? 1 : 0;
 saveNotify(params).then(() => {
  res.status(200).json({'status':true});
 }).catch((err) => {
  console.log(err);
  res.status(500).json({'status':false});
 });
});
const saveNotify = (params) => {
 const uid = params.uid;
 const type = params.type;
 const tokens = params.tokens;
 const active = params.active;
 const del_sql = `DELETE FROM notifies WHERE uid = ? AND type = ?`;
 const del_webpush_sql = `DELETE FROM notifies WHERE tokens = ? AND type = ?`;
 const sql = `INSERT INTO notifies (uid,type,tokens,active) VALUES (?,?,?,?)`;
 return new Promise((resolve, reject) => {
  db.serialize(function(){
   if(type == 'web'){
    db.run(del_webpush_sql, [tokens, type]);
   }else{
    db.run(del_sql, [uid, type]);
   }
   db.run(sql, [uid,type,tokens,active], (error, rows) => {
    if(error){
     reject(error);
    }else{
     resolve(rows);
    }
   });
  });
 });
}
const getNotify = (uid) => {
 const sql = `SELECT type,tokens,active FROM notifies WHERE uid = ?`;
 return new Promise((resolve, reject) => {
  db.all(sql, [uid], (error, rows) => {
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

const getDate = (date) => {
 date = date || Date.now();
 const days = new Date(date);
 let datetime = {};
 datetime.Y = days.getFullYear();
 datetime.M = ('0' + (days.getMonth() + 1)).slice(-2);
 datetime.D = ('0' + days.getDate()).slice(-2);
 datetime.h = ('0' + days.getHours()).slice(-2);
 datetime.m = ('0' + days.getMinutes()).slice(-2);
 datetime.s = ('0' + days.getSeconds()).slice(-2);
 return datetime;
}

module.exports = router;
