const moment = require('moment');
const debug = require('debug')('ccd-case-activity-api:activity-service');
const fetch = require('../util/fetch');
const jwtUtil = require('../util/jwt');

module.exports = (config, redis, ttlScoreGenerator) => {
  const redisActivityKeys = {
    view: (caseId) => `case:${caseId}:viewers`,
    edit: (caseId) => `case:${caseId}:editors`,
  };

  const ACCESS_PROCESS_ID = '[ACCESS_PROCESS]';
  const ACCESS_GRANTED_ID = '[ACCESS_GRANTED]';
  const BASIC_ACCESS = 'BASIC';
  const NON_STANDARD_ACCESS_TYPES = ['CHALLENGED', 'SPECIFIC'];
  const CASE_VIEW_ACCEPT = 'application/vnd.uk.gov.hmcts.ccd-data-store-api.ui-case-view.v2+json';

  const buildEmptyCaseStatus = (caseId) => ({
    caseId,
    viewers: [],
    unknownViewers: 0,
    editors: [],
    unknownEditors: 0,
  });

  const isStandardAccess = (caseView) => {
    if (!caseView || !Array.isArray(caseView.metadataFields)) {
      return true;
    }

    const accessProcess = caseView.metadataFields
      .find((metadataField) => metadataField.id === ACCESS_PROCESS_ID);
    const accessGranted = caseView.metadataFields
      .find((metadataField) => metadataField.id === ACCESS_GRANTED_ID);

    const accessGrantedValue = accessGranted ? accessGranted.value : null;
    const accessGrantedBool = accessGrantedValue ? accessGrantedValue !== BASIC_ACCESS : false;
    const accessProcessValue = accessProcess ? accessProcess.value : null;

    return accessGrantedBool || NON_STANDARD_ACCESS_TYPES.indexOf(accessProcessValue) === -1;
  };

  const getCaseView = (caseId, bearerToken) => {
    const baseUrl = config.get('ccd.url');
    const url = `${baseUrl}/internal/cases/${caseId}`;
    return fetch(url, {
      headers: {
        Authorization: jwtUtil.addBearer(bearerToken),
        Accept: CASE_VIEW_ACCEPT,
      },
    }).then((res) => res.json());
  };

  const hasStandardAccess = (caseId, bearerToken) => {
    if (!bearerToken) {
      return Promise.resolve(false);
    }
    return getCaseView(caseId, bearerToken)
      .then((caseView) => isStandardAccess(caseView))
      .catch((error) => {
        debug(`Access check failed for caseId ${caseId}: ${error && error.message ? error.message : error}`);
        return false;
      });
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

  const getActivitiesForCaseIds = (caseIds, user) => {
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

  const getActivities = (caseIds, user, bearerToken) => {
    if (!caseIds || caseIds.length === 0) {
      return Promise.resolve([]);
    }

    const accessChecks = caseIds.map((caseId) => hasStandardAccess(caseId, bearerToken)
      .then((allowed) => ({ caseId, allowed })));

    return Promise.all(accessChecks)
      .then((accessResults) => {
        const allowedCaseIds = accessResults
          .filter((result) => result.allowed)
          .map((result) => result.caseId);
        if (!allowedCaseIds.length) {
          return caseIds.map((caseId) => buildEmptyCaseStatus(caseId));
        }
        return getActivitiesForCaseIds(allowedCaseIds, user)
          .then((allowedResults) => {
            const allowedMap = new Map(allowedResults.map((item) => [item.caseId, item]));
            return caseIds.map((caseId) => allowedMap.get(caseId) || buildEmptyCaseStatus(caseId));
          });
      });
  };
  return { addActivity, getActivities };
};
