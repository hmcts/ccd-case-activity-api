const config = require('config');
const debug = require('debug')('ccd-case-activity-api:redis-client');
const Redis = require('ioredis');

const ERROR = 0;
const RESULT = 1;
const ENV = config.util.getEnv('NODE_ENV');

const redis = new Redis({
  port: config.get('redis.port'),
  host: config.get('redis.host'),
  password: config.get('redis.password'),
  tls: config.get('redis.ssl'),
  keyPrefix: config.get('redis.keyPrefix'),
  // log unhandled redis errors
  showFriendlyErrorStack: ENV === 'test' || ENV === 'dev',
});

/* redis pipeline returns a reply of the form [[op1error, op1result], [op2error, op2result], ...].
   error is null in case of success */
redis.logPipelineFailures = (plOutcome, message) => {
  if (Array.isArray(plOutcome)) {
    const operationsFailureOutcome = plOutcome.map(operationOutcome => operationOutcome[ERROR]);
    const failures = operationsFailureOutcome.filter(element => element !== null);
    failures.forEach(f => debug(`${message}: ${f}`));
  } else {
    debug(`${plOutcome} is not an Array...`);
  }
  return plOutcome;
};

redis.extractPipelineResults = (pipelineOutcome) => {
  const results = pipelineOutcome.map(operationOutcome => operationOutcome[RESULT]);
  debug(`pipeline results: ${results}`);
  return results;
};

redis
  .on('error', (err) => {
    debug(`Redis error: ${err.message}`);
  }).on('connect', () => {
    debug('connected to Redis');
  });

module.exports = redis;
