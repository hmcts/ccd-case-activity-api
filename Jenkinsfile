#!groovy

properties(
    [[$class: 'GithubProjectProperty', projectUrlStr: 'https://git.reform.hmcts.net/case-management/ccd-case-activity-web/'],
     pipelineTriggers([[$class: 'GitHubPushTrigger']])]
)

@Library('Reform')
import uk.gov.hmcts.Ansible
import uk.gov.hmcts.Packager
import uk.gov.hmcts.RPMTagger

ansible = new Ansible(this, 'ccdata')
packager = new Packager(this, 'ccdata')
rpmTagger = new RPMTagger(this, 'ccd-case-activity-web', packager.rpmName('ccd-case-activity-web', params.rpmVersion), 'ccdata-local')

milestone()
lock(resource: "ccd-case-activity-web-${env.BRANCH_NAME}", inversePrecedence: true) {
    node {
        try {
            wrap([$class: 'AnsiColorBuildWrapper', colorMapName: 'xterm']) {
                stage('Checkout') {
                    deleteDir()
                    checkout scm
                }

                stage('Setup (install only)') {
                    sh "yarn install"
                }

                stage('Node security check') {
                    sh "yarn test:nsp"
                }

                stage('Test') {
                    sh "yarn test"
                }

                onDevelop {
                    publishAndDeploy('dev')
                }

                onMaster {
                    publishAndDeploy('test')
                }

                milestone()
            }
        } catch (err) {
            notifyBuildFailure channel: '#ccd-notifications'
            throw err
        }
    }
}

def publishAndDeploy(env) {
    def rpmVersion
    def version

    stage('Package application (RPM)') {
        rpmVersion = packager.nodeRPM('ccd-case-activity-web')
    }

    stage('Publish RPM') {
        packager.publishNodeRPM('ccd-case-activity-web')
    }

    stage('Deploy: ' + env) {
        version = "{ccd_case_activity_web_version: ${rpmVersion}}"
        ansible.runDeployPlaybook(version, env)
        rpmTagger.tagDeploymentSuccessfulOn(env)
    }

    stage('Smoke Tests: ' + env) {
        sh "curl -vf https://case-activity-api." + env + ".ccd.reform.hmcts.net/health"
        rpmTagger.tagTestingPassedOn(env)
    }
}
