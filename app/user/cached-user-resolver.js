const userResolver = require('./user-resolver');
const { userInfoCache } = require('../cache/cache-config');
const jwtUtil = require('../util/jwt');

// NB: names match the user-resolver which this module mirrors
const getUserDetails = (jwt) => userInfoCache.getOrElseUpdate(
  jwtUtil.removeBearer(jwt),
  () => userResolver.getUserDetails(jwt),
);

exports.getUserDetails = getUserDetails;
