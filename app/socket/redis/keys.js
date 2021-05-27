const keys = {
  prefixes: {
    case: 'c',
    socket: 's',
    user: 'u'
  },
  view: (caseId) => keys.compile('case', caseId, 'viewers'),
  edit: (caseId) => keys.compile('case', caseId, 'editors'),
  baseCase: (caseId) => keys.compile('case', caseId),
  user: (userId) => keys.compile('user', userId),
  socket: (socketId) => keys.compile('socket', socketId),
  compile: (prefix, value, suffix) => {
    const key = `${keys.prefixes[prefix]}:${value}`;
    if (suffix) {
      return `${key}:${suffix}`;
    }
    return key;
  }
};

module.exports = keys;
