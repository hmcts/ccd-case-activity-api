const debug = require('debug')('ccd-case-activity-api:socket-utils-store');
const redisActivityKeys = require('../redis/keys');
const toUserString = require('./other').toUserString;

const store = {
  userActivity: (activityKey, userId, score) => {
    debug(`about to store activity "${activityKey}" for user "${userId}"`);
    return ['zadd', activityKey, score, userId];
  },
  userDetails: (user, ttl) => {
    const key = redisActivityKeys.user(user.uid);
    const store = toUserString(user);
    debug(`about to store details "${key}" for user "${user.uid}": ${store}`);
    return ['set', key, store, 'EX', ttl];
  },
  socketActivity: (socketId, activityKey, caseId, userId, ttl) => {
    const key = redisActivityKeys.socket(socketId);
    const store = JSON.stringify({ activityKey, caseId, userId });
    debug(`about to store activity "${key}" for socket "${socketId}": ${store}`);
    return ['set', key, store, 'EX', ttl];
  }
};

module.exports = store;
