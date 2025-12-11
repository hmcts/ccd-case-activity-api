const healthcheck = require('@hmcts/nodejs-healthcheck');
const express = require('express');
const logger = require('morgan');
const config = require('config');
const debug = require('debug')('ccd-case-activity-api:app');
const enableAppInsights = require('./app/app-insights/app-insights');

enableAppInsights();

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
console.log(`starting application with environment: ${config.util.getEnv('NODE_ENV')}`);

app.use(corsHandler);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.text());

console.log('Applying auth checker user only filter');
app.use(authCheckerUserOnlyFilter);

app.use('/', activity);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  console.log(`404 Not Found for request: ${req.method} ${req.originalUrl}`);
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
// FIXME `next` MUST be kept for error handling, even though it causes linting to fail
/* eslint-disable no-unused-vars */
app.use((err, req, res, next) => {
  debug(`Error processing request: ${err}`);
  console.log(`Error processing request: ${err}`);

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  console.log(`Returning error response: ${err.status || 500} - ${err.message}`);

  res.status(err.status || 500);
  res.json({
    message: err.message,
  });
});

module.exports = app;
