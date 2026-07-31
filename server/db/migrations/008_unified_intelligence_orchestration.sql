create table if not exists intelligence_events (
  id text not null,
  organization_id text not null,
  location_id text,
  producer text not null,
  event_type text not null,
  category text not null,
  occurred_at timestamptz not null,
  subject_type text,
  subject_key text,
  payload jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  correlation_id text,
  created_at timestamptz not null default now(),
  primary key (organization_id, producer, id)
);
create index if not exists intelligence_events_org_time_idx on intelligence_events (organization_id, occurred_at desc);
create index if not exists intelligence_events_org_category_idx on intelligence_events (organization_id, category, occurred_at desc);

create table if not exists executive_graph_entities (
  id text primary key,
  organization_id text not null,
  entity_type text not null,
  external_key text not null,
  display_name text not null,
  attributes jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  unique (organization_id, entity_type, external_key)
);
create index if not exists executive_graph_entities_org_type_idx on executive_graph_entities (organization_id, entity_type);

create table if not exists executive_graph_edges (
  id text primary key,
  organization_id text not null,
  from_entity_id text not null references executive_graph_entities(id) on delete cascade,
  to_entity_id text not null references executive_graph_entities(id) on delete cascade,
  relationship_type text not null,
  attributes jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  unique (organization_id, from_entity_id, to_entity_id, relationship_type)
);
create index if not exists executive_graph_edges_org_idx on executive_graph_edges (organization_id, last_seen_at desc);

create table if not exists unified_business_memory (
  id text primary key,
  organization_id text not null,
  memory_key text not null,
  memory_type text not null,
  value jsonb not null,
  source_event_id text not null,
  confidence integer not null check (confidence between 0 and 100),
  observed_at timestamptz not null,
  updated_at timestamptz not null default now(),
  unique (organization_id, memory_key)
);
create index if not exists unified_business_memory_org_type_idx on unified_business_memory (organization_id, memory_type, updated_at desc);

create table if not exists executive_priority_queue (
  id text primary key,
  organization_id text not null,
  recommendation_key text not null,
  source_event_id text not null,
  title text not null,
  summary text not null,
  recommended_action text not null,
  category text not null,
  status text not null default 'active',
  priority_score integer not null check (priority_score between 0 and 100),
  confidence integer not null check (confidence between 0 and 100),
  score_components jsonb not null,
  evidence jsonb not null,
  location_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, recommendation_key)
);
create index if not exists executive_priority_queue_org_status_idx on executive_priority_queue (organization_id, status, priority_score desc);

create table if not exists intelligence_distributions (
  id text primary key,
  organization_id text not null,
  recommendation_id text not null references executive_priority_queue(id) on delete cascade,
  consumer text not null,
  delivered_at timestamptz not null default now(),
  read_at timestamptz,
  unique (organization_id, recommendation_id, consumer)
);
create index if not exists intelligence_distributions_org_consumer_idx on intelligence_distributions (organization_id, consumer, delivered_at desc);
