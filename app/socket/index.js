const config = require('config');
const IORouter = require('socket.io-router-middleware');
const SocketIO = require('socket.io');
// Missing imports — REQUIRED for Redis Adapter
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

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
  const socketServer = SocketIO(server, {
    allowEIO3: true,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: false
    },
  });

  // const socketServer = SocketIO(server, {
  //   allowEIO3: true,
  //   transports: ['websocket', 'polling'],
  //   cors: {
  //     origin: [
  //       'https://manage-case-int1.demo.platform.hmcts.net',
  //       'http://localhost:3000'
  //     ],
  //     methods: ['GET', 'POST'],
  //     credentials: true
  //   },
  // });

  //
  // ---------------------------------------------------------
  // ENABLE REDIS ADAPTER (Fixes “Session ID unknown”)
  // ---------------------------------------------------------
  //
  async function enableRedisAdapter(io) {
    try {
      const redisPort = config.get('redis.port');
      const redisHost = config.get('redis.host');

      // HMCTS secret pattern → password is inside .value
      const redisPwdObj = config.get('secrets.ccd.activity-redis-password');
      // const redisPwd = redisPwdObj?.value ?? redisPwdObj;   // supports both flat and nested

      const redisPwd = redisPwdObj && redisPwdObj.value
        ? redisPwdObj.value
        : redisPwdObj;

      if (!redisHost || !redisPort) {
        console.warn('[SOCKET.IO] redis.host/redis.port missing — Redis adapter not enabled');
        return;
      }

      const redisUrl = redisPwd
        ? `redis://:${encodeURIComponent(redisPwd)}@${redisHost}:${redisPort}`
        : `redis://${redisHost}:${redisPort}`;

      console.log('[SOCKET.IO] Connecting to Redis at', redisUrl);

      const pubClient = createClient({ url: redisUrl });
      const subClient = pubClient.duplicate();

      await pubClient.connect();
      await subClient.connect();

      io.adapter(createAdapter(pubClient, subClient));

      console.log('[SOCKET.IO] Redis adapter enabled');
    } catch (err) {
      console.error('[SOCKET.IO] Failed to enable Redis adapter:', err);
    }
  }

  // Call the adapter initialisation (non-blocking)
  enableRedisAdapter(socketServer).catch((err) => {
    console.error('[SOCKET.IO] Redis adapter init failed:', err);
  });

  //
  // ---------------------------------------------------------
  // SETUP ROUTER + HANDLERS + PUBSUB
  // ---------------------------------------------------------
  //
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

  //
  // ---------------------------------------------------------
  // LOG CONNECTION EVENTS
  // ---------------------------------------------------------
  //
  socketServer.on('connection', (s) => {
    console.log('Socket connected:', s.id, 'transport:', s.conn.transport.name);
  });
  return { socketServer, activityService, handlers };
};
