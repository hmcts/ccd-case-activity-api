
const expect = require('chai').expect;
const config = require('config');
const sandbox = require("sinon").createSandbox();
const ttlScoreGenerator = require('../../../../app/service/ttl-score-generator');

describe('service.ttl-score-generator', () => {

  afterEach(() => {
    sandbox.restore();
  });

  describe('getScore', () => {
    it('should handle an activity TTL', () => {
      const TTL = '12';
      const NOW = 55;
      sandbox.stub(Date, 'now').returns(NOW);
      sandbox.stub(config, 'get').returns(TTL);
      const score = ttlScoreGenerator.getScore();
      expect(score).to.equal(12055); // (TTL * 1000) + NOW
    });
    it('should handle a numeric TTL', () => {
      const TTL = 13;
      const NOW = 55;
      sandbox.stub(Date, 'now').returns(NOW);
      sandbox.stub(config, 'get').returns(TTL);
      const score = ttlScoreGenerator.getScore();
      expect(score).to.equal(13055); // (TTL * 1000) + NOW
    });
    it('should handle a null TTL', () => {
      const TTL = null;
      const NOW = 55;
      sandbox.stub(Date, 'now').returns(NOW);
      sandbox.stub(config, 'get').returns(TTL);
      const score = ttlScoreGenerator.getScore();
      expect(score).to.equal(55); // null TTL => 0
    });
  });

});
