const config = require('config');
const ttlScoreGenerator = require('../service/ttl-score-generator');
const redisWatcher = require('./redis-watcher');

const IORouter = new require('socket.io-router-middleware');
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
 *  addActivity 1588201414700270 {
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
    } view
 *
 */
module.exports = (server, redis) => {
  const activityService = require('./activity-service')(config, redis, ttlScoreGenerator);
  const io = require('socket.io')(server, {
    allowEIO3: true
  });

  async function whenActivityForCases(caseIds) {
    const caseActivty = await activityService.getActivityForCases(caseIds);
    console.log('activity for cases', caseIds, caseActivty);
    return caseActivty;
  }
  async function notifyWatchers(caseIds) {
    caseIds = Array.isArray(caseIds) ? caseIds : [caseIds];
    caseIds.sort().forEach(async (caseId) => {
      const cs = await whenActivityForCases([caseId]);
      io.to(`case:${caseId}`).emit('cases', cs);
    });
  }

  // TODO: Track this stuff in redis.
  const caseStatuses = {};
  const socketUsers = {};

  // Pretty way of logging.
  function doLog(socket, payload, group) {
    let text = `${new Date().toISOString()} | ${socket.id} | ${group}`;
    if (typeof payload === 'string') {
      if (payload) {
        text = `${text} => ${payload}`;
      }
      console.log(text);
    } else {
      console.group(text);
      console.log(payload);
      console.groupEnd();
    }
  }

  redisWatcher.on('message', room => {
    const caseId = room.replace('case:', '');
    console.log('redisWatcher.on.message', room, caseId);
    notifyWatchers([caseId]);
    // io.to(room).emit(message);
  });
  

  // When a new room is created, we want to watch for changes to that case.
  io.of('/').adapter.on('create-room', (room) => {
    console.log(`room ${room} was created`);
    if (room.indexOf('case:') === 0) {
      redisWatcher.subscribe(`${room}`);
    }
  });

  io.of('/').adapter.on('delete-room', (room) => {
    if (room.indexOf('case:') === 0) {
      redisWatcher.unsubscribe(`${room}`);
    }
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

    // Try sticking it in redis.
    activityService.addActivity(ctx.request.caseId, toUser(user), 'view');
    next();
  });

  iorouter.on('edit', (socket, ctx, next) => {
    const user = socketUsers[socket.id];
    doLog(socket, `${ctx.request.caseId} (${user.name})`, 'edit');
    handleEdit(socket, ctx.request.caseId, user);

    // Try sticking it in redis.
    activityService.addActivity(ctx.request.caseId, toUser(user), 'edit');
    next();
  });

  iorouter.on('watch', (socket, ctx, next) => {
    const user = socketUsers[socket.id];
    doLog(socket, `${ctx.request.caseIds} (${user.name})`, 'watch');
    handleWatch(socket, ctx.request.caseIds);
    next();
  });

  // On client connection attach the router
  io.on('connection', function (socket) {
    socket.use((packet, next) => {
      // Call router.attach() with the client socket as the first parameter
      iorouter.attach(socket, packet, next);
    });
  });

  function handleEdit(socket, caseId, user) {
    const stoppedViewing = stopViewingCases(socket.id);
    if (stoppedViewing.length > 0) {
      stoppedViewing.filter(c => c !== caseId).forEach(c => stopWatchingCase(socket, c));
    }
    const stoppedEditing = stopEditingCases(socket.id, caseId);
    if (stoppedEditing.length > 0) {
      stoppedEditing.filter(c => c !== caseId).forEach(c => stopWatchingCase(socket, c));
    }
    watchCase(socket, caseId);
    const caseStatus = caseStatuses[caseId] || { viewers: [], editors: [] };
    caseStatuses[caseId] = caseStatus;
    const matchingEditor = caseStatus.editors.find(e => e.id === user.id);
    const notify = stoppedViewing.concat(stoppedEditing);
    if (!matchingEditor) {
      caseStatus.editors.push({ ...user, socketId: socket.id });
      notify.push(caseId);
    }
    if (notify.length > 0) {
      notifyWatchers([ ...new Set(notify) ]);
    }
  }

  function handleView(socket, caseId, user) {
    const stoppedViewing = stopViewingCases(socket.id, caseId);
    if (stoppedViewing.length > 0) {
      stoppedViewing.filter(c => c !== caseId).forEach(c => stopWatchingCase(socket, c));
    }
    const stoppedEditing = stopEditingCases(socket.id);
    if (stoppedEditing.length > 0) {
      stoppedEditing.filter(c => c !== caseId).forEach(c => stopWatchingCase(socket, c));
    }
    watchCase(socket, caseId);
    const caseStatus = caseStatuses[caseId] || { viewers: [], editors: [] };
    caseStatuses[caseId] = caseStatus;
    const matchingViewer = caseStatus.viewers.find(v => v.id === user.id);
    const notify = stoppedViewing.concat(stoppedEditing);
    if (!matchingViewer) {
      caseStatus.viewers.push({ ...user, socketId: socket.id });
      notify.push(caseId);
    }
    if (notify.length > 0) {
      notifyWatchers([ ...new Set(notify) ]);
    }
  }

  async function handleWatch(socket, caseIds) {
    watchCases(socket, caseIds);
    const cs = await whenActivityForCases(caseIds);
    socket.emit('cases', cs);
  }

  function watchCases(socket, caseIds) {
    caseIds.forEach(caseId => {
      watchCase(socket, caseId);
    });
  }
  function watchCase(socket, caseId) {
    socket.join(`case:${caseId}`);
  }
  function stopWatchingCase(socket, caseId) {
    socket.leave(`case:${caseId}`);
  }
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

  function stopViewingOrEditing(socketId, exceptCaseId) {
    const stoppedViewing = stopViewingCases(socketId, exceptCaseId);
    const stoppedEditing = stopEditingCases(socketId, exceptCaseId);
    return { stoppedViewing, stoppedEditing };
  }
  function stopViewingCases(socketId, exceptCaseId) {
    const affectedCases = [];
    Object.keys(caseStatuses).filter(key => key !== exceptCaseId).forEach(key => {
      const c = caseStatuses[key];
      const viewer = c.viewers.find(v => v.socketId === socketId);
      if (viewer) {
        c.viewers.splice(c.viewers.indexOf(viewer), 1);
        affectedCases.push(key);
      }
    });
    return affectedCases;
  }
  function stopEditingCases(socketId, exceptCaseId) {
    const affectedCases = [];
    Object.keys(caseStatuses).filter(key => key !== exceptCaseId).forEach(key => {
      const c = caseStatuses[key];
      const editor = c.editors.find(e => e.socketId === socketId);
      if (editor) {
        c.editors.splice(c.editors.indexOf(editor), 1);
        affectedCases.push(key);
      }
    });
    return affectedCases;
  }

  const connections = [];
  io.sockets.on("connection", (socket) => {
    connections.push(socket);
    if (connections.length === 1) {
      console.log("1 socket connected");
    } else {
      console.log("%s sockets connected", connections.length);
    }
    // console.log('connections[0]', connections[0]);
    socket.on("disconnect", () => {
      console.log(socket.id, 'has disconnected');
      stopViewingOrEditing(socket.id);
      delete socketUsers[socket.id];
      connections.splice(connections.indexOf(socket), 1);
    });
    socket.on("sending message", (message) => {
      console.log("Message is received :", message);
      io.sockets.emit("new message", { message: message });
    });
  });

  return io;
};