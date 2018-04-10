const activityStore = require('../utils/activity-store-commands')
const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const assertArrays = require('chai-arrays');
chai.use(assertArrays);

let assertValueOrArray = (actual, expected) => {
    if(Array.isArray(expected)) {
      expect(actual).to.be.ofSize(expected.length);
      expect(actual).to.be.containingAllOf(expected);
    } else {
      assert.equal(actual, expected)
    }
}

exports.allCaseViewersEquals = (caseId, expected) => {
  return activityStore.getAllCaseViewers(caseId).then(result => {
    assertValueOrArray(result, expected);
  })
}

exports.notExpiredCaseViewersEquals = (caseId, expected) => {
  return activityStore.getNotExpiredCaseViewers(caseId).then(result => {
   assertValueOrArray(result, expected);
  })
}
exports.allCaseEditorsEquals = (caseId, expected) => {
  return activityStore.getAllCaseEditors(caseId).then(result => {
    assertValueOrArray(result, expected);
  })
}

exports.notExpiredCaseEditorsEquals = (caseId, expected) => {
  return activityStore.getNotExpiredCaseEditors(caseId).then(result => {
    assertValueOrArray(result, expected);
  })
}

exports.userDetailsEquals = (userId, expected) => {
  return activityStore.getUser(userId).then(result => {
    assert.equal(result, expected);
  })
}
