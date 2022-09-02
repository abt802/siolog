"use strict";

const path = require('path');

const DB = require('./db');
DB.init();

const express = require('express');
const session = require('express-session');
const app = express();

app.disable('x-powered-by');
app.set('views', path.join( __dirname, '/tpl'));
app.set('trust proxy', 'loopback');
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use('/', express.static(path.join(__dirname, '/pub')));

app.use(session({
 secret: 'siolog',
 resave: false,
 saveUninitialized: true,
 name: 'siolog_srv',
}));

const newCheck = async (req, res, next) => {
 if(await chkNewSrv()){
  next();
 }else{
  res.status(500).end('Not Access.');
 }
}

const sessionCheck = async (req, res, next) => {
 if(await chkNewSrv()){
  return res.redirect('/new');
 }
 if(req.session.auth){
  let uid = req.session.auth.uid;
  DB.get_user({'uid':uid}).then((data) => {
   req.session.user = data;
   next();
  }).catch((error) => {
   console.log('ss_chk:',error);
   const err = 'DBエラーが発生しました。';
   res.render('login', {'error': err});
  });
 }else{
  res.redirect('/login');
 }
}

const logout = (req, res) => {
 req.session.destroy();
 res.redirect('/login');
}

app.use('/login', require('./login'));
app.use('/new', newCheck, require('./new'));
app.use('/post', require('./post'));
app.use('/', sessionCheck, require('./router'));
app.use('/setup', require('./setup'));
app.use('/logout', logout);

const fs = require('fs');
try {
 fs.statSync('./ssl/server.key');
 cert: fs.statSync('./ssl/server.crt');
} catch(err){
 console.log('ERROR: SSL証明書が有りません');
 return false;
}
const options = {
 key: fs.readFileSync('./ssl/server.key'),
 cert: fs.readFileSync('./ssl/server.crt'),
}

const server = require('https').createServer(options, app);
const io = require('socket.io')(server);
app.set('io', io);
io.on('connection',function(socket){
 let uid = socket.handshake.query.uid;
 let room = `room:${uid}`;
 socket.join(room);
 console.log('Connect:',uid,socket.id);
 socket.on('disconnect',function(e){
  console.log('Disconnect:',socket.id);
 });
});

const PORT = process.env.PORT || 7100;
server.listen(PORT, function(){
    console.log('server listening. Port:' + PORT);
});

var NewServer;
const chkNewSrv = () => {
 return new Promise((resolve, reject) => {
  if(NewServer === false) return resolve(NewServer);
  console.log('ChkNewSrv');
  DB.db.get('SELECT uid FROM users', (error, rows) => {
   if(error){
    reject(error);
   }else{
    NewServer = false;
    if(!rows){
     NewServer = true;
    }
    resolve(NewServer);
   }
  });
 });
}

const dest = 'appserver-keys.json';
let app_keys = {};
if (fs.existsSync(dest)) {
 app_keys = require("./appserver-keys.json");
 console.log('app kys load.');
}else{
 const webpush = require('web-push');
 app_keys = webpush.generateVAPIDKeys();
 fs.writeFileSync(dest, JSON.stringify(app_keys, null, 2));
 console.log('app keys write.');
}
app.set('app_keys', app_keys);

module.exports = app;
