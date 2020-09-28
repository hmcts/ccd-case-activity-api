#===========================
@F-018
Feature: F-018: Add Activity
#===========================

Background: Load test data for the scenario
      Given an appropriate test context as detailed in the test data source

#-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
@Smoke
@S-001
Scenario: must successfully add an activity with a correct and complete invocation

    Given a user with [an active profile in CCD],
      And a case that has just been created as in [Standard_Full_Case_Creation_Data],

     When a request is prepared with appropriate values,
      And the request [is to add an activity for the case created above],
      And it is submitted to call the [Add Activity] operation of [CCD Case Activity API],

     Then a positive response is received,
      And the response has all the details as expected,
      And another call [to observe the new activity just added on the case above] will get the expected response as in [S-014-Verification-call].

#-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
@S-002 #RDM-8986 should return 400 Bad Request but returning 422
Scenario: must return a negative response when activity is missing

    Given a user with [an active profile in CCD],
      And a case that has just been created as in [Standard_Full_Case_Creation_Data],

     When a request is prepared with appropriate values,
      And the request [is to add an activity for the case created above],
      And the request [will miss activity information],
      And it is submitted to call the [Add Activity] operation of [CCD Case Activity API],

     Then a negative response is received,
      And the response has all the details as expected.

#-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
@S-003 #RDM-8986 should return 400 Bad Request but returning 422
Scenario: must return a negative response when activity is unknown

    Given a user with [an active profile in CCD],
      And a case that has just been created as in [Standard_Full_Case_Creation_Data],

     When a request is prepared with appropriate values,
      And the request [is to add an activity for the case created above],
      And the request [contains an unknown activity],
      And it is submitted to call the [Add Activity] operation of [CCD Case Activity API],

     Then a negative response is received,
      And the response has all the details as expected.

#-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
@S-004
Scenario: must return a negative response for a malformed Case ID

    Given a user with [an active profile in CCD],

     When a request is prepared with appropriate values,
      And the request [contains a malformed caseID],
      And it is submitted to call the [Add Activity] operation of [CCD Case Activity API],

     Then a negative response is received,
      And the response has all the details as expected.

#-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
@S-005
Scenario: must return a negative response for a missing Case ID

    Given a user with [an active profile in CCD],

     When a request is prepared with appropriate values,
      And the request [is to add an activity for the case created above],
      And the request [contains a missing caseID],
      And it is submitted to call the [Add Activity] operation of [CCD Case Activity API],

     Then a negative response is received,
      And the response has all the details as expected.
