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
 */
const redis = require('./app/redis/redis-client');
require('./app/socket')(server, redis);

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port);
server.on('error', onServerError(port, console.error, process.exit));
server.on('listening', onListening(server, debug));
