const debug = require('debug')('ccd-case-activity-api:get-activities');
const utils = require('../util/utils');

const { ifNotTimedOut } = utils;

const getActivities = (activityService) => (req, res, next) => {
  const caseIds = req.params.caseids.split(',');
  const { user } = req.authentication;

  debug(`GET_ACTIVITIES request for caseIds: ${caseIds}`);
  activityService.getActivities(caseIds, user)
    .then((result) => ifNotTimedOut(req, () => {
      debug(`GET_ACTIVITIES response is ==> ${JSON.stringify(result)}`);
      res.status(200).json(result);
    }))
    .catch((err) => ifNotTimedOut(req, () => {
      next(err.message);
    }));
};

module.exports = getActivities;
