"use strict";

const DB = require('./db');
const db = DB.db;
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
 res.render('new');
});

router.post('/', (req, res) => {
 const id = req.body.id || '';
 const passwd = req.body.passwd || '';
 add_user({'id':id, 'passwd':passwd}).then((data) => {
  res.status(200).json({'status':true});
 }).catch((error) => {
  console.log(error);
  res.status(200).json({'status':false});
 });
});

const add_user = (params) => {
 return new Promise((resolve, reject) => {
  let sql = `SELECT uid FROM users WHERE id = ?`;
  let param = [params.id];
  db.get(sql, param, (error, row) => {
   if(error || row){
    reject(error);
   }else{
    DB.add_user({'id': params.id, 'pw': params.passwd});
   }
   resolve(row);
  });
 });
}

module.exports = router;
