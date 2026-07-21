const config = require('config');
const appInsights = require('applicationinsights');

const enabled = config.get('appInsights.enabled');

const enableAppInsights = () => {
  if (!enabled) {
    return;
  }
  const appInsightsString = config.get('secrets.ccd.app-insights-connection-string');
  const appInsightsRoleName = config.get('appInsights.roleName');
  appInsights.setup(appInsightsString)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectConsole(true, true);
  appInsights.defaultClient.context.tags[
    appInsights.defaultClient.context.keys.cloudRole] = appInsightsRoleName;
  appInsights.defaultClient.config.samplingPercentage = 1;
  appInsights.start();
};

module.exports = enableAppInsights;
