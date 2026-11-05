const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const assert = require('assert').strict;

describe('TTL score generator', () => {
  it('adds the configured activity TTL in seconds to the current time', () => {
    const expectedScore = 123456789;
    const config = { get: sinon.stub().withArgs('redis.activityTtlSec').returns(5) };
    const date = { valueOf: () => expectedScore };
    const now = { add: sinon.stub().returns(date) };
    const moment = sinon.stub().returns(now);
    const ttlScoreGenerator = proxyquire('../../../../app/service/ttl-score-generator', {
      config,
      moment,
    });

    assert.equal(ttlScoreGenerator.getScore(), expectedScore);
    sinon.assert.calledOnce(moment);
    sinon.assert.calledOnceWithExactly(now.add, 5, 'seconds');
    sinon.assert.calledTwice(config.get);
  });
});
