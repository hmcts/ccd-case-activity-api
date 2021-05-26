const debug = require('debug')('ccd-case-activity-api:redis-watcher');
const watcher = require('../../redis/instantiator')(debug);

module.exports = watcher;
