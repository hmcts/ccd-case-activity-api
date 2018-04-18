var config = require('config');
var config = redis = ttlScoreGenerator = {};
var activityService = require('../../../../app/service/activity-service')(config, redis, ttlScoreGenerator);
var getActivitesRoute = require('../../../../app/routes/get-activities')(activityService, config);
var addActivityRoute = require('../../../../app/routes/add-activity')(activityService, config);
var httpMocks = require('node-mocks-http');
var delayed = require('../../../../app/util/delayed');
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

describe("get activities route", () => {

  afterEach(function () {
    // completely restore all fakes created through the sandbox
    sandbox.restore();
  });

  it("should invoke activity service and return response on successful requests", (done) => {
    let req = {
      params: { caseids: '111, 121' },
      authentication: { user: { id: 900 } },
      timedout: false
    };
    let next = () => {
    };

    var res = buildResponse()
    res.on('end', function () {
      expect(res.statusCode).to.equal(200)
      expect(res._getData()).to.equal('"a result"')
      done()
    })

    sandbox.stub(activityService, 'getActivities').returns(Promise.resolve('a result'));

    getActivitesRoute(req, res, next)

    expect(activityService.getActivities).to.have.been.calledWith(req.params.caseids.split(','), { id : 900 })
  })

  it("should not return a result when request is successful after it has timed out", (done) => {

    let req = {
      params: {
        caseids: '111,121'
      },
      authentication: { user: { id: 900 } },
      timedout: true
    };

    let next = () => {
    };

    var res = buildResponse()
    res.on('end', function () {
      done(new Error("Received unexpected response"))
    });
    sandbox.stub(activityService, 'getActivities').returns(Promise.resolve('unused result'));

    getActivitesRoute(req, res, next);

    expect(activityService.getActivities).to.have.been.called;

    //required to avoid false positives
    setTimeout(done)
  });

  it("should not return a result when request fails after it has timed out", (done) => {

    let req = {
      params: {
        caseids: '111,121'
      },
      authentication: { user: { id: 900 } },
      timedout: true
    };

    var res = buildResponse()

    sandbox.stub(activityService, 'getActivities').returns(Promise.reject('error'));
    res.on('end', function () {
      done(new Error("Received unexpected response"))
    });

    getActivitesRoute(req, res, function (error) {
      done(new Error("Received unexpected response"))
    });

    expect(activityService.getActivities).to.have.been.called;

    //required to avoid false positives
    setTimeout(done)
  })
});
