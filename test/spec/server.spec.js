const chai = require('chai');
const expect = chai.expect;
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('server startup', () => {
  const startServer = (portValue, address = { port: 3460 }) => {
    const handlers = {};
    const app = { set: sinon.spy() };
    const server = {
      listen: sinon.spy(),
      on: sinon.stub().callsFake((event, handler) => {
        handlers[event] = handler;
        return server;
      }),
      address: sinon.stub().returns(address),
    };
    const http = { createServer: sinon.stub().returns(server) };
    const oldPort = process.env.PORT;
    const log = sinon.stub(console, 'log');

    if (portValue === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = String(portValue);
    }

    try {
      proxyquire('../../server', {
        '@hmcts/properties-volume': { addTo: sinon.stub() },
        './app': app,
        http,
      });
    } finally {
      if (oldPort === undefined) {
        delete process.env.PORT;
      } else {
        process.env.PORT = oldPort;
      }
      log.restore();
    }

    return { app, handlers, server };
  };

  it('uses the default port when PORT is unset', () => {
    const { app, server } = startServer(undefined);

    expect(app.set).to.have.been.calledWith('port', 3460);
    expect(server.listen).to.have.been.calledWith(3460);
  });

  it('keeps a named pipe port as a string', () => {
    const { app, server } = startServer('case-activity.sock');

    expect(app.set).to.have.been.calledWith('port', 'case-activity.sock');
    expect(server.listen).to.have.been.calledWith('case-activity.sock');
  });

  it('returns false for a negative numeric port', () => {
    const { app, server } = startServer(-1);

    expect(app.set).to.have.been.calledWith('port', false);
    expect(server.listen).to.have.been.calledWith(false);
  });

  it('throws errors that did not come from listening', () => {
    const { handlers } = startServer(3460);
    const error = new Error('server error');
    error.syscall = 'read';

    expect(() => handlers.error(error)).to.throw(error);
  });

  it('reports permission and address-in-use listen errors', () => {
    const { handlers } = startServer(3460);
    const exit = sinon.stub(process, 'exit');
    const errorLog = sinon.stub(console, 'error');

    try {
      handlers.error({ syscall: 'listen', code: 'EACCES' });
      handlers.error({ syscall: 'listen', code: 'EADDRINUSE' });

      expect(exit).to.have.been.calledTwice;
      expect(errorLog.firstCall.args[0]).to.include('Port 3460 requires elevated privileges');
      expect(errorLog.secondCall.args[0]).to.include('Port 3460 is already in use');
    } finally {
      exit.restore();
      errorLog.restore();
    }
  });

  it('throws unrecognized listen errors', () => {
    const { handlers } = startServer('case-activity.sock');
    const error = { syscall: 'listen', code: 'EOTHER' };
    let caughtError;

    try {
      handlers.error(error);
    } catch (thrownError) {
      caughtError = thrownError;
    }

    expect(caughtError).to.equal(error);
  });

  it('handles string and numeric listening addresses', () => {
    const stringAddressServer = startServer(3460, 'case-activity.sock');
    const numericAddressServer = startServer(3460, { port: 3460 });

    expect(() => stringAddressServer.handlers.listening()).not.to.throw();
    expect(() => numericAddressServer.handlers.listening()).not.to.throw();
  });
});
