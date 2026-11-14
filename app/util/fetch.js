const nodeFetch = require('node-fetch');

const fetch = (...args) => nodeFetch(...args)
  .then(async (res) => {
    if (res.status >= 200 && res.status < 300) {
      return res;
    }

    // node-fetch v2 enforces these limits while consuming the error body.
    // Successful responses retain their existing limits and behaviour.
    res.size = 4096;
    res.timeout = 1000;
    let body = '[Diagnostic body unavailable]';
    let cause;
    try {
      body = await res.text();
    } catch (error) {
      cause = error;
    } finally {
      if (res.body) {
        res.body.destroy();
      }
    }
    const error = new Error(`Upstream HTTP ${res.status} ${res.statusText}: ${body}`);
    error.name = 'UpstreamResponseError';
    error.status = res.status;
    if (cause) {
      error.cause = cause;
    }
    throw error;
  });

module.exports = fetch;
