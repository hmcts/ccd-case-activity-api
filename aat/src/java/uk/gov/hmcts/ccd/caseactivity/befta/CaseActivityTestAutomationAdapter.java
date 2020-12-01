package uk.gov.hmcts.ccd.caseactivity.befta;

import uk.gov.hmcts.befta.BeftaTestDataLoader;
import uk.gov.hmcts.befta.DefaultBeftaTestDataLoader;
import uk.gov.hmcts.befta.DefaultTestAutomationAdapter;
import uk.gov.hmcts.befta.dse.ccd.TestDataLoaderToDefinitionStore;

public class CaseActivityTestAutomationAdapter extends DefaultTestAutomationAdapter {

    private TestDataLoaderToDefinitionStore loader = new TestDataLoaderToDefinitionStore(this);

    @Override
    protected BeftaTestDataLoader buildTestDataLoader() {
        return new DefaultBeftaTestDataLoader() {
            @Override
            public void doLoadTestData() {
                CaseActivityTestAutomationAdapter.this.loader.addCcdRoles();
                CaseActivityTestAutomationAdapter.this.loader.importDefinitions();
            }            
        };
    }

}

