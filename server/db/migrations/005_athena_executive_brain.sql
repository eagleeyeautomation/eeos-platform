create table if not exists athena_snapshots (
  id text primary key,
  business_id text not null,
  snapshot jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now()
);

create index if not exists athena_snapshots_business_generated_idx
  on athena_snapshots (business_id, generated_at desc);

create table if not exists athena_audit_events (
  id text primary key,
  business_id text not null,
  input_data_timestamps jsonb not null default '{}'::jsonb,
  data_sources_used jsonb not null default '[]'::jsonb,
  recommendations_selected jsonb not null default '[]'::jsonb,
  recommendations_excluded jsonb not null default '{}'::jsonb,
  confidence_calculation jsonb not null default '{}'::jsonb,
  memory_records_used jsonb not null default '{}'::jsonb,
  final_briefing jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now()
);

create index if not exists athena_audit_events_business_generated_idx
  on athena_audit_events (business_id, generated_at desc);
