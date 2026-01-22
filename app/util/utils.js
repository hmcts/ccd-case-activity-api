const debug = require('debug')('ccd-case-activity-api:utils');

exports.ifNotTimedOut = (request, f) => {
  if (!request.timedout) {
    f();
  } else {
    debug('request timed out');
  }
};

exports.normalizePort = (val) => {
  const port = parseInt(val, 10);
  if (Number.isNaN(port)) {
    // named pipe
    return val;
  }
  if (port >= 0) {
    // port number
    return port;
  }
  return false;
};

/**
 * Event listener for HTTP server "error" event.
 */
exports.onServerError = (port, logTo, exitRoute) => {
  return (error) => {
    if (error.syscall !== 'listen') {
      throw error;
    }

    console.log(`Server error on port ${port}: ${error.message}`);

    const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

    console.log(`Handling server error for ${bind}`);
    console.log(`Error code: ${error.code}`);

    // Handle specific listen errors with friendly messages.
    switch (error.code) {
      case 'EACCES':
        logTo(`${bind} requires elevated privileges`);
        exitRoute(1);
        break;
      case 'EADDRINUSE':
        logTo(`${bind} is already in use`);
        exitRoute(1);
        break;
      default:
        throw error;
    }
  };
};

/**
 * Event listener for HTTP server "listening" event.
 */
exports.onListening = (server, logTo) => {
  return () => {
    console.log('Server listening event triggered');
    const addr = server.address();
    const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
    logTo(`Listening on ${bind}`);
    console.log(`Listening on ${bind}`);
  };
};
