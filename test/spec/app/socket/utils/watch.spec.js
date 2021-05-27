const keys = require('../../../../../app/socket/redis/keys');
const watch = require('../../../../../app/socket/utils/watch');
const expect = require('chai').expect;

describe('socket.utils', () => {

  describe('watch', () => {

    const MOCK_SOCKET = {
      id: 'socket-id',
      rooms: ['socket-id'],
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
      }
    };

    afterEach(() => {
      MOCK_SOCKET.rooms.length = 0;
      MOCK_SOCKET.rooms.push(MOCK_SOCKET.id)
    });

    describe('case', () => {
      it('should join the appropriate room on the socket', () => {
        const CASE_ID = '1234567890';
        watch.case(MOCK_SOCKET, CASE_ID);
        expect(MOCK_SOCKET.rooms).to.have.lengthOf(2)
          .and.to.include(MOCK_SOCKET.id)
          .and.to.include(keys.case.base(CASE_ID));
      });
      it('should handle a null room', () => {
        const CASE_ID = null;
        watch.case(MOCK_SOCKET, CASE_ID);
        expect(MOCK_SOCKET.rooms).to.have.lengthOf(1)
          .and.to.include(MOCK_SOCKET.id);
      });
      it('should handle a null socket', () => {
        const CASE_ID = null;
        watch.case(null, CASE_ID);
        expect(MOCK_SOCKET.rooms).to.have.lengthOf(1)
          .and.to.include(MOCK_SOCKET.id);
      });
    });

    describe('cases', () => {
      it('should join all appropriate rooms on the socket', () => {
        const CASE_IDS = ['1234567890', '0987654321', 'bob'];
        watch.cases(MOCK_SOCKET, CASE_IDS);
        expect(MOCK_SOCKET.rooms).to.have.lengthOf(CASE_IDS.length + 1)
          .and.to.include(MOCK_SOCKET.id);
        CASE_IDS.forEach((id) => {
          expect(MOCK_SOCKET.rooms).to.include(keys.case.base(id));
        });
      });
      it('should handle a null room', () => {
        const CASE_IDS = ['1234567890', null, 'bob'];
        watch.cases(MOCK_SOCKET, CASE_IDS);
        expect(MOCK_SOCKET.rooms).to.have.lengthOf(CASE_IDS.length)
          .and.to.include(MOCK_SOCKET.id);
        CASE_IDS.forEach((id) => {
          if (id) {
            expect(MOCK_SOCKET.rooms).to.include(keys.case.base(id));
          }
        });
      });
      it('should handle a null socket', () => {
        const CASE_IDS = ['1234567890', '0987654321', 'bob'];
        watch.cases(null, CASE_IDS);
        expect(MOCK_SOCKET.rooms).to.have.lengthOf(1)
          .and.to.include(MOCK_SOCKET.id);
      });
    });

    describe('stop', () => {
      it('should leave all the case rooms', () => {
        // First, join a bunch of rooms.
        const CASE_IDS = ['1234567890', '0987654321', 'bob'];
        watch.cases(MOCK_SOCKET, CASE_IDS);
        expect(MOCK_SOCKET.rooms).to.have.lengthOf(CASE_IDS.length + 1)
          .and.to.include(MOCK_SOCKET.id);

        // Now stop watching the rooms.
        watch.stop(MOCK_SOCKET);
        expect(MOCK_SOCKET.rooms).to.have.lengthOf(1)
          .and.to.include(MOCK_SOCKET.id);
      });
      it('should handle a null socket', () => {
        // First, join a bunch of rooms.
        const CASE_IDS = ['1234567890', '0987654321', 'bob'];
        watch.cases(MOCK_SOCKET, CASE_IDS);
        expect(MOCK_SOCKET.rooms).to.have.lengthOf(CASE_IDS.length + 1)
          .and.to.include(MOCK_SOCKET.id);

        // Now pass a null socket to the stop method.
        watch.stop(null);

        // The MOCK_SOCKET's rooms should be untouched.
        expect(MOCK_SOCKET.rooms).to.have.lengthOf(CASE_IDS.length + 1)
          .and.to.include(MOCK_SOCKET.id);
      });
      it('should handle no case rooms to leave', () => {
        expect(MOCK_SOCKET.rooms).to.have.lengthOf(1)
          .and.to.include(MOCK_SOCKET.id);

        // Now stop watching the rooms, which should have no effect.
        watch.stop(MOCK_SOCKET);
        expect(MOCK_SOCKET.rooms).to.have.lengthOf(1)
          .and.to.include(MOCK_SOCKET.id);
      });
    });

    describe('update', () => {
      it('should appropriately replace one set of cases with another', () => {
        // First, let's watch a bunch of cases.
        const CASE_IDS = ['1234567890', '0987654321', 'bob'];
        watch.cases(MOCK_SOCKET, CASE_IDS);

        // Now, let's use a whole different bunch.
        const REPLACEMENT_CASE_IDS = ['a', 'b', 'c', 'd'];
        watch.update(MOCK_SOCKET, REPLACEMENT_CASE_IDS);
        expect(MOCK_SOCKET.rooms).to.have.lengthOf(REPLACEMENT_CASE_IDS.length + 1)
          .and.to.include(MOCK_SOCKET.id);
        REPLACEMENT_CASE_IDS.forEach((id) => {
          expect(MOCK_SOCKET.rooms).to.include(keys.case.base(id));
        });
        CASE_IDS.forEach((id) => {
          expect(MOCK_SOCKET.rooms).not.to.include(keys.case.base(id));
        });
      });
    });

  });

});
