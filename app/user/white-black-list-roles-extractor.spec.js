const chai = require('chai');
const extractor = require('./white-black-list-roles-extractor');

chai.should();
const expect = chai.expect;

describe('white-black-list-roles-extractor case single role', () => {
  it('should not authorize when whitelist and blacklist are empty', () => {
    const authorised = extractor.getAuthorisedRoles(['caseworker-probate'], [], []);
    expect(authorised).to.deep.equal([]);
  });

  it('should authorize when is whitelisted and not blacklist is empty', () => {
    const authorised = extractor.getAuthorisedRoles(['caseworker-probate'], ['^caseworker-.+'], []);
    expect(authorised).to.deep.equal(['caseworker-probate']);
  });

  it('should not authorize when not whitelisted and blacklist is empty', () => {
    const authorised = extractor.getAuthorisedRoles(['roleA'], ['^caseworker-.+'], []);
    expect(authorised).to.deep.equal([]);
  });

  it('should not authorize a blacklisted role ', () => {
    const authorised = extractor.getAuthorisedRoles(['caseworker-solicitor'], ['^caseworker-.+'], ['solicitor']);
    expect(authorised).to.deep.equal([]);
  });

  it('should not authorize a role which is not whitelisted and not blacklisted', () => {
    const authorised = extractor.getAuthorisedRoles(['caseworker'], ['^caseworker-.+'], ['solicitor']);
    expect(authorised).to.deep.equal([]);
  });
});

describe('white-black-list-roles-extractor case multiple roles', () => {
  it('should authorize when no blacklisted roles and some whitelisted', () => {
    const authorised = extractor.getAuthorisedRoles(['caseworker', 'caseworker-divorce'], ['^caseworker-.+'], ['solicitor']);
    expect(authorised).to.deep.equal(['caseworker', 'caseworker-divorce']);
  });

  it('should not authorize when some blacklisted', () => {
    const authorised = extractor.getAuthorisedRoles(['caseworker', 'caseworker-divorce', 'caseworker-divorce-solicitor'], ['^caseworker-.+'], ['solicitor']);
    expect(authorised).to.deep.equal([]);
  });
});
