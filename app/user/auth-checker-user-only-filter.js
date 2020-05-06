const debug = require('debug')('ccd-case-activity-api:auth-checker-filter');
const userRequestAuthorizer = require('./user-request-authorizer');

const authCheckerUserOnlyFilter = (req, res, next) => {
  req.authentication = {};

  userRequestAuthorizer
    .authorise(req)
    .then((user) => {
      req.authentication.user = user;
    })
    .then(() => next())
    .catch(error => {
      if (error.name === 'FetchError') {
        logger.error(error);
        next({
          status: 500,
          error: 'Internal Server Error',
          message: error.message
        });
      } else {
        logger.warn('Unsuccessful user authentication', error);
        error.status = error.status || 401;
      }
      next(error);
    });
};

module.exports = authCheckerUserOnlyFilter;
