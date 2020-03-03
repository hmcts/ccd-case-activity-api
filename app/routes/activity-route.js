const express = require('express');
const timeout = require('connect-timeout');

const router = express.Router();

module.exports = (activityService, config) => {
  const addActivity = require('./add-activity')(activityService); // eslint-disable-line global-require
  const getActivities = require('./get-activities')(activityService); // eslint-disable-line global-require

  const toMillis = (timeSec) => timeSec * 1000;

  router.use(timeout(toMillis(config.get('app.requestTimeoutSec'))));

  router.post('/cases/:caseid/activity', addActivity);

  router.get('/cases/:caseids/activity', getActivities);

  return router;
};
