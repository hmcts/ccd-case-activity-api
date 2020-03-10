const moment = require('moment');
const debug = require('debug')('ccd-case-activity-api:activity-service');

module.exports = (config, redis, ttlScoreGenerator) => {
  const redisActivityKeys = {
    view: (caseId) => `case:${caseId}:viewers`,
    edit: (caseId) => `case:${caseId}:editors`,
  };

  const addActivity = (caseId, user, activity) => {
    const storeUserActivity = () => {
      const key = redisActivityKeys[activity](caseId);
      debug(`about to store user activity with key: ${key}`);
      return ['zadd', key, ttlScoreGenerator.getScore(), user.uid];
    };

    const storeUserDetails = () => {
      const userDetails = JSON.stringify({ forename: user.given_name, surname: user.family_name });
      const key = `user:${user.uid}`;
      debug(`about to store user details with key ${key}: ${userDetails}`);
      return ['set', key, userDetails, 'EX', config.get('redis.userDetailsTtlSec')];
    };

    return redis.pipeline([
      storeUserActivity(),
      storeUserDetails(),
    ]).exec();
  };

  const getActivities = (caseIds, user) => {
    const uniqueUserIds = [];
    let caseViewers = [];
    let caseEditors = [];
    const now = moment.now();
    const getUserDetails = () => redis.pipeline(uniqueUserIds.map((userId) => ['get', `user:${userId}`])).exec();
    const extractUniqueUserIds = (result) => {
      result.forEach((item) => {
        item[1].forEach((userId) => {
          if (!uniqueUserIds.includes(userId)) {
            uniqueUserIds.push(userId);
          }
        });
      });
    };
    const caseViewersPromise = redis
      .pipeline(caseIds.map((caseId) => ['zrangebyscore', `case:${caseId}:viewers`, now, '+inf']))
      .exec()
      .then((result) => {
        redis.logPipelineFailures(result, 'caseViewersPromise');
        caseViewers = result;
        extractUniqueUserIds(result);
      });
    const caseEditorsPromise = redis
      .pipeline(caseIds.map((caseId) => ['zrangebyscore', `case:${caseId}:editors`, now, '+inf']))
      .exec()
      .then((result) => {
        redis.logPipelineFailures(result, 'caseEditorsPromise');
        caseEditors = result;
        extractUniqueUserIds(result);
      });
    return Promise.all([caseViewersPromise, caseEditorsPromise])
      .then(() => getUserDetails())
      .then((userDetails) => caseIds.map((elem, index) => {
        redis.logPipelineFailures(userDetails, 'userDetails');
        const caseStatus = {};
        caseStatus.caseId = elem;
        caseStatus.viewers = caseViewers[index][1] ? caseViewers[index][1]
          .filter((element) => element !== user.uid.toString())
          .map((item) => JSON.parse(userDetails[uniqueUserIds.indexOf(item)][1]))
          .filter((item) => item) : [];
        caseStatus.unknownViewers = caseViewers[index][1] ? caseViewers[index][1]
          .filter((element) => element !== user.uid.toString())
          .map((item) => JSON.parse(userDetails[uniqueUserIds.indexOf(item)][1]))
          .reduce((sum, el) => (!el ? sum + 1 : sum), 0) : [];
        caseStatus.editors = caseEditors[index][1] ? caseEditors[index][1]
          .filter((element) => element !== user.uid.toString())
          .map((item) => JSON.parse(userDetails[uniqueUserIds.indexOf(item)][1]))
          .filter((item) => item) : [];
        caseStatus.unknownEditors = caseEditors[index][1] ? caseEditors[index][1]
          .filter((element) => element !== user.uid.toString())
          .map((item) => JSON.parse(userDetails[uniqueUserIds.indexOf(item)][1]))
          .reduce((sum, el) => (!el ? sum + 1 : sum), 0) : [];
        return caseStatus;
      }));
  };
  return { addActivity, getActivities };
};
