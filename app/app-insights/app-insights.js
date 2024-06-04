const config = require('config');
const appInsights = require('applicationinsights');

const enableAppInsights = () => {
  const appInsightsString = config.get('secrets.ccd.app-insights-connection-string');
  appInsights.setup(appInsightsString)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectConsole(true, true);
  appInsights.defaultClient.config.samplingPercentage = 1;
  appInsights.start();
};

module.exports = enableAppInsights;
