const EventEmitter = require('events');
const assert = require('assert').strict;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

describe('Store cleanup job', () => {
  let stream;
  let redis;
  let cron;
  let storeCleanupJob;

  beforeEach(() => {
    stream = new EventEmitter();
    redis = {
      scanStream: sinon.stub().returns(stream),
      pipeline: sinon.stub(),
      logPipelineFailures: sinon.stub().callsFake((result) => result),
    };
    cron = {
      validate: sinon.stub().returns(true),
      schedule: sinon.stub(),
    };
    storeCleanupJob = proxyquire('../../../../app/job/store-cleanup-job', {
      config: { get: sinon.stub().withArgs('redis.keyPrefix').returns('activity:') },
      'node-cron': cron,
      moment: () => ({ valueOf: () => 1234 }),
      '../redis/redis-client': redis,
    });
  });

  it('scans activity keys and removes the prefix before issuing cleanup commands', async () => {
    const pipelineResult = [[null, 1], [null, 1]];
    const exec = sinon.stub().resolves(pipelineResult);
    redis.pipeline.returns({ exec });

    const cleanup = storeCleanupJob.force();
    stream.emit('data', ['activity:case:55:viewers']);
    stream.emit('data', ['activity:case:55:editors']);
    stream.emit('end');
    await cleanup;

    sinon.assert.calledOnceWithExactly(redis.scanStream, { match: 'activity:case:*', count: 100 });
    sinon.assert.calledOnceWithExactly(redis.pipeline, [
      ['zremrangebyscore', 'case:55:viewers', '-inf', 1234],
      ['zremrangebyscore', 'case:55:editors', '-inf', 1234],
    ]);
    sinon.assert.calledOnceWithExactly(redis.logPipelineFailures, pipelineResult, 'error in store cleanup job');
  });

  it('runs an empty pipeline when the scan finds no activity keys', async () => {
    const exec = sinon.stub().resolves([]);
    redis.pipeline.returns({ exec });

    const cleanup = storeCleanupJob.force();
    stream.emit('end');
    await cleanup;

    sinon.assert.calledOnceWithExactly(redis.pipeline, []);
    sinon.assert.calledOnceWithExactly(redis.logPipelineFailures, [], 'error in store cleanup job');
  });

  it('handles a scan stream error without issuing a cleanup pipeline', async () => {
    const cleanup = storeCleanupJob.force();
    stream.emit('error', new Error('scan failed'));
    await cleanup;

    sinon.assert.notCalled(redis.pipeline);
  });

  it('rejects an invalid cron expression and schedules a valid one', () => {
    cron.validate.returns(false);
    assert.throws(() => storeCleanupJob.start('invalid'), /invalid crontab: invalid/);

    cron.validate.returns(true);
    storeCleanupJob.start('* * * * *');
    sinon.assert.calledOnceWithExactly(cron.schedule, '* * * * *', sinon.match.func);
  });
});
