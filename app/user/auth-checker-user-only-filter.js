const { Logger } = require('@hmcts/nodejs-logging');
const userRequestAuthorizer = require('./user-request-authorizer');

const logger = Logger.getLogger('authCheckerUserOnlyFilter');

const isBadGatewayError = (error) => error.message !== undefined && (error.message.includes('getaddrinfo ENOTFOUND')
  || error.message.includes('socket hang up')
  || error.message.includes('getaddrinfo EAI_AGAIN')
  || error.message.includes('connect ETIMEOUT')
  || error.message.includes('ECONNRESET')
  || error.message.includes('ECONNREFUSED'));

const mapFetchErrors = (error, next) => {
  if (isBadGatewayError(error)) {
    next({
      error: 'Bad Gateway',
      status: 502,
      message: error.message,
    });
  } else {
    next({
      error: 'Internal Server Error',
      status: 500,
      message: error.message,
    });
  }
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
        logger.error(error);
        mapFetchErrors(error, next);
      } else {
        logger.warn('Unsuccessful user authentication', error);
        error.status = error.status || 401; // eslint-disable-line no-param-reassign
        next(error);
      }
    });
};

module.exports = authCheckerUserOnlyFilter;
