const debug = require('debug')('ccd-case-activity-api:activity-service');

module.exports = (config, redis, ttlScoreGenerator) => {
  const redisActivityKeys = {
    view: (caseId) => `case:${caseId}:viewers`,
    edit: (caseId) => `case:${caseId}:editors`,
    base: (caseId) => `case:${caseId}`
  };
  const userDetailsTtlSec = config.get('redis.userDetailsTtlSec');
  const toUserString = (user) => {
    return JSON.stringify({
      id: user.uid,
      forename: user.given_name,
      surname: user.family_name
    });
  };

  const addActivity = (caseId, user, activity) => {
    const storeUserActivity = () => {
      const key = redisActivityKeys[activity](caseId);
      debug(`about to store user activity with key: ${key}`);
      return ['zadd', key, ttlScoreGenerator.getScore(), user.uid];
    };

    const storeUserDetails = () => {
      const userDetails = toUserString(user);
      const key = `user:${user.uid}`;
      debug(`about to store user details with key ${key}: ${userDetails}`);
      return ['set', key, userDetails, 'EX', userDetailsTtlSec];
    };
    return redis.pipeline([
      storeUserActivity(),
      storeUserDetails()
    ]).exec().then(() => {
      redis.publish(redisActivityKeys.base(caseId), Date.now().toString());
    });
  };

  /**
   * TODO: Implement a mechanism to remove activity. There are a few options here:
   * I think this will require us to track which activities relates to which sockets
   * so we can clear them whenever the socket disconnects.
   * @param {*} caseId 
   * @param {*} user 
   * @param {*} activity 
   * @returns 
   */
  const removeActivity = (caseId, user, activity) => {
    const removeUserActivity = () => {
      const key = redisActivityKeys[activity](caseId);
      debug(`about to remove user activity with key: ${key}`);
      return ['zrem', key, user.uid];
    };

    return redis.pipeline([
      removeUserActivity()
    ]).exec().then(() => {
      redis.publish(redisActivityKeys.base(caseId), Date.now().toString());
    });
  };

  const getActivityForCases = async (caseIds) => {
    const uniqueUserIds = [];
    let caseViewers = [];
    let caseEditors = [];
    const now = Date.now();
    const getUserDetails = () => redis.pipeline(uniqueUserIds.map((userId) => ['get', `user:${userId}`])).exec();
    const extractUniqueUserIds = (result) => {
      if (result) {
        result.forEach(item => {
          if (item && item[1]) {
            item[1].forEach(userId => {
              if (!uniqueUserIds.includes(userId)) {
                uniqueUserIds.push(userId);
              }
            });
          }
        });
      }
    };
    const caseViewersPromise = redis
      .pipeline(caseIds.map(caseId => ['zrangebyscore', `case:${caseId}:viewers`, now, '+inf']))
      .exec()
      .then(result => {
        redis.logPipelineFailures(result, 'caseViewersPromise');
        caseViewers = result;
        extractUniqueUserIds(result);
      });
    const caseEditorsPromise = redis
      .pipeline(caseIds.map(caseId => ['zrangebyscore', `case:${caseId}:editors`, now, '+inf']))
      .exec()
      .then(result => {
        redis.logPipelineFailures(result, 'caseEditorsPromise');
        caseEditors = result;
        extractUniqueUserIds(result);
      });
    await Promise.all([caseViewersPromise, caseEditorsPromise]);

    const userDetails = await getUserDetails().reduce((obj, item) => {
      const user = JSON.parse(item[1]);
      obj[user.id] = { forename: user.forename, surname: user.surname };
      return obj;
    }, {});

    return caseIds.map((caseId, index) => {
      redis.logPipelineFailures(userDetails, 'userDetails');
      const cv = caseViewers[index][1], ce = caseEditors[index][1];
      const viewers = cv ? cv.map(v => userDetails[v]) : [];
      const editors = ce ? ce.map(e => userDetails[e]) : [];
      return {
        caseId,
        viewers: viewers.filter(v => !!v),
        unknownViewers: viewers.filter(v => !v).length,
        editors: editors.filter(e => !!e),
        unknownEditors: editors.filter(e => !e).length
      };
    });
  };
  return { addActivity, removeActivity, getActivityForCases };
};
