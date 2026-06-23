const validateRequest = (schema, value) => (req, res, next) => {
  const { error } = schema.validate(value);
  const valid = error === null || error === undefined;
  if (valid) {
    next();
  } else {
    const { details } = error;
    const message = details.map((i) => i.message).join(',');
    res.status(400).json({ error: message });
  }
};

module.exports = validateRequest;
