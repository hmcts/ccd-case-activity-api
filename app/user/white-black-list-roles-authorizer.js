const debug = require('debug')('ccd-case-activity-api:white-black-list-roles-authorizer');

const isUserAuthorized = (roles, whiteList, blackList) => {
  debug(`whitelist: ${whiteList}`);
  debug(`blacklist: '${blackList}'`);

  const whitelisted = [].concat.apply(roles.filter((r) => whiteList.some((w) => r.match(w))));
  debug(`whitelisted: ${whitelisted}`);

  const blacklisted = [].concat.apply(roles.filter((r) => blackList.some((b) => r.match(b))));
  debug(`blacklisted: ${blacklisted}`);

  return whitelisted.length > 0 && blacklisted.length === 0;
};

exports.isUserAuthorized = isUserAuthorized;
