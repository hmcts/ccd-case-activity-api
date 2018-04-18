const cron = require('node-cron');
const debug = require('debug')('ccd-case-activity-web:store-cleanup-job');
const redis = require('../redis/redis-client');
const moment = require('moment');
const config = require('config');

const { logPipelineFailures } = redis;
const now = () => moment().valueOf();
const REDIS_ACTIVITY_KEY_PREFIX = config.get('redis.keyPrefix');

const scanExistingCasesKeys = (f) => {
  const stream = redis.scanStream({
    // only returns keys following the pattern
    match: `${REDIS_ACTIVITY_KEY_PREFIX}case:*`,
    // returns approximately 100 elements per call
    count: 100,
  });
  const keys = [];
  stream.on('data', (resultKeys) => {
    // `resultKeys` is an array of strings representing key names
    for (let i = 0; i < resultKeys.length; i += 1) {
      keys.push(resultKeys[i]);
    }
  });
  stream.on('end', () => {
    debug(`scan completed keys: ${keys}`);
    f(keys);
  });
};

const getCasesWithActivities = f => scanExistingCasesKeys(f);

const cleanupActivitiesCommand = key => ['zremrangebyscore', key, '-inf', now()];

const pipeline = (cases) => {
  const commands = cases.map(caseKey => cleanupActivitiesCommand(caseKey));
  debug(`created cleanup pipeline: ${commands}`);
  return redis.pipeline(commands);
};

const storeCleanup = () => {
  debug('store cleanup starting...');
  getCasesWithActivities((cases) => {
    // scan returns the prefixed keys. Remove them since the redis client will add it back
    const casesWithoutPrefix = cases.map(k => k.replace(REDIS_ACTIVITY_KEY_PREFIX, ''));

    debug(`about to cleanup the following cases: ${casesWithoutPrefix}`);
    return pipeline(casesWithoutPrefix).exec()
      .then(pipelineOutcome => logPipelineFailures(pipelineOutcome, 'error in store cleanup job'))
      .catch((err) => {
        debug('Error in getCasesWithActivities', err.message);
      });
  });
};

exports.start = (crontab) => {
  const isValid = cron.validate(crontab);
  if (!isValid) throw new Error(`invalid crontab: ${crontab}`);
  debug(`scheduling store cleanup job according to crontab: ${crontab}`);
  cron.schedule(crontab, storeCleanup);
};

exports.force = () => {
  debug('forced store cleanup');
  storeCleanup();
};
