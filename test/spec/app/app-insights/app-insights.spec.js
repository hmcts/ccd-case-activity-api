const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const path = require('path');
const enableAppInsights = require('../../../../app/app-insights/app-insights');

describe('Application insights', () => {
  it('should initialize properly', () => {
    expect(enableAppInsights).to.not.throw();
  });

  it('should read connection string and role name when enabled', () => {
    const configStub = {
      get: sinon.stub()
        .withArgs('appInsights.enabled').returns(true)
        .withArgs('secrets.rpx.app-insights-connection-string-at').returns('InstrumentationKey=XYZ;IngestionEndpoint=https://foo')
        .withArgs('appInsights.roleName').returns('rpx-case-activity-api'),
    };
    const defaultClient = { context: { tags: {}, keys: { cloudRole: 'cloudRoleKey' } }, config: {} };
    const setAutoDependencyCorrelation = sinon.stub().returnsThis();
    const setAutoCollectConsole = sinon.stub().returnsThis();
    const setupStub = sinon.stub().returns({ setAutoDependencyCorrelation, setAutoCollectConsole });
    const startStub = sinon.stub();
    const appInsightsStub = { setup: setupStub, start: startStub, defaultClient };

    const modulePath = path.resolve(__dirname, '../../../../app/app-insights/app-insights.js');
    delete require.cache[modulePath];
    const enableWithStubs = proxyquire(modulePath, {
      config: configStub,
      applicationinsights: appInsightsStub,
    });

    enableWithStubs();

    expect(setupStub).to.have.been.calledOnce;
    expect(configStub.get).to.have.been.calledWith('secrets.rpx.app-insights-connection-string-at');
    expect(configStub.get).to.have.been.calledWith('appInsights.roleName');
    expect(defaultClient.context.tags['cloudRoleKey']).to.equal('rpx-case-activity-api');
    expect(startStub).to.have.been.calledOnce;
  });
});
