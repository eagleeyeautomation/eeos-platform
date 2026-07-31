alter table executive_priority_queue
  add column if not exists legacy_recommendation_id integer;

create unique index if not exists executive_priority_queue_org_legacy_idx
  on executive_priority_queue (organization_id, legacy_recommendation_id)
  where legacy_recommendation_id is not null;
