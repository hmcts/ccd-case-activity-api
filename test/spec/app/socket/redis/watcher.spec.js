const config = require('config');
const expect = require('chai').expect;
const Redis = require('ioredis');

describe('socket.redis.watcher', () => {
  it('should instantiate a Redis client', () => {
    const watcher = require('../../../../../app/socket/redis/watcher');
    expect(watcher).to.be.instanceOf(Redis);
    expect(watcher.options.port).to.equal(config.get('redis.port'));
    expect(watcher.options.host).to.equal(config.get('redis.host'));
  });
});