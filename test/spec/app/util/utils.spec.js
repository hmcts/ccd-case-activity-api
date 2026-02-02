const expect = require('chai').expect;
const utils = require('../../../../app/util/utils');

describe('util.utils', () => {

  describe('ifNotTimedOut', () => {
    it('should call the function if it is not timed out', () => {
      const REQUEST = { timedout: false };
      let functionCalled = false;
      utils.ifNotTimedOut(REQUEST, () => {
        functionCalled = true;
      });
      expect(functionCalled).to.be.true;
    });
    it('should not the function if it is timed out', () => {
      const REQUEST = { timedout: true };
      let functionCalled = false;
      utils.ifNotTimedOut(REQUEST, () => {
        functionCalled = true;
      });
      expect(functionCalled).to.be.false;
    });
  });

  describe('normalizePort', () => {
    it('should parse and use a numeric string', () => {
      const PORT = '1234';
      const response = utils.normalizePort(PORT);
      expect(response).to.be.a('number').and.to.equal(1234);
    });
    it('should parse and use a zero string', () => {
      const PORT = '0';
      const response = utils.normalizePort(PORT);
      expect(response).to.be.a('number').and.to.equal(0);
    });
    it('should bounce a null', () => {
      const PORT = null;
      const response = utils.normalizePort(PORT);
      expect(response).to.equal(PORT);
    });
    it('should bounce an object', () => {
      const PORT = { bob: 'Bob' };
      const response = utils.normalizePort(PORT);
      expect(response).to.equal(PORT);
    });
    it('should bounce a string that cannot be parsed as a number', () => {
      const PORT = 'Bob';
      const response = utils.normalizePort(PORT);
      expect(response).to.equal(PORT);
    });
    it('should reject an invalid numeric string', () => {
      const PORT = '-1234';
      const response = utils.normalizePort(PORT);
      expect(response).to.be.false;
    });
  });

  describe('onServerError', () => {
    const getSystemError = (code, syscall, message) => {
      return {
        address: 'http://test.address.net',
        code: code,
        errno: 1,
        message: message || 'An error occurred',
        syscall: syscall
      };
    };
    let logTo;
    let exitRoute;
    beforeEach(() => {
      logTo = {
        logs: [],
        output: (str) => {
          logTo.logs.push(str);
        }
      };
      exitRoute = {
        calls: [],
        exit: (code) => {
          exitRoute.calls.push(code);
        }
      }
    });

    it('should handle an access error on a numeric port', () => {
      const PORT = 1234;
      const ERROR = getSystemError('EACCES', 'listen');
      utils.onServerError(PORT, logTo.output, exitRoute.exit)(ERROR);
      expect(logTo.logs).to.have.a.lengthOf(1)
        .and.to.contain('Port 1234 requires elevated privileges');
      expect(exitRoute.calls).to.have.a.lengthOf(1)
        .and.to.contain(1);
    });
    it('should handle an access error on a string port', () => {
      const PORT = 'BOBBINS';
      const ERROR = getSystemError('EACCES', 'listen');
      utils.onServerError(PORT, logTo.output, exitRoute.exit)(ERROR);
      expect(logTo.logs).to.have.a.lengthOf(1)
        .and.to.contain('Pipe BOBBINS requires elevated privileges');
      expect(exitRoute.calls).to.have.a.lengthOf(1)
        .and.to.contain(1);
    });
    it('should handle an address in use error on a numeric port', () => {
      const PORT = 1234;
      const ERROR = getSystemError('EADDRINUSE', 'listen');
      utils.onServerError(PORT, logTo.output, exitRoute.exit)(ERROR);
      expect(logTo.logs).to.have.a.lengthOf(1)
        .and.to.contain('Port 1234 is already in use');
      expect(exitRoute.calls).to.have.a.lengthOf(1)
        .and.to.contain(1);
    });
    it('should handle an address in use error on a string port', () => {
      const PORT = 'BOBBINS';
      const ERROR = getSystemError('EADDRINUSE', 'listen');
      utils.onServerError(PORT, logTo.output, exitRoute.exit)(ERROR);
      expect(logTo.logs).to.have.a.lengthOf(1)
        .and.to.contain('Pipe BOBBINS is already in use');
      expect(exitRoute.calls).to.have.a.lengthOf(1)
        .and.to.contain(1);
    });
    it('should throw an error when not a listen syscall', () => {
      const PORT = 1234;
      const ERROR = getSystemError('EADDRINUSE', 'not listening', `Sorry, what was that? I wasn't listening.`);
      const onServerError = utils.onServerError(PORT, logTo.output, exitRoute.exit);
      let errorThrown = null;
      try {
        onServerError(ERROR);
      } catch (err) {
        errorThrown = err;
      }
      expect(errorThrown).to.equal(ERROR);
      expect(logTo.logs).to.have.a.lengthOf(0);
      expect(exitRoute.calls).to.have.a.lengthOf(0);
    });
    it('should rethrow an unhandled error', () => {
      const PORT = 1234;
      const ERROR = getSystemError('PANIC_STATIONS', 'listen');
      const onServerError = utils.onServerError(PORT, logTo.output, exitRoute.exit);
      let errorThrown = null;
      try {
        onServerError(ERROR);
      } catch (err) {
        errorThrown = err;
      }
      expect(errorThrown).to.equal(ERROR);
      expect(logTo.logs).to.have.a.lengthOf(0);
      expect(exitRoute.calls).to.have.a.lengthOf(0);
    });

  });

  describe('onListening', () => {
    let logTo;
    beforeEach(() => {
      logTo = {
        logs: [],
        output: (str) => {
          logTo.logs.push(str);
        }
      };
    });
    it('should handle a string address', () => {
      const ADDRESS = 'http://test.address';
      const SERVER = {
        address: () => {
          return ADDRESS;
        }
      };
      utils.onListening(SERVER, logTo.output)();
      expect(logTo.logs).to.have.a.lengthOf(1)
        .and.to.contain(`Listening on pipe ${ADDRESS}`);
    });
    it('should handle an address with a port', () => {
      const PORT = 6251;
      const SERVER = {
        address: () => {
          return { port: PORT };
        }
      };
      utils.onListening(SERVER, logTo.output)();
      expect(logTo.logs).to.have.a.lengthOf(1)
        .and.to.contain(`Listening on port ${PORT}`);
    });
  });

});