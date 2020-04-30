const config = require('config');
const fetch = require('../util/fetch');
const jwtUtil = require('../util/jwt');

const getTokenDetails = (jwt) => {

  return fetch(`${config.get('idam.base_url')}/o/userinfo`, {
    headers: {
      Authorization: jwtUtil.getBearerJwt(jwt),
    },
  })
    .then((res) => res.json());
};

exports.getTokenDetails = getTokenDetails;
