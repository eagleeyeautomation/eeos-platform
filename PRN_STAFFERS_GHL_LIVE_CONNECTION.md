# PRN Staffers GoHighLevel Mission Zero Connection

PRN Staffers is the Founding Customer of Eagle Eye Automation. PRN Staffers is not the EEOS platform.

Mission Zero connects one PRN Staffers customer membership to four GoHighLevel operational divisions:

- Delaware
- South Carolina
- Alabama
- Florida

Mission Zero uses GoHighLevel Private Integration Tokens for fastest production validation. The long-term EEOS onboarding path remains the Eagle Eye Automation OAuth Marketplace App.

## Required Environment Variables

- `EEOS_APP_BASE_URL`
- `EEOS_TOKEN_VAULT_KEY`
- `EEOS_CUSTOMER_MEMBERSHIP_ID`
- `EEOS_CUSTOMER_MEMBERSHIP_NAME`
- `EEOS_BUSINESS_DNA_PROFILE_ID`
- `EEOS_DEFAULT_OFFICE_ID`
- `GHL_PRN_DELAWARE_LOCATION_ID`
- `GHL_PRN_DELAWARE_PRIVATE_TOKEN`
- `GHL_PRN_SOUTH_CAROLINA_LOCATION_ID`
- `GHL_PRN_SOUTH_CAROLINA_PRIVATE_TOKEN`
- `GHL_PRN_ALABAMA_LOCATION_ID`
- `GHL_PRN_ALABAMA_PRIVATE_TOKEN`
- `GHL_PRN_FLORIDA_LOCATION_ID`
- `GHL_PRN_FLORIDA_PRIVATE_TOKEN`
- `GHL_BASE_URL`
- `GHL_API_VERSION`
- `GHL_WEBHOOK_URL`
- `GHL_WEBHOOK_SECRET`
- `GHL_RETRY_MAX_ATTEMPTS`
- `GHL_RETRY_BASE_DELAY_MS`
- `GHL_RATE_LIMIT_MIN_INTERVAL_MS`

Future OAuth Marketplace App variables:

- `GHL_OAUTH_CLIENT_ID`
- `GHL_OAUTH_CLIENT_SECRET`
- `GHL_OAUTH_REDIRECT_URI`
- `GHL_OAUTH_STATE_SECRET`
- `GHL_OAUTH_SCOPES`
- `GHL_WEBHOOK_REGISTRATION_PATH`
- `GHL_TOKEN_VAULT_FILE`

## Mission Zero Setup Steps

1. Generate a GoHighLevel Private Integration Token for each PRN Staffers operational division.
2. Store each token and matching GoHighLevel location ID in production environment variables.
3. Set `EEOS_CUSTOMER_MEMBERSHIP_ID=membership-prn-staffers`.
4. Set `EEOS_CUSTOMER_MEMBERSHIP_NAME=PRN Staffers`.
5. Set `EEOS_BUSINESS_DNA_PROFILE_ID=business-dna-prn-staffers`.
6. Set `GHL_WEBHOOK_URL` and `GHL_WEBHOOK_SECRET`.
7. Deploy EEOS.
8. Confirm `/api/integrations/gohighlevel/health` reports configured private-token divisions.
9. Confirm `/api/integrations/gohighlevel/diagnostics` runs for Delaware, South Carolina, Alabama, and Florida.
10. Send signed webhooks from each operational division into the EEOS Gateway.
11. Verify every event routes through Gateway, Tenant Resolver, Business DNA, Decision Engine, Confidence Engine, Executive Recommendation, Executive Dashboard, Timeline, Audit, and Knowledge Graph.

## Future OAuth Callback URL

Runtime generated from `EEOS_APP_BASE_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL`, or the incoming request host:

`<production-url>/api/integrations/gohighlevel/oauth/callback`

## Webhook URL

Runtime generated from `GHL_WEBHOOK_URL` when provided, otherwise the production URL:

`<production-url>/api/integrations/gohighlevel/webhook`

## Verification Report

- Mission Zero Private Integration Token flow: implemented per customer membership and operational division.
- Future OAuth production flow: implemented at `/api/integrations/gohighlevel/oauth/start`.
- Future OAuth callback route: implemented at `/api/integrations/gohighlevel/oauth/callback`.
- Secure token storage: implemented with AES-256-GCM encrypted vault file keyed by `EEOS_TOKEN_VAULT_KEY`.
- Token refresh logic: implemented before webhook registration and health-sensitive server use.
- Customer membership resolver: resolves every GoHighLevel event to a customer membership and operational division.
- Location ID detection: reads `locationId`, `location_id`, nested `location.id`, or configured division location env vars.
- Webhook registration: implemented at `/api/integrations/gohighlevel/webhook/register` and after OAuth callback.
- Webhook receiver: implemented at `/api/integrations/gohighlevel/webhook`.
- Contact event processing: `Contact Created` and `Contact Updated`.
- Opportunity event processing: `Opportunity Created` and `Opportunity Updated`.
- Calendar event processing: `Appointment Created`, `Appointment Booked`, and `Calendar Event Created`.
- Integration health status: implemented at `/api/integrations/gohighlevel/health`.
- Integration diagnostics: implemented at `/api/integrations/gohighlevel/diagnostics` for Contacts, Opportunities, Calendars, Conversations, Custom Fields, Pipelines, Tags, and Locations across configured operational divisions.
- Enterprise error handling: implemented with structured error codes.
- Structured logging: implemented as JSON runtime logs.
- Retry and rate-limit handling: implemented for GoHighLevel API calls.
- Webhook security: shared-secret and HMAC validation implemented.
- Audit logging: every accepted event writes an audit record in the live receiver.
- Retry handling: rejected webhook deliveries are queued with a next retry timestamp.

## Live Blockers

Real live verification requires production Private Integration Tokens, matching location IDs for all PRN Staffers operational divisions, a production domain, and signed GoHighLevel webhook delivery.
