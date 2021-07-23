const SocketIO = require('socket.io');
const expect = require('chai').expect;
const Socket = require('../../../../app/socket');

describe('socket', () => {
  const MOCK_SERVER = {};
  const MOCK_REDIS = {};
  it('should be appropriately initialised', () => {
    const socket = Socket(MOCK_SERVER, MOCK_REDIS);
    expect(socket).not.to.be.undefined;
    expect(socket.socketServer).to.be.instanceOf(SocketIO.Server);
    expect(socket.activityService).to.be.an('object');
    expect(socket.activityService.redis).to.equal(MOCK_REDIS);
    expect(socket.handlers).to.be.an('object');
    expect(socket.handlers.activityService).to.equal(socket.activityService);
    expect(socket.handlers.socketServer).to.equal(socket.socketServer);
  })
});