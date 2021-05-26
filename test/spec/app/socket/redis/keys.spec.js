const expect = require('chai').expect;
const redisActivityKeys = require('../../../../../app/socket/redis/keys');

describe('socket.redis.keys', () => {

  it('should get the correct key for viewing a case', () => {
    const CASE_ID = '12345678';
    expect(redisActivityKeys.view(CASE_ID)).to.equal(`case:${CASE_ID}:viewers`);
  });

  it('should get the correct key for editing a case', () => {
    const CASE_ID = '12345678';
    expect(redisActivityKeys.edit(CASE_ID)).to.equal(`case:${CASE_ID}:editors`);
  });

  it('should get the correct base key for a case', () => {
    const CASE_ID = '12345678';
    expect(redisActivityKeys.baseCase(CASE_ID)).to.equal(`case:${CASE_ID}`);
  });

  it('should get the correct key for a user', () => {
    const USER_ID = 'abcdef123456';
    expect(redisActivityKeys.user(USER_ID)).to.equal(`user:${USER_ID}`);
  });

  it('should get the correct key for a socket', () => {
    const SOCKET_ID = 'zyxwvu987654';
    expect(redisActivityKeys.socket(SOCKET_ID)).to.equal(`socket:${SOCKET_ID}`);
  });

});
