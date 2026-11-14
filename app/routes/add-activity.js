const debug = require('debug')('ccd-case-activity-api:add-activity');
const utils = require('../util/utils');
const { invalidActivityError } = require('../safe-errors');

const Activity = ['view', 'edit'];
const { ifNotTimedOut } = utils;

const addActivity = (activityService) => (req, res, next) => {
  const caseId = req.params.caseid;
  const { user } = req.authentication;
  const { activity } = req.body;

  debug(`ADD_ACTIVITY request - caseId: ${caseId}, userId:${user.uid}, activity:${activity}`);

  if (!Activity.includes(activity)) {
    next(invalidActivityError());
  } else {
    activityService.addActivity(caseId, user, activity)
      .then((result) => ifNotTimedOut(req, () => {
        debug(`ADD_ACTIVITY response is ==> ${JSON.stringify(result)}`);
        res.status(201).json({ case: caseId, user: user.uid.toString(), activity });
      }))
      .catch((err) => ifNotTimedOut(req, () => {
        next(err);
      }));
  }
};

module.exports = addActivity;
