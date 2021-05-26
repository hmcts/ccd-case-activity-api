const debug = require('debug')('ccd-case-activity-api:socket-utils-remove');
const redisActivityKeys = require('../redis-keys');

const remove = {
  userActivity: (activity) => {
    debug(`about to remove activity "${activity.activityKey}" for user "${activity.userId}"`);
    return ['zrem', activity.activityKey, activity.userId];
  },
  socketEntry: (socketId) => {
    debug(`about to remove activity for socket "${socketId}"`);
    return ['del', redisActivityKeys.socket(socketId)];
  }
};

module.exports = remove;
