const chai = require('chai');
const authorizer = require('./white-black-list-roles-authorizer');

chai.should();
const { expect } = chai;

describe('white-black-list-roles-authorizer case single role', () => {
  it('should not authorize when whitelist and blacklist are empty', () => {
    const authorised = authorizer.isUserAuthorized(['caseworker-probate'], [], []);
    expect(authorised).to.be.false;
  });

  it('should authorize when is whitelisted and not blacklist is empty', () => {
    const authorised = authorizer.isUserAuthorized(['caseworker-probate'], ['^caseworker-.+'], []);
    expect(authorised).to.be.true;
  });

  it('should not authorize when not whitelisted and blacklist is empty', () => {
    const authorised = authorizer.isUserAuthorized(['roleA'], ['^caseworker-.+'], []);
    expect(authorised).to.be.false;
  });

  it('should not authorize a blacklisted role ', () => {
    const authorised = authorizer.isUserAuthorized(['caseworker-solicitor'], ['^caseworker-.+'], ['solicitor']);
    expect(authorised).to.be.false;
  });

  it('should not authorize a role which is not whitelisted and not blacklisted', () => {
    const authorised = authorizer.isUserAuthorized(['caseworker'], ['^caseworker-.+'], ['solicitor']);
    expect(authorised).to.be.false;
  });
});

describe('white-black-list-roles-authorizer case multiple roles', () => {
  it('should authorize when no blacklisted roles and some whitelisted', () => {
    const authorised = authorizer.isUserAuthorized(['caseworker', 'caseworker-divorce'], ['^caseworker-.+'], ['solicitor']);
    expect(authorised).to.be.true;
  });

  it('should not authorize when some blacklisted', () => {
    const authorised = authorizer.isUserAuthorized(['caseworker', 'caseworker-divorce', 'caseworker-divorce-solicitor'], ['^caseworker-.+'], ['solicitor']);
    expect(authorised).to.be.false;
  });
});
