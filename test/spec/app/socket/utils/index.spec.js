const expect = require('chai').expect;
const sandbox = require("sinon").createSandbox();
const utils = require('../../../../../app/socket/utils');

describe('socket.utils', () => {

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

  describe('log', () => {
    it('should output string payload', () => {
      const logs = [];
      const logTo = (str) => {
        logs.push(str);
      };
      const SOCKET = { id: 'Are' };
      const PAYLOAD = 'entertained?';
      const GROUP = 'you not';
      utils.log(SOCKET, PAYLOAD, GROUP, logTo);
      expect(logs).to.have.lengthOf(1);
      expect(logs[0]).to.include(`| Are | you not => entertained?`);
    });
    it('should output object payload', () => {
      const logs = [];
      const logTo = (str) => {
        logs.push(str);
      };
      const SOCKET = { id: 'Are' };
      const PAYLOAD = { sufficiently: 'entertained?' };
      const GROUP = 'you not';
      utils.log(SOCKET, PAYLOAD, GROUP, logTo);
      expect(logs).to.have.lengthOf(2);
      expect(logs[0]).to.include(`| Are | you not`);
      expect(logs[1]).to.equal(PAYLOAD);
    });
  });

  describe('score', () => {
    it('should handle a string TTL', () => {
      const TTL = '12';
      const NOW = 55;
      sandbox.stub(Date, 'now').returns(NOW);
      const score = utils.score(TTL);
      expect(score).to.equal(12055); // (TTL * 1000) + NOW
    });
    it('should handle a numeric TTL', () => {
      const TTL = 13;
      const NOW = 55;
      sandbox.stub(Date, 'now').returns(NOW);
      const score = utils.score(TTL);
      expect(score).to.equal(13055); // (TTL * 1000) + NOW
    });
    it('should handle a null TTL', () => {
      const TTL = null;
      const NOW = 55;
      sandbox.stub(Date, 'now').returns(NOW);
      const score = utils.score(TTL);
      expect(score).to.equal(55); // null TTL => 0
    });

    afterEach(() => {
      // completely restore all fakes created through the sandbox
      sandbox.restore();
    });
  });

  describe('toUser', () => {
    it('should handle a null object', () => {
      const OBJ = null;
      const user = utils.toUser(OBJ);
      expect(user).to.deep.equal({});
    });
    it('should handle a valid object', () => {
      const OBJ = { id: 'bob', name: 'Bob Smith' };
      const user = utils.toUser(OBJ);
      expect(user.uid).to.equal(OBJ.id);
      expect(user.name).to.equal(OBJ.name);
      expect(user.given_name).to.equal('Bob');
      expect(user.family_name).to.equal('Smith');
      expect(user.sub).to.equal('Bob.Smith@mailinator.com');
    });
    it('should handle a valid object with a long name', () => {
      const OBJ = { id: 'ddl', name: 'Daniel Day Lewis' };
      const user = utils.toUser(OBJ);
      expect(user.uid).to.equal(OBJ.id);
      expect(user.name).to.equal(OBJ.name);
      expect(user.given_name).to.equal('Daniel');
      expect(user.family_name).to.equal('Day Lewis');
      expect(user.sub).to.equal('Daniel.Day-Lewis@mailinator.com');
    });
  });

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

  describe('get', () => {
    it('should be appropriately set up', () => {
      expect(utils.get).to.equal(require('../../../../../app/socket/utils/get'));
    });
  });
  describe('remove', () => {
    it('should be appropriately set up', () => {
      expect(utils.remove).to.equal(require('../../../../../app/socket/utils/remove'));
    });
  });
  describe('store', () => {
    it('should be appropriately set up', () => {
      expect(utils.store).to.equal(require('../../../../../app/socket/utils/store'));
    });
  });
  describe('watch', () => {
    it('should be appropriately set up', () => {
      expect(utils.watch).to.equal(require('../../../../../app/socket/utils/watch'));
    });
  });

});
