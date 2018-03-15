const config = require('config');
const moment = require('moment');
const debug = require('debug')('ccd-case-activity-web:score-generator');

exports.getScore = () => {
  const now = moment();
  const score = now.add(config.get('redis.activityTtlSec'), 'seconds').valueOf();
  debug(`generated score out of current timestamp '${now.valueOf()}' plus ${config.get('redis.activityTtlSec')} sec`);
  return score;
};
