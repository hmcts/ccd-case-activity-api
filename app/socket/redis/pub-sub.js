const keys = require('./keys');

module.exports = () => {
  return {
    init: (sub, caseNotifier)  => {
      if (sub && typeof caseNotifier === 'function') {
        sub.psubscribe(`${keys.prefixes.case}:*`);
        sub.on('pmessage', (_, room) => {
          const caseId = room.replace(`${keys.prefixes.case}:`, '');
          caseNotifier(caseId);
        });
      }
    }
  };
};
