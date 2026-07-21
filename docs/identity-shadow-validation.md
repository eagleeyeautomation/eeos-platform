# Identity shadow validation

The C5 shadow path compares the current in-process EEOS identity result with `POST /internal/v1/session/validate`. The in-process MySQL path remains authoritative: the observer is scheduled only after existing authentication succeeds, its result is never returned to callers, and every shadow failure is contained.

Shadow validation is disabled by default. Enabling it requires all `IDENTITY_SHADOW_*` and Core Platform request-signing values documented in `.env.example`. Incomplete configuration causes a safe skip and does not prevent platform startup. Production sampling defaults to zero; the timeout is capped at 1,000 ms and there is one aborted HTTP attempt with no retry.

Eligible requests are existing successfully authenticated paths through `sdk.authenticateRequest`. Public unauthenticated requests, health requests, static assets, webhooks, and the login OAuth callback do not reach the observer. Cookie sessions are forwarded only as `app_session_id`; the existing bearer compatibility session is forwarded only through `X-EEOS-Session-Authorization`. Session material never enters JSON.

Comparison covers authentication category, user and scoped IDs, platform role, authorized subaccount IDs without deduplication or reordering, requested-location authorization, permitted display name and email, session version, and normalized error category. Outcomes are exactly `MATCH`, `MISMATCH`, `SHADOW_SKIPPED`, and `SHADOW_ERROR`.

Telemetry contains request correlation, endpoint category, outcome, latency, result categories, mismatch field names, keyed fingerprints, normalized errors, sampling decision, and contract version. It excludes session material, assertions, identity values, raw IDs, locations, bodies, keys, and stack traces. In-memory metrics are for tests and local validation only and are not production durable.

C5 is non-production. Read switching is not eligible until the approved fixture matrix has zero unexplained semantic mismatches, all shadow failures remain isolated, service authentication is valid, sensitive logging is excluded, and production networking, replay protection, and key management receive separate approval.
