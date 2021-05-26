const expect = require('chai').expect;
const store = require('../../../../../app/socket/utils/store');
const redisActivityKeys = require('../../../../../app/socket/redis/keys');

describe('socket.utils', () => {

  describe('store', () => {

    describe('userActivity', () => {
      it('should produce an appopriate pipe', () => {
        const CASE_ID = '1234567890';
        const ACTIVITY_KEY = redisActivityKeys.view(CASE_ID);
        const USER_ID = 'a';
        const SCORE = 500;
        const pipe = store.userActivity(ACTIVITY_KEY, USER_ID, SCORE);
        expect(pipe).to.be.an('array').and.have.lengthOf(4);
        expect(pipe[0]).to.equal('zadd');
        expect(pipe[1]).to.equal(ACTIVITY_KEY);
        expect(pipe[2]).to.equal(SCORE);
        expect(pipe[3]).to.equal(USER_ID);
      });
    });

    describe('userDetails', () => {
      it('should produce an appopriate pipe', () => {
        const USER = { uid: 'a', given_name: 'Bob', family_name: 'Smith' };
        const TTL = 487;
        const pipe = store.userDetails(USER, TTL);
        expect(pipe).to.be.an('array').and.have.lengthOf(5);
        expect(pipe[0]).to.equal('set');
        expect(pipe[1]).to.equal(redisActivityKeys.user(USER.uid));
        expect(pipe[2]).to.equal('{"id":"a","forename":"Bob","surname":"Smith"}');
        expect(pipe[3]).to.equal('EX'); // Expires in...
        expect(pipe[4]).to.equal(TTL);  // ...487 seconds.
      });
    });

    describe('socketActivity', () => {
      it('should produce an appopriate pipe', () => {
        const CASE_ID = '1234567890';
        const SOCKET_ID = 'abcdef123456';
        const ACTIVITY_KEY = redisActivityKeys.view(CASE_ID);
        const USER_ID = 'a';
        const TTL = 487;
        const pipe = store.socketActivity(SOCKET_ID, ACTIVITY_KEY, CASE_ID, USER_ID, TTL);
        expect(pipe).to.be.an('array').and.have.lengthOf(5);
        expect(pipe[0]).to.equal('set');
        expect(pipe[1]).to.equal(redisActivityKeys.socket(SOCKET_ID));
        expect(pipe[2]).to.equal(`{"activityKey":"${ACTIVITY_KEY}","caseId":"${CASE_ID}","userId":"${USER_ID}"}`);
        expect(pipe[3]).to.equal('EX'); // Expires in...
        expect(pipe[4]).to.equal(TTL);  // ...487 seconds.
      });
    });

  });

});
