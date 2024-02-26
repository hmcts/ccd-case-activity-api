const config = require('config');
const appInsights = require('applicationinsights');

const enableAppInsights = () => {
  const appInsightsKey = config.get('secrets.ccd.AppInsightsInstrumentationKey');
  const appInsightsRoleName = config.get('appInsights.roleName');
  appInsights.setup(appInsightsKey)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectConsole(true, true);
  appInsights.defaultClient.context.tags[
    appInsights.defaultClient.context.keys.cloudRole] = appInsightsRoleName;
  appInsights.defaultClient.config.samplingPercentage = 1;
  appInsights.start();
};

module.exports = enableAppInsights;
