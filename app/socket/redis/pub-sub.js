const keys = require('./keys');

module.exports = () => {
  return {
    init: (watcher, caseNotifier)  => {
      if (watcher && typeof caseNotifier === 'function') {
        watcher.psubscribe(`${keys.prefixes.case}:*`);
        watcher.on('pmessage', (_, room) => {
          const caseId = room.replace(`${keys.prefixes.case}:`, '');
          caseNotifier(caseId);
        });
      }
    }
  };
};
