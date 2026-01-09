const debug = require('debug')('rpx-case-activity-api:roles-based-authorizer');
const config = require('config');
const authorizer = require('./white-black-list-roles-authorizer');

const whitelist = config.get('security.auth_whitelist')
  ? config.get('security.auth_whitelist').split(',') : [];
const blacklist = config.get('security.auth_blacklist')
  ? config.get('security.auth_blacklist').split(',') : [];

const isUserAuthorized = (request, user) => {
  const authorized = authorizer.isUserAuthorized(user.roles, whitelist, blacklist);
  debug(`user roles authorized: ${authorized}`);
  return authorized;
};

exports.isUserAuthorized = isUserAuthorized;
