const keys = require('../../../../../app/socket/redis/keys');
const ActivityService = require('../../../../../app/socket/service/activity-service');
const expect = require('chai').expect;
const sandbox = require("sinon").createSandbox();

describe('socket.service.activity-service', () => {
  // An instance that can be tested.
  let activityService;

  const USER_ID = 'a';
  const CASE_ID = '1234567890';
  const TTL_USER = 20;
  const TTL_ACTIVITY = 99;
  const MOCK_CONFIG = {
    getCalls: [],
    keys: {
      'redis.socket.activityTtlSec': TTL_ACTIVITY,
      'redis.socket.userDetailsTtlSec': TTL_USER
    },
    get: (key) => {
      MOCK_CONFIG.getCalls.push(key);
      return MOCK_CONFIG.keys[key];
    }
  };
  const MOCK_REDIS = {
    messages: [],
    gets: [],
    pipelines: [],
    pipelineFailureLogs: [],
    pipelineMode: undefined,
    publish: (channel, message) => {
      MOCK_REDIS.messages.push({ channel, message });
    },
    get: (key) => {
      MOCK_REDIS.gets.push(key);
      return JSON.stringify({
        activityKey: keys.case.view(CASE_ID),
        caseId: CASE_ID,
        userId: USER_ID
      });
    },
    pipeline: (pipes) => {
      MOCK_REDIS.pipelines.push(pipes);
      let result = null;
      let execResult = null;
      switch (MOCK_REDIS.pipelineMode) {
        case 'get':
          if (MOCK_REDIS.isUserGet(pipes)) {
            execResult = MOCK_REDIS.userPipeline(pipes);
          } else {
            execResult = MOCK_REDIS.casePipeline(pipes);
          }
          break;
        case 'socket':
          execResult = CASE_ID;
          break;
        case 'user':
          execResult = MOCK_REDIS.userPipeline(pipes);
          break;
      }
      return {
        exec: () => {
          return execResult;
        }
      };
    },
    casePipeline: (pipes) => {
      return pipes.map((pipe) => {
        // ['zrangebyscore', keys.case[activity](id), now, '+inf'];
        const id = pipe[1].replace(`${keys.prefixes.case}:`, '');
        return [null, [USER_ID, 'MISSING']];
      });
    },
    userPipeline: (pipes) => {
      return pipes.map((pipe) => {
        const id = pipe[1].replace(`${keys.prefixes.user}:`, '');
        if (id === 'MISSING') {
          return [null, null];
        }
        return [null, JSON.stringify({ id, forename: `Bob ${id.toUpperCase()}`, surname: 'Smith' })];
      });
    },
    logPipelineFailures: (result, message) => {
      MOCK_REDIS.pipelineFailureLogs.push({ result, message });
    },
    isUserGet: (pipes) => {
      if (pipes.length > 0) {
        return pipes[0][0] === 'get';
      }
      return false;
    }
  };

  beforeEach(() => {
    activityService = ActivityService(MOCK_CONFIG, MOCK_REDIS);
  });

  afterEach(async () => {
    MOCK_CONFIG.getCalls.length = 0;
    MOCK_REDIS.messages.length = 0;
    MOCK_REDIS.gets.length = 0;
    MOCK_REDIS.pipelines.length = 0;
    MOCK_REDIS.pipelineMode = undefined;
    MOCK_REDIS.pipelineFailureLogs.length = 0;
  });

  it('should have appropriately initialised from the config', () => {
    expect(MOCK_CONFIG.getCalls).to.include('redis.socket.activityTtlSec');
    expect(activityService.ttl.activity).to.equal(TTL_ACTIVITY);
    expect(MOCK_CONFIG.getCalls).to.include('redis.socket.userDetailsTtlSec');
    expect(activityService.ttl.user).to.equal(TTL_USER);
  });

  describe('notifyChange', () => {
    it('should broadcast via redis that there is a change to a case', () => {
      const NOW = Date.now();
      activityService.notifyChange(CASE_ID);
      expect(MOCK_REDIS.messages).to.have.lengthOf(1);
      expect(MOCK_REDIS.messages[0].channel).to.equal(keys.case.base(CASE_ID));
      const messageTS = parseInt(MOCK_REDIS.messages[0].message, 10);
      expect(messageTS).to.be.approximately(NOW, 5); // Within 5ms.
    });
    it('should handle a null caseId', () => {
      activityService.notifyChange(null);
      expect(MOCK_REDIS.messages).to.have.lengthOf(0); // Should have been no broadcast.
    });
  });

  describe('getSocketActivity', () => {
    it('should appropriately get socket activity', async () => {
      const SOCKET_ID = 'abcdef123456';
      const activity = await activityService.getSocketActivity(SOCKET_ID);
      expect(MOCK_REDIS.gets).to.have.lengthOf(1);
      expect(MOCK_REDIS.gets[0]).to.equal(keys.socket(SOCKET_ID));
      expect(activity).to.be.an('object');
      expect(activity.activityKey).to.equal(keys.case.view(CASE_ID)); // Just our mock response.
    });
    it('should handle a null caseId', async () => {
      const SOCKET_ID = null;
      const activity = await activityService.getSocketActivity(SOCKET_ID);
      expect(MOCK_REDIS.messages).to.have.lengthOf(0); // Should have been no broadcast.
      expect(activity).to.be.null;
    });
  });

  describe('getUserDetails', () => {
    beforeEach(() => {
      MOCK_REDIS.pipelineMode = 'user';
    });

    it('should appropriately get user details', async () => {
      const USER_IDS = ['a', 'b'];
      const userDetails = await activityService.getUserDetails(USER_IDS);
      expect(MOCK_REDIS.pipelines).to.have.lengthOf(1);
      const pipes = MOCK_REDIS.pipelines[0];
      expect(pipes).to.be.an('array').and.have.lengthOf(USER_IDS.length);
      USER_IDS.forEach((id, index) => {
        const user = userDetails[id];
        expect(user).to.be.an('object');
        expect(user.forename).to.be.a('string');
        expect(user.surname).to.be.a('string');

        expect(pipes[index]).to.be.an('array')
          .and.to.have.lengthOf(2)
          .and.to.contain('get')
          .and.to.contain(keys.user(id));
      });
    });
    it('should handle null userIds', async () => {
      const USER_IDS = null;
      const userDetails = await activityService.getUserDetails(USER_IDS);
      expect(MOCK_REDIS.pipelines).to.have.lengthOf(0); // Should have been no calls to redis.
      expect(userDetails).to.deep.equal({});
    });
    it('should handle empty userIds', async () => {
      const USER_IDS = [];
      const userDetails = await activityService.getUserDetails(USER_IDS);
      expect(MOCK_REDIS.pipelines).to.have.lengthOf(0); // Should have been no calls to redis.
      expect(userDetails).to.deep.equal({});
    });
    it('should handle a missing user', async () => {
      const USER_IDS = ['a', 'b', 'MISSING'];
      const userDetails = await activityService.getUserDetails(USER_IDS);
      expect(MOCK_REDIS.pipelines).to.have.lengthOf(1);
      const pipes = MOCK_REDIS.pipelines[0];
      expect(pipes).to.be.an('array').and.have.lengthOf(USER_IDS.length);
      USER_IDS.forEach((id, index) => {
        if (id === 'MISSING') {
          expect(userDetails[id]).to.be.undefined;
        } else {
          const user = userDetails[id];
          expect(user).to.be.an('object');
          expect(user.forename).to.be.a('string');
          expect(user.surname).to.be.a('string');
        }
        expect(pipes[index]).to.be.an('array')
          .and.to.have.lengthOf(2)
          .and.to.contain('get')
          .and.to.contain(keys.user(id));
      });
    });
    it('should handle a null userId', async () => {
      const USER_IDS = ['a', 'b', null];
      const userDetails = await activityService.getUserDetails(USER_IDS);
      expect(MOCK_REDIS.pipelines).to.have.lengthOf(1);
      const pipes = MOCK_REDIS.pipelines[0];
      // Should not have tried to retrieve the null user at all.
      expect(pipes).to.be.an('array').and.have.lengthOf(USER_IDS.length - 1);
      let userIndex = 0;
      USER_IDS.forEach((id) => {
        if (id) {
          const user = userDetails[id];
          expect(user).to.be.an('object');
          expect(user.forename).to.be.a('string');
          expect(user.surname).to.be.a('string');

          expect(pipes[userIndex]).to.be.an('array')
            .and.to.have.lengthOf(2)
            .and.to.contain('get')
            .and.to.contain(keys.user(id));
          userIndex++;
        }
      });
    });
  });

  describe('removeSocketActivity', () => {
    beforeEach(() => {
      MOCK_REDIS.pipelineMode = 'socket';
    });

    it('should appropriately remove socket activity', async () => {
      const NOW = Date.now();
      const SOCKET_ID = 'abcdef123456';
      await activityService.removeSocketActivity(SOCKET_ID);
      expect(MOCK_REDIS.pipelines).to.have.lengthOf(1);
      const pipes = MOCK_REDIS.pipelines[0];
      expect(pipes).to.be.an('array').with.a.lengthOf(2);
      // First one should be to remove the user activity.
      expect(pipes[0]).to.be.an('array').with.a.lengthOf(3)
        .and.to.contain('zrem')
        .and.to.contain(keys.case.view(CASE_ID))
        .and.to.contain(USER_ID);
      // Second one should be to remove the socket entry.
      expect(pipes[1]).to.be.an('array').with.a.lengthOf(2)
        .and.to.contain('del')
        .and.to.contain(keys.socket(SOCKET_ID));

      // Should have also notified about the change.
      expect(MOCK_REDIS.messages).to.have.lengthOf(1);
      expect(MOCK_REDIS.messages[0].channel).to.equal(keys.case.base(CASE_ID));
      const messageTS = parseInt(MOCK_REDIS.messages[0].message, 10);
      expect(messageTS).to.be.approximately(NOW, 5); // Within 5ms.
    });
    it('should handle a null socketId', async () => {
      await activityService.removeSocketActivity(null);
      expect(MOCK_REDIS.pipelines).to.have.lengthOf(0); // Should have been no calls to redis.
    });
  });

  describe('addActivity', () => {
    const DATE_NOW = 55;

    beforeEach(() => {
      MOCK_REDIS.pipelineMode = 'add';
      sandbox.stub(Date, 'now').returns(DATE_NOW);
    });

    afterEach(() => {
      // completely restore all fakes created through the sandbox
      sandbox.restore();
    });

    it('should appropriately add view activity', async () => {
      const NOW = Date.now();
      const USER = { uid: USER_ID, given_name: 'Joe', family_name: 'Bloggs' };
      const SOCKET_ID = 'abcdef123456';
      await activityService.addActivity(CASE_ID, USER, SOCKET_ID, 'view');
      expect(MOCK_REDIS.pipelines).to.have.lengthOf(2);
      const removePipes = MOCK_REDIS.pipelines[0];
      expect(removePipes).to.be.an('array').with.a.lengthOf(2); // Remove

      const pipes = MOCK_REDIS.pipelines[1];
      // First one should be to add the user activity.
      expect(pipes[0]).to.be.an('array').with.a.lengthOf(4)
        .and.to.contain('zadd')
        .and.to.contain(keys.case.view(CASE_ID))
        .and.to.contain(DATE_NOW + TTL_ACTIVITY * 1000) // TTL + NOW
        .and.to.contain(USER_ID);
      // Second one should be to add the socket entry.
      expect(pipes[1]).to.be.an('array').with.a.lengthOf(5)
        .and.to.contain('set')
        .and.to.contain(keys.socket(SOCKET_ID))
        .and.to.contain(`{"activityKey":"${keys.case.view(CASE_ID)}","caseId":"${CASE_ID}","userId":"${USER_ID}"}`)
        .and.to.contain('EX')
        .and.to.contain(TTL_USER);
      // Third one should be to set the user details.
      expect(pipes[2]).to.be.an('array').with.a.lengthOf(5)
        .and.to.contain('set')
        .and.to.contain(keys.user(USER_ID))
        .and.to.contain(`{"id":"${USER_ID}","forename":"Joe","surname":"Bloggs"}`)
        .and.to.contain('EX')
        .and.to.contain(TTL_USER);

      // Should have also notified about the change.
      expect(MOCK_REDIS.messages).to.have.lengthOf(1);
      expect(MOCK_REDIS.messages[0].channel).to.equal(keys.case.base(CASE_ID));
      const messageTS = parseInt(MOCK_REDIS.messages[0].message, 10);
      expect(messageTS).to.be.approximately(NOW, 5); // Within 5ms.
    });
    it('should notifications about both removed and added cases', async () => {
      const NOW = Date.now();
      const USER = { uid: USER_ID, given_name: 'Joe', family_name: 'Bloggs' };
      const SOCKET_ID = 'abcdef123456';
      const NEW_CASE_ID = '0987654321';
      await activityService.addActivity(NEW_CASE_ID, USER, SOCKET_ID, 'view');

      // Should have been two notifictions...
      expect(MOCK_REDIS.messages).to.have.lengthOf(2);
      // ... firstly about the original case.
      expect(MOCK_REDIS.messages[0].channel).to.equal(keys.case.base(CASE_ID));
      // ... and then about the new case.
      expect(MOCK_REDIS.messages[1].channel).to.equal(keys.case.base(NEW_CASE_ID));
    });
    it('should handle a null caseId', async () => {
      const USER = { uid: USER_ID };
      const SOCKET_ID = 'abcdef123456';
      await activityService.addActivity(null, USER, SOCKET_ID, 'view');
      expect(MOCK_REDIS.pipelines).to.have.lengthOf(0); // Should have been no calls to redis.
    });
    it('should handle a null user', async () => {
      const SOCKET_ID = 'abcdef123456';
      await activityService.addActivity(CASE_ID, null, SOCKET_ID, 'view');
      expect(MOCK_REDIS.pipelines).to.have.lengthOf(0); // Should have been no calls to redis.
    });
    it('should handle a null socketId', async () => {
      const USER = { uid: USER_ID };
      await activityService.addActivity(CASE_ID, USER, null, 'view');
      expect(MOCK_REDIS.pipelines).to.have.lengthOf(0); // Should have been no calls to redis.
    });
    it('should handle a null activity', async () => {
      const USER = { uid: USER_ID };
      const SOCKET_ID = 'abcdef123456';
      await activityService.addActivity(CASE_ID, USER, SOCKET_ID, null);
      expect(MOCK_REDIS.pipelines).to.have.lengthOf(0); // Should have been no calls to redis.
    });
  });

  describe('getActivityForCases', () => {
    const DATE_NOW = 55;

    beforeEach(() => {
      MOCK_REDIS.pipelineMode = 'get';
      sandbox.stub(Date, 'now').returns(DATE_NOW);
    });

    afterEach(() => {
      // completely restore all fakes created through the sandbox
      sandbox.restore();
    });

    it('should appropriately get case activity', async () => {
      const CASE_IDS = ['1234567890','0987654321'];
      const result = await activityService.getActivityForCases(CASE_IDS);
      expect(result).to.be.an('array').with.a.lengthOf(CASE_IDS.length);
      CASE_IDS.forEach((id, index) => {
        expect(result[index]).to.be.an('object');
        expect(result[index].caseId).to.equal(id);
        expect(result[index].viewers).to.be.an('array').with.a.lengthOf(1);
        expect(result[index].viewers[0]).to.be.an('object');
        expect(result[index].viewers[0].forename).to.equal(`Bob ${USER_ID.toUpperCase()}`);
        expect(result[index].unknownViewers).to.equal(1); // 'MISSING' id.
        expect(result[index].editors).to.be.an('array').with.a.lengthOf(1);
        expect(result[index].editors[0]).to.be.an('object');
        expect(result[index].unknownEditors).to.equal(1); // 'MISSING' id.
        expect(result[index].editors[0].forename).to.equal(`Bob ${USER_ID.toUpperCase()}`);
      });
    });
    it('should handle null caseIds', async () => {
      const result = await activityService.getActivityForCases(null);
      expect(result).to.be.an('array').with.a.lengthOf(0);
      expect(MOCK_REDIS.pipelines).to.have.lengthOf(0); // Should have been no calls to redis.
    });
    it('should handle empty caseIds', async () => {
      const result = await activityService.getActivityForCases([]);
      expect(result).to.be.an('array').with.a.lengthOf(0);
      expect(MOCK_REDIS.pipelines).to.have.lengthOf(0); // Should have been no calls to redis.
    });
  });

});
