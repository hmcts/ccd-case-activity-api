process.env.NODE_ENV = 'test';
process.env.DEBUG = 'ccd-case-activity-api:*';

const chai = require('chai');
const chaiHttp = require('chai-http');

const mock = require('mock-require');

mock('../../app/user/auth-checker-user-only-filter', './stubs/idam-stub');

const server = require('../../app');
const redis = require('../../app/redis/redis-client');
const delayed = require('../../app/util/delayed');
const activityAssert = require('./utils/activity-store-asserts');
const testUtils = require('./utils/test-utils')(chai, server);

const should = chai.should(); // eslint-disable-line no-unused-vars

chai.use(chaiHttp);

/* Relies on activityTtlSec:5, userDetailsTtlSec:2 */

describe('Activity Service store cleanup', () => {
  beforeEach(() => redis.flushall());

  const CASE_ID = 55;

  it('should cleanup expired activities and list of cases with activities', (done) => {
    // these activities happen way before the cleanup job runs. They will have expired by that time
    const a1 = testUtils.addActivity(1242, CASE_ID, 'view');
    const a2 = testUtils.addActivity(10, CASE_ID, 'view');
    const a3 = testUtils.addActivity(10, CASE_ID, 'edit');

    Promise.all([a1, a2, a3]).then(() =>
      Promise.all([
        activityAssert.allCaseViewersEquals(CASE_ID, ['1242', '10']),
        activityAssert.allCaseEditorsEquals(CASE_ID, ['10'])]))
      .catch(error => done(error));

    // these activities happen just before the cleanup job runs. They won't have expired yet
    const BeforeCleanup = 5 * 1000;
    delayed(BeforeCleanup, () => {
      testUtils.addActivity(88, CASE_ID, 'view').end();
      testUtils.addActivity(98, CASE_ID, 'view').end();
      testUtils.addActivity(198, CASE_ID, 'edit').end();
    });

    delayed(7 * 1000, () => {
      server.forceStoreCleanup();
    });

    // after cleanup job has run
    const AfterCleanup = 10 * 1000;
    delayed(AfterCleanup, () => {
      Promise.all([
        activityAssert.allCaseViewersEquals(CASE_ID, ['88', '98']),
        activityAssert.allCaseEditorsEquals(CASE_ID, ['198'])])
        .then(() => done())
        .catch(error => done(error));
    });
  });

  it('should not touch unexpired activities', (done) => {
    // these activities happen way before the cleanup job runs. They will have expired by that time
    const a1 = testUtils.addActivity(1242, CASE_ID, 'view');
    const a2 = testUtils.addActivity(10, CASE_ID, 'view');
    const a3 = testUtils.addActivity(10, CASE_ID, 'edit');

    Promise.all([a1, a2, a3]).then(() =>
      Promise.all([
        activityAssert.allCaseViewersEquals(CASE_ID, ['1242', '10']),
        activityAssert.allCaseEditorsEquals(CASE_ID, ['10']),
        // This should no effect since none of the items are expired
        server.forceStoreCleanup()]))
      .catch(error => done(error));

    delayed(7 * 1000, () => { // Do regular cleanup and clean items
      server.forceStoreCleanup();
    });

    // after cleanup job has run nothing must be left
    const AfterCleanup = 10 * 1000;
    delayed(AfterCleanup, () => {
      Promise.all([
        activityAssert.allCaseViewersEquals(CASE_ID, []),
        activityAssert.allCaseEditorsEquals(CASE_ID, [])])
        .then(() => done())
        .catch(error => done(error));
    });
  });

  it('smoke - should cleanup expired user details', (done) => {
    const a1 = testUtils.addActivity(1242, CASE_ID, 'view');
    const a2 = testUtils.addActivity(10, CASE_ID, 'view');
    const a3 = testUtils.addActivity(10, CASE_ID, 'edit');

    Promise.all([a1, a2, a3]).then(() =>
      Promise.all([
        activityAssert.allCaseViewersEquals(CASE_ID, ['1242', '10']),
        activityAssert.allCaseEditorsEquals(CASE_ID, ['10'])]))
      .catch(error => done(error));

    const AfterUserDetailsTTL = 4 * 1000;
    delayed(AfterUserDetailsTTL, () => {
      Promise.all([
        activityAssert.userDetailsEquals(1242, undefined),
        activityAssert.userDetailsEquals(10, undefined)])
        .then(() => done())
        .catch(error => done(error));
    });
  });
});
