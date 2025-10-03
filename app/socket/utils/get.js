const keys = require('../redis/keys');

const get = {
  caseActivities: (caseIds, activity, now) => {
    console.log(`getting case activities for activity '${activity}' and caseIds: `, caseIds);
    
    if (Array.isArray(caseIds) && ['view', 'edit'].indexOf(activity) > -1) {
      return caseIds.filter((id) => !!id).map((id) => {
        return ['zrangebyscore', keys.case[activity](id), now, '+inf'];
        // return ['zrangebyscore', keys.case[activity](id), '-inf', '+inf'];
      });
    }
    return [];
  },
  users: (userIds) => {
    console.log('getting user details for userIds: ', userIds);
    if (Array.isArray(userIds)) {
      return userIds.filter((id) => !!id).map((id) => ['get', keys.user(id)]);
    }
    return [];
  }
};

module.exports = get;
