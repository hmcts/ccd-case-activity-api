var redis = require('../../../app/redis/redis-client')
var moment = require('moment')

exports.getAllCaseViewers = (caseId) => redis.zrangebyscore(`case:${caseId}:viewers`, '-inf', '+inf')

exports.getNotExpiredCaseViewers = (caseId) => redis.zrangebyscore(`case:${caseId}:viewers`, moment().valueOf(), '+inf')

exports.getAllCaseEditors = (caseId) => redis.zrangebyscore(`case:${caseId}:editors`, '-inf', '+inf')

exports.getNotExpiredCaseEditors = (caseId) => redis.zrangebyscore(`case:${caseId}:editors`,  moment().valueOf(), '+inf')

exports.getUser = (id) => redis.get(`user:${id}`)