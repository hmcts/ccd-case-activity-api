module.exports = {
  "extends": "airbnb-base",
  "env": {
    "mocha": true,
    "jasmine": true
  },
  "rules": {
    "comma-dangle": 0,
    "arrow-body-style": 0,
    "no-param-reassign": [ 2, { props: false } ],
    "linebreak-style": [ "error", process.platform === 'win32' ? 'windows' : 'unix' ]
  }
}
