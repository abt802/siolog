"use strict";

const DB = require('./db');
const db = DB.db;
const PW = require('./chk_pass');
const express = require('express');
const router = express.Router();
let system;

router.use((req, res, next) => {
  DB.get_system().then((data) => {
   system = data;
   next();
  }).catch((error) => {
   console.log('sys:',error);
   const err = 'サーバーエラー';
   res.render('login', {'acc_opt':system.account_opt, 'error': err});
  });
});

router.get('/', (req, res) => {
 res.render('login', {'acc_opt':system.account_opt, 'error': ''});
});

router.get('/:token', (req, res) => {
 const token = req.params.token;
 let view = false;
 let params = {'rtoken':token};
 if(token.length == 16){
  params = {'vtoken':token};
  view = true;
 }
 DB.get_user(params).then((data) => {
  add_accesslog(data.id,req);
  req.session.auth = {'uid':data.uid, 'view':view};
  res.redirect('/');
 }).catch((error) => {
  console.log(error);
  const err = 'ログインエラー 入力が正しくありません。';
  res.render('login', {'acc_opt':system.account_opt, 'error': err});
 });
});

router.post('/', (req, res) => {
 const id = req.body.id || '';
 const passwd = req.body.passwd || '';
 DB.get_user({'id':id}).then((data) => {
  if(!PW.chkHash(passwd, data.passwd)) throw 'passwd error';
  add_accesslog(id,req);
  req.session.auth = {'uid':data.uid, 'view':false};
  res.redirect('/');
 }).catch((error) => {
  console.log('login:',error);
  const err = 'ログインエラー 入力が正しくありません。';
  res.render('login', {'acc_opt':system.account_opt, 'error': err});
 });
});

const add_accesslog = (id,req) => {
 const remoteAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
 const splittedAddress = remoteAddress.split(':');
 const ipAddress = splittedAddress[splittedAddress.length - 1];
console.log(ipAddress);
 const sql = `INSERT INTO access_log (id,ip) VALUES (?,?)`;
 const query = [id,ipAddress];
 db.run(sql, query);
}

module.exports = router;
