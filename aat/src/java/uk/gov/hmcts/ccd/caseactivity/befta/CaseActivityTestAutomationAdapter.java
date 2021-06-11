package uk.gov.hmcts.ccd.caseactivity.befta;

import uk.gov.hmcts.befta.BeftaMain;
import uk.gov.hmcts.befta.BeftaTestDataLoader;
import uk.gov.hmcts.befta.DefaultBeftaTestDataLoader;
import uk.gov.hmcts.befta.DefaultTestAutomationAdapter;
import uk.gov.hmcts.befta.dse.ccd.DataLoaderToDefinitionStore;
import uk.gov.hmcts.befta.dse.ccd.CcdEnvironment;

public class CaseActivityTestAutomationAdapter extends DefaultTestAutomationAdapter {

    @Override
    protected BeftaTestDataLoader buildTestDataLoader() {
        return new DefaultBeftaTestDataLoader(CcdEnvironment.AAT);
    }

}
