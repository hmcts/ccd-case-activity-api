const authorizer = require('./white-black-list-roles-authorizer');
const config = require('config');

const whitelist = config.get('security.auth_whitelist').split(',');
const blacklist = config.get('security.auth_blacklist').split(',');
const isUserAuthorized = (request, user) => authorizer.isUserAuthorized(user.roles, whitelist, blacklist);

exports.extract = isUserAuthorized;
