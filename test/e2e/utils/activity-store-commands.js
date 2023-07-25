var redis = require('../../../app/redis/redis-client')

exports.getAllCaseViewers = (caseId) => redis.zrangebyscore(`case:${caseId}:viewers`, '-inf', '+inf')

exports.getNotExpiredCaseViewers = (caseId) => redis.zrangebyscore(`case:${caseId}:viewers`, Date.now(), '+inf')

exports.getAllCaseEditors = (caseId) => redis.zrangebyscore(`case:${caseId}:editors`, '-inf', '+inf')

exports.getNotExpiredCaseEditors = (caseId) => redis.zrangebyscore(`case:${caseId}:editors`, Date.now(), '+inf')

exports.getUser = (id) => redis.get(`user:${id}`)