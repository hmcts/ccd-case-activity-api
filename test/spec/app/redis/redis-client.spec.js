const chai = require('chai');
const expect = chai.expect;
const redis = require('../../../../app/redis/redis-client');

describe('Redis pipeline helpers', () => {
  it('returns non-array pipeline outcomes without processing them', () => {
    const outcome = 'pipeline failed';

    expect(redis.logPipelineFailures(outcome, 'test')).to.equal(outcome);
  });

  it('returns array outcomes containing failures', () => {
    const outcome = [[new Error('redis failure'), null], [null, 'ok']];

    expect(redis.logPipelineFailures(outcome, 'test')).to.equal(outcome);
  });
});
