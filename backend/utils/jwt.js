// utils/jwt.js
const jwt = require("jsonwebtoken");
const env = require("../config/env");


//JASON WEB TOKEN SIGNING AFTER LOGIN
function signToken(payload) {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn
  });
}

//VERFIYING THE JWT AFTER NEXT TIME LOGIN 
function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

module.exports = {
  signToken,
  verifyToken
};
