const keys = require('../redis/keys');
const utils = require('../utils');

module.exports = (activityService, socketServer) => {
  /**
   * Handle a user viewing or editing a case on a specific socket.
   * @param {*} socket The socket they're connected on.
   * @param {*} caseId The id of the case they're viewing or editing.
   * @param {*} user The user object.
   * @param {*} activity Whether they're viewing or editing.
   */
  async function addActivity(socket, caseId, user, activity) {
    // Update what's being watched.
    utils.watch.update(socket, [caseId]);

    // Then add this new activity to redis, which will also clear out the old activity.
    await activityService.addActivity(caseId, utils.toUser(user), socket.id, activity);
  }

  /**
   * Notify all users in a case room about any change to activity on a case.
   * @param {*} caseId The id of the case that has activity and that people should be notified about.
   */
  async function notify(caseId) {
    const cs = await activityService.getActivityForCases([caseId]);
    socketServer.to(keys.baseCase(caseId)).emit('activity', cs);
  }

  /**
   * Remove any activity associated with a socket. This can be called when the
   * socket disconnects.
   * @param {*} socketId The id of the socket to remove activity for.
   */
  async function removeSocketActivity(socketId) {
    await activityService.removeSocketActivity(socketId);
  }

  /**
   * Handle a user watching a bunch of cases on a specific socket.
   * @param {*} socket The socket they're connected on.
   * @param {*} caseIds The ids of the cases they're interested in.
   */
  async function watch(socket, caseIds) {
    // Stop watching the current cases.
    utils.watch.stop(socket);

    // Remove the activity for this socket.
    await activityService.removeSocketActivity(socket.id);

    // Now watch the specified cases.
    utils.watch.cases(socket, caseIds);

    // And immediately dispatch a message about the activity on those cases.
    const cs = await activityService.getActivityForCases(caseIds);
    socket.emit('activity', cs);
  }

  return {
    activityService,
    addActivity,
    notify,
    removeSocketActivity,
    socketServer,
    watch
  };
};
