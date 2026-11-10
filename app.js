// Telemetry must initialise before modules load Express/HTTP.
// eslint-disable-next-line import/order
const enableAppInsights = require('./app/app-insights/app-insights');

enableAppInsights();

const healthcheck = require('@hmcts/nodejs-healthcheck');
const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const config = require('config');
const debug = require('debug')('ccd-case-activity-api:app');

const storeCleanupJob = require('./app/job/store-cleanup-job');
const authCheckerUserOnlyFilter = require('./app/user/auth-checker-user-only-filter');
const corsHandler = require('./app/security/cors');

const redis = require('./app/redis/redis-client');
const ttlScoreGenerator = require('./app/service/ttl-score-generator');
const activityService = require('./app/service/activity-service')(config, redis, ttlScoreGenerator);
const activity = require('./app/routes/activity-route')(activityService, config);

const app = express();
const appHealth = express();

const poweredByHeader = 'x-powered-by';
app.disable(poweredByHeader);
appHealth.disable(poweredByHeader);

const healthConfig = {
  checks: {},
};
healthcheck.addTo(appHealth, healthConfig);
app.use(appHealth);

if (config.util.getEnv('NODE_ENV') !== 'test') {
  app.use(logger('dev'));
  const Crontab = config.get('app.storeCleanupCrontab');
  storeCleanupJob.start(Crontab);
}

if (config.util.getEnv('NODE_ENV') === 'test') {
  app.forceStoreCleanup = storeCleanupJob.force;
}

debug(`starting application with environment: ${config.util.getEnv('NODE_ENV')}`);

app.use(corsHandler);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text());
app.use(authCheckerUserOnlyFilter);

app.use('/', activity);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Fixed public errors in every environment, including development.
app.use(require('./app/safe-errors').errorHandler);

module.exports = app;
