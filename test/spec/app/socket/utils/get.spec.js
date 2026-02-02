const expect = require('chai').expect;
const get = require('../../../../../app/socket/utils/get');
const keys = require('../../../../../app/socket/redis/keys');

describe('socket.utils', () => {

  describe('get', () => {

    describe('caseActivities', () => {
      it('should get the correct result for a single case being viewed', () => {
        const CASE_IDS = ['1'];
        const ACTIVITY = 'view';
        const NOW = 999;
        const pipes = get.caseActivities(CASE_IDS, ACTIVITY, NOW);
        expect(pipes).to.be.an('array').and.have.lengthOf(1);
        expect(pipes[0]).to.be.an('array').and.have.lengthOf(4);
        expect(pipes[0][0]).to.equal('zrangebyscore');
        expect(pipes[0][1]).to.equal(keys.case.view(CASE_IDS[0]));
        expect(pipes[0][2]).to.equal(NOW);
        expect(pipes[0][3]).to.equal('+inf');
      });
      it('should get the correct result for a multiple cases being viewed', () => {
        const CASE_IDS = ['1', '8', '2345678', 'x'];
        const ACTIVITY = 'view';
        const NOW = 999;
        const pipes = get.caseActivities(CASE_IDS, ACTIVITY, NOW);
        expect(pipes).to.be.an('array').and.have.lengthOf(CASE_IDS.length);
        CASE_IDS.forEach((id, index) => {
          expect(pipes[index]).to.be.an('array').and.have.lengthOf(4);
          expect(pipes[index][0]).to.equal('zrangebyscore');
          expect(pipes[index][1]).to.equal(keys.case.view(id));
          expect(pipes[index][2]).to.equal(NOW);
          expect(pipes[index][3]).to.equal('+inf');
        });
      });
      it('should handle a null case ID for cases being viewed', () => {
        const CASE_IDS = ['1', '8', null, 'x'];
        const ACTIVITY = 'view';
        const NOW = 999;
        const pipes = get.caseActivities(CASE_IDS, ACTIVITY, NOW);
        expect(pipes).to.be.an('array').and.have.lengthOf(CASE_IDS.length - 1);
        let pipeIndex = 0;
        CASE_IDS.forEach((id) => {
          if (id !== null) {
            expect(pipes[pipeIndex]).to.be.an('array').and.have.lengthOf(4);
            expect(pipes[pipeIndex][0]).to.equal('zrangebyscore');
            expect(pipes[pipeIndex][1]).to.equal(keys.case.view(id));
            expect(pipes[pipeIndex][2]).to.equal(NOW);
            expect(pipes[pipeIndex][3]).to.equal('+inf');
            pipeIndex++;
          }
        });
      });
      it('should handle a null case ID for cases being edited', () => {
        const CASE_IDS = ['1', '8', null, 'x'];
        const ACTIVITY = 'edit';
        const NOW = 999;
        const pipes = get.caseActivities(CASE_IDS, ACTIVITY, NOW);
        expect(pipes).to.be.an('array').and.have.lengthOf(CASE_IDS.length - 1);
        let pipeIndex = 0;
        CASE_IDS.forEach((id) => {
          if (id !== null) {
            expect(pipes[pipeIndex]).to.be.an('array').and.have.lengthOf(4);
            expect(pipes[pipeIndex][0]).to.equal('zrangebyscore');
            expect(pipes[pipeIndex][1]).to.equal(keys.case.edit(id));
            expect(pipes[pipeIndex][2]).to.equal(NOW);
            expect(pipes[pipeIndex][3]).to.equal('+inf');
            pipeIndex++;
          }
        });
      });
      it('should handle a null array of case IDs', () => {
        const CASE_IDS = null;
        const ACTIVITY = 'view';
        const NOW = 999;
        const pipes = get.caseActivities(CASE_IDS, ACTIVITY, NOW);
        expect(pipes).to.be.an('array').and.have.lengthOf(0);
      });
      it('should handle an invalid activity type', () => {
        const CASE_IDS = ['1', '8', '2345678', 'x'];
        const ACTIVITY = 'bob';
        const NOW = 999;
        const pipes = get.caseActivities(CASE_IDS, ACTIVITY, NOW);
        expect(pipes).to.be.an('array').and.have.lengthOf(0);
      });
    });

    describe('users', () => {
      it('should get the correct result for a single user ID', () => {
        const USER_IDS = ['1'];
        const pipes = get.users(USER_IDS);
        expect(pipes).to.be.an('array').and.have.lengthOf(1);
        expect(pipes[0]).to.be.an('array').and.have.lengthOf(2);
        expect(pipes[0][0]).to.equal('get');
        expect(pipes[0][1]).to.equal(keys.user(USER_IDS[0]));
      });
      it('should get the correct result for multiple user IDs', () => {
        const USER_IDS = ['1', '8', '2345678', 'x'];
        const pipes = get.users(USER_IDS);
        expect(pipes).to.be.an('array').and.have.lengthOf(USER_IDS.length);
        expect(pipes[0]).to.be.an('array').and.have.lengthOf(2);
        USER_IDS.forEach((id, index) => {
          expect(pipes[index][0]).to.equal('get');
          expect(pipes[index][1]).to.equal(keys.user(id));
        });
      });
      it('should handle a null user ID', () => {
        const USER_IDS = ['1', '8', null, 'x'];
        const pipes = get.users(USER_IDS);
        expect(pipes).to.be.an('array').and.have.lengthOf(USER_IDS.length - 1);
        expect(pipes[0]).to.be.an('array').and.have.lengthOf(2);
        let pipeIndex = 0;
        USER_IDS.forEach((id) => {
          if (id) {
            expect(pipes[pipeIndex][0]).to.equal('get');
            expect(pipes[pipeIndex][1]).to.equal(keys.user(id));
            pipeIndex++;
          }
        });
      });
      it('should handle a null array of user IDs', () => {
        const USER_IDS = null;
        const pipes = get.users(USER_IDS);
        expect(pipes).to.be.an('array').and.have.lengthOf(0);
      });
    });

  });

});
