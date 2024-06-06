const config = require('config');
const appInsights = require('applicationinsights');

const enableAppInsights = () => {
  const appInsightsKey = config.get('secrets.ccd.AppInsightsInstrumentationKey');
  appInsights.setup(appInsightsKey)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectConsole(true, true);
  appInsights.defaultClient.config.samplingPercentage = 1;
  appInsights.start();
};

module.exports = enableAppInsights;
