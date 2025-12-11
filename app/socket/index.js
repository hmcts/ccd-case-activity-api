// index.js
const config = require('config');
const IORouter = require('socket.io-router-middleware');
const SocketIO = require('socket.io');

const ActivityService = require('./service/activity-service');
const Handlers = require('./service/handlers');
const pubSub = require('./redis/pub-sub')();
const router = require('./router');

/**
 * Sets up a series of routes for a "socket" endpoint.
 *
 * Adds extra logging for CORS and Upgrade headers to help debug Front Door / proxy issues.
 */
module.exports = (server, redis) => {
  console.log('Setting up socket server');
  const activityService = ActivityService(config, redis);

  console.log('Creating socket server');

  // Allowed origins: add any FD/custom domains or local dev hosts you need
  const allowedOrigins = new Set([
    'https://manage-case-int1.demo.platform.hmcts.net',
    'https://manage-case.demo.platform.hmcts.net',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ]);

  // Socket.IO options with detailed CORS handling + diagnostics
  const io = SocketIO(server, {
    allowEIO3: true,
    transports: ['websocket', 'polling'],
    // Use origin function to accept/reject and log
    cors: {
      origin: (origin, callback) => {
        // Note: `origin` will be undefined for non-browser clients (e.g. wscat)
        if (!origin) {
          console.log('[CORS] No Origin header (non-browser client?) — allowing by default.');
          return callback(null, true);
        }

        console.log('[CORS] Incoming Origin:', origin);
        if (allowedOrigins.has(origin)) {
          console.log('[CORS] Origin allowed:', origin);
          return callback(null, true);
        }

        console.log('[CORS] Origin rejected:', origin);
        // Provide an error to the callback so the client sees rejection
        return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
      },
      methods: ['GET', 'POST'],
      credentials: true
    },

    /**
     * allowRequest gives us raw access to the handshake request and lets us accept/reject
     * it before Socket.IO processes it. Useful for logging Upgrade headers and Connection headers.
     *
     * accept(err, success) -> if success === false the handshake is rejected.
     */
    allowRequest: (req, accept) => {
      try {
        const { origin } = req.headers;
        const { upgrade } = req.headers;
        const connectionHeader = req.headers.connection;
        const { url } = req;

        console.log('[ALLOW_REQUEST] handshake req=', req);
        console.log('[ALLOW_REQUEST] handshake url=', url);
        console.log('[ALLOW_REQUEST] headers.origin=', origin);
        console.log('[ALLOW_REQUEST] headers.upgrade=', upgrade);
        console.log('[ALLOW_REQUEST] headers.connection=', connectionHeader);

        // Basic validation: ensure allowed origin if provided
        if (origin && !allowedOrigins.has(origin)) {
          console.log('[ALLOW_REQUEST] Rejecting handshake due to disallowed origin:', origin);
          // reject the request — the client will get a CORS error / handshake failure
          return accept(new Error('Origin not allowed'), false);
        }

        // Optionally enforce that Upgrade header is present for websocket transport requests
        // (Don't strictly require here because Socket.IO may start with polling)
        // If you'd like to log transport type: req._query or req.url may contain transport param

        // Accept handshake
        return accept(null, true);
      } catch (err) {
        console.error('[ALLOW_REQUEST] Unexpected error while checking handshake:', err);
        return accept(err, false);
      }
    },

    // Tune timeouts (helps reduce disconnects behind proxies)
    pingInterval: 25000,
    pingTimeout: 60000,
    maxHttpBufferSize: 1e6
  });

  // Router / handlers / pubsub wiring (same as before) with robust logging
  console.log('Setting up socket handlers and router');
  const handlers = Handlers(activityService, io);
  const watcher = redis.duplicate();

  console.log('Initializing router for socket server');
  router.init(io, new IORouter(), handlers);

  console.log('Initializing pubsub for socket server');
  try {
    pubSub.init(watcher, handlers.notify);
    console.log('PubSub initialized');
  } catch (e) {
    console.error('PubSub init failed (sockets still running):', e);
  }

  // Connection logging to confirm traffic (shows transport used)
  io.on('connection', (socket) => {
    try {
      console.log('[WS] client connected:', socket.id, 'transport:', socket.conn.transport.name);
      // If you want more detail on handshake:
      if (socket.handshake && socket.handshake.headers) {
        console.log('[WS] handshake.headers.origin=', socket.handshake.headers.origin);
        console.log('[WS] handshake.headers.upgrade=', socket.handshake.headers.upgrade);
        console.log('[WS] handshake.headers.connection=', socket.handshake.headers.connection);
      }

      socket.on('error', (err) => {
        console.error('[WS] socket error for', socket.id, err);
      });

      socket.on('disconnect', (reason) => {
        console.log('[WS] disconnect', socket.id, reason);
      });
    } catch (ex) {
      console.error('[WS] error in connection handler', ex);
    }
  });

  // Global engine-level error logging (handshake/connect errors)
  io.engine.on('connection_error', (err) => {
    console.log('[ENGINE] connection_error:', err && err.message ? err.message : err);
  });

  console.log('Socket server setup complete');
  return { socketServer: io, activityService, handlers };
};
