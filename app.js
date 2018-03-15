const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const config = require('config');
const debug = require('debug')('ccd-case-activity-web:app');
const health = require('./app/health');
const storeCleanupJob = require('./app/job/store-cleanup-job');
const authCheckerUserOnlyFilter = require('./app/user/auth-checker-user-only-filter');
const corsHandler = require('./app/security/cors');


const redis = require('./app/redis/redis-client');
const ttlScoreGenerator = require('./app/service/ttl-score-generator');
const activityService = require('./app/service/activity-service')(config, redis, ttlScoreGenerator);
const activity = require('./app/routes/activity-route')(activityService, config);

const app = express();

app.get('/health', health);

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

// error handler
// FIXME `next` MUST be kept for error handling, even though it causes linting to fail
/* eslint-disable no-unused-vars */
app.use((err, req, res, next) => {
  console.error('Error processing request', err);

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.json({
    message: err.message,
  });
});

module.exports = app;
