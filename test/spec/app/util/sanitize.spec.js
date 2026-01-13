const { expect } = require('chai');
const path = require('path');
// Load module via absolute path to avoid parent-relative issues
// eslint-disable-next-line import/no-dynamic-require, global-require
const { sanitizeData } = require(path.resolve(__dirname, '../../../../app/util/sanitize.js'));

describe('sanitizeData', () => {
  it('should remove newline and carriage returns when data present', () => {
    const result = sanitizeData('abc\n123\rxyz');
    expect(result).to.equal('abc123xyz');
  });

  it('should return empty string for falsy data', () => {
    expect(sanitizeData('')).to.equal('');
    expect(sanitizeData(null)).to.equal('');
    expect(sanitizeData(undefined)).to.equal('');
  });
});
