const watch = {
  case: (socket, caseId) => {
    if (socket && caseId) {
      socket.join(`case:${caseId}`);
    }
  },
  cases: (socket, caseIds) => {
    if (socket && Array.isArray(caseIds)) {
      caseIds.forEach((caseId) => {
        watch.case(socket, caseId);
      });
    }
  },
  stop: (socket) => {
    if (socket) {
      [...socket.rooms]
        .filter((r) => r.indexOf('case:') === 0) // Only case rooms.
        .forEach((r) => socket.leave(r));
    }
  },
  update: (socket, caseIds) => {
    watch.stop(socket);
    watch.cases(socket, caseIds);
  }
};

module.exports = watch;
