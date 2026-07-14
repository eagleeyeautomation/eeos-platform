create table if not exists recommendation_feedback (
  id text primary key,
  business_id text not null,
  recommendation_id text not null,
  briefing_id text,
  executive_decision text not null check (executive_decision in ('accepted', 'dismissed', 'deferred', 'modified', 'no_decision')),
  status text not null check (status in ('pending', 'in_progress', 'completed', 'cancelled', 'review_due')),
  feedback text not null,
  owner text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recommendation_feedback_business_recommendation_idx
  on recommendation_feedback (business_id, recommendation_id, created_at desc);

create table if not exists recommendation_measurements (
  id text primary key,
  business_id text not null,
  recommendation_id text not null,
  metric_name text not null,
  baseline_value numeric,
  target_value numeric,
  actual_value numeric,
  unit text not null,
  measurement_source text not null,
  measured_at timestamptz not null,
  verified boolean not null default false,
  verification_evidence text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recommendation_measurements_business_recommendation_idx
  on recommendation_measurements (business_id, recommendation_id, measured_at desc);

create table if not exists recommendation_lessons (
  id text primary key,
  business_id text not null,
  recommendation_id text not null,
  lesson_type text not null check (lesson_type in ('successful', 'partially_successful', 'unsuccessful', 'inconclusive', 'invalidated', 'superseded')),
  summary text not null,
  evidence jsonb not null default '[]'::jsonb,
  confidence_adjustment integer not null default 0 check (confidence_adjustment between -15 and 10),
  ranking_adjustment integer not null default 0 check (ranking_adjustment between -20 and 15),
  reusable_pattern text not null,
  approved_for_reuse boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recommendation_lessons_business_recommendation_idx
  on recommendation_lessons (business_id, recommendation_id, created_at desc);

create table if not exists athena_learning_profiles (
  id text primary key,
  business_id text not null,
  category text not null,
  evidence_count integer not null default 0,
  successful_outcome_count integer not null default 0,
  unsuccessful_outcome_count integer not null default 0,
  inconclusive_outcome_count integer not null default 0,
  reliability_score integer not null default 0,
  last_updated_at timestamptz not null default now(),
  unique (business_id, category)
);

create table if not exists athena_learning_audit_events (
  id text primary key,
  business_id text not null,
  recommendation_id text not null,
  actor_type text not null,
  action text not null,
  prior_state jsonb,
  new_state jsonb not null default '{}'::jsonb,
  evidence_references jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists athena_learning_audit_business_recommendation_idx
  on athena_learning_audit_events (business_id, recommendation_id, created_at desc);
