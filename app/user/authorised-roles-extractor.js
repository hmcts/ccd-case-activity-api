const authorizer = require('./white-black-list-roles-authorizer');
const config = require('config');

const extract = (request, user) => authorizer.isUserAuthorized(user.roles, config.get('security.auth_whitelist'), config.get('security.auth_blacklist'));

exports.extract = extract;
