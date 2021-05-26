const config = require('config');
const IORouter = require('socket.io-router-middleware');
const SocketIO = require('socket.io');

const ActivityService = require('./activity-service');
const redisWatcher = require('./redis-watcher');
const utils = require('./utils');

const iorouter = new IORouter();

/**
 * Sets up a series of routes for a "socket" endpoint, that
 * leverages socket.io and will more than likely use long polling
 * instead of websockets as the latter isn't supported by Azure
 * Front Door.
 *
 * The behaviour is the same, though.
 *
 * TODO:
 *   1. Use redis rather than holding the details in memory.
 *   2. Some sort of auth / get the credentials when the user connects.
 *
 * Add view activity looks like this:
 *  addActivity 1588201414700270, {
      sub: 'leeds_et@mailinator.com',
      uid: '85269805-3a70-419d-acab-193faeb89ad3',
      roles: [
        'caseworker-employment',
        'caseworker-employment-leeds',
        'caseworker'
      ],
      name: 'Ethos Leeds',
      given_name: 'Ethos',
      family_name: 'Leeds'
    }, '18hs67171jak', 'view'
 *
 */
module.exports = (server, redis) => {
  const activityService = ActivityService(config, redis);
  const io = SocketIO(server, {
    allowEIO3: true,
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });
  const socketUsers = {};

  async function notifyWatchers(caseId) {
    const cs = await activityService.getActivityForCases([caseId]);
    io.to(`case:${caseId}`).emit('activity', cs);
  }
  async function handleActivity(socket, caseId, user, activity) {
    // Update what's being watched.
    utils.watch.update(socket, [caseId]);

    // Then add this new activity to redis, which will also clear out the old activity.
    await activityService.addActivity(caseId, utils.toUser(user), socket.id, activity);
  }
  async function handleWatch(socket, caseIds) {
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

  redisWatcher.psubscribe('case:*');
  redisWatcher.on('pmessage', (_, room) => {
    const caseId = room.replace('case:', '');
    notifyWatchers(caseId);
  });

  // Set up routes for each type of message.
  iorouter.on('register', (socket, ctx, next) => {
    utils.log(socket, ctx.request.user, 'register');
    socketUsers[socket.id] = ctx.request.user;
    next();
  });
  iorouter.on('view', (socket, ctx, next) => {
    const user = socketUsers[socket.id];
    utils.log(socket, `${ctx.request.caseId} (${user.name})`, 'view');
    handleActivity(socket, ctx.request.caseId, user, 'view');
    next();
  });
  iorouter.on('edit', (socket, ctx, next) => {
    const user = socketUsers[socket.id];
    utils.log(socket, `${ctx.request.caseId} (${user.name})`, 'edit');
    handleActivity(socket, ctx.request.caseId, user, 'edit');
    next();
  });
  iorouter.on('watch', (socket, ctx, next) => {
    const user = socketUsers[socket.id];
    utils.log(socket, `${ctx.request.caseIds} (${user.name})`, 'watch');
    handleWatch(socket, ctx.request.caseIds);
    next();
  });

  // On client connection, attach the router
  io.on('connection', (socket) => {
    socket.use((packet, next) => {
      iorouter.attach(socket, packet, next);
    });
  });

  const connections = [];
  io.sockets.on('connection', (socket) => {
    connections.push(socket);
    utils.log(socket, '', `connected (${connections.length} total)`);
    socket.on('disconnect', () => {
      utils.log(socket, '', `disconnected (${connections.length - 1} total)`);
      activityService.removeSocketActivity(socket.id);
      delete socketUsers[socket.id];
      connections.splice(connections.indexOf(socket), 1);
    });
  });

  return io;
};
