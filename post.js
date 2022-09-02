"use strict";

const DB = require('./db');
const db = DB.db;
const Notify = require('./notify');
const express = require('express');
const router = express.Router();

router.get('/:vtoken', (req, res) => {
 const io = module.parent.exports.get('io');
 const now = Date.now();
 const date = convDate(now);
 const vtoken = req.params.vtoken;
 let tid = 0;
 let tag_name = '';
 let tag = req.query.tag || '';
 let msg = req.query.msg || '';
 if(!msg) return res.status(500).end('Param Error');
console.log(date+' ',req.query);
 DB.get_user({'vtoken':vtoken}).then((data) => {
  db.get('SELECT tid,tag_name FROM tags WHERE uid = ? AND tag = ?', [data.uid, tag],
   (error, row) => {
    if(!row){
     tag = '';
     tag_name = '';
    }else{
     tid = row.tid;
     tag_name = row.tag_name;
    }
    let room = `room:${data.uid}`;
    io.to(room).emit('update', {
     'tid': tid,
     'tag': tag,
     'tag_name': tag_name,
     'msg': msg,
     'rdate': date
    });
    insert_log({'uid': data.uid, 'tid': tid, 'tag':tag, 'msg': msg, 'rdate': now});
    db.all('SELECT key_str FROM match_data WHERE push = 1 AND uid = ?', [data.uid], (error, row) => {
     if(row){
	  for(let key in row){
	   let myregexp = new RegExp(row[key].key_str);
	   if(myregexp.test(msg)){
	    Notify.send_msg(data.uid, msg);
	    break;
	   }
	  };
	 }
	});
    res.status(200).end('OK');
   });
 }).catch((error) => {
console.log(error);
  res.status(500).end('Error');
 });
});

const insert_log = function(params){
 db.serialize(function(){
  db.run('INSERT INTO logs (uid,tag,msg,rdate) VALUES ($uid,$tag,$msg,$rdate)',
   {$uid: params.uid, $tag: params.tag, $msg: params.msg, $rdate: params.rdate});
 });
};

const convDate = (date) => {
 let days = new Date(date);
 let year = days.getFullYear();
 let month = ('0' + (days.getMonth() + 1)).slice(-2);
 let day = ('0' + days.getDate()).slice(-2);
 let hour = ('0' + days.getHours()).slice(-2);
 let minute = ('0' + days.getMinutes()).slice(-2);
 let second = ('0' + days.getSeconds()).slice(-2);
 return year+'/'+month+'/'+day+' '+hour+':'+minute+':'+second;
}

module.exports = router;
