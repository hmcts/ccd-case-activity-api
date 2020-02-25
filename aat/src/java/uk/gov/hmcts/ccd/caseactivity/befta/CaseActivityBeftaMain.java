package uk.gov.hmcts.ccd.caseactivity.befta;

import uk.gov.hmcts.befta.BeftaMain;

public class CaseActivityBeftaMain extends BeftaMain {

    public static void main(String[] args) {
        BeftaMain.main(args, new CaseActivityTestAutomationAdapter());
    }

}
