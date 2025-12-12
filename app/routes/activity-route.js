const express = require('express');
const timeout = require('connect-timeout');
const Joi = require('joi');
const validateRequest = require('./validate-request');

const router = express.Router();

module.exports = (activityService, config) => {
  console.log(`Initializing activity route at ${new Date().toISOString()}`);

  const addActivity = require('./add-activity')(activityService); // eslint-disable-line global-require
  const getActivities = require('./get-activities')(activityService); // eslint-disable-line global-require

  const toMillis = (timeSec) => timeSec * 1000;

  const caseIdSchema = Joi.number().required().label('Malformed caseId');

  router.use(timeout(toMillis(config.get('app.requestTimeoutSec'))));

  console.log(`Setting request timeout to ${config.get('app.requestTimeoutSec')} seconds`);

  router.post('/cases/:caseid/activity', (req, res, next) => {
    validateRequest(caseIdSchema, req.params.caseid)(req, res, next);
  },
  addActivity);

  router.get('/cases/:caseids/activity', (req, res, next) => {
    validateRequest(Joi.array().items(caseIdSchema), req.params.caseids.split(','))(req, res, next);
  },
  getActivities);

  console.log('Activity route initialized => ready to accept requests ', router);

  return router;
};
