const debug = require('debug')('ccd-case-activity-api:redis-watcher');

module.exports = require('../redis/instantiator')(debug);
