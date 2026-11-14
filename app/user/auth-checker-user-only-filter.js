const { safeError } = require('../safe-errors');
const userRequestAuthorizer = require('./user-request-authorizer');

const isBadGatewayError = (error) => error.message !== undefined && (error.message.includes('getaddrinfo ENOTFOUND')
  || error.message.includes('socket hang up')
  || error.message.includes('getaddrinfo EAI_AGAIN')
  || error.message.includes('connect ETIMEOUT')
  || error.message.includes('ECONNRESET')
  || error.message.includes('ECONNREFUSED'));

const mapFetchErrors = (error, next) => {
  next(safeError(isBadGatewayError(error) ? 502 : 500, error));
};

const authCheckerUserOnlyFilter = (req, res, next) => {
  req.authentication = {};

  userRequestAuthorizer
    .authorise(req)
    .then((user) => {
      req.authentication.user = user;
    })
    .then(() => next())
    .catch((error) => {
      if (error.name === 'FetchError') {
        mapFetchErrors(error, next);
      } else {
        error.status = error.status || 401; // eslint-disable-line no-param-reassign
        next(error);
      }
    });
};

module.exports = authCheckerUserOnlyFilter;
