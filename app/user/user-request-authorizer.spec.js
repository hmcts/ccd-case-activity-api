const proxyquire = require('proxyquire');
const chai = require('chai');
const sinon = require('sinon');

const expect = chai.expect;
const sinonChai = require('sinon-chai');

chai.use(sinonChai);

describe('UserRequestAuthorizer', () => {
  describe('authorize', () => {
    const AUTHZ_HEADER = 'Bearer cincwuewncew.cewnuceuncwe.cewucwbeu';
    const USER_ID = 1;
    const ROLE_1 = 'role1';
    const DETAILS = {
      id: USER_ID,
      roles: [ROLE_1],
    };

    let request;
    let userResolver;
    let authorizedRolesExtractor;
    let userIdExtractor;

    let userRequestAuthorizer;

    beforeEach(() => {
      request = {
        get: sinon.stub().returns(AUTHZ_HEADER),
      };
      userResolver = {
        getTokenDetails: sinon.stub().returns(Promise.resolve(DETAILS)),
      };
      authorizedRolesExtractor = {
        extract: sinon.stub(),
      };
      userIdExtractor = {
        extract: sinon.stub(),
      };

      userRequestAuthorizer = proxyquire('./user-request-authorizer', {
        './user-resolver': userResolver,
        './authorised-roles-extractor': authorizedRolesExtractor,
        './user-id-extractor': userIdExtractor,
      });
    });

    it('should reject missing Authorization header', (done) => {
      request.get.returns(null);

      userRequestAuthorizer.authorise(request)
        .then(() => fail('Promise should have been rejected'))
        .catch((error) => {
          expect(error).to.equal(userRequestAuthorizer.ERROR_TOKEN_MISSING);
          done();
        });
    });

    it('should reject when user cannot be resolved', (done) => {
      const ERROR = { error: 'oops', status: 401 };
      userResolver.getTokenDetails.returns(Promise.reject(ERROR));

      userRequestAuthorizer.authorise(request)
        .then(() => fail('Promise should have been rejected'))
        .catch((error) => {
          expect(error).to.equal(ERROR);
          done();
        });
    });

    it('should reject when roles do not match', (done) => {
      authorizedRolesExtractor.extract.returns(['no-match']);

      userRequestAuthorizer.authorise(request)
        .then(() => fail('Promise should have been rejected'))
        .catch((error) => {
          expect(error).to.equal(userRequestAuthorizer.ERROR_UNAUTHORISED_ROLE);
          done();
        });
    });

    it('should NOT reject when no roles extracted', (done) => {
      authorizedRolesExtractor.extract.returns([]);

      userRequestAuthorizer.authorise(request)
        .then(() => done())
        .catch((error) => {
          expect(error).not.to.equal(userRequestAuthorizer.ERROR_UNAUTHORISED_ROLE);
          done();
        });
    });

    it('should reject when user id does not match', (done) => {
      userIdExtractor.extract.returns('no-match');

      userRequestAuthorizer.authorise(request)
        .then(() => fail('Promise should have been rejected'))
        .catch((error) => {
          expect(error).to.equal(userRequestAuthorizer.ERROR_UNAUTHORISED_USER_ID);
          done();
        });
    });

    it('should NOT reject when no user id extracted', (done) => {
      userIdExtractor.extract.returns(null);

      userRequestAuthorizer.authorise(request)
        .then(() => done())
        .catch((error) => {
          expect(error).not.to.equal(userRequestAuthorizer.ERROR_UNAUTHORISED_USER_ID);
          done();
        });
    });

    it('should resolve with user details when all checks OK', (done) => {
      authorizedRolesExtractor.extract.returns([ROLE_1]);
      userIdExtractor.extract.returns(String(USER_ID));

      userRequestAuthorizer.authorise(request)
        .then((user) => {
          expect(user).to.equal(DETAILS);
          done();
        })
        .catch(() => fail('Promise should have been resolved'));
    });
  });
});
