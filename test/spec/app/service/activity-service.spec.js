var redis = require('../../../../app/redis/redis-client');
var config = require('config');
var ttlScoreGenerator = require('../../../../app/service/ttl-score-generator');
var activityService = require('../../../../app/service/activity-service')(config, redis, ttlScoreGenerator);
var chai = require("chai");
var sinon = require("sinon");
var sinonChai = require("sinon-chai");
chai.should();
var expect = chai.expect;
chai.use(sinonChai);
var sandbox = sinon.createSandbox();

describe("activity service", () => {

  afterEach(function () {
    // completely restore all fakes created through the sandbox
    sandbox.restore();
  });

  const CASE_ID = 55;
  const USER_ID = '67';
  const SCORE = 30;
  const USER_DETAILS_TTL = 15;
  const TIMESTAMP = 40;
  let pipStub;

  it("addActivity should create a redis pipeline with the correct redis commands for edit", () => {
    pipStub = sinon.stub();
    pipStub.exec = () => "result";
    sandbox.stub(redis, 'pipeline').returns(pipStub);
    sandbox.stub(ttlScoreGenerator, 'getScore').returns(SCORE);
    sandbox.stub(config, 'get').returns(USER_DETAILS_TTL);

    const result = activityService.addActivity(CASE_ID, { uid: USER_ID }, 'edit');

    expect(redis.pipeline).to.have.been.calledWith([['zadd', `case:${CASE_ID}:editors`, SCORE, USER_ID], ['set', `user:${USER_ID}`, '{}', 'EX', USER_DETAILS_TTL]]);
    expect(config.get).to.have.been.calledWith('redis.userDetailsTtlSec');
    expect(result).to.equal("result");
  });

  it("addActivity should create a redis pipeline with the correct redis commands for view", () => {
    pipStub = sinon.stub();
    pipStub.exec = () => "result";
    sandbox.stub(redis, 'pipeline').returns(pipStub);
    sandbox.stub(ttlScoreGenerator, 'getScore').returns(SCORE);

    sandbox.stub(config, 'get').returns(USER_DETAILS_TTL);

    const result = activityService.addActivity(CASE_ID, { uid: USER_ID }, 'view')
    expect(redis.pipeline).to.have.been.calledWith([['zadd', `case:${CASE_ID}:viewers`, SCORE, USER_ID], ['set', `user:${USER_ID}`, '{}', 'EX', USER_DETAILS_TTL]]);
    expect(config.get).to.have.been.calledWith('redis.userDetailsTtlSec');
    expect(result).to.equal("result")
  });

  it("getActivities should create a redis pipeline with the correct redis commands for getViewers", (done) => {
    sandbox.stub(Date, 'now').returns(TIMESTAMP);
    sandbox.stub(config, 'get').returns(USER_DETAILS_TTL);
    sandbox.stub(redis, "pipeline").callsFake(function (arguments) {
      argStr = JSON.stringify(arguments);
      if (argStr.includes('zrangebyscore')) {
        pipStub.exec = () => Promise.resolve([[null, [242]], [null, [12]]]);
        return pipStub;
      } else {
        pipStub.exec = () => Promise.resolve([[null, "{\"forename\":\"nayab\",\"surname\":\"gul\"}"], [null, "{\"forename\":\"sam\",\"surname\":\"gamgee\"}"]]);
        return pipStub;
      }
    });

    const result = activityService.getActivities(['767', '888'], { uid: '900' });

    result.then((content) => {
      expect(redis.pipeline).to.have.been.calledWith([['zrangebyscore', 'case:767:viewers', TIMESTAMP, '+inf'], ['zrangebyscore', 'case:888:viewers', TIMESTAMP, '+inf']]);
      expect(redis.pipeline).to.have.been.calledWith([['zrangebyscore', 'case:767:editors', TIMESTAMP, '+inf'], ['zrangebyscore', 'case:888:editors', TIMESTAMP, '+inf']]);
      expect(redis.pipeline).to.have.been.calledWith([['get', 'user:242'], ['get', 'user:12']]);
      expect(content).deep.equal([{
        "caseId": "767",
        viewers: [{ forename: 'nayab', surname: 'gul' }],
        unknownViewers: 0,
        editors: [{ forename: 'nayab', surname: 'gul' }],
        unknownEditors: 0
      }, {
        "caseId": "888",
        viewers: [{ forename: 'sam', surname: 'gamgee' }],
        unknownViewers: 0,
        editors: [{ forename: 'sam', surname: 'gamgee' }],
        unknownEditors: 0
      }]);
      done();
    }).catch(err => console.log('error', done(err)));
  })

  it("getActivities should return unknown users if users detail are missing", (done) => {
    sandbox.stub(Date, 'now').returns(TIMESTAMP);
    sandbox.stub(config, 'get').returns(USER_DETAILS_TTL);
    sandbox.stub(redis, "pipeline").callsFake(function (arguments) {
      argStr = JSON.stringify(arguments);
      if (argStr.includes('zrangebyscore')) {
        pipStub.exec = () => Promise.resolve([[null, ['242']], [null, ['12']]]);
        return pipStub;
      } else {
        pipStub.exec = () => Promise.resolve([[null, null], [null, "{\"forename\":\"sam\",\"surname\":\"gamgee\"}"]]);
        return pipStub;
      }
    });

    const result = activityService.getActivities(['767', '888'], { uid: '111' });

    result.then((content) => {
      expect(content).deep.equal([{
        "caseId": "767",
        viewers: [],
        unknownViewers: 1,
        editors: [],
        unknownEditors: 1
      }, {
        "caseId": "888",
        viewers: [{ forename: 'sam', surname: 'gamgee' }],
        unknownViewers: 0,
        editors: [{ forename: 'sam', surname: 'gamgee' }],
        unknownEditors: 0
      }]);
      done();
    }).catch(err => console.log('error', done(err)));
  })

  it("getActivities should not return in the list of viewers the requesting user id", (done) => {
    sandbox.stub(Date, 'now').returns(TIMESTAMP);
    sandbox.stub(config, 'get').returns(USER_DETAILS_TTL);
    sandbox.stub(redis, "pipeline").callsFake(function (arguments) {
      argStr = JSON.stringify(arguments);
      if (argStr.includes('zrangebyscore')) {
        pipStub.exec = () => Promise.resolve([[null, ['242']], [null, ['12']]]);
        return pipStub;
      } else {
        pipStub.exec = () => Promise.resolve([[null, "{\"forename\":\"nayab\",\"surname\":\"gul\"}"], [null, "{\"forename\":\"sam\",\"surname\":\"gamgee\"}"]]);
        return pipStub;
      }
    });

    const result = activityService.getActivities(['767', '888'], { uid: '242' });

    result.then((content) => {
      expect(content).deep.equal([{
        "caseId": "767",
        viewers: [],
        unknownViewers: 0,
        editors: [],
        unknownEditors: 0
      }, {
        "caseId": "888",
        viewers: [{ forename: 'sam', surname: 'gamgee' }],
        unknownViewers: 0,
        editors: [{ forename: 'sam', surname: 'gamgee' }],
        unknownEditors: 0
      }]);
      done();
    }).catch(err => console.log('error', done(err)));
  })

  it("getActivities should not return the requesting user id in the list of unknown viewers", (done) => {
    sandbox.stub(Date, 'now').returns(TIMESTAMP);
    sandbox.stub(config, 'get').returns(USER_DETAILS_TTL);
    sandbox.stub(redis, "pipeline").callsFake(function (arguments) {
      argStr = JSON.stringify(arguments);
      if (argStr.includes('zrangebyscore')) {
        //the following userIds will be returned for both viewers & editors
        pipStub.exec = () => Promise.resolve([[null, ['242']], [null, ['12']]]);
        return pipStub;
      } else {
        //return the following user info for users 242 (unkown) and 12 (sam gamgee)
        pipStub.exec = () => Promise.resolve([[null, null], [null, "{\"forename\":\"sam\",\"surname\":\"gamgee\"}"]]);
        return pipStub;
      }
    });

    const result = activityService.getActivities(['767', '888'], { uid: '242' });

    result.then((content) => {
      // don't expect unknown users since the unknown user is the requester
      expect(content).deep.equal([{
        "caseId": "767",
        viewers: [],
        unknownViewers: 0,
        editors: [],
        unknownEditors: 0
      }, {
        "caseId": "888",
        viewers: [{ forename: 'sam', surname: 'gamgee' }],
        unknownViewers: 0,
        editors: [{ forename: 'sam', surname: 'gamgee' }],
        unknownEditors: 0
      }]);
      done();
    }).catch(err => console.log('error', done(err)));
  })
});
