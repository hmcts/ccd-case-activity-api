const chai = require('chai');
const expect = chai.expect;
const proxyquire = require('proxyquire');
const enableAppInsights = require('../../../../app/app-insights/app-insights');

describe('Application insights', () => {
  it('should initialize properly', () => {
    expect(enableAppInsights).to.not.throw();
  });

  it('configures and starts Application Insights when enabled', () => {
    const cloudRole = 'cloudRole';
    const appInsights = {
      setup: () => appInsights,
      setAutoDependencyCorrelation: () => appInsights,
      setAutoCollectConsole: () => appInsights,
      start: () => appInsights,
      defaultClient: {
        context: { tags: {}, keys: { cloudRole } },
        config: {},
      },
    };
    const config = {
      get: (key) => ({
        'appInsights.enabled': true,
        'secrets.ccd.app-insights-connection-string': 'connection-string',
        'appInsights.roleName': 'case-activity-api',
      })[key],
    };
    const setup = proxyquire('../../../../app/app-insights/app-insights', {
      config,
      applicationinsights: appInsights,
    });

    setup();

    expect(appInsights.defaultClient.context.tags[cloudRole]).to.equal('case-activity-api');
    expect(appInsights.defaultClient.config.samplingPercentage).to.equal(1);
  });
});
