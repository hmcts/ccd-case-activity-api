const userRequestAuthorizer = require('./user-request-authorizer');
const debug = require('debug')('ccd-case-activity-web:auth-checker-filter');

const authCheckerUserOnlyFilter = (req, res, next) => {
  req.authentication = {};

  userRequestAuthorizer
    .authorise(req)
    .then((user) => {
      req.authentication.user = user;
    })
    .then(() => next())
    .catch((error) => {
      debug(`Unsuccessful user authentication: ${error}`);
      error.status = error.status || 401; // eslint-disable-line no-param-reassign
      next(error);
    });
};

module.exports = authCheckerUserOnlyFilter;
