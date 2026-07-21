# EEOS Identity Service skeleton

This directory is the independently buildable EEOS Identity Service boundary. It will own authentication, sessions, organizations, memberships, RBAC, subaccounts, and GoHighLevel location authorization. It must not own OAuth provider tokens or state, integrations, webhooks, platform audit records, business memory, Athena, intelligence, or recommendations.

Commands:

- `pnpm identity:dev`
- `pnpm identity:build`
- `pnpm identity:start`
- `pnpm identity:test`

Reserved internal routes:

- `POST /internal/v1/session/validate`
- `POST /internal/v1/authorization/check`

`POST /internal/v1/session/validate` validates the frozen envelope, the Core Platform ES256 service assertion, the existing HS256 browser session, and the current read-only MySQL identity/RBAC context. `POST /internal/v1/authorization/check` remains deliberately unavailable and never returns an allow decision. `/health/live` returns 200.

Configuration names are documented in `.env.example`. The MySQL pool is created lazily from `LEGACY_MYSQL_DATABASE_URL`; `DATABASE_URL` is never read by this service. All adapter statements are `SELECT` statements. Preview, staging, and production remain not-ready with the local in-memory replay store, even when MySQL and key verification are operational.

The authoritative contract is `shared/identityServiceContract.ts` and `docs/identity-service-contract-v1.md`. C4 does not implement login, logout, session creation/rotation/revocation, PostgreSQL reads, authorization checks, production replay/rate-limit storage, or platform traffic switching. No production traffic is authorized.
