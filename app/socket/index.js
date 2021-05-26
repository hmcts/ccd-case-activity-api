const config = require('config');
const IORouter = require('socket.io-router-middleware');
const SocketIO = require('socket.io');

const ActivityService = require('./service/activity-service');
const Handlers = require('./service/handlers');
const watcher = require('./redis/watcher');
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
  const activityService = ActivityService(config, redis);
  const socketServer = SocketIO(server, {
    allowEIO3: true,
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });
  const handlers = Handlers(activityService, socketServer);
  pubSub.init(watcher, handlers.notify);
  router.init(socketServer, new IORouter(), handlers);

  return { socketServer, activityService, handlers };
};
