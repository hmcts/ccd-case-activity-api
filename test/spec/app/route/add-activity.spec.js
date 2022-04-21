var redis = require('../../../../app/redis/redis-client');
var config = require('config');
var ttlScoreGenerator = require('../../../../app/service/ttl-score-generator');
var activityService = require('../../../../app/service/activity-service')(config, redis, ttlScoreGenerator)
var addActivityRoute = require('../../../../app/routes/add-activity')(activityService)
var httpMocks = require('node-mocks-http')
var chai = require("chai");
var sinon = require("sinon");
var sinonChai = require("sinon-chai");
chai.should();
var expect = chai.expect;
chai.use(sinonChai);
var sandbox = sinon.createSandbox();

function buildResponse() {
  return httpMocks.createResponse({ eventEmitter: require('events').EventEmitter })
}

describe("add activity route", () => {

  afterEach(function () {
    // completely restore all fakes created through the sandbox
    sandbox.restore();
  });

  it("should invoke activity service and return response on successful requests", (done) => {
    let req = {
      params: { caseid: 55 },
      body: { activity: 'edit' },
      authentication: { user: { uid: 900 } },
      timedout: false
    }
    let next = () => { };
    var res = buildResponse()
    res.on('end', function () {
      expect(res.statusCode).to.equal(201);
      expect(res._getData()).to.equal('{"case":55,"user":"900","activity":"edit"}');
      //seems not to be invoked
      done();
    });
    sandbox.stub(activityService, 'addActivity').returns(Promise.resolve('unused result'));
    addActivityRoute(req, res, next)
    expect(activityService.addActivity).to.have.been.calledWith(req.params.caseid, req.authentication.user, req.body.activity)
  });

  it("should return status code 400 when activity is missing", () => {
    let req = {
      params: { caseid: 55 },
      body: {},
      authentication: { user: { id: 900 } },
      timedout: false
    };

    let res = buildResponse();
    sandbox.spy(activityService, 'addActivity');
    addActivityRoute(req, res, function (error) {
      expect(error.status).to.equal(400)
    });
    expect(activityService.addActivity).not.to.have.been.called;
  });

  it("should return status code 400 when activity is unknown", () => {
    let req = {
      params: { caseid: 55 },
      body: { activity: "unknown" },
      authentication: { user: { id: 900 } },
      timedout: false
    };

    var res = buildResponse();
    sandbox.spy(activityService, 'addActivity');
    addActivityRoute(req, res, function (error) {
      expect(error.status).to.equal(400)
    });
    expect(activityService.addActivity).not.to.have.been.called;
  });

  it("should not return a result when request is successful after it has timed out", (done) => {

    let req = {
      params: { caseid: 55 },
      body: { activity: 'edit' },
      authentication: { user: { id: 900 } },
      timedout: true
    };
    let next = () => { };
    let res = buildResponse();
    res.on('end', function () {
      done(new Error("Received unexpected response"))
    })
    sandbox.stub(activityService, 'addActivity').returns(Promise.resolve('unused result'));
    addActivityRoute(req, res, next);
    expect(activityService.addActivity).to.have.been.called;
    //required to avoid false positives
    setTimeout(done)
  });

  it("should not return a result when request fails after it has timed out", (done) => {
    let req = {
      params: { caseid: 55 },
      body: { activity: 'edit' },
      authentication: { user: { id: 900 } },
      timedout: true
    };
    let res = buildResponse();
    sandbox.stub(activityService, 'addActivity').returns(Promise.reject('error'));
    res.on('end', function () {
      done(new Error("Received unexpected response"))
    });
    addActivityRoute(req, res, function (error) {
      done(new Error("Received unexpected response"))
    });
    expect(activityService.addActivity).to.have.been.called;
    //required to avoid false positives
    setTimeout(done)
  })
});
