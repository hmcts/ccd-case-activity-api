const expect = require('chai').expect;
const keys = require('../../../../../app/socket/redis/keys');
const pubSub = require('../../../../../app/socket/redis/pub-sub')();

describe('socket.redis.pub-sub', () => {
  const MOCK_SUBSCRIBER = {
    patterns: [],
    events: {},
    psubscribe: (pattern) => {
      if (!MOCK_SUBSCRIBER.patterns.includes(pattern)) {
        MOCK_SUBSCRIBER.patterns.push(pattern);
      }
    },
    on: (event, eventHandler) => {
      MOCK_SUBSCRIBER.events[event] = eventHandler;
    },
    dispatch: (event, channel, message) => {
      const handler = MOCK_SUBSCRIBER.events[event];
      if (handler) {
        handler(MOCK_SUBSCRIBER.patterns[0], channel, message);
      }
    }
  };
  const MOCK_NOTIFIER = {
    messages: [],
    notify: (message) => {
      MOCK_NOTIFIER.messages.push(message);
    }
  };

  afterEach(() => {
    MOCK_SUBSCRIBER.patterns.length = 0;
    MOCK_SUBSCRIBER.events = {};
    MOCK_NOTIFIER.messages.length = 0;
  });

  describe('init', () => {
    it('should handle a null subscription client', () => {
      pubSub.init(null, MOCK_NOTIFIER.notify);
      expect(MOCK_SUBSCRIBER.patterns).to.have.lengthOf(0);
      expect(MOCK_SUBSCRIBER.events).to.deep.equal({})
    });
    it('should handle a null caseNotifier', () => {
      pubSub.init(MOCK_SUBSCRIBER, null);
      expect(MOCK_SUBSCRIBER.patterns).to.have.lengthOf(0);
      expect(MOCK_SUBSCRIBER.events).to.deep.equal({})
    });
    it('should handle appropriate parameters', () => {
      pubSub.init(MOCK_SUBSCRIBER, MOCK_NOTIFIER.notify);
      expect(MOCK_SUBSCRIBER.patterns).to.have.lengthOf(1)
        .and.to.include(`${keys.prefixes.case}:*`);
      expect(MOCK_SUBSCRIBER.events.pmessage).to.be.a('function');
      expect(MOCK_NOTIFIER.messages).to.have.lengthOf(0);
    });
    it('should call the caseNotifier when the correct event is received', () => {
      pubSub.init(MOCK_SUBSCRIBER, MOCK_NOTIFIER.notify);
      const CASE_ID = '1234567890';
      expect(MOCK_NOTIFIER.messages).to.have.lengthOf(0);
      MOCK_SUBSCRIBER.dispatch('pmessage', `${keys.prefixes.case}:${CASE_ID}`, new Date().toISOString());
      expect(MOCK_NOTIFIER.messages).to.have.lengthOf(1);
      expect(MOCK_NOTIFIER.messages[0]).to.equal(CASE_ID);
    });
  });

});
