alter table business_goals
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table strategic_priorities
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table executive_decisions
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table recommendation_outcomes
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table business_milestones
  add column if not exists metadata jsonb not null default '{}'::jsonb;
