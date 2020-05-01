const config = require('config');
const CacheService = require('./cache-service');

const userInfoCache = new CacheService('UserInfoCache', config.get('cache.user_info_ttl'), config.get('cache.user_info_check_period'));

module.exports = {
  userInfoCache,
};
