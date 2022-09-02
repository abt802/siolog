'use strict';

const DB = require('./db');
const db = DB.db;

const send_msg = (uid,msg) => {
 getNotify(uid).then((list) => {
  list.map(item => {
   const params = JSON.parse(item.tokens);
   switch(item.type){
    case 'twitter':
     tweetPost(params, msg);
     break;
    case 'line':
     linePost(params, msg);
     break;
    case 'web':
     webPost(params, msg);
     break;
   }
  });
 }).catch((error) => {
  console.log('Notify:',error);
 });
}

const Twitter = require('twitter');
function tweetPost(params, msg){
 const client = new Twitter({
  consumer_key: params.api_key,
  consumer_secret: params.api_secret,
  access_token_key: params.access_token,
  access_token_secret: params.access_secret
 });

 client.post('statuses/update', {status: msg})
 .then(function(tweet){
   console.log('tweet:', msg);
 })
 .catch(function(error){
   console.log('tweet:', error);
 });
}

const axios = require('axios');
const qs = require('querystring');
function linePost(params, msg){
 const LINE_NOTIFY_API_URL = 'https://notify-api.line.me/api/notify';
 const LINE_NOTIFY_TOKEN = params.notify_token;

 let config = {
  url: LINE_NOTIFY_API_URL,
  method: 'post',
  headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Bearer ' + LINE_NOTIFY_TOKEN
  },
  data: qs.stringify({
   message: msg,
  })
 }

 axios.request(config).then(response => {
  console.log('LINE:', response.data, response.status);
 })
 .catch(error => {
  console.error('LINE:', error.response.data);
 });
}

const getNotify = (uid) => {
 const sql = `SELECT type,tokens FROM notifies WHERE uid = ? and active = 1`;
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

const webpush = require('web-push');
function webPost(params, msg){
 const app_keys = module.parent.parent.exports.get('app_keys');
 webpush.setVapidDetails('mailto:_@abt.jp', app_keys.publicKey, app_keys.privateKey);
 webpush.sendNotification(params, msg)
 .then(res => {
  console.log('WebPush:', res.statusCode);
 })
 .catch(err => {
  console.log('WebPush Err:', err.statusCode);
  if(err.statusCode != 410) console.log('WebPush err:', err);
  const tokens = JSON.stringify(params);
  const del_sql = `DELETE FROM notifies WHERE tokens = ?`;
  db.run(del_sql, [tokens]);
 });
}

module.exports = {
 'send_msg': send_msg,
}
