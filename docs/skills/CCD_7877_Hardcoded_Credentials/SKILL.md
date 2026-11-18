# CCD-7877 Hardcoded Credentials

## Objective

Ensure Case Activity API credentials are supplied by runtime configuration rather than committed defaults.

## Acceptance criteria

- Redis credentials are not represented by a committed password value.
- `REDIS_PASSWORD` remains the runtime variable and chart secret mapping.
- Test-only synthetic values are not treated as evidence of live access.
- Live validity, deployment, and rotation status are explicitly verified by service owners.

## Findings and changes

- Replaced the committed `testPassword` default in `config/default.yaml` with an empty local default; the existing `REDIS_PASSWORD` environment mapping remains in `config/custom-environment-variables.yaml`.
- Chart configuration references the `activity-redis-password` managed secret. The preview template now receives `REDIS_PASSWORD` externally; whether any historical value was deployed or reused cannot be established locally.

## Local validation

For unauthenticated local Redis, leave `REDIS_PASSWORD` empty. For secured Redis, set `REDIS_PASSWORD` in the shell or local secret mechanism before starting the service. Run the existing unit tests and Redis-backed checks.

## Recommendations

Confirm the preview value is not used in a deployed environment, replace it with secret injection if required, and rotate any value that was historically shared.
