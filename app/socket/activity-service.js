const redisActivityKeys = require('./redis-keys');
const utils = require('./utils');

module.exports = (config, redis, ttlScoreGenerator) => {
  const userDetailsTtlSec = config.get('redis.userDetailsTtlSec');

  const notifyChange = (caseId) => {
    redis.publish(redisActivityKeys.baseCase(caseId), Date.now().toString());
  };

  const getSocketActivity = async (socketId) => {
    const key = redisActivityKeys.socket(socketId);
    return JSON.parse(await redis.get(key));
  };

  const getUserDetails = async (userIds) => {
    if (userIds.length > 0) {
      // Get hold of the details.
      const details = await redis.pipeline(utils.get.users(userIds)).exec();

      // Now turn them into a map.
      return details.reduce((obj, item) => {
        const user = JSON.parse(item[1]);
        if (user) {
          obj[user.id] = { forename: user.forename, surname: user.surname };
        }
        return obj;
      }, {});
    }
    return [];
  };

  const removeSocketActivity = async (socketId, skipNotifyForCaseId) => {
    // First make sure we actually have some activity to remove.
    const activity = await getSocketActivity(socketId);
    if (activity) {
      return redis.pipeline([
        utils.remove.userActivity(activity),
        utils.remove.socketEntry(socketId)
      ]).exec().then(() => {
        if (activity.caseId !== skipNotifyForCaseId) {
          notifyChange(activity.caseId);
        }
      });
    }
    return null;
  };

  const addActivity = async (caseId, user, socketId, activity) => {
    // First, clear out any existing activity on this socket.
    await removeSocketActivity(socketId, caseId);

    // Now store this activity.
    const activityKey = redisActivityKeys[activity](caseId);
    return redis.pipeline([
      utils.store.userActivity(activityKey, user.uid, ttlScoreGenerator.getScore()),
      utils.store.socketActivity(socketId, activityKey, caseId, user.uid, userDetailsTtlSec),
      utils.store.userDetails(user, userDetailsTtlSec)
    ]).exec().then(() => {
      notifyChange(caseId);
    });
  };

  const getActivityForCases = async (caseIds) => {
    let uniqueUserIds = [];
    let caseViewers = [];
    let caseEditors = [];
    const now = Date.now();
    const getPromise = (activity, cb, failureMessage) => {
      return redis.pipeline(
        utils.get.caseActivities(caseIds, activity, now)
      ).exec().then((result) => {
        redis.logPipelineFailures(result, failureMessage);
        cb(result);
        uniqueUserIds = utils.extractUniqueUserIds(result, uniqueUserIds);
      });
    };

    // Set up the promises fore view and edit.
    const caseViewersPromise = getPromise('view', (result) => {
      caseViewers = result;
    }, 'caseViewersPromise');
    const caseEditorsPromise = getPromise('edit', (result) => {
      caseEditors = result;
    }, 'caseEditorsPromise');

    // Now wait until both promises have been completed.
    await Promise.all([caseViewersPromise, caseEditorsPromise]);

    // Get all the user details for both viewers and editors.
    const userDetails = await getUserDetails(uniqueUserIds);

    // Now produce a response for every case requested.
    return caseIds.map((caseId, index) => {
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
    addActivity,
    getActivityForCases,
    getSocketActivity,
    removeSocketActivity
  };
};
