package uk.gov.hmcts.ccd.caseactivity.befta;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

import io.restassured.RestAssured;
import io.restassured.builder.RequestSpecBuilder;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;
import uk.gov.hmcts.befta.BeftaMain;
import uk.gov.hmcts.befta.DefaultTestAutomationAdapter;
import uk.gov.hmcts.befta.data.UserData;
import uk.gov.hmcts.befta.exception.FunctionalTestException;

public class CaseActivityTestAutomationAdapter extends DefaultTestAutomationAdapter {

    private Logger logger = LoggerFactory.getLogger(CaseActivityTestAutomationAdapter.class);

    private static final String CCD_SECURITY_CLASSIFICATION_PUBLIC = "PUBLIC";

    private static final String[][] CCD_ROLES_NEEDED_FOR_TA = {
            { "caseworker-autotest1", CCD_SECURITY_CLASSIFICATION_PUBLIC },

            { "caseworker-befta_jurisdiction_1", CCD_SECURITY_CLASSIFICATION_PUBLIC },

            { "caseworker-befta_jurisdiction_2", CCD_SECURITY_CLASSIFICATION_PUBLIC },
            { "caseworker-befta_jurisdiction_2-solicitor_1", CCD_SECURITY_CLASSIFICATION_PUBLIC },

            { "citizen", CCD_SECURITY_CLASSIFICATION_PUBLIC },
    };

    @Override
    public void doLoadTestData() {
        addCcdRoles();
    }

    private void addCcdRoles() {
        logger.info("{} roles will be added to '{}'.", CCD_ROLES_NEEDED_FOR_TA.length,
                BeftaMain.getConfig().getDefinitionStoreUrl());
        for (String[] roleInfo : CCD_ROLES_NEEDED_FOR_TA) {
            try {
                logger.info("\n\nAdding CCD Role {}, {}...", roleInfo[0], roleInfo[1]);
                addCcdRole(roleInfo[0], roleInfo[1]);
                logger.info("\n\nAdded CCD Role {}, {}...", roleInfo[0], roleInfo[1]);
            } catch (Exception e) {
                logger.error("\n\nCouldn't add CCD Role {}, {} - Exception: {}.\\n\\n", roleInfo[0], roleInfo[1], e);
            }
        }
    }

    private void addCcdRole(String role, String classification) {
        Map<String, String> ccdRoleInfo = new HashMap<>();
        ccdRoleInfo.put("role", role);
        ccdRoleInfo.put("security_classification", classification);
        Response response = asAutoTestImporter().given()
                .header("Content-type", "application/json").body(ccdRoleInfo).when()
                .put("/api/user-role");
        if (response.getStatusCode() / 100 != 2) {
            String message = "Import failed with response body: " + response.body().prettyPrint();
            message += "\nand http code: " + response.statusCode();
            throw new FunctionalTestException(message);
        }
    }

    private RequestSpecification asAutoTestImporter() {
        UserData caseworker = new UserData(BeftaMain.getConfig().getImporterAutoTestEmail(),
                BeftaMain.getConfig().getImporterAutoTestPassword());
        authenticate(caseworker);

        String s2sToken = getNewS2SToken();
        return RestAssured
                .given(new RequestSpecBuilder().setBaseUri(BeftaMain.getConfig().getDefinitionStoreUrl())
                        .build())
                .header("Authorization", "Bearer " + caseworker.getAccessToken())
                .header("ServiceAuthorization", s2sToken);
    }

}
