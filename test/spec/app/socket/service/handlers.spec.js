const keys = require('../../../../../app/socket/redis/keys');
const Handlers = require('../../../../../app/socket/service/handlers');
const expect = require('chai').expect;


describe('socket.service.handlers', () => {
  const MOCK_ACTIVITY_SERVICE = {
    calls: [],
    getActivityForCases: async(caseIds) => {
      MOCK_ACTIVITY_SERVICE.calls.push({ method: 'getActivityForCases', params: { caseIds } });
      return caseIds.map((caseId) => {
        return {
          caseId,
          viewers: [],
          unknownViewers: 0,
          editors: [],
          unknownEditors: 0
        };
      });
    },
    removeSocketActivity: (socketId) => {

    }
  };
  const MOCK_SOCKET_SERVER = {
    messagesTo: [],
    to: (room) => {
      const messageTo = { room }
      MOCK_SOCKET_SERVER.messagesTo.push(messageTo);
      return {
        emit: (event, message) => {
          messageTo.event = event;
          messageTo.message = message;
        }
      };
    }
  };

  afterEach(async () => {
    MOCK_ACTIVITY_SERVICE.calls.length = 0;
    MOCK_SOCKET_SERVER.messagesTo.length = 0;
  });

  describe('addActivity', () => {});

  describe('notify', () => {
    let handlers;
    beforeEach(async () => {
      handlers = Handlers(MOCK_ACTIVITY_SERVICE, MOCK_SOCKET_SERVER);
    });

    it('should get activity for specified case and notify watchers', async () => {
      const CASE_ID = '1234567890';
      await handlers.notify(CASE_ID);

      // The activity service should have been called.
      expect(MOCK_ACTIVITY_SERVICE.calls).to.have.lengthOf(1);
      expect(MOCK_ACTIVITY_SERVICE.calls[0].method).to.equal('getActivityForCases');
      expect(MOCK_ACTIVITY_SERVICE.calls[0].params.caseIds).to.deep.equal([CASE_ID]);

      // The socket server should also have been called.
      expect(MOCK_SOCKET_SERVER.messagesTo).to.have.lengthOf(1);
      expect(MOCK_SOCKET_SERVER.messagesTo[0].room).to.equal(keys.baseCase(CASE_ID));
      expect(MOCK_SOCKET_SERVER.messagesTo[0].event).to.equal('activity');
      expect(MOCK_SOCKET_SERVER.messagesTo[0].message).to.be.an('array').and.to.have.lengthOf(1);
      expect(MOCK_SOCKET_SERVER.messagesTo[0].message[0].caseId).to.equal(CASE_ID);
    });
  });


});
