# PRN Staffers GoHighLevel Live Connection

## Required Environment Variables

- `EEOS_APP_BASE_URL`
- `EEOS_TOKEN_VAULT_KEY`
- `EEOS_PRN_DEFAULT_OFFICE_ID`
- `GHL_BASE_URL`
- `GHL_API_VERSION`
- `GHL_OAUTH_CLIENT_ID`
- `GHL_OAUTH_CLIENT_SECRET`
- `GHL_OAUTH_REDIRECT_URI`
- `GHL_OAUTH_STATE_SECRET`
- `GHL_OAUTH_SCOPES`
- `GHL_LOCATION_ID`
- `GHL_PRN_LOCATION_ID`
- `GHL_WEBHOOK_URL`
- `GHL_WEBHOOK_SECRET`
- `GHL_WEBHOOK_REGISTRATION_PATH`
- `GHL_TOKEN_VAULT_FILE`

## OAuth Callback URL

Runtime generated from `EEOS_APP_BASE_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL`, or the incoming request host:

`<production-url>/api/integrations/gohighlevel/oauth/callback`

## Webhook URL

Runtime generated from `GHL_WEBHOOK_URL` when provided, otherwise the production URL:

`<production-url>/api/integrations/gohighlevel/webhook`

## Setup Steps

1. Configure the EEOS HighLevel Marketplace app with the OAuth callback URL returned by `/api/integrations/gohighlevel/runtime`.
2. Add the Marketplace client ID and client secret to the production environment.
3. Add a long random `GHL_OAUTH_STATE_SECRET`.
4. Add a long random `EEOS_TOKEN_VAULT_KEY`.
5. Set `EEOS_APP_BASE_URL` to the production domain, or deploy on Vercel with `VERCEL_PROJECT_PRODUCTION_URL`.
6. Set `GHL_WEBHOOK_URL` to the webhook URL above, or allow EEOS to derive it from the runtime production URL.
7. Set `GHL_WEBHOOK_SECRET` and configure GoHighLevel webhook delivery to send the same shared secret header.
8. Deploy EEOS.
9. Open `/connect-ghl`.
10. Click `Authorize Connection`.
11. Approve the PRN Staffers GoHighLevel location.
12. Confirm the callback returns `connected: true` and `credentialsStored: Secure Token Vault`.
13. Confirm `/api/integrations/gohighlevel/health` reports `connectionStatus: Connected`.
14. Create a new GoHighLevel contact in PRN Staffers.
15. Confirm the webhook response routes through Gateway, Tenant Resolver, Business DNA, Decision Engine, Confidence Engine, Executive Recommendation, Executive Dashboard, Timeline, Audit, and Knowledge Graph.

## Verification Report

- Official OAuth production flow: implemented at `/api/integrations/gohighlevel/oauth/start`.
- OAuth callback route: implemented at `/api/integrations/gohighlevel/oauth/callback`.
- Secure token storage: implemented with AES-256-GCM encrypted vault file keyed by `EEOS_TOKEN_VAULT_KEY`.
- Token refresh logic: implemented before webhook registration and health-sensitive server use.
- PRN Staffers tenant resolver: resolves every GoHighLevel event to `tenant-prn-staffers`.
- Location ID detection: reads `locationId`, `location_id`, nested `location.id`, or configured PRN location env vars.
- Webhook registration: implemented at `/api/integrations/gohighlevel/webhook/register` and after OAuth callback.
- Webhook receiver: implemented at `/api/integrations/gohighlevel/webhook`.
- Contact event processing: `Contact Created` and `Contact Updated`.
- Opportunity event processing: `Opportunity Created` and `Opportunity Updated`.
- Calendar event processing: `Appointment Created`, `Appointment Booked`, and `Calendar Event Created`.
- Integration health status: implemented at `/api/integrations/gohighlevel/health`.
- Audit logging: every accepted event writes an audit record in the live receiver.
- Retry handling: rejected webhook deliveries are queued with a next retry timestamp.

## Live Blockers

Real live verification still requires production OAuth credentials, a production domain, PRN Staffers location authorization, and a GoHighLevel webhook delivery from the PRN Staffers location.
