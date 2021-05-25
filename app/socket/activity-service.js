const debug = require('debug')('ccd-case-activity-api:activity-service');

module.exports = (config, redis, ttlScoreGenerator) => {
  const redisActivityKeys = {
    view: (caseId) => `case:${caseId}:viewers`,
    edit: (caseId) => `case:${caseId}:editors`,
    baseCase: (caseId) => `case:${caseId}`,
    user: (userId) => `user:${userId}`,
    socket: (socketId) => `socket:${socketId}`
  };
  const userDetailsTtlSec = config.get('redis.userDetailsTtlSec');
  const toUserString = (user) => {
    return JSON.stringify({
      id: user.uid,
      forename: user.given_name,
      surname: user.family_name
    });
  };

  const addActivity = (caseId, user, socketId, activity) => {
    const storeUserActivity = () => {
      const key = redisActivityKeys[activity](caseId);
      debug(`about to store user activity with key: ${key}`);
      return ['zadd', key, ttlScoreGenerator.getScore(), user.uid];
    };

    const storeUserDetails = () => {
      const userDetails = toUserString(user);
      const key = redisActivityKeys.user(user.uid);
      debug(`about to store user details with key ${key}: ${userDetails}`);
      return ['set', key, userDetails, 'EX', userDetailsTtlSec];
    };

    const storeSocketActivity = () => {
      const activityKey = redisActivityKeys[activity](caseId);
      const key = redisActivityKeys.socket(socketId);
      const store = JSON.stringify({
        activityKey,
        caseId,
        userId: user.uid
      });
      return ['set', key, store, 'EX', userDetailsTtlSec];
    };

    return redis.pipeline([
      storeUserActivity(),
      storeSocketActivity(),
      storeUserDetails()
    ]).exec().then(async () => {
      redis.publish(redisActivityKeys.baseCase(caseId), Date.now().toString());
    });
  };

  const getSocketActivity = async (socketId) => {
    const key = redisActivityKeys.socket(socketId);
    return JSON.parse(await redis.get(key));
  };

  const removeSocketActivity = async (socketId) => {
    const activity = await getSocketActivity(socketId);
    if (activity) {
      const removeUserActivity = () => {
        return ['zrem', activity.activityKey, activity.userId];
      };
      const removeSocketEntry = () => {
        return ['del', redisActivityKeys.socket(socketId)];
      };
      return redis.pipeline([
        removeUserActivity(),
        removeSocketEntry()
      ]).exec().then(() => {
        redis.publish(redisActivityKeys.baseCase(activity.caseId), Date.now().toString());
      });
    }
    return null;
  };

  const getActivityForCases = async (caseIds) => {
    const uniqueUserIds = [];
    let caseViewers = [];
    let caseEditors = [];
    const now = Date.now();
    const getUserDetails = () => {
      if (uniqueUserIds.length > 0) {
        return redis.pipeline(uniqueUserIds.map((userId) => ['get', redisActivityKeys.user(userId)])).exec();
      }
      return [];
    };
    const extractUniqueUserIds = (result) => {
      if (result) {
        result.forEach((item) => {
          if (item && item[1]) {
            item[1].forEach((userId) => {
              if (!uniqueUserIds.includes(userId)) {
                uniqueUserIds.push(userId);
              }
            });
          }
        });
      }
    };
    const caseViewersPromise = redis
      .pipeline(caseIds.map((caseId) => ['zrangebyscore', redisActivityKeys.view(caseId), now, '+inf']))
      .exec()
      .then((result) => {
        redis.logPipelineFailures(result, 'caseViewersPromise');
        caseViewers = result;
        extractUniqueUserIds(result);
      });
    const caseEditorsPromise = redis
      .pipeline(caseIds.map((caseId) => ['zrangebyscore', redisActivityKeys.edit(caseId), now, '+inf']))
      .exec()
      .then((result) => {
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
      const cv = caseViewers[index][1];
      const ce = caseEditors[index][1];
      const viewers = cv ? cv.map((v) => userDetails[v]) : [];
      const editors = ce ? ce.map((e) => userDetails[e]) : [];
      return {
        caseId,
        viewers: viewers.filter((v) => !!v),
        unknownViewers: viewers.filter((v) => !v).length,
        editors: editors.filter((e) => !!e),
        unknownEditors: editors.filter((e) => !e).length
      };
    });
  };

  return {
    addActivity, getActivityForCases, getSocketActivity, removeSocketActivity
  };
};
