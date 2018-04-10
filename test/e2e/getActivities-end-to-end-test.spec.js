process.env.NODE_ENV = 'test';
process.env.DEBUG = 'ccd-case-activity-web:*';

const chai = require('chai');
const chaiHttp = require('chai-http');

const mock = require('mock-require');

mock('../../app/user/auth-checker-user-only-filter', './stubs/idam-stub');

const server = require('../../app');
const redis = require('../../app/redis/redis-client');
const delayed = require('../../app/util/delayed');
const activityAssert = require('./utils/activity-store-asserts');
const testUtils = require('./utils/test-utils')(chai, server);

const FORENAME = 'john';
const SURNAME = 'smith';

const should = chai.should(); // eslint-disable-line no-unused-vars


const Token = JSON.stringify({ id: 242, forename: 'nayab', surname: 'gul' });

chai.use(chaiHttp);

/* Relies on activityTtlSec:5, userDetailsTtlSec:2 */

describe('Activity Service - GetActivities', () => {
  beforeEach(() => redis.flushall());

  after(() => redis.flushall());

  it('should retrieve all activities for a case', (done) => {
    const a1 = testUtils.addActivity(1242, 111, 'view', FORENAME, SURNAME);
    const a2 = testUtils.addActivity(10, 111, 'view', FORENAME, SURNAME);
    const a3 = testUtils.addActivity(10, 121, 'edit', FORENAME, SURNAME);

    Promise.all([a1, a2, a3])
      .then(() => {
        Promise.all([
          activityAssert.allCaseViewersEquals(111, ['1242', '10']),
          activityAssert.allCaseEditorsEquals(121, ['10'])]);
        chai.request(server)
          .get('/cases/111/activity')
          .set('Authorization', Token)
          .end((err, res) => {
            res.should.have.status(200);
            res.should.be.json; // eslint-disable-line no-unused-expressions
            res.body.should.be.a('array');
            res.body.length.should.equal(1);
            res.body[0].caseId.should.equal('111');
            res.body[0].viewers.should.be.a('array');
            res.body[0].viewers[0].forename.should.equal(FORENAME);
            res.body[0].viewers[0].surname.should.equal(SURNAME);
            res.body[0].editors.should.be.a('array');
            res.body[0].editors.length.should.equal(0);
            done();
          });
      })
      .catch(error => done(error));
  });

  it('should retrieve all activities for a list of cases', (done) => {
    const a1 = testUtils.addActivity(1242, 111, 'view', FORENAME, SURNAME);
    const a2 = testUtils.addActivity(10, 111, 'view', FORENAME, SURNAME);
    const a3 = testUtils.addActivity(10, 121, 'edit', FORENAME, SURNAME);

    Promise.all([a1, a2, a3])
      .then(() => {
        Promise.all([
          activityAssert.allCaseViewersEquals(111, ['1242', '10']),
          activityAssert.allCaseEditorsEquals(121, ['10'])]);
        chai.request(server)
          .get('/cases/111,121/activity')
          .set('Authorization', Token)
          .end((err, res) => {
            res.should.have.status(200);
            res.should.be.json; // eslint-disable-line no-unused-expressions
            res.body.should.be.a('array');
            res.body.length.should.equal(2);
            res.body[0].caseId.should.equal('111');
            res.body[1].caseId.should.equal('121');
            res.body[0].viewers.should.be.a('array');
            res.body[0].viewers[0].forename.should.equal(FORENAME);
            res.body[0].viewers[0].surname.should.equal(SURNAME);
            res.body[0].editors.should.be.a('array');
            res.body[0].editors.length.should.equal(0);
            res.body[1].editors.length.should.equal(1);
            done();
          });
      })
      .catch(error => done(error));
  });

  it('should get only the non expired activities', (done) => {
    const a1 = testUtils.addActivity(1242, 111, 'view', FORENAME, SURNAME);
    const a2 = testUtils.addActivity(10, 111, 'view', FORENAME, SURNAME);
    const a3 = testUtils.addActivity(10, 121, 'edit', FORENAME, SURNAME);

    Promise.all([a1, a2, a3])
      .then(() => Promise.all([
        activityAssert.allCaseViewersEquals(111, ['1242', '10']),
        activityAssert.allCaseEditorsEquals(121, ['10'])]))
      .catch(error => done(error));


    const AfterActivitiesExpired = 7 * 1000;
    delayed(AfterActivitiesExpired, () => {
      const a4 = testUtils.addActivity(88, 111, 'view', FORENAME, SURNAME);
      const a5 = testUtils.addActivity(98, 111, 'view', FORENAME, SURNAME);
      const a6 = testUtils.addActivity(198, 121, 'edit', FORENAME, SURNAME);

      Promise.all([a4, a5, a6])
        .then(() => {
          Promise.all([
            activityAssert.allCaseViewersEquals(111, ['1242', '10', '88', '98']),
            activityAssert.allCaseEditorsEquals(121, ['10', '198'])]);

            chai.request(server)
            .get('/cases/111,121/activity')
            .set('Authorization', Token)
            .end((err, res) => {
              res.should.have.status(200);
              res.should.be.json; // eslint-disable-line no-unused-expressions
              res.body.should.be.a('array');
              res.body[0].caseId.should.equal('111');
              res.body[1].caseId.should.equal('121');
              res.body[0].viewers.should.be.a('array');
              res.body[0].viewers.length.should.equal(2);
              res.body[0].viewers[0].forename.should.equal(FORENAME);
              res.body[0].viewers[1].surname.should.equal(SURNAME);
              res.body[0].editors.should.be.a('array');
              res.body[0].editors.length.should.equal(0);
              res.body[1].editors.length.should.equal(1);
              done();
            });
        })
        .catch(error => done(error));
    });
  });

  it('should display unknown viewer/editor count for tho users whose info is expired', (done) => {
    const a1 = testUtils.addActivity(11, 111, 'view', FORENAME, SURNAME);
    const a2 = testUtils.addActivity(12, 121, 'edit', FORENAME, SURNAME);

    Promise.all([a1, a2])
      .then(() => Promise.all([
        activityAssert.allCaseViewersEquals(111, ['11']),
        activityAssert.allCaseEditorsEquals(121, ['12'])]))
      .catch(error => done(error));

    const USER_EXPIRED_TIME = 3 * 1000;
    delayed(USER_EXPIRED_TIME, () => {
      const a4 = testUtils.addActivity(88, 111, 'view', FORENAME, SURNAME);
      const a5 = testUtils.addActivity(98, 111, 'view', FORENAME, SURNAME);
      const a6 = testUtils.addActivity(198, 121, 'edit', FORENAME, SURNAME);

      Promise.all([a4, a5, a6])
        .then(() => {
          Promise.all([
            activityAssert.allCaseViewersEquals(111, ['11', '88', '98']),
            activityAssert.allCaseEditorsEquals(121, ['12', '198'])]);
          chai.request(server)
            .get('/cases/111,121/activity')
            .set('Authorization', Token)
            .end((err, res) => {
              res.should.have.status(200);
              res.should.be.json; // eslint-disable-line no-unused-expressions
              res.body.should.be.a('array');
              res.body[0].caseId.should.equal('111');
              res.body[1].caseId.should.equal('121');
              res.body[0].viewers.should.be.a('array');
              res.body[0].viewers.length.should.equal(2);
              res.body[0].unknownViewers.should.equal(1);
              res.body[0].editors.should.be.a('array');
              res.body[0].editors.length.should.equal(0);
              res.body[1].editors.length.should.equal(1);
              res.body[1].unknownEditors.should.equal(1);
              done();
            });
        })
        .catch(error => done(error));
    });
  });
});
