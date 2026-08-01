# EEOS Security Phase 1 assessment

Assessment baseline: `main` at `9ab460d65ba94491d1cefc8db48e377afeef58d1`.
Scope is limited to identity, access, sessions, CSRF, RBAC, tenant/location isolation, service trust, rate limiting, audit attribution, and MFA readiness.

## Tooling baseline

- Repository: `eagleeyeautomation/eeos-platform`
- Package manager: pnpm (`packageManager` declares 10.4.1; available runtime 11.9.0)
- Node requirement: no `.nvmrc`, `.node-version`, or `engines` declaration; verified with Node 24.14.0
- Build: `pnpm build`
- TypeScript: `pnpm check` / `pnpm typecheck`
- Lint: `pnpm lint` (currently TypeScript-only)
- Test framework: Vitest 2 and Playwright for end-to-end tests
- Focused suites: first-party auth, logout, session/CSRF, authorization, Business Memory security, GHL OAuth, Identity Service, Identity shadow, service contracts, OAuth signing, and tenant parity

## Authentication boundary and route classification

All routes below are registered by the production entry point unless marked deprecated/unregistered.

### Public and health

- `GET /.well-known/openid-configuration`, `GET /.well-known/jwks.json`, `GET /oauth/jwks.json`: public protocol metadata; no tenant data; no CSRF.
- `GET /health/live`, `GET /health/ready`, `GET /health`: health; no business-record reads.
- `system.health`: public tRPC health query.
- `GET /api/auth/session`, `auth.me`, `auth.session`: public authentication-discovery boundary; returns an unauthenticated shape/401 or the current session only.
- `POST /api/auth/login`: public credential exchange; neutral invalid-credential response; account+network throttling; audit.
- `POST /api/auth/forgot-password`: public recovery request; neutral account response; throttling; audit.
- `POST /api/auth/reset-password`: public one-time reset-token exchange; hashed token, expiry, throttling, session revocation, audit.
- `POST /api/auth/invitations/accept`: public one-time invitation-token exchange; hashed token and expiry; no existing browser session is authoritative.
- OAuth protocol endpoints `GET|POST /oauth/authorize`, `POST /oauth/token`, and `GET|POST /oauth/userinfo`: OAuth client/code/bearer protected as applicable; protocol anti-replay/PKCE applies instead of browser CSRF.
- `POST /oauth/clients`: deployment/administrative registration-secret boundary; fails closed if the server-only registration secret is absent or invalid.
- `POST /api/webhooks/ghl`: provider webhook; provider signature validation, not browser CSRF.
- `GET /manus-storage/*`: public object-reference redirect boundary used by generated asset URLs; signed upstream URL and `no-store`; no tenant selector is accepted.

### Authenticated organization/location reads

- Business Memory: `GET /api/prn/business-memory`.
- PRN/Athena: `GET /api/prn/athena/learning`, `GET /api/prn/athena/recommendations/:recommendationId/history`, `GET /api/prn/athena/executive-brief`.
- PRN intelligence: `GET /api/prn/gohighlevel/live-dashboard`, `/api/prn/executive-recommendations`, `/api/prn/intelligence-engine`, `/api/prn/b2b-intelligence`, `/api/prn/c2b-intelligence`.
- GHL: `GET /api/ghl/status`, `/api/ghl/verify-location`, `/api/ghl/operations-snapshot/latest`, `/api/ghl/pit/connections`, `/api/ghl/pit/status/:locationId`, `/api/integrations/gohighlevel/session-context`, and `GET /api/location-management/locations`.
- tRPC: `ghl.connectionStatus`, `memory.get`, `timeline.list`, `knowledgeGraph.get`, `signals.recent`, `recommendations.list`, `tenant.mySubaccounts`, `tenant.subaccountStatus`, `ie.metrics`, `ie.feedbackHistory`, and authenticated intelligence/evolution/mission-control/automation/industry queries.
- Enforcement: opaque-session lookup, active account, current membership/organization/location resolution, server-derived scope, 401 for missing/invalid session, 403 for denied scope, private/no-store where sensitive.

### Authenticated cookie mutations

- Business Memory: all ten `POST|PATCH /api/prn/business-memory/*` record routes.
- Athena learning: `POST /api/prn/athena/feedback`, `/measurements`, `/outcomes/review`, and `/lessons/:lessonId/approve`.
- GHL safe snapshot/location operations: `POST /api/location-management/locations`, `/api/ghl/operations-snapshot`.
- tRPC recommendation, C2B, evolution, intelligence, automation, and industry mutations.
- Enforcement: authenticated session, current organization/location context, writable role, session-derived tenant, session-bound CSRF, and record-scoped predicate where a record ID is supplied.

### Privileged routes

- Platform administrator: `POST /api/admin/organizations/:organizationId/enter`; `GET /api/admin/integrations/gohighlevel/florida-binding`; `POST` reconcile/repair-scopes; `POST /api/admin/invitations`; all `admin.*`, `demo.*`, and `system.notifyOwner` tRPC procedures.
- Organization owner: GHL OAuth start, location onboarding, snapshot hydration, and PIT connect/disconnect credential lifecycle.
- Enforcement: current server-loaded role/membership, organization/location scope, CSRF for cookie mutations, generic denial, and audit for supported high-risk operations.

### Internal service

- Identity `POST /internal/v1/session/validate` and `/authorization/check`: ES256 service assertion, exact issuer/audience/subject/key/algorithm, short lifetime, method/path/body/nonce binding, Redis replay consumption in production, request correlation, rate limiting, and sanitized errors.
- Unknown Identity internal routes return a generic 404 error; missing/invalid/replayed assertions fail closed.

### Integration callback and provider-signature routes

- `GET /api/integrations/eea/oauth/callback` and legacy `/api/ghl/callback`: one-time persisted OAuth state, exact redirect/location binding, and safe failure; no browser CSRF because the provider callback is state protected.
- Legacy anonymous `GET /api/integrations/gohighlevel/oauth/start`: deprecated and returns 410; the authenticated POST route is authoritative.

### Deprecated/unregistered

- `server/integrations/gohighlevel.ts` routes and `server/index.ts` are not registered by the production `_core/index.ts` build entry. They are classified deprecated/unregistered and must not be treated as live authorization boundaries.
- `GET /api/ghl/operations-snapshot` is an explicitly disabled legacy trigger; the POST path is authoritative.

## Verified defects and corrections

1. Protected tRPC routes used `publicProcedure` plus ad hoc checks. They now use the existing `protectedProcedure` boundary consistently.
2. Cookie-authenticated tRPC mutations did not uniformly enforce CSRF. The protected/admin middleware now rejects missing or session-mismatched CSRF; the client supplies the existing browser-readable session-bound token.
3. Express logout and administrator invitation creation lacked CSRF. Both now reject before authentication/data access when CSRF is missing.
4. Athena/PRN intelligence routes were anonymous and fixed to a PRN identifier. They now authenticate, resolve the configured location through current membership, derive `organization:{organization}:location:{location}` scope, and reject cross-location access.
5. Athena Executive Brief performed persistence from GET. The GET is now read-only.
6. PRN learning mutations lacked role and CSRF checks. They now require a current writable role and session-bound CSRF.
7. GHL PIT mutations lacked CSRF; credential connect/disconnect allowed any writable role. They now require CSRF and organization-owner authorization.
8. Recommendation feedback loaded/updated by global ID. Both predicates now include the authorized tenant before any mutation.
9. New browser sessions lasted one year and lacked idle expiration. New user sessions are capped at 24 hours, platform-admin sessions at 8 hours, and all sessions enforce a 12-hour idle limit.
10. Login throttling read `X-Forwarded-For` directly. It now uses Express's trust-proxy-resolved address.
11. Password reset routes lacked throttling and rate-limit audit events. Bounded route+network+account/token-hash limits and safe audit evidence were added.
12. Auth audit metadata was inconsistent. The existing audit path now supplies outcome, reason code, correlation ID, source service, severity, role, and location fields (nullable when unavailable) without sensitive material.

Expected impact: expired/idle sessions reauthenticate; protected mutations require the CSRF value already issued by the session endpoint; unauthorized PRN/Athena reads become 401/403; authorized reads remain scoped; read-only Athena GET no longer creates snapshots.

Rollback: revert the Phase 1 commit and redeploy only the EEOS application service. No schema migration, secret rotation, OAuth action, integration-state change, or production-data rewrite is required for rollback.

## Session and cookie results

- Token: 32 random bytes, base64url opaque value; SHA-256 hash stored.
- Validation: current session row, revocation, absolute expiry, idle expiry, and active user are checked before refresh.
- Revocation: logout revokes current hash; password reset revokes all user sessions; current role/membership/location is resolved at request time.
- Cookie: `HttpOnly`, root path, `SameSite=Lax`, and `Secure` when Express's trusted request scheme is HTTPS. Authentication state is not stored in localStorage.
- CSRF cookie: client-readable by design, derived from the session with HMAC, short-lived, and useless without the `HttpOnly` session token.
- Known limitation: existing sessions retain their stored absolute expiry but are subject to the new idle timeout; forced global rotation was not authorized.

## Secrets and credential inventory

Values were not read. All listed consumers are server-side unless explicitly noted as public URL/configuration metadata.

- Session/CSRF: `JWT_SECRET`; required in production; Core and Identity; fail closed/readiness failure; rotation revokes sessions and needs coordinated rollout.
- OAuth provider signing/registration: `EEOS_OAUTH_PRIVATE_KEY_PEM`, `EEOS_OAUTH_KEY_ID`, `EEOS_OAUTH_CLIENT_REGISTRATION_SECRET`, `EEOS_OAUTH_ISSUER`; production-scoped; startup fails closed when required signing material is invalid.
- Identity service request/response trust: `IDENTITY_SERVICE_REQUEST_PRIVATE_KEY`, `IDENTITY_SERVICE_REQUEST_KEY_ID`, `IDENTITY_SERVICE_TRUSTED_CLIENT_JWKS`, `IDENTITY_SERVICE_ASSERTION_PRIVATE_KEY`, `IDENTITY_SERVICE_ASSERTION_KEY_ID`, `IDENTITY_SERVICE_TRUSTED_ASSERTION_JWKS`, expected issuer/audience/client variables; production/preview scoped intentionally; fail closed.
- Replay/rate infrastructure: `IDENTITY_SERVICE_REPLAY_STORE`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, integration aliases; Redis required for production replay protection.
- Data stores: `DATABASE_URL`, `LEGACY_MYSQL_DATABASE_URL`, `POSTGRES_DATABASE_URL` plus bounded pool/timeout/TLS settings; server only; readiness fails closed.
- Credential encryption: `EEOS_TOKEN_VAULT_KEY`, `GHL_OAUTH_STATE_SECRET`; server only; runtime persistence fails closed when required.
- GoHighLevel: client IDs/secrets, private integration token, location identifiers, redirect URI, scopes, webhook secret; server only except approved public callback metadata; no values enter client bundles.
- Email/password recovery: `RESEND_API_KEY`, `EEOS_PASSWORD_RESET_FROM`, `EEOS_APP_BASE_URL`; server only; neutral delivery failure.
- Bootstrap: `INITIAL_PLATFORM_ADMIN_EMAIL`, `INITIAL_PLATFORM_ADMIN_NAME`, `INITIAL_PLATFORM_ADMIN_PASSWORD`; deployment-only and bootstrap refuses to run once an admin exists.
- Built-in storage/connector: `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, webhook/connector secrets; server only.
- Identity shadow: enable/sample/timeout/fingerprint variables; shadow remains non-authoritative and disabled unless configured.
- No `process.env` consumption exists under `client/src`; no private key, bearer token, reset token, session token, CSRF value, or authorization header is intentionally logged.

## MFA and distributed-throttling readiness

- Core authentication throttling uses the existing Upstash Redis integration through
  `UPSTASH_REDIS_REST_KV_REST_API_URL` and `UPSTASH_REDIS_REST_KV_REST_API_TOKEN`.
  Account and trusted Express client-network hashes are enforced as separate keys under
  `eeos:auth-limit:v1:`. General user routes degrade to an in-process fixed-window limiter
  during a brief store fault; administrator authentication fails closed. Health endpoints
  never consume the limiter.
- TOTP secrets are stored only as versioned AES-256-GCM ciphertext using the server-only
  `EEOS_MFA_ENCRYPTION_KEY`. Recovery codes are random, SHA-256 hashed, displayed once,
  and atomically removed on use. TOTP counters advance atomically to prevent replay.
- `EEOS_MFA_REQUIRED_ROLES=disabled` is the safe readiness policy. A comma-separated
  server-side role list such as `PLATFORM_ADMIN` can be activated without a source change,
  but only after approved administrator enrollment and recovery validation.
- Enabled factors cause password login to issue a pending session. Normal authentication
  rejects that session until its session-specific MFA completion timestamp is recorded.
  Enrollment requires a fully authenticated session, CSRF, and recent password
  authentication. Disablement requires password confirmation and revokes all sessions.
- Users can list opaque active-session handles and revoke only their own sessions;
  revocation requires CSRF and produces a sanitized audit event.

## Completion rollback

1. Keep `EEOS_MFA_REQUIRED_ROLES=disabled`; do not remove the encryption key while any
   MFA ciphertext exists.
2. Roll application code back to the prior deployment if runtime verification fails.
3. The MFA table and nullable session columns are backward compatible and may remain
   during application rollback. Remove them only through a later reviewed migration after
   confirming no factors exist.
4. Redis limiter keys expire after their fixed window and require no destructive cleanup.
