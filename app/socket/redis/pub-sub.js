const ROOM_PREFIX = 'case:';

module.exports = () => {
  return {
    init: (sub, caseNotifier)  => {
      if (sub && typeof caseNotifier === 'function') {
        sub.psubscribe(`${ROOM_PREFIX}*`);
        sub.on('pmessage', (_, room) => {
          const caseId = room.replace(ROOM_PREFIX, '');
          caseNotifier(caseId);
        });
      }
    },
    ROOM_PREFIX
  };
};
