const userResolver = require('./cached-user-resolver');
const rolesBasedAuthorizer = require('./roles-based-authorizer');

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
  if (!rolesBasedAuthorizer.isUserAuthorized(request, user)) {
    reject(ERROR_UNAUTHORISED_ROLE);
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
    .getCachedUserDetails(bearerToken)
    .then((tokenDetails) => {
      user = tokenDetails;
    })
    .then(() => authorizeRoles(request, user))
    .then(() => user);
};

exports.ERROR_TOKEN_MISSING = ERROR_TOKEN_MISSING;
exports.ERROR_UNAUTHORISED_ROLE = ERROR_UNAUTHORISED_ROLE;
exports.ERROR_UNAUTHORISED_USER_ID = ERROR_UNAUTHORISED_USER_ID;
exports.authorise = authorise;
