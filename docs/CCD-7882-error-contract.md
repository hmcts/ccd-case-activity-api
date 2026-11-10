# CCD-7882: controlled error responses

## Current support logging policy

Public exception responses remain generic. Missing or unsupported activities return the fixed
validation message `activity must be one of: view, edit`; submitted values are never reflected.
Only errors created by the dedicated activity-validation factory receive this public message.
Existing case-ID validation responses remain unchanged. Failed upstream response bodies are
limited to 4096 bytes and a one-second read; diagnostic read failures preserve the upstream status
and are retained as private causes. Successful upstream responses retain their existing behaviour.
Detailed request failures, including exception causes
and stack traces, are retained at normal WARN/ERROR levels in server logs; DEBUG is optional
additional troubleshooting. Dependency and health diagnostics retain their originating severity
and respect the source logger threshold. Support must not need to enable DEBUG and reproduce
an incident to obtain its original failure details.

This policy supersedes the DEBUG-only descriptions and test expectations in earlier verification
entries below. Those entries describe historical checks. Deployment acceptance still requires
administrator-only log access, suitable retention and verification of logging/Application Insights
collection. Local tests do not establish those infrastructure controls.


Branch `CCD-7882_Verbose_Error_Messages` was created from local `master` on 20 October 2026.

The final middleware always returns a generic status/error/message/code body, including in development. Fetch diagnostic text is removed. Routes forward the original Error rather than just its message so middleware can handle it consistently. Invalid activity values are no longer reflected or followed by a second response.

Error categories: INVALID_REQUEST (400/422), AUTHENTICATION_REQUIRED (401), ACCESS_DENIED (403), RESOURCE_NOT_FOUND (404), METHOD_NOT_ALLOWED (405), REQUEST_TOO_LARGE (413), UNSUPPORTED_MEDIA_TYPE (415), TOO_MANY_REQUESTS (429), INTERNAL_ERROR (5xx), otherwise REQUEST_FAILED. Codes describe categories, not individual incidents. Boot fallback and empty security responses do not promise a category code.

## Local verification

27 focused Mocha tests passed; ESLint passed for the changed production files and new regression suite. Tests cover public middleware, malformed JSON, fetch failures, original route errors and committed responses.

## Deployment handoff

These are local source/test results. Deployed BEFTA/ITHC, ingress/upstream error pages and actual dependency failures still require retesting. Do not infer restricted log access, Application Insights collection or production deployment from these checks. Existing internal diagnostics may contain sensitive information; use the existing restricted access controls. Authentication validation, endpoint permissions and successful responses were not deliberately changed.

## Authoritative remediation and support requirement

The supplied CCD-7882 finding concerns unauthenticated disclosure of implementation details
through HTTP error responses. This note covers the remediation and verification for this service.

The remediation requires generic public error pages/responses and states: "The server should
still log the detailed information, but access to the log will be restricted to administrators."
An event reference is optional. It does not prescribe DEBUG-only logging or require support
to restart a service to obtain diagnostics.

Response sanitisation and administrator diagnostics are separate requirements. DEBUG-only
implementation details described elsewhere in this note record the implementation, not an
acceptance criterion from the finding. If production DEBUG is disabled and no other approved
mechanism records the detailed failure, that is a support/acceptance gap: enabling DEBUG after
an incident cannot recover its missing diagnostics. A safe category/status summary alone does
not satisfy the detailed-log requirement.

Before release, verify that detailed failures are recorded and accessible only to administrators,
including the deployed logging/Application Insights configuration, while public responses stay
generic. Preserve useful validation responses and existing protocol behaviour. Select and test
the logging policy against these requirements; do not assume that moving every diagnostic to
ERROR, or enabling DEBUG globally, is the required solution. Existing local test results do not
establish this deployed acceptance. This requirement also applies to the current support logging policy above.

## Support logging verification — 21 October 2026

28 focused tests passed, zero failures/errors/skips. Checks cover the applicable request/error
paths and confirm that public responses remain sanitised while original exception diagnostics
are retained without enabling DEBUG. ESLint for the changed files passed.
Administrator-only log access, retention and deployed collection remain environment acceptance checks.

## Logging uniqueness review — 21 October 2026

30 focused tests passed with DEBUG disabled and again with DEBUG enabled. The final middleware owns authentication diagnostics, preserving the original cause without serialising it. Direct proxy responses retain their own diagnostic. Expected client failures use WARN; server failures use ERROR.

## Paired application-container verification — 22 October 2026

The bounded diagnostic formatter retains nested Error.cause chains and terminates cycles. Rejected upstream HTTP responses now become private Errors with status and bounded body diagnostics, rather than logging [object Response]. Public statuses and generic bodies remain unchanged. 32 focused tests passed and changed-file ESLint passed.

Both INFO (DEBUG off) and DEBUG runs passed all six checks: anonymous JSON/HTML,
invalid user bearer or invalid service credentials as appropriate, authenticated dependency failure,
health-detail redaction and retained original server diagnostics. This is 12 checks for this service.
Different services retain their existing HTTP status and validation contracts; diagnostic redaction
is consistent. Support logging is the policy; authentication logging is one covered failure category.
Neither requires enabling DEBUG to retain original failures.

The shared local driver is review-reports/CCD-7882/verify_docker.py in the parent workspace.
Run from the workspace root with --repo ccd-case-activity-api (both modes are the default).
Fresh Java bootJars or the current Node application source/dependencies were used, with synthetic
OIDC/S2S/services and PostgreSQL where applicable. Some database fixtures deliberately omit tables
for controlled infrastructure errors; definition-store uses its migrations for startup.
Java used the cached HMCTS Java 21 runtime; Node used public node:22-alpine as non-root node.
These are substitute runtimes, not builds of each exact production Dockerfile.
Artifact hashes and per-check results are in review-reports/CCD-7882/docker-results.json.
Scripts allow repeat runs and results identify what was checked; retaining them is evidence,
not an extra production runtime dependency. Synthetic raw logs are local diagnostics.

Production image/ingress verification, deployed BEFTA/ITHC, actual Azure ingestion, retention
and administrator-only access remain release gates. The local telemetry collector proves the
specific agent/SDK path tested, not production collection settings.

## Message compatibility review — 9 November 2026

The reviewed error handling already retains controlled public messages. No production
change was needed in this follow-up. Keep approved business validation feedback and
existing statuses; technical details belong in restricted operator logs. Tests for
this service were not rerun in this follow-up. Consumer Pact/BEFTA verification is
still required before release; field presence does not establish exact-text compatibility.
