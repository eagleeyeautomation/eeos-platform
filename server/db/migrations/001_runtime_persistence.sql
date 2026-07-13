create table if not exists eeos_integration_connections (
  id bigserial primary key,
  organization_id text not null,
  provider text not null,
  operational_division_id text not null,
  location_id text not null,
  encrypted_token_payload text not null,
  token_expires_at timestamptz,
  scopes jsonb not null default '[]'::jsonb,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disconnected_at timestamptz,
  unique (organization_id, provider, operational_division_id)
);

create index if not exists eeos_integration_connections_org_provider_idx
  on eeos_integration_connections (organization_id, provider);

create table if not exists eeos_oauth_states (
  id bigserial primary key,
  state_hash text not null unique,
  organization_id text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index if not exists eeos_oauth_states_org_status_idx
  on eeos_oauth_states (organization_id, status, expires_at);

create table if not exists eeos_webhook_events (
  id bigserial primary key,
  organization_id text not null,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  location_id text,
  payload_fingerprint text not null,
  status text not null,
  duplicate_count integer not null default 0,
  attempts integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  next_retry_at timestamptz,
  dead_lettered_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, provider_event_id)
);

create index if not exists eeos_webhook_events_org_status_idx
  on eeos_webhook_events (organization_id, status, received_at desc);

create table if not exists eeos_sync_checkpoints (
  id bigserial primary key,
  organization_id text not null,
  provider text not null,
  resource text not null,
  location_id text,
  checkpoint jsonb not null default '{}'::jsonb,
  last_successful_sync_at timestamptz,
  last_error_summary text,
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, resource, location_id)
);

create table if not exists eeos_audit_events (
  id bigserial primary key,
  organization_id text not null,
  source text not null,
  event_type text not null,
  location_id text,
  correlation_id text,
  payload_fingerprint text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists eeos_audit_events_org_created_idx
  on eeos_audit_events (organization_id, created_at desc);
