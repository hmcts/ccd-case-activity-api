exports.ifNotTimedOut = (request, f) => {
  if (!request.timedout) {
    f();
  } else {
    console.warn('request timed out');
  }
};
