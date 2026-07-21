# EEOS Identity Service Internal Contract v1

Status: frozen for implementation review. These contracts are internal and are not public CRUD APIs.

## Endpoints and transport

Only two endpoints are approved:

- `POST /internal/v1/session/validate`
- `POST /internal/v1/authorization/check`

Requests use JSON with `Content-Type: application/json` and a 16 KiB maximum body. Unknown JSON fields are rejected. The EEOS Core Platform authenticates each call with a signed service assertion in `Authorization: Bearer <assertion>`. Session validation forwards `app_session_id` only in `Cookie`. The proven preview bearer fallback may be forwarded only as `X-EEOS-Session-Authorization: Bearer <session>`; it is transitional and must not occupy the service-authentication header.

Database identifiers cross the boundary only as positive decimal strings within signed `bigint`. A GHL location ID is an opaque string, not a database ID.

## Current behavior preserved

- The session source is `app_session_id`, with the existing bearer fallback when no cookie is present.
- Session JWTs use HS256 and `JWT_SECRET`; required claims are `openId`, `appId`, and non-empty `name`.
- A valid JWT is followed by MySQL user lookup. A missing user is synchronized from the existing OAuth provider, then looked up again. Successful authentication updates `lastSignedIn`.
- Active membership-user rows and active subaccounts are included. Membership status and organization active state are not enforced.
- Missing memberships are skipped. Missing organizations retain subaccounts with `orgName` represented internally as `Unknown`.
- Duplicate active membership-user rows produce duplicate subaccount results.
- Public tRPC procedures receive `user: null` when authentication fails; protected procedures reject the request.
- OAuth start validates CSRF, authenticates the session, selects an accessible location, verifies its membership, then creates PostgreSQL OAuth state.
- OAuth callback consumes PostgreSQL state but does not currently reauthenticate the EEOS session. The marketplace-install fallback can proceed without validated EEOS state. Changing this is deferred.

## Session validation

The exact JSON schemas are enforced by `shared/identityServiceContract.ts`. A successful response is HTTP 200 with `authenticated: true`. Identity scope fields are nullable only when the user is valid but has no selected authorization scope. When any scoped field is present, organization, membership, subaccount, and membership role must be present together.

The service never returns a password hash, raw session, `openId`, provider token, encryption key, database metadata, or unrelated membership data. `authorizedSubaccountIds` contains only the current behavior’s accessible subaccounts and is capped at 100.

## Authorization decisions

Approved resource/action pairs are:

| Resource | Actions |
|---|---|
| `organization` | `organization:read` |
| `membership` | `membership:read` |
| `subaccount` | `subaccount:read` |
| `ghl_location` | `ghl:connect`, `ghl:refresh`, `ghl:disconnect`, `ghl:status` |

Wildcard and unknown actions are rejected. An allow is HTTP 200 with `allowed: true`. A completed denial is HTTP 403 with `allowed: false`; ownership-related IDs and active states are null so another tenant's existence is not disclosed.

## HTTP and errors

| Status | Meaning |
|---|---|
| 200 | Valid session or allowed authorization |
| 400 | Malformed request/schema/binding |
| 401 | Invalid service authentication; missing, invalid, expired, revoked, or replayed session/assertion |
| 403 | Authenticated identity with denied authorization |
| 429 | Rate limited |
| 500 | Unexpected internal fault |
| 502 | Invalid upstream response, emitted by the Core Platform |
| 503 | Identity Service or identity database unavailable |
| 504 | Internal authorization deadline exceeded |

404 is not used for authorization because it can disclose tenant-resource existence. 409 is reserved and is not used until a deterministic identity conflict is proven.

All errors use `{ error: { code, message, requestId, retryable } }`. Approved codes are frozen in the runtime enum. Messages are generic and never contain SQL, stacks, database IDs, secrets, cookies, tokens, ownership data, or personal data.

## Assertions and request authentication

Both assertion families use asymmetric ES256 JWTs with `typ: JWT` and mandatory `kid`.

Identity assertions:

- issuer `eeos-identity-service`; audience `eeos-core-platform`
- maximum lifetime 60 seconds; clock tolerance 30 seconds
- required claims: `sub`, `iat`, `nbf`, `exp`, `jti`, session version, canonical identity IDs, roles, narrow scope, and request binding
- no email, display name, `openId`, provider data, or session token

Core Platform request assertions:

- issuer `eeos-core-platform`; audience `eeos-identity-service`
- maximum lifetime 30 seconds; clock tolerance 30 seconds
- subject is the configured service client ID
- binds HTTP method, exact versioned path, SHA-256 body hash, request ID, and nonce

Every JTI is single-use. Replay records remain until `exp + 30 seconds`. Key rotation publishes old and new verification keys concurrently for the maximum token lifetime plus clock tolerance; signing switches only after consumers have loaded the new key. Revocation increments the session version, invalidating assertions derived from older versions.

## Session and cookie ownership

The EEOS Identity Service is the sole session signer, validator, rotator, and revocation owner. Login implementation remains deferred. During transition, the current OAuth login callback remains on the Core Platform but must delegate session issuance to the Identity Service before extraction completes.

The Platform will proxy `/auth/*` on the application origin. The browser does not call a publicly exposed Identity Service host. The cookie remains host-only:

- name `app_session_id`
- no `Domain`
- `Path=/`
- `HttpOnly=true`
- `SameSite=None` during compatibility transition
- `Secure=true` in preview and production; local HTTP development may use `Secure=false`
- current maximum age remains one year until rotation/revocation behavior is implemented and approved

Session creation and clearing endpoints are intentionally deferred because only the two internal endpoints are frozen in v1. They may not be invented during implementation without a new contract review.

## Timeouts and retries

- connect timeout: 250 ms
- per-attempt request timeout: 600 ms
- total deadline: 1,000 ms
- retries: at most one, only for connection reset/refused or a 503 before a valid response
- backoff: one randomized delay between 25 and 75 ms, bounded by the deadline
- no retry for 400, 401, 403, 429, malformed responses, or timeouts after dispatch
- session validation and authorization are read-only and idempotent by request ID, but a replayed signed request is rejected; a retry must use a new JTI and nonce while retaining the correlation request ID
- any timeout or uncertainty fails closed

## Logging and masking

May log: request ID, assertion JTI, caller and callee service names, endpoint, action, resource type, allow/deny result, latency, normalized error code, and a keyed non-reversible resource fingerprint.

Never log: raw Cookie or Authorization headers, JWTs, assertions, `openId`, full email, password hash, database URL, provider token, encryption material, full GHL location ID, private key, or identity-bearing request body. Display identifiers use only a short final suffix when operationally necessary; logs otherwise use an HMAC fingerprint with a dedicated rotating logging key.

## Versioning

- Route version: `/internal/v1`
- JSON `schemaVersion`: `v1`
- Unknown fields are rejected in v1.
- Optional additive fields require a documented consumer compatibility window and must not become required within v1.
- Removing, renaming, changing meaning/type/nullability, changing status behavior, or broadening authorization requires `/internal/v2`.
- Deprecation requires at least one full deployment cycle with dual-version contract tests and observed zero v1 traffic before removal.

## Contract review table

| Contract item | Frozen decision | Repository evidence | Security reason | Compatibility/deferred change |
|---|---|---|---|---|
| Session source | Cookie first, bearer fallback second | `sdk.authenticateRequest` | Preserves current precedence | Bearer removal deferred |
| Cookie | Host-only `app_session_id` | `shared/const.ts`, `cookies.ts` | Avoid sibling-subdomain exposure | Secure enforcement and shorter lifetime deferred |
| JWT lookup | Verify then MySQL user lookup/upsert | `sdk.ts`, `db.ts` | Database remains authorization authority | Identity Service implementation deferred |
| Membership filtering | Active link only | `getUserSubaccounts` | Prevent inactive-link access | Duplicate cleanup deferred |
| Subaccount filtering | Active only | `getSubaccountsByMembership` | Prevent inactive-location access | None |
| Membership/org state | Not authorization filters | Current MySQL queries | No behavior change in freeze | Hardening deferred |
| Missing organization | Keep accessible row as `Unknown` | Extracted MySQL algorithm | Exact parity | Data repair deferred |
| IDs | Decimal strings | PostgreSQL bigint safety tests | Prevent JS truncation | None |
| Denial | HTTP 403 plus `allowed:false` | Existing OAuth-start uses 403 | Clear fail-closed semantics without existence leak | None |
| Assertions | ES256, keyed, request-bound, short-lived | No current service boundary | Limits forgery and replay | Key provider selection deferred |
| OAuth callback | No new session authorization in C2 | Current callback | Avoid behavior change | Reauthorization decision deferred |
| Public tRPC | Authentication failure becomes null | `context.ts` | Exact current behavior | Public-route audit deferred |
