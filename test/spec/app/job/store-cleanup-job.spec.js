const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const path = require('path');
const EventEmitter = require('events');

describe('store-cleanup-job', () => {
  let cronStub;
  let configStub;
  let redisStub;
  let jobModule;

  beforeEach(() => {
    cronStub = { validate: sinon.stub(), schedule: sinon.stub() };
    configStub = { get: sinon.stub().withArgs('redis.keyPrefix').returns('prefix:') };
    const pipelineExecStub = sinon.stub().resolves([['OK']]);
    redisStub = {
      pipeline: sinon.stub().returns({ exec: pipelineExecStub }),
      logPipelineFailures: sinon.stub(),
      scanStream: sinon.stub().callsFake(() => new EventEmitter()),
    };
  });

  it('start should validate and schedule with valid crontab', () => {
    cronStub.validate.returns(true);
    const modulePath = path.resolve(__dirname, '../../../../app/job/store-cleanup-job.js');
    delete require.cache[modulePath];
    jobModule = proxyquire(modulePath, {
      'node-cron': cronStub,
      config: configStub,
      '../redis/redis-client': redisStub,
      debug: () => () => {},
    });

    jobModule.start('* * * * *');
    expect(cronStub.validate).to.have.been.calledWith('* * * * *');
    expect(cronStub.schedule).to.have.been.calledWith('* * * * *', sinon.match.func);
  });

  it('start should throw on invalid crontab', () => {
    cronStub.validate.returns(false);
    const modulePath = path.resolve(__dirname, '../../../../app/job/store-cleanup-job.js');
    delete require.cache[modulePath];
    jobModule = proxyquire(modulePath, {
      'node-cron': cronStub,
      config: configStub,
      '../redis/redis-client': redisStub,
      debug: () => () => {},
    });

    expect(() => jobModule.start('invalid')).to.throw('invalid crontab: invalid');
  });

  it('force should trigger pipeline cleanup and log failures', async () => {
    cronStub.validate.returns(true);
    const stream = new EventEmitter();
    redisStub.scanStream.callsFake(() => stream);
    const modulePath = path.resolve(__dirname, '../../../../app/job/store-cleanup-job.js');
    delete require.cache[modulePath];
    jobModule = proxyquire(modulePath, {
      'node-cron': cronStub,
      config: configStub,
      '../redis/redis-client': redisStub,
      debug: () => () => {},
    });

    // Emulate scan stream producing keys with prefix and ending
    const producedKeys = ['prefix:case:111', 'prefix:case:222'];
    setImmediate(() => {
      stream.emit('data', producedKeys);
      stream.emit('end');
    });

    await jobModule.force();
    await new Promise((resolve) => setImmediate(resolve));
    expect(redisStub.pipeline).to.have.been.calledOnce;
    const arg = redisStub.pipeline.getCall(0).args[0];
    expect(arg).to.be.an('array').with.length(2);
    expect(arg[0]).to.be.an('array').with.length(4);
    expect(arg[0][0]).to.equal('zremrangebyscore');
    expect(arg[0][1]).to.equal('case:111');
    expect(arg[0][2]).to.equal('-inf');
    expect(arg[1][1]).to.equal('case:222');
    expect(redisStub.logPipelineFailures).to.have.been.called;
  });
});
