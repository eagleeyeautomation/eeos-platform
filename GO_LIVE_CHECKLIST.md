# Sprint 12 Go Live Checklist

## Runtime URLs

- [ ] Confirm `/api/integrations/gohighlevel/runtime` returns the production URL.
- [ ] Copy the returned `oauthCallbackUrl` into the HighLevel Marketplace app.
- [ ] Confirm the returned `webhookUrl` is reachable from the public internet.
- [ ] Confirm no hardcoded `<production-domain>` placeholder remains in production configuration.

## OAuth

- [ ] Set `GHL_OAUTH_CLIENT_ID`.
- [ ] Set `GHL_OAUTH_CLIENT_SECRET`.
- [ ] Set `GHL_OAUTH_STATE_SECRET`.
- [ ] Set `EEOS_TOKEN_VAULT_KEY`.
- [ ] Open `/connect-ghl`.
- [ ] Click `Authorize Connection`.
- [ ] Authorize the PRN Staffers GoHighLevel location.
- [ ] Confirm callback returns `connected: true`.
- [ ] Record the returned `locationId` as `GHL_PRN_LOCATION_ID`.

## Webhooks

- [ ] Confirm OAuth callback automatically registers webhooks.
- [ ] If needed, call `POST /api/integrations/gohighlevel/webhook/register`.
- [ ] Confirm GoHighLevel is configured to send the shared webhook secret header.
- [ ] Confirm GoHighLevel webhook HMAC/shared-secret validation rejects unsigned requests.
- [ ] Confirm `/api/integrations/gohighlevel/health` reports `webhookStatus: Configured`.

## Diagnostics

- [ ] Confirm `/api/integrations/gohighlevel/diagnostics` can reach Contacts.
- [ ] Confirm `/api/integrations/gohighlevel/diagnostics` can reach Opportunities.
- [ ] Confirm `/api/integrations/gohighlevel/diagnostics` can reach Calendars.
- [ ] Confirm `/api/integrations/gohighlevel/diagnostics` can reach Conversations.
- [ ] Confirm `/api/integrations/gohighlevel/diagnostics` can reach Custom Fields.
- [ ] Confirm `/api/integrations/gohighlevel/diagnostics` can reach Pipelines.
- [ ] Confirm `/api/integrations/gohighlevel/diagnostics` can reach Locations.
- [ ] Confirm 429/5xx responses retry with backoff and respect `Retry-After`.
- [ ] Confirm structured logs are visible in production runtime logs.

## Live Event Verification

- [ ] Create a PRN Staffers contact and verify `Contact Created`.
- [ ] Update that contact and verify `Contact Updated`.
- [ ] Create an opportunity and verify `Opportunity Created`.
- [ ] Update that opportunity and verify `Opportunity Updated`.
- [ ] Create an appointment and verify `Appointment Created`.
- [ ] Confirm each event routes through Gateway, Tenant Resolver, Business DNA, Decision Engine, Confidence Engine, Executive Recommendation, Executive Dashboard, Timeline, Audit, and Knowledge Graph.
- [ ] Confirm retry queue stays at `0`.
- [ ] Confirm the Executive Dashboard GoHighLevel connector health card displays `Connected`.

## Release

- [ ] Run `pnpm check`.
- [ ] Run `pnpm build`.
- [ ] Run lint if/when the repository defines a lint script.
- [ ] Commit the activation changes.
- [ ] Deploy to production.
