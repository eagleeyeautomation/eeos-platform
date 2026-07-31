create table if not exists organization_industry_packs (
  id text primary key, organization_id text not null, pack_key text not null,
  is_primary boolean not null default false, configured_by text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, pack_key)
);
create unique index if not exists organization_industry_packs_primary_idx on organization_industry_packs (organization_id) where is_primary;
create index if not exists organization_industry_packs_org_idx on organization_industry_packs (organization_id, created_at);

create table if not exists industry_kpi_observations (
  id text primary key, organization_id text not null, location_id text,
  pack_key text not null, kpi_key text not null, value numeric not null, unit text not null,
  observed_at timestamptz not null, evidence jsonb not null, recorded_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists industry_kpi_observations_org_kpi_idx on industry_kpi_observations (organization_id, pack_key, kpi_key, observed_at desc);

create table if not exists industry_pack_audit (
  id text primary key, organization_id text not null, event_type text not null,
  before_pack_keys jsonb not null, after_pack_keys jsonb not null, actor_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists industry_pack_audit_org_time_idx on industry_pack_audit (organization_id, created_at desc);
