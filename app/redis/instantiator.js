const config = require('config');
const Redis = require('ioredis');

const ERROR = 0;
const RESULT = 1;
const ENV = config.util.getEnv('NODE_ENV');

module.exports = (debug) => {
  const redis = new Redis({
    port: config.get('redis.port'),
    host: config.get('redis.host'),
    password: config.get('secrets.ccd.activity-redis-password'),
    tls: config.get('redis.ssl'),
    keyPrefix: config.get('redis.keyPrefix'),
    // log unhandled redis errors
    showFriendlyErrorStack: ENV === 'test' || ENV === 'dev',
  });

  /* redis pipeline returns a reply of the form [[op1error, op1result], [op2error, op2result], ...].
    error is null in case of success */
  redis.logPipelineFailures = (plOutcome, message) => {
    if (Array.isArray(plOutcome)) {
      const operationsFailureOutcome = plOutcome.map((operationOutcome) => operationOutcome[ERROR]);
      const failures = operationsFailureOutcome.filter((element) => element !== null);
      failures.forEach((f) => debug(`${message}: ${f}`));
    }
    return plOutcome;
  };

  redis.extractPipelineResults = (pipelineOutcome) => {
    const results = pipelineOutcome.map((operationOutcome) => operationOutcome[RESULT]);
    debug(`pipeline results: ${results}`);
    return results;
  };

  redis
    .on('error', (err) => {
      // eslint-disable-next-line no-console
      debug(`Redis error: ${err.message}`);
    }).on('connect', () => {
    // eslint-disable-next-line no-console
      debug('connected to Redis');
    });

  return redis;
};
