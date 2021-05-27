const expect = require('chai').expect;
const router = require('../../../../../app/socket/router');

describe('socket.router', () => {
  const MOCK_SOCKET_SERVER = {
    events: {},
    on: (event, eventHandler) => {
      MOCK_SOCKET_SERVER.events[event] = eventHandler;
    },
    dispatch: (event, socket) => {
      const handler = MOCK_SOCKET_SERVER.events[event];
      if (handler) {
        handler(socket);
      }
    }
  };
  const MOCK_IO_ROUTER = {
    events: {},
    attachments: [],
    on: (event, eventHandler) => {
      MOCK_IO_ROUTER.events[event] = eventHandler;
    },
    attach: (socket, packet, next) => {
      MOCK_IO_ROUTER.attachments.push({ socket, packet, next });
    },
    dispatch: (event, socket, ctx, next) => {
      const handler = MOCK_IO_ROUTER.events[event];
      if (handler) {
        handler(socket, ctx, next);
      }
    }
  };
  const MOCK_HANDLERS = {
    calls: [],
    addActivity: (socket, caseId, user, activity) => {
      const params = { socket, caseId, user, activity };
      MOCK_HANDLERS.calls.push({ method: 'addActivity', params });
    },
    watch: (socket, caseIds) => {
      const params = { socket, caseIds };
      MOCK_HANDLERS.calls.push({ method: 'watch', params });
    },
    removeSocketActivity: async (socketId) => {
      const params = { socketId };
      MOCK_HANDLERS.calls.push({ method: 'removeSocketActivity', params });
    }
  };
  const MOCK_SOCKET = {
    id: 'socket-id',
    rooms: ['socket-id'],
    events: {},
    messages: [],
    using: [],
    join: (room) => {
      if (!MOCK_SOCKET.rooms.includes(room)) {
        MOCK_SOCKET.rooms.push(room);
      }
    },
    leave: (room) => {
      const roomIndex = MOCK_SOCKET.rooms.indexOf(room);
      if (roomIndex > -1) {
        MOCK_SOCKET.rooms.splice(roomIndex, 1);
      }
    },
    emit: (event, message) => {
      MOCK_SOCKET.messages.push({ event, message });
    },
    use: (fn) => {
      MOCK_SOCKET.using.push(fn);
    },
    on: (event, eventHandler) => {
      MOCK_SOCKET.events[event] = eventHandler;
    },
    dispatch: (event) => {
      const handler = MOCK_SOCKET.events[event];
      if (handler) {
        handler(MOCK_SOCKET);
      }
    }
  };

  beforeEach(() => {
    router.init(MOCK_SOCKET_SERVER, MOCK_IO_ROUTER, MOCK_HANDLERS);
  });

  afterEach(() => {
    MOCK_SOCKET_SERVER.events = {};
    MOCK_IO_ROUTER.events = {};
    MOCK_IO_ROUTER.attachments.length = 0;
    MOCK_HANDLERS.calls.length = 0;
    MOCK_SOCKET.using.length = 0;
    router.removeUser(MOCK_SOCKET.id);
    router.removeConnection(MOCK_SOCKET);
  });

  describe('init', () => {
    it('should have set up the appropriate events on the socket server', () => {
      const EXPECTED_EVENTS = ['connection'];
      EXPECTED_EVENTS.forEach((event) => {
        expect(MOCK_SOCKET_SERVER.events[event]).to.be.a('function');
      });
    });
    it('should have set up the appropriate events on the io router', () => {
      const EXPECTED_EVENTS = ['register', 'view', 'edit', 'watch'];
      EXPECTED_EVENTS.forEach((event) => {
        expect(MOCK_IO_ROUTER.events[event]).to.be.a('function');
      });
    });
  });

  describe('iorouter', () => {
    const MOCK_CONTEXT_REGISTER = {
      request: {
        user: { id: 'a', name: 'Bob Smith' }
      }
    };
    const MOCK_CONTEXT = {
      request: {
        caseId: '1234567890',
        caseIds: ['2345678901', '3456789012', '4567890123']
      }
    };
    beforeEach(() => {
      // We need to register before each call as it sets up the user.
      MOCK_IO_ROUTER.dispatch('register', MOCK_SOCKET, MOCK_CONTEXT_REGISTER, () => {});
    });
    it('should appropriately handle registering a user', () => {
      expect(router.getUser(MOCK_SOCKET.id)).to.deep.equal(MOCK_CONTEXT_REGISTER.request.user);
    });
    it('should appropriately handle viewing a case', () => {
      const ACTIVITY = 'view';
      let nextCalled = false;
      MOCK_IO_ROUTER.dispatch(ACTIVITY, MOCK_SOCKET, MOCK_CONTEXT, () => {
        // next() should be called last so everything else should have been done already.
        nextCalled = true;
        expect(MOCK_HANDLERS.calls).to.have.lengthOf(1);
        expect(MOCK_HANDLERS.calls[0].method).to.equal('addActivity');
        expect(MOCK_HANDLERS.calls[0].params.socket).to.equal(MOCK_SOCKET);
        expect(MOCK_HANDLERS.calls[0].params.caseId).to.equal(MOCK_CONTEXT.request.caseId);
        // Note that the MOCK_CONTEXT doesn't include the user, which means we had to get it from elsewhere.
        expect(MOCK_HANDLERS.calls[0].params.user).to.deep.equal(MOCK_CONTEXT_REGISTER.request.user);
        expect(MOCK_HANDLERS.calls[0].params.activity).to.equal(ACTIVITY);
      });
      expect(nextCalled).to.be.true;
    });
    it('should appropriately handle editing a case', () => {
      const ACTIVITY = 'edit';
      let nextCalled = false;
      MOCK_IO_ROUTER.dispatch(ACTIVITY, MOCK_SOCKET, MOCK_CONTEXT, () => {
        // next() should be called last so everything else should have been done already.
        nextCalled = true;
        expect(MOCK_HANDLERS.calls).to.have.lengthOf(1);
        expect(MOCK_HANDLERS.calls[0].method).to.equal('addActivity');
        expect(MOCK_HANDLERS.calls[0].params.socket).to.equal(MOCK_SOCKET);
        expect(MOCK_HANDLERS.calls[0].params.caseId).to.equal(MOCK_CONTEXT.request.caseId);
        // Note that the MOCK_CONTEXT doesn't include the user, which means we had to get it from elsewhere.
        expect(MOCK_HANDLERS.calls[0].params.user).to.deep.equal(MOCK_CONTEXT_REGISTER.request.user);
        expect(MOCK_HANDLERS.calls[0].params.activity).to.equal(ACTIVITY);
      });
      expect(nextCalled).to.be.true;
    });
    it('should appropriately handle watching cases', () => {
      const ACTIVITY = 'watch';
      let nextCalled = false;
      MOCK_IO_ROUTER.dispatch(ACTIVITY, MOCK_SOCKET, MOCK_CONTEXT, () => {
        // next() should be called last so everything else should have been done already.
        nextCalled = true;
        expect(MOCK_HANDLERS.calls).to.have.lengthOf(1);
        expect(MOCK_HANDLERS.calls[0].method).to.equal('watch');
        expect(MOCK_HANDLERS.calls[0].params.socket).to.equal(MOCK_SOCKET);
        expect(MOCK_HANDLERS.calls[0].params.caseIds).to.deep.equal(MOCK_CONTEXT.request.caseIds);
      });
      expect(nextCalled).to.be.true;
    });
  });

  describe('io', () => {
    const MOCK_CONTEXT_REGISTER = {
      request: {
        user: { id: 'a', name: 'Bob Smith' }
      }
    };
    beforeEach(() => {
      // We need to register before each call as it sets up the user.
      MOCK_IO_ROUTER.dispatch('register', MOCK_SOCKET, MOCK_CONTEXT_REGISTER, () => {});

      // Dispatch the connection each time.
      MOCK_SOCKET_SERVER.dispatch('connection', MOCK_SOCKET);
    });
    it('should appropriately handle a new connection', () => {
      expect(router.getConnections()).to.have.lengthOf(1)
        .and.to.contain(MOCK_SOCKET);
      expect(MOCK_SOCKET.using).to.have.lengthOf(1);
      expect(MOCK_SOCKET.using[0]).to.be.a('function');
      expect(MOCK_SOCKET.events.disconnect).to.be.a('function');
    });
    it('should handle a socket use', () => {
      const useFn = MOCK_SOCKET.using[0];
      const PACKET = 'packet';
      const NEXT_FN = () => {};

      expect(MOCK_IO_ROUTER.attachments).to.have.lengthOf(0);
      useFn(PACKET, NEXT_FN);
      expect(MOCK_IO_ROUTER.attachments).to.have.lengthOf(1);
      expect(MOCK_IO_ROUTER.attachments[0].socket).to.equal(MOCK_SOCKET);
      expect(MOCK_IO_ROUTER.attachments[0].packet).to.equal(PACKET);
      expect(MOCK_IO_ROUTER.attachments[0].next).to.equal(NEXT_FN);
    });
    it('should handle a socket disconnecting', () => {
      MOCK_SOCKET.dispatch('disconnect');
      expect(MOCK_HANDLERS.calls).to.have.lengthOf(1);
      expect(MOCK_HANDLERS.calls[0].method).to.equal('removeSocketActivity');
      expect(MOCK_HANDLERS.calls[0].params.socketId).to.equal(MOCK_SOCKET.id);
      expect(router.getUser(MOCK_SOCKET.id)).to.be.undefined;
      expect(router.getConnections()).to.have.lengthOf(0);
    });
  });

});
