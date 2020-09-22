var validator = require('../../../../app/routes/validate-request');
var Joi = require('joi');
var httpMocks = require('node-mocks-http')
var chai = require("chai");
var sinon  = require('sinon');
var expect = chai.expect;

describe("Validate request data", () => {

  beforeEach(function () {
  });

  it("should return status code 400 when validation failed", () => {
    let req = () => { };
    let res = httpMocks.createResponse();
    var nextSpy = sinon.spy();

    res.on('end', function () {
      expect(res.statusCode).to.equal(400);
      expect(res._getData()).to.equal('{"error":"\\"value\\" must be a number"}');
    });

    validator(Joi.number().required(), '33er4r') (req, res, nextSpy);
    expect(nextSpy.calledOnce).to.be.false;
  });

  it("should proceed to next function for valid request",  () => {
    let req = () => { };
    let res = httpMocks.createResponse();
    var nextSpy = sinon.spy();

    validator(Joi.number().required(), 3345) (req, res, nextSpy);
    expect(nextSpy.calledOnce).to.be.true;
  });

});
