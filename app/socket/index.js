const debug = require('debug')('ccd-case-activity-api:socket');
const config = require('config');
const IORouter = require('socket.io-router-middleware');
const SocketIO = require('socket.io');
const ttlScoreGenerator = require('../service/ttl-score-generator');
const redisWatcher = require('./redis-watcher');
const ActivityService = require('./activity-service');

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
  const activityService = ActivityService(config, redis, ttlScoreGenerator);
  const io = SocketIO(server, {
    allowEIO3: true,
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });
  function toUser(obj) {
    return {
      sub: `${obj.name.replace(' ', '.')}@mailinator.com`,
      uid: obj.id,
      roles: [
        'caseworker-employment',
        'caseworker-employment-leeds',
        'caseworker'
      ],
      name: obj.name,
      given_name: obj.name.split(' ')[0],
      family_name: obj.name.split(' ')[1]
    };
  }
  function watchCase(socket, caseId) {
    socket.join(`case:${caseId}`);
  }
  function watchCases(socket, caseIds) {
    caseIds.forEach((caseId) => {
      watchCase(socket, caseId);
    });
  }
  function stopWatchingCases(socket) {
    [...socket.rooms].filter((r) => r.indexOf('case:') === 0).forEach((r) => socket.leave(r));
  }

  async function whenActivityForCases(caseIds) {
    return activityService.getActivityForCases(caseIds);
  }
  async function notifyWatchers(caseIds) {
    const ids = Array.isArray(caseIds) ? caseIds : [caseIds];
    ids.sort().forEach(async (caseId) => {
      const cs = await whenActivityForCases([caseId]);
      io.to(`case:${caseId}`).emit('activity', cs);
    });
  }
  async function handleViewOrEdit(socket, caseId, user, activity) {
    // Leave all the case rooms.
    stopWatchingCases(socket);

    // Remove the activity for this socket.
    activityService.removeSocketActivity(socket.id);

    // Now watch this case again.
    watchCase(socket, caseId);

    // Finally, add this new activity to redis.
    activityService.addActivity(caseId, toUser(user), socket.id, activity);
  }
  function handleEdit(socket, caseId, user) {
    handleViewOrEdit(socket, caseId, user, 'edit');
  }
  function handleView(socket, caseId, user) {
    handleViewOrEdit(socket, caseId, user, 'view');
  }
  async function handleWatch(socket, caseIds) {
    // Stop watching the current cases.
    stopWatchingCases(socket);

    // Remove the activity for this socket.
    activityService.removeSocketActivity(socket.id);

    // Now watch the specified cases.
    watchCases(socket, caseIds);

    // And immediately dispatch a message about the activity on those cases.
    const cs = await whenActivityForCases(caseIds);
    socket.emit('activity', cs);
  }

  // TODO: Track this stuff in redis.
  const socketUsers = {};

  // Pretty way of logging.
  function doLog(socket, payload, group) {
    let text = `${new Date().toISOString()} | ${socket.id} | ${group}`;
    if (typeof payload === 'string') {
      if (payload) {
        text = `${text} => ${payload}`;
      }
      debug(text);
    } else {
      debug(text);
      debug(payload);
    }
  }

  redisWatcher.psubscribe('case:*');
  redisWatcher.on('pmessage', (_, room) => {
    const caseId = room.replace('case:', '');
    notifyWatchers([caseId]);
  });

  // Set up routes for each type of message.
  iorouter.on('init', (socket, ctx, next) => {
    // Do nothing in here.
    doLog(socket, '', 'init');
    next();
  });

  iorouter.on('register', (socket, ctx, next) => {
    doLog(socket, ctx.request.user, 'register');
    socketUsers[socket.id] = ctx.request.user;
    next();
  });

  iorouter.on('view', (socket, ctx, next) => {
    const user = socketUsers[socket.id];
    doLog(socket, `${ctx.request.caseId} (${user.name})`, 'view');
    handleView(socket, ctx.request.caseId, user);
    next();
  });

  iorouter.on('edit', (socket, ctx, next) => {
    const user = socketUsers[socket.id];
    doLog(socket, `${ctx.request.caseId} (${user.name})`, 'edit');
    handleEdit(socket, ctx.request.caseId, user);
    next();
  });

  iorouter.on('watch', (socket, ctx, next) => {
    const user = socketUsers[socket.id];
    doLog(socket, `${ctx.request.caseIds} (${user.name})`, 'watch');
    handleWatch(socket, ctx.request.caseIds);
    next();
  });

  // On client connection attach the router
  io.on('connection', (socket) => {
    socket.use((packet, next) => {
      // Call router.attach() with the client socket as the first parameter
      iorouter.attach(socket, packet, next);
    });
  });

  const connections = [];
  io.sockets.on('connection', (socket) => {
    connections.push(socket);
    doLog(socket, '', `connected (${connections.length} total)`);
    socket.on('disconnect', () => {
      doLog(socket, '', `disconnected (${connections.length - 1} total)`);
      activityService.removeSocketActivity(socket.id);
      delete socketUsers[socket.id];
      connections.splice(connections.indexOf(socket), 1);
    });
  });

  return io;
};
