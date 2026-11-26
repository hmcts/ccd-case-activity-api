const chai = require('chai');
const expect = chai.expect;
const proxyquire = require('proxyquire');
const redis = require('../../../../app/redis/redis-client');
const sinon = require('sinon');

describe('Redis pipeline helpers', () => {
  it('returns non-array pipeline outcomes without processing them', () => {
    const outcome = 'pipeline failed';

    expect(redis.logPipelineFailures(outcome, 'test')).to.equal(outcome);
  });

  it('returns array outcomes containing failures', () => {
    const outcome = [[new Error('redis failure'), null], [null, 'ok']];

    expect(redis.logPipelineFailures(outcome, 'test')).to.equal(outcome);
  });

  it('enables friendly Redis errors in the dev environment', () => {
    const client = { on: sinon.stub() };
    client.on.returns(client);
    const Redis = sinon.stub().returns(client);
    const config = {
      util: { getEnv: () => 'dev' },
      get: sinon.stub(),
    };

    proxyquire('../../../../app/redis/redis-client', {
      config,
      ioredis: Redis,
    });

    expect(Redis).to.have.been.calledWith(sinon.match({ showFriendlyErrorStack: true }));
  });
});
