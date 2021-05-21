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
 */
module.exports = (server) => {
  const io = require('socket.io')(server, {
    allowEIO3: true
  });
  const IORouter = new require('socket.io-router-middleware');
  const iorouter = new IORouter();

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
  io.on('connection', function (socket) {
    // console.log('io.on.connection', socket.handshake);
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
      notifyWatchers(socket, [ ...new Set(notify) ]);
    }
    socket.emit('response', getCaseStatuses([caseId]));
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
      notifyWatchers(socket, [ ...new Set(notify) ]);
    }
    socket.emit('response', getCaseStatuses([caseId]));
  }

  function handleWatch(socket, caseIds) {
    watchCases(socket, caseIds);
    socket.emit('cases', getCaseStatuses(caseIds));
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
  function notifyWatchers(socket, caseIds) {
    caseIds.sort().forEach(caseId => {
      const cs = getCaseStatuses([caseId]);
      doLog(socket, cs, `notify room 'case:${caseId}'`);
      socket.to(`case:${caseId}`).emit('cases', getCaseStatuses([caseId]));
    });
  }

  function getCaseStatuses(caseIds) {
    return caseIds.reduce((obj, caseId) => {
      const cs = caseStatuses[caseId];
      if (cs) {
        obj[caseId] = {
          viewers: [ ...cs.viewers.map(w => toUser(w)) ],
          editors: [ ...cs.editors.map(e => toUser(e)) ]
        };
      }
      return obj;
    }, {});
  }
  function toUser(obj) {
    return { id: obj.id, name: obj.name };
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