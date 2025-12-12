#!/usr/bin/env node

/**
 * Module dependencies.
 */
require('@hmcts/properties-volume').addTo(require('config'));
const { normalizePort, onListening, onServerError } = require('./app/util/utils');
const debug = require('debug')('ccd-case-activity-api:server');
const http = require('http');
const app = require('./app');

/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(process.env.PORT || '3460');
console.log(`Starting on port ${port}`);
app.set('port', port);

/**
 * Create HTTP server.
 */
const server = http.createServer(app);

/**
 * Create the socket server.
 *
 * This runs on the same server, in parallel to the RESTful interface. At the present
 * time, interoperability is turned off to keep them isolated but, with a couple of
 * tweaks, it can easily be enabled:
 *
 *   * Adjust the prefixes in socket/redis/keys.js to be the same as the RESTful ones.
 *     * This will immediately allow the RESTful interface to see what people on sockets
 *       are viewing/editing.
 *   * Add redis.publish(...) calls in service/activity-service.js.
 *     * To notify those on sockets when someone is viewing or editing a case.
 */
const redis = require('./app/redis/redis-client');
require('./app/socket')(server, redis);

/**
 * Listen on provided port, on all network interfaces.
 */

console.log(`Listening on port ${port}`);
server.listen(port);

console.log(`Server started on port ${port}`);

console.log('Registering onServerError handler');

server.on('error', onServerError(port, console.error, process.exit));

console.log('Registering onListening handler');

server.on('listening', onListening(server, debug));
