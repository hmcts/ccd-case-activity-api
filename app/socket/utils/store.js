const debug = require('debug')('ccd-case-activity-api:socket-utils-store');
const redisActivityKeys = require('../redis/keys');
const { toUserString } = require('./other');

const store = {
  userActivity: (activityKey, userId, score) => {
    debug(`about to store activity "${activityKey}" for user "${userId}"`);
    return ['zadd', activityKey, score, userId];
  },
  userDetails: (user, ttl) => {
    const key = redisActivityKeys.user(user.uid);
    const userString = toUserString(user);
    debug(`about to store details "${key}" for user "${user.uid}": ${userString}`);
    return ['set', key, userString, 'EX', ttl];
  },
  socketActivity: (socketId, activityKey, caseId, userId, ttl) => {
    const key = redisActivityKeys.socket(socketId);
    const userString = JSON.stringify({ activityKey, caseId, userId });
    debug(`about to store activity "${key}" for socket "${socketId}": ${userString}`);
    return ['set', key, userString, 'EX', ttl];
  }
};

module.exports = store;
