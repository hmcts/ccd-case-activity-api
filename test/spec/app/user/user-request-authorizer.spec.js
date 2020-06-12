const proxyquire = require('proxyquire');
const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;
const sinonChai = require('sinon-chai');
chai.use(sinonChai);


describe('UserRequestAuthorizer', () => {

  describe('authorize', () => {

    const USER_INFO_CACHE_ENABLED = 'cache.user_info_enabled';

    const AUTHZ_HEADER = 'Bearer cincwuewncew.cewnuceuncwe.cewucwbeu';
    const USER_ID = '1';
    const ROLE_1 = 'role1';
    const DETAILS = {
      uid: USER_ID,
      roles: [ROLE_1]
    };

    let config;
    let request;
    let cachedUserResolver = {};
    let userResolver = {};
    let rolesBasedAuthorizer = {};

    let userRequestAuthorizer;

    const requireUserRequestAuthorizer = () => {
      userRequestAuthorizer = proxyquire('../../../../app/user/user-request-authorizer', {
        'config': config,
        './cached-user-resolver': cachedUserResolver,
        './user-resolver': userResolver,
        './roles-based-authorizer': rolesBasedAuthorizer
      });
    };

    beforeEach(() => {
      request = {
        get: sinon.stub().returns(AUTHZ_HEADER)
      };

      // default stubs are for HAPPY PATH scenario
      config = {
        get: sinon.stub().withArgs(USER_INFO_CACHE_ENABLED).returns(true)
      };
      cachedUserResolver = {
        getUserDetails: sinon.stub().returns(Promise.resolve(DETAILS))
      };
      // NB: use a single common user resolver for default set of tests
      userResolver = cachedUserResolver;
      rolesBasedAuthorizer = {
        isUserAuthorized: sinon.stub().returns(true)
      };

      requireUserRequestAuthorizer();
    });

    it('should reject missing Authorization header', done => {
      request.get.returns(null);

      userRequestAuthorizer.authorise(request)
        .then(() => done(new Error('Promise should have been rejected')))
        .catch((error) => {
          expect(error).to.equal(userRequestAuthorizer.ERROR_TOKEN_MISSING);
          done();
        });
    });

    it('should pass authorize header token to user resolver if cache disabled', done => {
      config.get.withArgs(USER_INFO_CACHE_ENABLED).returns(false);
      // NB: use seperate user resolvers for cached/not-cached tests
      userResolver = {
        getUserDetails: sinon.stub().returns(Promise.resolve(DETAILS))
      };

      // NB: re-require after config override
      requireUserRequestAuthorizer();

      userRequestAuthorizer.authorise(request)
        .then(() => {
          expect(config.get).to.have.been.calledWith(USER_INFO_CACHE_ENABLED);

          expect(userResolver.getUserDetails).to.have.been.calledWith(AUTHZ_HEADER);
          expect(cachedUserResolver.getUserDetails).not.to.have.been.called;
          done();
        })
        .catch((error) => {
          done(error);
        });
    });

    it('should pass authorize header token to cached user resolver if cache enabled', done => {
      config.get.withArgs(USER_INFO_CACHE_ENABLED).returns(true);
      // NB: use seperate user resolvers for cached/not-cached tests
      userResolver = {
        getUserDetails: sinon.stub().returns(Promise.resolve(DETAILS))
      };

      // NB: re-require after config override
      requireUserRequestAuthorizer();

      userRequestAuthorizer.authorise(request)
        .then(() => {
          expect(config.get).to.have.been.calledWith(USER_INFO_CACHE_ENABLED);

          expect(cachedUserResolver.getUserDetails).to.have.been.calledWith(AUTHZ_HEADER);
          expect(userResolver.getUserDetails).not.to.have.been.called;
          done();
        })
        .catch((error) => {
          done(error);
        });
    });

    it('should reject when user cannot be resolved', done => {
      const ERROR = { error: 'oops', status: 401 };
      userResolver.getUserDetails.returns(Promise.reject(ERROR));

      userRequestAuthorizer.authorise(request)
        .then(() => done(new Error('Promise should have been rejected')))
        .catch((error) => {
          expect(error).to.equal(ERROR);
          done();
        });
    });

    it('should pass resolved user details to roles authorizer', done => {
      userRequestAuthorizer.authorise(request)
        .then(() => {
          expect(rolesBasedAuthorizer.isUserAuthorized).to.have.been.calledWith(request, DETAILS);
          done();
        })
        .catch((error) => {
          done(error);
        });
    });

    it('should reject when roles authorizer says unauthorized', done => {
      rolesBasedAuthorizer.isUserAuthorized.returns(false);

      userRequestAuthorizer.authorise(request)
        .then(() => done(new Error('Promise should have been rejected')))
        .catch((error) => {
          expect(error).to.equal(userRequestAuthorizer.ERROR_UNAUTHORISED_ROLE);
          done();
        });
    });

    it('should NOT reject when roles authorizer says authorized', done => {
      rolesBasedAuthorizer.isUserAuthorized.returns(true);

      userRequestAuthorizer.authorise(request)
        .then(() => done())
        .catch((error) => {
          expect(error).not.to.equal(userRequestAuthorizer.ERROR_UNAUTHORISED_ROLE);
          done();
        });
    });

    it('should resolve with user details when all checks OK', done => {
      userRequestAuthorizer.authorise(request)
        .then((user) => {
          expect(user).to.equal(DETAILS);
          done();
        })
        .catch((error) => {
          done(new Error('Promise should have been resolved'))
        });
    });
  });
});
