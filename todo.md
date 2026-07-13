# EEOS — Production Platform TODO

## Architecture
- [x] Multi-tenant schema: organizations → memberships → subaccounts (GHL locations)
- [x] EEA = Software Company | EEOS = Platform | IE = Intelligence Engine | PRN Staffers = Founding Customer
- [x] Mission Zero: Private Integration Token (PIT) flow for PRN Staffers 4 GHL divisions

## Phase 1: Database Schema (15 tables)
- [x] organizations, memberships, membership_users, subaccounts tables
- [x] ghl_tokens table (per-subaccount, encrypted, with refresh)
- [x] ghl_signals table (normalized events from GHL webhooks)
- [x] business_memory table (persistent business context per tenant)
- [x] kg_nodes and kg_edges tables (Knowledge Graph)
- [x] timeline_events table (chronological business events)
- [x] audit_log table (every system action with actor + outcome)
- [x] ie_recommendations table (IE output with confidence + trust anatomy)
- [x] recommendation_feedback table (executive acceptance/rejection)
- [x] ie_metrics table (accuracy tracking: TP, FP, FN, calibration)
- [x] Schema migration applied to production database

## Phase 2: GoHighLevel Connection
- [x] Private Integration Token (PIT) server route: POST /api/ghl/pit/connect
- [x] PIT validation against GHL API (GET /locations/{locationId})
- [x] Secure token storage in ghl_tokens table
- [x] ConnectGHL page: per-subaccount token entry for all 4 PRN Staffers divisions
- [x] tRPC procedure: tenant.mySubaccounts — returns connected subaccounts
- [x] GHL OAuth flow (for future Marketplace App): GET /api/ghl/auth + /api/ghl/callback

## Phase 3: Webhook Receiver & Signal Pipeline
- [x] POST /api/ghl/webhook — receives all GHL event types
- [x] HMAC-SHA256 signature verification
- [x] Signal normalization: contact, opportunity, appointment, tag, payment events
- [x] Signals stored in ghl_signals table
- [x] tRPC procedure: signals.recent — returns live signal feed

## Phase 4: Business Memory, Timeline, Knowledge Graph
- [x] Signal → business_memory update logic
- [x] Signal → timeline_events insert logic
- [x] Signal → kg_nodes/kg_edges upsert logic
- [x] tRPC procedures: timeline.list, knowledgeGraph.get, memory.get

## Phase 5: Intelligence Engine
- [x] IE trigger: runs after each batch of new signals
- [x] Signal aggregation (24h, 7d, 30d windows)
- [x] LLM prompt with structured JSON schema output
- [x] Confidence scoring (signal count × recency × historical accuracy)
- [x] Recommendation deduplication (suppress if same rec < 48h old)
- [x] tRPC procedures: recommendations.list, recommendations.generate

## Phase 6: Feedback Loop & IE Accuracy
- [x] tRPC procedure: recommendations.feedback (accept/reject/outcome)
- [x] Accuracy aggregation: acceptance rate, TP, FP, FN per type
- [x] tRPC procedure: ie.metrics — IE performance dashboard data
- [x] Recommendation cards wired to live feedback mutation

## Phase 7: Frontend Wiring
- [x] ExecutiveHome wired to live tRPC data (recommendations, IE metrics, subaccount selector)
- [x] AIRecommendations wired to live tRPC data with feedback mutations
- [x] LiveSignals wired to live ghl_signals data
- [x] ExecutiveTimeline wired to live timeline_events
- [x] KnowledgeGraphPreview wired to live kg_nodes/kg_edges data
- [x] ConnectGHL wired to live PIT connection flow

## Phase 8: Quality
- [x] TypeScript: 0 errors (full tsc --noEmit pass)
- [x] Production build: passes (pnpm build)
- [x] Vitest: 1/1 tests passing
- [ ] Push to GitHub eagleeyeautomation/eeos-platform
- [ ] Save checkpoint and deliver

## Future (Post Mission Zero)
- [ ] GHL OAuth Marketplace App packaging (replace PIT with one-click OAuth)
- [ ] Webhook registration via GHL API after connection
- [ ] Real-time signal polling / SSE push to frontend
- [ ] IE scheduled background runs (heartbeat)
- [ ] BusinessHealth page wired to live business_memory
- [ ] IntegrationHealth page wired to live ghl_tokens + webhook status
- [ ] Admin panel for EEA to manage all customer memberships
