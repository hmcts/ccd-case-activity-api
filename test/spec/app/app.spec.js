const chai = require('chai');
const expect = chai.expect;
const proxyquire = require('proxyquire');
const request = require('supertest');
const sinon = require('sinon');

describe('application startup and error handling', () => {
  it('starts the cleanup job and request logger outside the test environment', () => {
    const cleanupJob = { start: sinon.spy(), force: sinon.spy() };
    const logger = sinon.stub().returns((req, res, next) => next());
    const config = {
      get: () => '0 0 * * *',
      util: { getEnv: () => 'preview' },
    };
    const middleware = (req, res, next) => next();

    proxyquire('../../../app', {
      config,
      '@hmcts/nodejs-healthcheck': { addTo: sinon.spy() },
      morgan: logger,
      './app/app-insights/app-insights': sinon.stub(),
      './app/job/store-cleanup-job': cleanupJob,
      './app/user/auth-checker-user-only-filter': middleware,
      './app/security/cors': middleware,
      './app/redis/redis-client': {},
      './app/service/ttl-score-generator': {},
      './app/service/activity-service': sinon.stub().returns({}),
      './app/routes/activity-route': sinon.stub().returns(middleware),
    });

    expect(logger).to.have.been.calledWith('dev');
    expect(cleanupJob.start).to.have.been.calledWith('0 0 * * *');
  });

  it('includes error details in development responses', async () => {
    const app = require('../../../app');
    const previousEnvironment = app.get('env');
    app.set('env', 'development');

    try {
      const response = await request(app).get('/unmatched-route');

      expect(response.status).to.equal(401);
      expect(response.body.message).to.equal('You are not authorized to access this resource');
    } finally {
      app.set('env', previousEnvironment);
    }
  });

  it('returns status 500 for errors without an explicit status', async () => {
    const app = proxyquire('../../../app', {
      './app/user/auth-checker-user-only-filter': (req, res, next) => next(new Error('unexpected failure')),
    });
    const response = await request(app).get('/any-route');

    expect(response.status).to.equal(500);
    expect(response.body.message).to.equal('unexpected failure');
  });
});
