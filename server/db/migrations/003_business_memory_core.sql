create table if not exists business_goals (
  id text primary key,
  business_id text not null,
  category text not null,
  title text not null,
  description text not null,
  status text not null,
  source text not null check (source in ('user', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_goals_business_status_idx
  on business_goals (business_id, status, created_at desc);

create table if not exists strategic_priorities (
  id text primary key,
  business_id text not null,
  category text not null,
  title text not null,
  description text not null,
  status text not null,
  source text not null check (source in ('user', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists strategic_priorities_business_status_idx
  on strategic_priorities (business_id, status, created_at desc);

create table if not exists executive_decisions (
  id text primary key,
  business_id text not null,
  category text not null,
  title text not null,
  description text not null,
  status text not null,
  source text not null check (source in ('user', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists executive_decisions_business_status_idx
  on executive_decisions (business_id, status, created_at desc);

create table if not exists recommendation_outcomes (
  id text primary key,
  business_id text not null,
  category text not null,
  title text not null,
  description text not null,
  status text not null,
  source text not null check (source in ('user', 'system')),
  recommendation_id text not null,
  action_taken text not null,
  expected_outcome text not null,
  actual_outcome text not null,
  success_metric text not null,
  result text not null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recommendation_outcomes_business_recommendation_idx
  on recommendation_outcomes (business_id, recommendation_id, result, reviewed_at desc);

create table if not exists business_milestones (
  id text primary key,
  business_id text not null,
  category text not null,
  title text not null,
  description text not null,
  status text not null,
  source text not null check (source in ('user', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_milestones_business_status_idx
  on business_milestones (business_id, status, created_at desc);

create table if not exists business_memory_audit_entries (
  id text primary key,
  business_id text not null,
  record_type text not null,
  record_id text not null,
  action text not null,
  source text not null check (source in ('user', 'system')),
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists business_memory_audit_business_created_idx
  on business_memory_audit_entries (business_id, created_at desc);
