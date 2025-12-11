const SocketIO = require('socket.io');
const expect = require('chai').expect;
const http = require('http');
const Socket = require('../../../../app/socket');

describe('socket', () => {
  let server;

  const MOCK_REDIS = {
    duplicated: false,
    duplicate: () => {
      MOCK_REDIS.duplicated = true;
      return MOCK_REDIS;
    },
    psubscribe: () => {},
    on: () => {}
  };

  beforeEach(() => {
    // Create a real HTTP server for Socket.IO to attach to
    server = http.createServer((req, res) => res.end());
  });

  afterEach((done) => {
    MOCK_REDIS.duplicated = false;
    // Close the server to avoid handle leaks
    if (server && server.close) {
      server.close(() => done());
    } else {
      done();
    }
  });

  it('should be appropriately initialised', () => {
    const socket = Socket(server, MOCK_REDIS);
    expect(socket).not.to.be.undefined;
    expect(socket.socketServer).to.be.instanceOf(SocketIO.Server);
    expect(socket.activityService).to.be.an('object');
    expect(socket.activityService.redis).to.equal(MOCK_REDIS);
    expect(socket.handlers).to.be.an('object');
    expect(socket.handlers.activityService).to.equal(socket.activityService);
    expect(socket.handlers.socketServer).to.equal(socket.socketServer);
    expect(MOCK_REDIS.duplicated).to.be.true;
  });
});
// ...existing code...