const config = require('config');
const healthcheck = require('@hmcts/nodejs-healthcheck');
const redis = require('./redis/redis-client');

const activityHealth = healthcheck.configure({
  checks: {
    redis: healthcheck.raw(() => Promise.race([
      redis.ping(),
      new Promise((_, reject) => {
        setTimeout(reject, config.get('app.requestTimeoutSec') * 1000);
      }),
    ])
      .then(() => healthcheck.up())
      .catch(() => healthcheck.down())),
  },
});

module.exports = activityHealth;
