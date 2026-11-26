const chai = require('chai');
const expect = chai.expect;
const sanitize = require('../../../../app/util/sanitize');

describe('sanitizeData', () => {
  it('returns an empty string for missing data', () => {
    expect(sanitize.sanitizeData(undefined)).to.equal('');
  });
});
