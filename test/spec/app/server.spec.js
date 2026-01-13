const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const path = require('path');

describe('server bootstrap', () => {
  let fakeServer;
  let httpStub;
  let appStub;
  let processExitStub;
  let consoleErrorStub;

  beforeEach(() => {
    fakeServer = {
      _handlers: {},
      listen: sinon.spy(),
      on(event, handler) {
        this._handlers[event] = handler;
      },
      address() {
        return { port: 3460 };
      },
    };

    httpStub = {
      createServer: sinon.stub().returns(fakeServer),
    };

    appStub = {
      set: sinon.spy(),
    };

    processExitStub = sinon.stub(process, 'exit');
    consoleErrorStub = sinon.stub(console, 'error');

    // Ensure a clean require for server.js using absolute path
    const serverPath = path.resolve(__dirname, '../../../server.js');
    delete require.cache[serverPath];

    proxyquire(serverPath, {
      '@hmcts/properties-volume': { addTo: () => ({}) },
      config: {},
      './app': appStub,
      http: httpStub,
      debug: () => () => {},
    });
  });

  afterEach(() => {
    processExitStub.restore();
    consoleErrorStub.restore();
  });

  it('should set port and start listening', () => {
    expect(appStub.set).to.have.been.calledWith('port', 3460);
    expect(httpStub.createServer).to.have.been.calledWith(appStub);
    expect(fakeServer.listen).to.have.been.calledWith(3460);
    expect(fakeServer._handlers.listening).to.be.a('function');
    // Invoke listening handler to exercise code path
    expect(() => fakeServer._handlers.listening()).to.not.throw();
  });

  it('should handle EACCES and EADDRINUSE errors by exiting', () => {
    const onError = fakeServer._handlers.error;
    expect(onError).to.be.a('function');

    onError({ syscall: 'listen', code: 'EACCES' });
    expect(processExitStub).to.have.been.calledWith(1);

    onError({ syscall: 'listen', code: 'EADDRINUSE' });
    expect(processExitStub).to.have.been.calledWith(1);
  });

  it('should rethrow unexpected errors', () => {
    const onError = fakeServer._handlers.error;
    expect(() => onError({ syscall: 'listen', code: 'PANIC_STATIONS' })).to.throw();
  });

  it('should support named pipe ports and string bind', () => {
    const originalPort = process.env.PORT;
    process.env.PORT = 'pipe';

    // Re-require server with named pipe env and custom address as string
    const serverPath = path.resolve(__dirname, '../../../server.js');
    delete require.cache[serverPath];
    // Change address to return string to hit onListening string branch
    fakeServer.address = () => 'named-socket';

    proxyquire(serverPath, {
      '@hmcts/properties-volume': { addTo: () => ({}) },
      config: {},
      './app': appStub,
      http: httpStub,
      debug: () => () => {},
    });

    // Validate normalizePort took string and listen used it
    expect(appStub.set).to.have.been.calledWith('port', 'pipe');
    expect(fakeServer.listen).to.have.been.calledWith('pipe');

    // Trigger EACCES to exercise 'Pipe ' bind branch
    const onError = fakeServer._handlers.error;
    onError({ syscall: 'listen', code: 'EACCES' });
    expect(processExitStub).to.have.been.calledWith(1);

    // Trigger listening to exercise string address
    expect(() => fakeServer._handlers.listening()).to.not.throw();

    process.env.PORT = originalPort;
  });

  it('should handle invalid numeric port by returning false', () => {
    const originalPort = process.env.PORT;
    process.env.PORT = '-1';

    const serverPath = path.resolve(__dirname, '../../../server.js');
    delete require.cache[serverPath];

    proxyquire(serverPath, {
      '@hmcts/properties-volume': { addTo: () => ({}) },
      config: {},
      './app': appStub,
      http: httpStub,
      debug: () => () => {},
    });

    expect(appStub.set).to.have.been.calledWith('port', false);
    expect(fakeServer.listen).to.have.been.calledWith(false);

    process.env.PORT = originalPort;
  });
});
