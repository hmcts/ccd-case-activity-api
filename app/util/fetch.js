const nodeFetch = require('node-fetch').default;

const fetch = (...args) => nodeFetch(...args)
  .then(async (res) => {
    if (res.status >= 200 && res.status < 300) {
      return res;
    }

    // Bound error diagnostics while consuming the response body.
    // Successful responses retain their existing limits and behaviour.
    res.size = 4096;
    let body = '[Diagnostic body unavailable]';
    let cause;
    let timer;
    try {
      body = await Promise.race([
        res.text(),
        new Promise((resolve, reject) => {
          timer = setTimeout(() => {
            const timeout = new Error('Upstream diagnostic body timed out');
            timeout.type = 'body-timeout';
            reject(timeout);
          }, 1000);
        })
      ]);
    } catch (error) {
      cause = error;
    } finally {
      clearTimeout(timer);
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
