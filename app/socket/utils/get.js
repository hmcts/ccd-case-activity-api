const redisActivityKeys = require('../redis-keys');

const get = {
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
};

module.exports = get;
