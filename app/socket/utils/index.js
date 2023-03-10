const other = require('./other');
const get = require('./get');
const remove = require('./remove');
const store = require('./store');
const watch = require('./watch');

module.exports = {
  ...other,
  get,
  remove,
  store,
  watch
};
