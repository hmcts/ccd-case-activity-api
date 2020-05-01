const BEARER_PREFIX = 'Bearer ';

const getBearerJwt = (jwt) => (jwt.startsWith(BEARER_PREFIX) ? jwt : BEARER_PREFIX + jwt);

const getJwt = (jwt) => (jwt.startsWith(BEARER_PREFIX) ? jwt.replace(BEARER_PREFIX, '') : jwt);

exports.getBearerJwt = getBearerJwt;
exports.getJwt = getJwt;
