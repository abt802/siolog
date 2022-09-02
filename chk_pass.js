"use strict";

const bcrypt = require('bcryptjs');

const passwd = {
 mkHash: (pass_txt) => {
  return bcrypt.hashSync(pass_txt, 8);
 },
 chkHash: (pass_txt, hash) => {
  return bcrypt.compareSync(pass_txt, hash);
 }
};

module.exports = passwd;
