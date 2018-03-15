const _fetch = require('node-fetch');

const fetch = (...args) => _fetch(...args)
  .then((res) => {
    if (res.status >= 200 && res.status < 300) {
      return res;
    }

    return Promise.reject(res);
  });

module.exports = fetch;
