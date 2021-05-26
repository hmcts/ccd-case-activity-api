const debug = require('debug')('ccd-case-activity-api:socket-utils');

const other = {
  extractUniqueUserIds: (result, uniqueUserIds) => {
    const userIds = Array.isArray(uniqueUserIds) ? [...uniqueUserIds] : [];
    if (Array.isArray(result)) {
      result.forEach((item) => {
        if (item && item[1]) {
          const users = item[1];
          users.forEach((userId) => {
            if (!userIds.includes(userId)) {
              userIds.push(userId);
            }
          });
        }
      });
    }
    return userIds;
  },
  log: (socket, payload, group, logTo) => {
    const outputTo = logTo || debug;
    let text = `${new Date().toISOString()} | ${socket.id} | ${group}`;
    if (typeof payload === 'string') {
      if (payload) {
        text = `${text} => ${payload}`;
      }
      outputTo(text);
    } else {
      outputTo(text);
      outputTo(payload);
    }
  },
  score: (ttlStr) => {
    const now = Date.now();
    const ttl = parseInt(ttlStr, 10) || 0;
    const score = now + (ttl * 1000);
    debug(`generated score out of current timestamp '${now}' plus ${ttl} sec`);
    return score;
  },
  toUser: (obj) => {
    // TODO: REMOVE THIS
    // This is here purely until we have proper auth coming from a client.
    if (!obj) {
      return {};
    }
    const nameParts = obj.name.split(' ');
    const givenName = nameParts.shift();
    return {
      sub: `${givenName}.${nameParts.join('-')}@mailinator.com`,
      uid: obj.id,
      roles: [
        'caseworker-employment',
        'caseworker-employment-leeds',
        'caseworker'
      ],
      name: obj.name,
      given_name: givenName,
      family_name: nameParts.join(' ')
    };
  },
  toUserString: (user) => {
    return user ? JSON.stringify({
      id: user.uid,
      forename: user.given_name,
      surname: user.family_name
    }) : '{}';
  }
};

module.exports = other;
