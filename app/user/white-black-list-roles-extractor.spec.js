const chai = require('chai');
const extractor = require('./white-black-list-roles-extractor');

chai.should();
const expect = chai.expect;

describe('white-black-list-roles-extractor', () => {
  it('should invoke activity service and return response on successful requests', () => {
    const authorised = extractor.getAuthorisedRoles(['caseworker-probate'], [], []);
    expect(authorised).to.deep.equal([]);
  });

  it('should invoke activity service and return response on ', () => {
    const authorised = extractor.getAuthorisedRoles(['caseworker-probate'], ['^caseworker-.+'], []);
    expect(authorised).to.deep.equal(['caseworker-probate']);
  });

  it('should invoke activity service and return response on ', () => {
    const authorised = extractor.getAuthorisedRoles(['probate'], ['^caseworker-.+'], []);
    expect(authorised).to.deep.equal([]);
  });

  it('should invoke activity service and return response on ', () => {
    const authorised = extractor.getAuthorisedRoles(['caseworker-solicitor'], ['^caseworker-.+'], ['solicitor']);
    expect(authorised).to.deep.equal([]);
  });

  it('should invoke activity service and return response on successful requests', () => {
    const authorised = extractor.getAuthorisedRoles(['caseworker'], ['^caseworker-.+'], ['solicitor']);
    expect(authorised).to.deep.equal([]);
  });

  it('should invoke activity service and return response on successful requests', () => {
    const authorised = extractor.getAuthorisedRoles(['caseworker', 'caseworker-divorce'], ['^caseworker-.+'], ['solicitor']);
    expect(authorised).to.deep.equal(['caseworker', 'caseworker-divorce']);
  });

  it('should invoke activity service and return response on successful requests', () => {
    const authorised = extractor.getAuthorisedRoles(['caseworker', 'caseworker-divorce', 'caseworker-divorce-courtAdmin'], ['^caseworker-.+'], ['solicitor']);
    expect(authorised).to.deep.equal(['caseworker', 'caseworker-divorce', 'caseworker-divorce-courtAdmin']);
  });

  it('should invoke activity service and return response on successful requests', () => {
    const authorised = extractor.getAuthorisedRoles(['caseworker', 'caseworker-divorce', 'caseworker-divorce-solicitor'], ['^caseworker-.+'], ['solicitor']);
    expect(authorised).to.deep.equal([]);
  });

  it('should invoke activity service and return response on successful requests', () => {
    const authorised = extractor.getAuthorisedRoles(['caseworker', 'caseworker-divorce', 'caseworker-divorce-courtAdmin', 'otherRoles'], ['^caseworker-.+'], ['solicitor']);
    expect(authorised).to.deep.equal(['caseworker', 'caseworker-divorce', 'caseworker-divorce-courtAdmin', 'otherRoles']);
  });

  it('should invoke activity service and return response on successful requests', () => {
    const authorised = extractor.getAuthorisedRoles(['citizen'], ['^caseworker-.+'], ['solicitor']);
    expect(authorised).to.deep.equal([]);
  });

  it('should invoke activity service and return response on successful requests', () => {
    const authorised = extractor.getAuthorisedRoles(['otherRoles'], ['^caseworker-.+'], ['solicitor']);
    expect(authorised).to.deep.equal([]);
  });
});
