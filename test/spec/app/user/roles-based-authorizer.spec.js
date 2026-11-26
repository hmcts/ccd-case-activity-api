const chai = require('chai');
const expect = chai.expect;
const proxyquire = require('proxyquire');

describe('roles-based-authorizer configuration', () => {
  it('uses empty role lists when whitelist and blacklist are not configured', () => {
    const config = { get: () => undefined };
    const roleAuthorizer = { isUserAuthorized: () => false };
    const authorizer = proxyquire('../../../../app/user/roles-based-authorizer', {
      config,
      './white-black-list-roles-authorizer': roleAuthorizer,
    });

    expect(authorizer.isUserAuthorized({}, { roles: ['caseworker'] })).to.equal(false);
  });
});
