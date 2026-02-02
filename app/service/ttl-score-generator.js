const config = require('config');
const debug = require('debug')('ccd-case-activity-api:score-generator');

exports.getScore = () => {
  const now = Date.now();
  const ttl = parseInt(config.get('redis.activityTtlSec'), 10) || 0;
  const score = now + (ttl * 1000);
  debug(`generated score out of current timestamp '${now}' plus ${ttl} sec`);
  return score;
};
