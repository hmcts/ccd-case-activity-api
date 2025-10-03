const keys = require('../redis/keys');
const utils = require('../utils');

module.exports = (config, redis) => {
  const ttl = {
    user: config.get('redis.socket.userDetailsTtlSec'),
    activity: config.get('redis.socket.activityTtlSec')
  };

  const notifyChange = (caseId) => {
    if (caseId) {
      redis.publish(keys.case.base(caseId), Date.now().toString());
    }
  };

  const getSocketActivity = async (socketId) => {
    if (socketId) {
      const key = keys.socket(socketId);
      return JSON.parse(await redis.get(key));
    }
    return null;
  };

  const getUserDetails = async (userIds) => {
    if (Array.isArray(userIds) && userIds.length > 0) {
      // Get hold of the details.
      const details = await redis.pipeline(utils.get.users(userIds)).exec();

      // console.log('user details for userIds ', userIds, ' => ', details);

      // Now turn them into a map.
      return details.reduce((obj, item) => {
        if (item[1]) {
          const user = JSON.parse(item[1]);
          obj[user.id] = { id: user.id, forename: user.forename, surname: user.surname };
        }
        return obj;
      }, {});
    }
    return {};
  };

  const doRemoveSocketActivity = async (socketId) => {
    // First make sure we actually have some activity to remove.
    const activity = await getSocketActivity(socketId);
    console.log('Removing activity for socketId ', socketId, ' activity ', activity);
    if (activity) {
      await redis.pipeline([
        utils.remove.userActivity(activity),
        utils.remove.socketEntry(socketId)
      ]).exec();
      return activity.caseId;
    }
    return null;
  };

  const removeSocketActivity = async (socketId) => {
    const removedCaseId = await doRemoveSocketActivity(socketId);
    if (removedCaseId) {
      notifyChange(removedCaseId);
    }
  };

  const doAddActivity = async (caseId, user, socketId, activity) => {
    // Now store this activity.
    const activityKey = keys.case[activity](caseId);
    return redis.pipeline([
      utils.store.userActivity(activityKey, user.uid, utils.score(ttl.activity)),
      utils.store.socketActivity(socketId, activityKey, caseId, user.uid, ttl.user),
      utils.store.userDetails(user, ttl.user)
    ]).exec();
  };

  const addActivity = async (caseId, user, socketId, activity) => {
    console.log(`adding activity for caseId '${caseId}', user`, user, `on socket '${socketId}' with activity '${activity}'`);
    if (caseId && user && socketId && activity) {
      // First, clear out any existing activity on this socket.
      const removedCaseId = await doRemoveSocketActivity(socketId);

      // const cs = await getActivityForCases([caseId]);
      // console.log('notifying case activity: addActivity method ', JSON.stringify(cs, null, 2));

      console.log('removedCaseId => ', removedCaseId);

      // Now store this activity.
      await doAddActivity(caseId, user, socketId, activity);
      if (removedCaseId !== caseId) {
        notifyChange(removedCaseId);
      }
      notifyChange(caseId);
    }
    return null;
  };

  const getActivityForCases = async (caseIds) => {
    if (!Array.isArray(caseIds) || caseIds.length === 0) {
      return [];
    }
    // console.log('calling getActivityForCases with caseIds:', caseIds);
    let uniqueUserIds = [];
    let caseViewers = [];
    let caseEditors = [];
    const now = Date.now();
    const getPromise = async (activity, failureMessage, cb) => {
      // console.log('Redis Pipeline => ', await redis.pipeline(
      //   utils.get.caseActivities(caseIds, activity, now)));

      const result = await redis.pipeline(
        utils.get.caseActivities(caseIds, activity, now)
      ).exec();

      console.log(`raw result for activity '${activity}' =>`, result);

      redis.logPipelineFailures(result, failureMessage);
      cb(result);
      // console.log(`result for activity '${activity}' =>`, result);
      uniqueUserIds = utils.extractUniqueUserIds(result, uniqueUserIds);
      // console.log(`uniqueUserIds after extracting for activity '${activity}' =>`, uniqueUserIds);
    };

    // Set up the promises fore view and edit.
    const caseViewersPromise = getPromise('view', 'caseViewersPromise', (result) => {
      caseViewers = result;
    });
    const caseEditorsPromise = getPromise('edit', 'caseEditorsPromise', (result) => {
      caseEditors = result;
    });

    // Now wait until both promises have been completed.
    await Promise.all([caseViewersPromise, caseEditorsPromise]);

    // Get all the user details for both viewers and editors.
    console.log('uniqueUserIds => ', uniqueUserIds);

    const userDetails = await getUserDetails(uniqueUserIds);

    console.log('case viewers => ', caseViewers);
    console.log('case editors => ', caseEditors);

    console.log('case ids => ', caseIds);
    // console.log('case viewers =>', caseViewers);
    // console.log('case editors =>', caseEditors);
    console.log('user details => ', userDetails);

    // Now produce a response for every case requested.
    return caseIds.map((caseId, index) => {
      const cv = caseViewers[index][1];
      const ce = caseEditors[index][1];
      const viewers = cv ? cv.map((v) => userDetails[v]) : [];
      // console.log('viewers for caseId ', caseId, ' => ', viewers);
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
    getUserDetails,
    notifyChange,
    redis,
    removeSocketActivity,
    ttl
  };
};
