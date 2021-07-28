const utils = require('../utils');

const users = {};
const connections = [];
const router = {
  addUser: (socketId, user) => {
    if (user && !user.name) {
      user.name = `${user.forename} ${user.surname}`;
    }
    users[socketId] = user;
  },
  removeUser: (socketId) => {
    delete users[socketId];
  },
  getUser: (socketId) => {
    return users[socketId];
  },
  addConnection: (socket) => {
    connections.push(socket);
  },
  removeConnection: (socket) => {
    const socketIndex = connections.indexOf(socket);
    if (socketIndex > -1) {
      connections.splice(socketIndex, 1);
    }
  },
  getConnections: () => {
    return [...connections];
  },
  init: (io, iorouter, handlers) => {
    // Set up routes for each type of message.
    iorouter.on('view', (socket, ctx, next) => {
      const user = router.getUser(socket.id);
      utils.log(socket, `${ctx.request.caseId} (${user.name})`, 'view');
      handlers.addActivity(socket, ctx.request.caseId, user, 'view');
      next();
    });
    iorouter.on('edit', (socket, ctx, next) => {
      const user = router.getUser(socket.id);
      utils.log(socket, `${ctx.request.caseId} (${user.name})`, 'edit');
      handlers.addActivity(socket, ctx.request.caseId, user, 'edit');
      next();
    });
    iorouter.on('watch', (socket, ctx, next) => {
      const user = router.getUser(socket.id);
      utils.log(socket, `${ctx.request.caseIds} (${user.name})`, 'watch');
      handlers.watch(socket, ctx.request.caseIds);
      next();
    });

    // On client connection, attach the router and track the socket.
    io.on('connection', (socket) => {
      router.addConnection(socket);
      router.addUser(socket.id, JSON.parse(socket.handshake.query.user));
      utils.log(socket, '', `connected (${router.getConnections().length} total)`);
      utils.log(socket, '', `connected (${router.getConnections().length} total)`, console.log, Date.now());
      socket.use((packet, next) => {
        iorouter.attach(socket, packet, next);
      });
      // When the socket disconnects, do an appropriate teardown.
      socket.on('disconnect', () => {
        utils.log(socket, '', `disconnected (${router.getConnections().length - 1} total)`);
        utils.log(socket, '', `disconnected (${router.getConnections().length - 1} total)`, console.log, Date.now());
        handlers.removeSocketActivity(socket.id);
        router.removeUser(socket.id);
        router.removeConnection(socket);
      });
    });
  }
};

module.exports = router;
