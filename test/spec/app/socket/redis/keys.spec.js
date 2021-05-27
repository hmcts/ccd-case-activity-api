const keys = require('../../../../../app/socket/redis/keys');
const expect = require('chai').expect;

describe('socket.redis.keys', () => {

  it('should get the correct key for viewing a case', () => {
    const CASE_ID = '12345678';
    expect(keys.case.view(CASE_ID)).to.equal(`${keys.prefixes.case}:${CASE_ID}:viewers`);
  });

  it('should get the correct key for editing a case', () => {
    const CASE_ID = '12345678';
    expect(keys.case.edit(CASE_ID)).to.equal(`${keys.prefixes.case}:${CASE_ID}:editors`);
  });

  it('should get the correct base key for a case', () => {
    const CASE_ID = '12345678';
    expect(keys.case.base(CASE_ID)).to.equal(`${keys.prefixes.case}:${CASE_ID}`);
  });

  it('should get the correct key for a user', () => {
    const USER_ID = 'abcdef123456';
    expect(keys.user(USER_ID)).to.equal(`${keys.prefixes.user}:${USER_ID}`);
  });

  it('should get the correct key for a socket', () => {
    const SOCKET_ID = 'zyxwvu987654';
    expect(keys.socket(SOCKET_ID)).to.equal(`${keys.prefixes.socket}:${SOCKET_ID}`);
  });

});
