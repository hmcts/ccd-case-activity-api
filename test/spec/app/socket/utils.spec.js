const expect = require('chai').expect;
const utils = require('../../../../app/socket/utils');
const redisActivityKeys = require('../../../../app/socket/redis-keys');

describe('socket.utils', () => {

  describe('toUserString', () => {
    it('should handle a null user', () => {
      expect(utils.toUserString(null)).to.equal('{}');
    });
    it('should handle an undefined user', () => {
      expect(utils.toUserString(undefined)).to.equal('{}');
    });
    it('should handle an empty user', () => {
      expect(utils.toUserString({})).to.equal('{}');
    });
    it('should handle a full user', () => {
      const USER = {
        uid: '1234567890',
        given_name: 'Bob',
        family_name: 'Smith'
      };
      expect(utils.toUserString(USER)).to.equal('{"id":"1234567890","forename":"Bob","surname":"Smith"}');
    });
    it('should handle a user with a missing family name', () => {
      const USER = {
        uid: '1234567890',
        given_name: 'Bob'
      };
      expect(utils.toUserString(USER)).to.equal('{"id":"1234567890","forename":"Bob"}');
    });
    it('should handle a user with a missing given name', () => {
      const USER = {
        uid: '1234567890',
        family_name: 'Smith'
      };
      expect(utils.toUserString(USER)).to.equal('{"id":"1234567890","surname":"Smith"}');
    });
    it('should handle a user with a missing name', () => {
      const USER = {
        uid: '1234567890'
      };
      expect(utils.toUserString(USER)).to.equal('{"id":"1234567890"}');
    });
  });

  describe('extractUniqueUserIds', () => {
    it('should handle a null result', () => {
      const RESULT = null;
      const UNIQUE = ['a'];
      const IDS = utils.extractUniqueUserIds(RESULT, UNIQUE);
      expect(IDS).to.be.an('array')
        .that.has.lengthOf(1)
        .and.that.includes('a');
    });
    it('should handle a result of the wrong type', () => {
      const RESULT = 'bob';
      const UNIQUE = ['a'];
      const IDS = utils.extractUniqueUserIds(RESULT, UNIQUE);
      expect(IDS).to.be.an('array')
        .that.has.lengthOf(1)
        .and.that.includes('a');
    });
    it('should handle a result with the wrong structure', () => {
      const RESULT = [
        ['bob'],
        ['fred']
      ];
      const UNIQUE = ['a'];
      const IDS = utils.extractUniqueUserIds(RESULT, UNIQUE);
      expect(IDS).to.be.an('array')
        .that.has.lengthOf(1)
        .and.that.includes('a');
    });
    it('should handle a result containing nulls', () => {
      const RESULT = [
        ['bob', ['b']],
        ['fred', null]
      ];
      const UNIQUE = ['a'];
      const IDS = utils.extractUniqueUserIds(RESULT, UNIQUE);
      expect(IDS).to.be.an('array')
        .that.has.lengthOf(2)
        .and.that.includes('a')
        .and.that.includes('b');
    });
    it('should handle a result with the correct structure', () => {
      const RESULT = [
        ['bob', ['b', 'g']],
        ['fred', ['f']]
      ];
      const UNIQUE = ['a'];
      const IDS = utils.extractUniqueUserIds(RESULT, UNIQUE);
      expect(IDS).to.be.an('array').that.has.lengthOf(4)
        .and.that.includes('a')
        .and.that.includes('b')
        .and.that.includes('f')
        .and.that.includes('g');
    });
    it('should handle a result with the correct structure but a null original array', () => {
      const RESULT = [
        ['bob', ['b', 'g']],
        ['fred', ['f']]
      ];
      const UNIQUE = null;
      const IDS = utils.extractUniqueUserIds(RESULT, UNIQUE);
      expect(IDS).to.be.an('array').that.has.lengthOf(3)
        .and.that.includes('b')
        .and.that.includes('f')
        .and.that.includes('g');
    });
    it('should handle a result with the correct structure but an original array of the wrong type', () => {
      const RESULT = [
        ['bob', ['b', 'g']],
        ['fred', ['f']]
      ];
      const UNIQUE = 'a';
      const IDS = utils.extractUniqueUserIds(RESULT, UNIQUE);
      expect(IDS).to.be.an('array').that.has.lengthOf(3)
        .and.that.includes('b')
        .and.that.includes('f')
        .and.that.includes('g');
    });
    it('should strip out duplicates', () => {
      const RESULT = [
        ['bob', ['a', 'b', 'g']],
        ['fred', ['f', 'b']]
      ];
      const UNIQUE = ['a'];
      const IDS = utils.extractUniqueUserIds(RESULT, UNIQUE);
      expect(IDS).to.be.an('array')
        .and.that.includes('a')
        .and.that.includes('b')
        .and.that.includes('f')
        .and.that.includes('g')
        .but.that.has.lengthOf(4); // One of each, despite the RESULT containing an extra 'a', and 'b' twice.
    });
  });

  describe('get', () => {

    describe('caseActivities', () => {
      it('should get the correct result for a single case being viewed', () => {
        const CASE_IDS = ['1'];
        const ACTIVITY = 'view';
        const NOW = 999;
        const pipes = utils.get.caseActivities(CASE_IDS, ACTIVITY, NOW);
        expect(pipes).to.be.an('array').and.have.lengthOf(1);
        expect(pipes[0]).to.be.an('array').and.have.lengthOf(4);
        expect(pipes[0][0]).to.equal('zrangebyscore');
        expect(pipes[0][1]).to.equal(redisActivityKeys.view(CASE_IDS[0]));
        expect(pipes[0][2]).to.equal(NOW);
        expect(pipes[0][3]).to.equal('+inf');
      });
      it('should get the correct result for a multiple cases being viewed', () => {
        const CASE_IDS = ['1', '8', '2345678', 'x'];
        const ACTIVITY = 'view';
        const NOW = 999;
        const pipes = utils.get.caseActivities(CASE_IDS, ACTIVITY, NOW);
        expect(pipes).to.be.an('array').and.have.lengthOf(CASE_IDS.length);
        CASE_IDS.forEach((id, index) => {
          expect(pipes[index]).to.be.an('array').and.have.lengthOf(4);
          expect(pipes[index][0]).to.equal('zrangebyscore');
          expect(pipes[index][1]).to.equal(redisActivityKeys.view(id));
          expect(pipes[index][2]).to.equal(NOW);
          expect(pipes[index][3]).to.equal('+inf');
        });
      });
      it('should handle a null case ID for cases being viewed', () => {
        const CASE_IDS = ['1', '8', null, 'x'];
        const ACTIVITY = 'view';
        const NOW = 999;
        const pipes = utils.get.caseActivities(CASE_IDS, ACTIVITY, NOW);
        expect(pipes).to.be.an('array').and.have.lengthOf(CASE_IDS.length - 1);
        let pipeIndex = 0;
        CASE_IDS.forEach((id) => {
          if (id !== null) {
            expect(pipes[pipeIndex]).to.be.an('array').and.have.lengthOf(4);
            expect(pipes[pipeIndex][0]).to.equal('zrangebyscore');
            expect(pipes[pipeIndex][1]).to.equal(redisActivityKeys.view(id));
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
        const pipes = utils.get.caseActivities(CASE_IDS, ACTIVITY, NOW);
        expect(pipes).to.be.an('array').and.have.lengthOf(CASE_IDS.length - 1);
        let pipeIndex = 0;
        CASE_IDS.forEach((id) => {
          if (id !== null) {
            expect(pipes[pipeIndex]).to.be.an('array').and.have.lengthOf(4);
            expect(pipes[pipeIndex][0]).to.equal('zrangebyscore');
            expect(pipes[pipeIndex][1]).to.equal(redisActivityKeys.edit(id));
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
        const pipes = utils.get.caseActivities(CASE_IDS, ACTIVITY, NOW);
        expect(pipes).to.be.an('array').and.have.lengthOf(0);
      });
      it('should handle an invalid activity type', () => {
        const CASE_IDS = ['1', '8', '2345678', 'x'];
        const ACTIVITY = 'bob';
        const NOW = 999;
        const pipes = utils.get.caseActivities(CASE_IDS, ACTIVITY, NOW);
        expect(pipes).to.be.an('array').and.have.lengthOf(0);
      });
    });

    describe('users', () => {
      it('should get the correct result for a single user ID', () => {
        const USER_IDS = ['1'];
        const pipes = utils.get.users(USER_IDS);
        expect(pipes).to.be.an('array').and.have.lengthOf(1);
        expect(pipes[0]).to.be.an('array').and.have.lengthOf(2);
        expect(pipes[0][0]).to.equal('get');
        expect(pipes[0][1]).to.equal(redisActivityKeys.user(USER_IDS[0]));
      });
      it('should get the correct result for multiple user IDs', () => {
        const USER_IDS = ['1', '8', '2345678', 'x'];
        const pipes = utils.get.users(USER_IDS);
        expect(pipes).to.be.an('array').and.have.lengthOf(USER_IDS.length);
        expect(pipes[0]).to.be.an('array').and.have.lengthOf(2);
        USER_IDS.forEach((id, index) => {
          expect(pipes[index][0]).to.equal('get');
          expect(pipes[index][1]).to.equal(redisActivityKeys.user(id));
        });
      });
      it('should handle a null user ID', () => {
        const USER_IDS = ['1', '8', null, 'x'];
        const pipes = utils.get.users(USER_IDS);
        expect(pipes).to.be.an('array').and.have.lengthOf(USER_IDS.length - 1);
        expect(pipes[0]).to.be.an('array').and.have.lengthOf(2);
        let pipeIndex = 0;
        USER_IDS.forEach((id) => {
          if (id) {
            expect(pipes[pipeIndex][0]).to.equal('get');
            expect(pipes[pipeIndex][1]).to.equal(redisActivityKeys.user(id));
            pipeIndex++;
          }
        });
      });
      it('should handle a null array of user IDs', () => {
        const USER_IDS = null;
        const pipes = utils.get.users(USER_IDS);
        expect(pipes).to.be.an('array').and.have.lengthOf(0);
      });
    });

  });

});
