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

    console.log('Adding activity for caseId ', caseId, ' user ', user, ' activity ', activity);

    // Then add this new activity to redis, which will also clear out the old activity.
    await activityService.addActivity(caseId, user, socket.id, activity);
  }

  /**
   * Notify all users in a case room about any change to activity on a case.
   * @param {*} caseId The id of the case that has activity and that people should be
   * notified about.
   */
  async function notify(caseId) {
    const cs = await activityService.getActivityForCases([caseId]);
    console.log('notifying case activity: ', JSON.stringify(cs, null, 2));
    socketServer.to(keys.case.base(caseId)).emit('activity', cs);
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

// ws://localhost:3000/socket.io/?user=%7B%22given_name%22%3A%22SSCS%22%2C%22email%22%3A%22sscs.superuserhmc%40justice.gov.uk%22%2C%22family_name%22%3A%22superuser%22%2C%22name%22%3A%22SSCS%20superuser%22%2C%22ssoProvider%22%3A%22testing-support%22%2C%22uid%22%3A%2241033a79-b9c1-4a36-b0ff-113451f736ba%22%2C%22identity%22%3A%22id%3D41033a79-b9c1-4a36-b0ff-113451f736ba%2Cou%3Duser%2Co%3Dhmcts%2Cou%3Dservices%2Cou%3Dam-config%22%2C%22roles%22%3A%5B%22caseworker%22%2C%22caseworker-sscs%22%2C%22caseworker-sscs-superuser%22%2C%22caseworker-sscs-systemupdate%22%2C%22cwd-user%22%2C%22staff-admin%22%2C%22hmcts-legal-operations%22%2C%22hearing-viewer%22%2C%22hearing-manager%22%2C%22tribunal-caseworker%22%2C%22sscs-tribunal-caseworker%22%5D%2C%22sub%22%3A%22sscs.superuserhmc%40justice.gov.uk%22%2C%22subname%22%3A%22sscs.superuserhmc%40justice.gov.uk%22%2C%22iss%22%3A%22https%3A%2F%2Fforgerock-am.service.core-compute-idam-aat2.internal%3A8443%2Fopenam%2Foauth2%2Frealms%2Froot%2Frealms%2Fhmcts%22%2C%22roleCategory%22%3A%22LEGAL_OPERATIONS%22%7D&EIO=3&transport=websocket
