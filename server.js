#!/usr/bin/env node

/**
 * Module dependencies.
 */

require('@hmcts/properties-volume').addTo(require('config'));
var app = require('./app');

var debug = require('debug')('ccd-case-activity-api:server');
var http = require('http');

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '3460');
console.log('Starting on port ' + port);
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Set up a socket.io router.
 */
const io = require('socket.io')(server, {
  allowEIO3: true
});
const IORouter = new require('socket.io-router-middleware');
const iorouter = new IORouter();

// const socketsWatchingCases = {};
const caseStatuses = {};

// Add router paths
iorouter.on('/socket', (socket, ctx, next) => {
  const payload = ctx.request.payload;
  if (payload) {
    if (payload.edit) {
      handleEdit(socket, payload);
    } else if (payload.view) {
      handleView(socket, payload);
    } else if (payload.watch) {
      handleWatch(socket, payload.watch);
    }
  }
  // ctx.response = { hello: 'from server' };
  // socket.emit('response', ctx);
  // Don't forget to call next() at the end to enable passing to other middlewares
  next();
});
// On client connection attach the router
io.on('connection', function (socket) {
  socket.use((packet, next) => {
    // Call router.attach() with the client socket as the first parameter
    iorouter.attach(socket, packet, next);
  });
});

function handleEdit(socket, payload) {
  const caseId = payload.edit;
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
  const matchingEditor = caseStatus.editors.find(e => e.id === payload.user.id);
  const notify = stoppedViewing.concat(stoppedEditing);
  if (!matchingEditor) {
    caseStatus.editors.push({ ...payload.user, socketId: socket.id });
    notify.push(caseId);
  }
  if (notify.length > 0) {
    notifyWatchers(socket, [ ...new Set(notify) ]);
  }
  socket.emit('response', getCaseStatuses([caseId]));
}

function handleView(socket, payload) {
  const caseId = payload.view;
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
  const matchingViewer = caseStatus.viewers.find(v => v.id === payload.user.id);
  const notify = stoppedViewing.concat(stoppedEditing);
  if (!matchingViewer) {
    caseStatus.viewers.push({ ...payload.user, socketId: socket.id });
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
    socket.to(`case:${caseId}`).emit('cases', getCaseStatuses([caseId]));
  });
}

function getCaseStatuses(caseIds) {
  return caseIds.reduce((obj, caseId) => {
    const cs = caseStatuses[caseId];
    if (cs) {
      obj[caseId] = {
        viewers: [ ...cs.viewers.map(w => w.id) ],
        editors: [ ...cs.editors.map(e => e.id) ]
      };
    }
    return obj;
  }, {});
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
  console.log(" %s sockets is connected", connections.length);
  // console.log('connections[0]', connections[0]);
  socket.on("disconnect", () => {
    console.log(socket.id, 'has disconnected');
    stopViewingOrEditing(socket.id);
    connections.splice(connections.indexOf(socket), 1);
  });
  socket.on("sending message", (message) => {
    console.log("Message is received :", message);
    io.sockets.emit("new message", { message: message });
  });
});

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {

  var addr = server.address();

  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;

  debug('Listening on ' + bind);
}
