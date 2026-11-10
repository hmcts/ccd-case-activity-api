const { STATUS_CODES } = require('http');
const { Logger } = require('@hmcts/nodejs-logging');
const { withFailureDiagnostics } = require('./failure-diagnostics');

const logger = Logger.getLogger('safeErrors');
// Only errors created here can carry approved public validation details.
const activityValidationErrors = new WeakSet();
const invalidActivityError = () => {
  const error = new Error('activity must be one of: view, edit');
  error.status = 400;
  activityValidationErrors.add(error);
  return error;
};
const codes = {
  400: 'INVALID_REQUEST',
  422: 'INVALID_REQUEST',
  401: 'AUTHENTICATION_REQUIRED',
  403: 'ACCESS_DENIED',
  404: 'RESOURCE_NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  413: 'REQUEST_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  429: 'TOO_MANY_REQUESTS',
};

const safeError = (value, cause) => {
  const candidate = Number(value);
  const status = Number.isInteger(candidate) && candidate >= 400 && candidate < 600
    ? candidate : 500;
  const message = STATUS_CODES[status] || 'Request failed';
  const body = {
    status,
    error: message,
    message,
    code: codes[status] || (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED'),
  };
  if (cause !== undefined) {
    Object.defineProperty(body, 'cause', { value: cause });
  }
  return body;
};

// Preserve nested causes without logging arbitrary request properties or looping on cycles.
const diagnosticError = (error) => {
  const seen = new Set();
  const messages = [];
  let current = error;
  while (current && !seen.has(current) && messages.length < 16) {
    seen.add(current);
    messages.push(current.stack || current.message || String(current));
    current = current.cause;
  }
  if (current) {
    messages.push('[Cause chain truncated or cyclic]');
  }
  return messages.join('\nCaused by: ');
};

// Four arguments are required for Express to recognise error middleware.
const errorHandler = (err, req, res, next) => {
  const body = safeError(err && (err.status || err.statusCode));
  if (activityValidationErrors.has(err)) {
    body.message = err.message;
  }
  const original = err instanceof Error ? err : (err && err.cause) || err;
  withFailureDiagnostics(body.status, original, (fields) => {
    logger[body.status >= 500 ? 'error' : 'warn'](
      `Request failed: code=${body.code} status=${body.status}`, { error: diagnosticError(original), ...fields },
    );
  }, activityValidationErrors.has(err) ? 'ACTIVITY_VALUE_INVALID' : undefined);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(body.status).json({ message: body.message });
};

module.exports = {
  safeError, errorHandler, diagnosticError, invalidActivityError,
};
