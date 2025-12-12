const config = require('config');
const IORouter = require('socket.io-router-middleware');
const SocketIO = require('socket.io');

const ActivityService = require('./service/activity-service');
const Handlers = require('./service/handlers');
const pubSub = require('./redis/pub-sub')();
const router = require('./router');

/**
 * Sets up a series of routes for a "socket" endpoint, that
 * leverages socket.io and will more than likely use long polling
 * instead of websockets as the latter isn't supported by Azure
 * Front Door.
 *
 * The behaviour is the same, though.
 *
 * TODO:
 *   * Some sort of auth / get the credentials when the user connects.
 */
module.exports = (server, redis) => {
  console.log('Setting up socket server');
  const activityService = ActivityService(config, redis);

  console.log('Creating socket server');
  // const socketServer = SocketIO(server, {
  //   allowEIO3: true,
  //   cors: {
  //     origin: '*',
  //     methods: ['GET', 'POST'],
  //     credentials: true
  //   },
  // });

  const socketServer = SocketIO(server, {
    allowEIO3: true,
    transports: ['websocket', 'polling'],
    cors: {
      origin: ['https://manage-case-int1.demo.platform.hmcts.net', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    },
  });

  // console.log('Setting up socket handlers and router');
  // const handlers = Handlers(activityService, socketServer);
  // const watcher = redis.duplicate();

  // console.log('Initializing pubsub for socket server');
  // pubSub.init(watcher, handlers.notify);

  // console.log('Initializing router for socket server');
  // router.init(socketServer, new IORouter(), handlers);

  // console.log('Socket server setup complete');

  // console.log('socket Server ', socketServer);
  console.log('Setting up socket handlers and router');
  const handlers = Handlers(activityService, socketServer);
  const watcher = redis.duplicate();

  console.log('Initializing router for socket server');
  router.init(socketServer, new IORouter(), handlers);

  console.log('Initializing pubsub for socket server');
  try {
    pubSub.init(watcher, handlers.notify);
    console.log('PubSub initialized');
  } catch (e) {
    console.error('PubSub init failed (sockets still running):', e);
  }

  // Optional: log connections to confirm traffic in Azure
  socketServer.on('connection', (s) => {
    console.log('Socket connected:', s.id, 'transport:', s.conn.transport.name);
  });
  return { socketServer, activityService, handlers };
};
