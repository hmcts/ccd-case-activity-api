const redisActivityKeys = {
  view: (caseId) => `case:${caseId}:viewers`,
  edit: (caseId) => `case:${caseId}:editors`,
  baseCase: (caseId) => `case:${caseId}`,
  user: (userId) => `user:${userId}`,
  socket: (socketId) => `socket:${socketId}`
};

module.exports = redisActivityKeys;
