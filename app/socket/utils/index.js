const other = require('./other');

module.exports = {
  ...other,
  get: require('./get'),
  remove: require('./remove'),
  store: require('./store'),
  watch: require('./watch')
};
