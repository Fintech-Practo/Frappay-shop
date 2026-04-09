const { v4: uuidv4 } = require('uuid');

function requestContext(req, res, next) {
    req.requestId = uuidv4();
    req.ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.connection.remoteAddress || req.ip;
    req.userAgent = req.get('User-Agent') || '';
    next();
}

module.exports = requestContext;
