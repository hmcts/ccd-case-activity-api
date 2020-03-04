process.env.NODE_ENV = 'test';
process.env.DEBUG = 'ccd-case-activity-api:*';

const chai = require('chai');
const chaiHttp = require('chai-http');

const mock = require('mock-require');

mock('../../app/user/auth-checker-user-only-filter', './stubs/idam-stub');

const server = require('../../app');
const redis = require('../../app/redis/redis-client');
const activityAssert = require('./utils/activity-store-asserts');

const should = chai.should(); // eslint-disable-line no-unused-vars

const Token = JSON.stringify({ id: '242', forename: 'nayab', surname: 'gul' });

chai.use(chaiHttp);

/* Relies on activityTtlSec:5, userDetailsTtlSec:2 */

describe('Activity Service - activityTtlSec:5, userDetailsTtlSec:2', () => {
  beforeEach(() => redis.flushall());

  it('smoke - should POST a user activity on a case', (done) => {
    const body = {
      activity: 'view',
    };
    chai.request(server)
      .post('/cases/55/activity')
      .set('Authorization', Token)
      .send(body)
      .end((err, res) => {
        const assertEndpointResult = new Promise((resolve) => {
          res.should.have.status(201);
          res.should.be.json; // eslint-disable-line no-unused-expressions
          res.body.should.be.a('object');
          res.body.case.should.equal('55');
          res.body.user.should.equal('242');
          res.body.activity.should.equal('view');
          resolve();
        });

        Promise.all([assertEndpointResult,
          activityAssert.allCaseViewersEquals(55, '242'),
          activityAssert.userDetailsEquals('242', '{"forename":"nayab","surname":"gul"}')])
          .then(() => done())
          .catch((error) => done(error));
      });
  });

  it('should not POST a user activity if the activity type is not specified', (done) => {
    const body = {};
    chai.request(server)
      .post('/cases/55/activity')
      .set('Authorization', Token)
      .send(body)
      .end((err, res) => {
        res.should.have.status(422);
        res.should.be.json; // eslint-disable-line no-unused-expressions
        res.body.should.be.a('object');
        res.body.message.should.equal('unknown activity: undefined');
        done();
      });
  });

  it('should not POST a user activity if the activity type is unknown', (done) => {
    const body = {
      activity: 'vie',
    };
    chai.request(server)
      .post('/cases/55/activity')
      .set('Authorization', Token)
      .send(body)
      .end((err, res) => {
        res.should.have.status(422);
        res.should.be.json; // eslint-disable-line no-unused-expressions
        res.body.should.be.a('object');
        res.body.message.should.equal('unknown activity: vie');
        done();
      });
  });

  it('should not POST a user activity if authentication is not provided', (done) => {
    const body = {

      activity: 'view',
    };
    chai.request(server)
      .post('/cases/55/activity')
      .send(body)
      .end((err, res) => {
        res.should.have.status(401);
        done();
      });
  });

  it('should not POST a user activity if the url is wrong', (done) => {
    const body = {};
    chai.request(server)
      .post('/cases/activity')
      .set('Authorization', Token)
      .send(body)
      .end((err, res) => {
        res.should.have.status(404);
        done();
      });
  });
});
