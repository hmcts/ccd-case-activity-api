const debug = require('debug')('ccd-case-activity-api:add-activity');
const utils = require('../util/utils');

const Activity = ['view', 'edit'];
const UNPROCESSABLE_ENTITY = 422;
const { ifNotTimedOut } = utils;

const addActivity = activityService => (req, res, next) => {
  const caseId = req.params.caseid;
  const { user } = req.authentication;
  const { activity } = req.body;

  debug(`ADD_ACTIVITY request - caseId: ${caseId}, userId:${user.uid}, activity:${activity}`);

  if (!Activity.includes(activity)) {
    const err = new Error(`unknown activity: ${activity}`);
    err.status = UNPROCESSABLE_ENTITY;
    res.status(UNPROCESSABLE_ENTITY).json({ message: `unknown activity: ${activity}` });
    next(err);
  } else {
    activityService.addActivity(caseId, user, activity)
      .then(result => ifNotTimedOut(req, () => {
        debug(`ADD_ACTIVITY response is ==> ${JSON.stringify(result)}`);
        res.status(201).json({ case: caseId, user: user.uid.toString(), activity });
      }))
      .catch(err => ifNotTimedOut(req, () => {
        next(err.message);
      }));
  }
};

module.exports = addActivity;
