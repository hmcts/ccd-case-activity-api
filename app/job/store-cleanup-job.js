const cron = require('node-cron');
const debug = require('debug')('ccd-case-activity-api:store-cleanup-job');
const config = require('config');
const redis = require('../redis/redis-client');

const { logPipelineFailures } = redis;
const REDIS_ACTIVITY_KEY_PREFIX = config.get('redis.keyPrefix');

const scanExistingCasesKeys = (f, prefix) => {
  const stream = redis.scanStream({
    // only returns keys following the pattern
    match: `${REDIS_ACTIVITY_KEY_PREFIX}${prefix}:*`,
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

const getCasesWithActivities = (f, prefix) => scanExistingCasesKeys(f, prefix);

const cleanupActivitiesCommand = (key) => ['zremrangebyscore', key, '-inf', Date.now()];

const pipeline = (cases) => {
  const commands = cases.map((caseKey) => cleanupActivitiesCommand(caseKey));
  debug(`created cleanup pipeline: ${commands}`);
  return redis.pipeline(commands);
};

const cleanCasesWithPrefix = (prefix) => {
  getCasesWithActivities((cases) => {
    // scan returns the prefixed keys. Remove them since the redis client will add it back
    const casesWithoutPrefix = cases.map((k) => k.replace(REDIS_ACTIVITY_KEY_PREFIX, ''));

    debug(`about to cleanup the following cases: ${casesWithoutPrefix}`);
    return pipeline(casesWithoutPrefix).exec()
      .then((pipelineOutcome) => logPipelineFailures(pipelineOutcome, 'error in store cleanup job'))
      .catch((err) => {
        debug('Error in getCasesWithActivities', err.message);
      });
  }, prefix);
};

const storeCleanup = () => {
  debug('store cleanup starting...');
  cleanCasesWithPrefix('case'); // Cases via RESTful interface.
  cleanCasesWithPrefix('c'); // Cases via socket interface.
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
