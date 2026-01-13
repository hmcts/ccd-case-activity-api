const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const path = require('path');

describe('TTL Score Generator', () => {
  it('should compute score as now + ttl seconds', () => {
    const fixedNow = 1700000000000; // arbitrary fixed timestamp ms
    const momentStub = sinon.stub().returns({
      add: (sec, unit) => ({ valueOf: () => fixedNow + (sec * 1000) }),
      valueOf: () => fixedNow,
    });
    const configStub = { get: sinon.stub().withArgs('redis.activityTtlSec').returns(30) };

    const modulePath = path.resolve(__dirname, '../../../../app/service/ttl-score-generator.js');
    delete require.cache[modulePath];
    const ttlScoreGen = proxyquire(modulePath, {
      moment: momentStub,
      config: configStub,
      debug: () => () => {},
    });

    const score = ttlScoreGen.getScore();
    expect(score).to.equal(fixedNow + 30000);
  });
});
