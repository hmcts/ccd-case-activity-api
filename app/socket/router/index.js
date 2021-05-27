const utils = require('../utils');

const users = {};
const connections = [];
const router = {
  addUser: (socketId, user) => {
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
    iorouter.on('register', (socket, ctx, next) => {
      utils.log(socket, ctx.request.user, 'register');
      router.addUser(socket.id, ctx.request.user);
      next();
    });
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
      utils.log(socket, '', `connected (${router.getConnections().length} total)`);
      socket.use((packet, next) => {
        iorouter.attach(socket, packet, next);
      });
      // When the socket disconnects, do an appropriate teardown.
      socket.on('disconnect', () => {
        utils.log(socket, '', `disconnected (${router.getConnections().length - 1} total)`);
        handlers.removeSocketActivity(socket.id);
        router.removeUser(socket.id);
        router.removeConnection(socket);
      });
    });
  }
};

module.exports = router;
