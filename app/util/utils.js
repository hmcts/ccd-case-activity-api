const debug = require('debug')('ccd-case-activity-web:utils');

exports.ifNotTimedOut = (request, f) => {
  if (!request.timedout) {
    f();
  } else {
    debug('request timed out');
  }
};
