const debug = require('debug')('ccd-case-activity-api:validate-request');

const validateRequest = (schema, value) => (req, res, next) => {
  const { error } = schema.validate(value);
  const valid = error == null;
  if (valid) {
    next();
  } else {
    const { details } = error;
    const message = details.map((i) => i.message).join(',');
    debug(`error ${message}`);
    res.status(400).json({ error: message });
  }
};

module.exports = validateRequest;
