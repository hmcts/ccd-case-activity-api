const AUTHORIZATION = 'Authorization';
const ERROR_TOKEN_MISSING = {
  error: 'Bearer token missing',
  status: 401,
  message: 'Idam stub - you are not authorized to access this resource'
}

//Stub idam client which returns the user contained in the token. This allows for easy stubbing of idam requests during tests
const authCheckerUserOnlyFilter = (req, res, next) => {

  console.log("invoked stub Idam client")

  let bearerToken = req.get(AUTHORIZATION);

  if (!bearerToken) {
    next(ERROR_TOKEN_MISSING);
  }

  req.authentication = {};
     req.authentication.user = JSON.parse(bearerToken)

  next()
}

module.exports = authCheckerUserOnlyFilter;
