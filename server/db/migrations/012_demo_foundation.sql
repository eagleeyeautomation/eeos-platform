create table if not exists demo_environments (
  organization_id text primary key, organization_name text not null,
  classification text not null check (classification='demo'), data_classification text not null check (data_classification='synthetic'),
  organization_type text not null, scenario_version text not null, seeded_at timestamptz not null,
  reset_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists demo_scenarios (
  id text primary key, organization_id text not null references demo_environments(organization_id) on delete cascade,
  name text not null, description text not null, status text not null check(status in ('ready','active','completed','reset')),
  version text not null, started_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,name,version)
);
create table if not exists demo_synthetic_metrics (
  id text primary key, organization_id text not null references demo_environments(organization_id) on delete cascade,
  location_id text not null, metric_key text not null, value numeric not null, unit text not null,
  source text not null default 'summit_demo_seed', classification text not null default 'synthetic',
  scenario_version text not null, observed_at timestamptz not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(organization_id,location_id,metric_key,scenario_version)
);
create table if not exists demo_scenario_runs (
  id text primary key, organization_id text not null references demo_environments(organization_id) on delete cascade,
  scenario_id text not null references demo_scenarios(id) on delete cascade, run_key text not null,
  action text not null, status text not null, actor_id text not null, scenario_version text not null,
  details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(organization_id,run_key)
);
create index if not exists demo_metrics_org_location_idx on demo_synthetic_metrics(organization_id,location_id,observed_at desc);
create index if not exists demo_runs_org_time_idx on demo_scenario_runs(organization_id,created_at desc);
