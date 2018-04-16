const userResolver = require('./user-resolver');
const authorizedRolesExtractor = require('./authorised-roles-extractor');
const userIdExtractor = require('./user-id-extractor');

const AUTHORIZATION = 'Authorization';
const ERROR_TOKEN_MISSING = {
  error: 'Bearer token missing',
  status: 401,
  message: 'You are not authorized to access this resource',
};
const ERROR_UNAUTHORISED_ROLE = {
  error: 'Unauthorised role',
  status: 403,
  message: 'You are not authorized to access this resource',
};
const ERROR_UNAUTHORISED_USER_ID = {
  error: 'Unauthorised user',
  status: 403,
  message: 'You are not authorized to access this resource',
};

const authorizeRoles = (request, user) => new Promise((resolve, reject) => {
  const roles = authorizedRolesExtractor.extract(request, user);

  if (roles
        && roles.length
        && !roles.some(role => user.roles.includes(role))) {
    reject(ERROR_UNAUTHORISED_ROLE);
  } else {
    resolve();
  }
});

const verifyRequestUserId = (request, user) => new Promise((resolve, reject) => {
  const resourceUserId = userIdExtractor.extract(request);

  if (resourceUserId && resourceUserId !== String(user.id)) {
    reject(ERROR_UNAUTHORISED_USER_ID);
  } else {
    resolve();
  }
});

const authorise = (request) => {
  let user;
  const bearerToken = request.get(AUTHORIZATION);

  if (!bearerToken) {
    return Promise.reject(ERROR_TOKEN_MISSING);
  }

  return userResolver
    .getTokenDetails(bearerToken)
    .then((tokenDetails) => {
      user = tokenDetails;
    })
    .then(() => Promise.all([
      authorizeRoles(request, user),
      verifyRequestUserId(request, user),
    ]))
    .then(() => user);
};

exports.ERROR_TOKEN_MISSING = ERROR_TOKEN_MISSING;
exports.ERROR_UNAUTHORISED_ROLE = ERROR_UNAUTHORISED_ROLE;
exports.ERROR_UNAUTHORISED_USER_ID = ERROR_UNAUTHORISED_USER_ID;
exports.authorise = authorise;
