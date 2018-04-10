var redis = require('../../../../app/redis/redis-client');
var config = require('config');
var ttlScoreGenerator = require('../../../../app/service/ttl-score-generator');
var activityService = require('../../../../app/service/activity-service')(config, redis, ttlScoreGenerator)
var addActivityRoute = require('../../../../app/routes/add-activity')(activityService)
var httpMocks = require('node-mocks-http')

function buildResponse() {
  return httpMocks.createResponse({ eventEmitter: require('events').EventEmitter })
}

describe("add activity route", () => {

  it("should invoke activity service and return response on successful requests", (done) => {
    let req = {
      params: { caseid: 55 },
      body: { activity: 'edit' },
      authentication: { user: { id: 900 } },
      timedout: false
    }
    let next = () => { };
    var res = buildResponse()
    res.on('end', function () {
      expect(res.statusCode).toEqual(201);
      expect(res._getData()).toEqual('{"case":55,"user":"900","activity":"edit"}');
      done();
    });
    spyOn(activityService, 'addActivity').andReturn(Promise.resolve('unused result'));
    addActivityRoute(req, res, next)
    expect(activityService.addActivity).toHaveBeenCalledWith(req.params.caseid, req.authentication.user, req.body.activity)
  });

  it("should return status code 422 when activity is missing", (done) => {
    let req = {
      params: { caseid: 55 },
      body: {},
      authentication: { user: { id: 900 } },
      timedout: false
    };

    let res = buildResponse();
    spyOn(activityService, 'addActivity');
    addActivityRoute(req, res, function (error) {
      expect(error.status).toEqual(422)
    });
    expect(activityService.addActivity).not.toHaveBeenCalled();
    done()
  });

  it("should return status code 422 when activity is unknown", (done) => {
    let req = {
      params: { caseid: 55 },
      body: { activity: "unknown" },
      authentication: { user: { id: 900 } },
      timedout: false
    };

    var res = buildResponse();
    spyOn(activityService, 'addActivity');
    addActivityRoute(req, res, function (error) {
      expect(error.status).toEqual(422)
    });
    expect(activityService.addActivity).not.toHaveBeenCalled();
    done()
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
    spyOn(activityService, 'addActivity').andReturn(Promise.resolve('unused result'));
    addActivityRoute(req, res, next);
    expect(activityService.addActivity).toHaveBeenCalled();
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
    spyOn(activityService, 'addActivity').andReturn(Promise.reject('error'));
    res.on('end', function () {
      done(new Error("Received unexpected response"))
    });
    addActivityRoute(req, res, function (error) {
      done(new Error("Received unexpected response"))
    });
    expect(activityService.addActivity).toHaveBeenCalled();
    //required to avoid false positives
    setTimeout(done)
  })
});
