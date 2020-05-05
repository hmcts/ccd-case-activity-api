const userResolver = require('./user-resolver');
const { userInfoCache } = require('../cache/cache-config');
const jwtUtil = require('../util/jwt');

const getCachedUserDetails = (jwt) => userInfoCache.getOrElseUpdate(
  jwtUtil.removeBearer(jwt),
  () => userResolver.getTokenDetails(jwt),
);


exports.getCachedUserDetails = getCachedUserDetails;
