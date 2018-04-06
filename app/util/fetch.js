const nodeFetch = require('node-fetch');

const fetch = (...args) => nodeFetch(...args)
  .then((res) => {
    if (res.status >= 200 && res.status < 300) {
      return res;
    }

    return Promise.reject(res);
  });

module.exports = fetch;
