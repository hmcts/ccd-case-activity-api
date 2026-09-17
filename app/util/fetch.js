// node-fetch v3 is ESM-only, so load it dynamically from this CommonJS module.
const nodeFetch = import('node-fetch').then(({ default: fetcher }) => fetcher);

const fetch = (...args) => nodeFetch.then((fetcher) => fetcher(...args))
  .then((res) => {
    if (res.status >= 200 && res.status < 300) {
      return res;
    }

    return Promise.reject(res);
  });

module.exports = fetch;
