const debug = require('debug')('ccd-case-activity-api:socket-activity-service');
const redisActivityKeys = require('./redis-keys');

const utils = {
  toUserString: (user) => {
    return user ? JSON.stringify({
      id: user.uid,
      forename: user.given_name,
      surname: user.family_name
    }) : '{}';
  },
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
  get: {
    caseActivities: (caseIds, activity, now) => {
      if (Array.isArray(caseIds) && ['view', 'edit'].indexOf(activity) > -1) {
        return caseIds.filter((id) => !!id).map((id) => {
          return ['zrangebyscore', redisActivityKeys[activity](id), now, '+inf'];
        });
      }
      return [];
    },
    users: (userIds) => {
      if (Array.isArray(userIds)) {
        return userIds.filter((id) => !!id).map((id) => ['get', redisActivityKeys.user(id)]);
      }
      return [];
    }
  },
  store: {
    userActivity: (activityKey, userId, score) => {
      debug(`about to store activity "${activityKey}" for user "${userId}"`);
      return ['zadd', activityKey, score, userId];
    },
    userDetails: (user, ttl) => {
      const key = redisActivityKeys.user(user.uid);
      const store = utils.toUserString(user);
      debug(`about to store details "${key}" for user "${user.uid}": ${store}`);
      return ['set', key, store, 'EX', ttl];
    },
    socketActivity: (socketId, activityKey, caseId, userId, ttl) => {
      const key = redisActivityKeys.socket(socketId);
      const store = JSON.stringify({ activityKey, caseId, userId });
      debug(`about to store activity "${key}" for socket "${socketId}": ${store}`);
      return ['set', key, store, 'EX', ttl];
    }
  },
  remove: {
    userActivity: (activity) => {
      debug(`about to remove activity "${activity.activityKey}" for user "${activity.userId}"`);
      return ['zrem', activity.activityKey, activity.userId];
    },
    socketEntry: (socketId) => {
      debug(`about to remove activity for socket "${socketId}"`);
      return ['del', redisActivityKeys.socket(socketId)];
    }
  }
};

module.exports = utils;
