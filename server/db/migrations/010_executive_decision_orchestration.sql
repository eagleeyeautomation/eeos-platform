create table if not exists approval_policies (
  id text primary key, organization_id text, action_type text not null,
  requires_approval boolean not null default true, minimum_role text not null default 'ORGANIZATION_OWNER',
  risk_threshold integer not null default 85 check (risk_threshold between 0 and 100),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists approval_policies_scope_action_idx on approval_policies (coalesce(organization_id, '__system__'), action_type);

create table if not exists workflow_templates (
  id text primary key, organization_id text, template_key text not null, name text not null,
  action_type text not null, protected_action boolean not null default false,
  steps jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists workflow_templates_scope_key_idx on workflow_templates (coalesce(organization_id, '__system__'), template_key);

create table if not exists executive_playbooks (
  id text primary key, organization_id text, playbook_key text not null, name text not null,
  trigger_category text not null, workflow_template_keys jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists executive_playbooks_scope_key_idx on executive_playbooks (coalesce(organization_id, '__system__'), playbook_key);

create table if not exists decision_workflows (
  id text primary key, organization_id text not null, location_id text,
  recommendation_id text references executive_priority_queue(id) on delete set null,
  template_key text not null, playbook_key text, title text not null, action_type text not null,
  status text not null, protected_action boolean not null, confidence integer not null check (confidence between 0 and 100),
  risk_score integer not null check (risk_score between 0 and 100), risk_gates jsonb not null,
  prepared_payload jsonb not null, evidence jsonb not null, requested_by text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), decided_at timestamptz
);
create index if not exists decision_workflows_org_status_idx on decision_workflows (organization_id, status, created_at desc);

create table if not exists workflow_approvals (
  id text primary key, organization_id text not null, workflow_id text not null references decision_workflows(id) on delete cascade,
  decision text not null check (decision in ('approved','rejected')), decided_by text not null,
  comment text, policy_snapshot jsonb not null, decided_at timestamptz not null default now()
);
create index if not exists workflow_approvals_org_workflow_idx on workflow_approvals (organization_id, workflow_id, decided_at desc);

create table if not exists business_automation_queue (
  id text primary key, organization_id text not null, workflow_id text not null references decision_workflows(id) on delete cascade,
  action_type text not null, status text not null, payload jsonb not null,
  execution_blocked boolean not null default true, blocked_reason text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, workflow_id)
);
create index if not exists business_automation_queue_org_status_idx on business_automation_queue (organization_id, status, created_at desc);

create table if not exists business_goals_v2 (
  id text primary key, organization_id text not null, location_id text, goal_type text not null,
  title text not null, baseline numeric, target numeric not null, current_value numeric,
  unit text not null, status text not null default 'active', due_at timestamptz, created_by text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists business_goals_v2_org_status_idx on business_goals_v2 (organization_id, status, due_at);

insert into workflow_templates (id, template_key, name, action_type, protected_action, steps) values
 ('system-create-task','create-task','Create Task','create_task',false,'["prepare","review"]'),
 ('system-assign-user','assign-user','Assign User','assign_user',false,'["prepare","review"]'),
 ('system-create-reminder','create-reminder','Create Reminder','create_reminder',false,'["prepare","review"]'),
 ('system-create-follow-up','create-follow-up','Create Follow-up','create_follow_up',false,'["prepare","review"]'),
 ('system-schedule-meeting','schedule-meeting','Schedule Meeting','schedule_meeting',true,'["prepare","approve","handoff"]'),
 ('system-prepare-crm-record','prepare-crm-record','Prepare CRM Record','prepare_crm_record',true,'["prepare","approve","handoff"]'),
 ('system-prepare-ghl-contact','prepare-ghl-contact','Prepare GHL Contact','prepare_ghl_contact',true,'["prepare","approve","handoff"]'),
 ('system-prepare-opportunity','prepare-opportunity','Prepare Opportunity','prepare_opportunity',true,'["prepare","approve","handoff"]'),
 ('system-partner-review','prepare-partner-review','Prepare Partner Review','prepare_partner_review',false,'["prepare","review"]'),
 ('system-referral-review','prepare-referral-review','Prepare Referral Review','prepare_referral_review',false,'["prepare","review"]')
on conflict do nothing;

insert into executive_playbooks (id, playbook_key, name, trigger_category, workflow_template_keys) values
 ('system-new-client','new-client','New Client','customer','["prepare-crm-record","create-follow-up"]'),
 ('system-new-referral','new-referral','New Referral','referral','["prepare-referral-review","create-follow-up"]'),
 ('system-low-staffing','low-staffing','Low Staffing','staffing','["create-task","assign-user"]'),
 ('system-revenue-decline','revenue-decline','Revenue Decline','financial','["create-task","create-reminder"]'),
 ('system-marketing-opportunity','marketing-opportunity','Marketing Opportunity','marketing','["prepare-opportunity","create-follow-up"]'),
 ('system-hospital-partnership','hospital-partnership','Hospital Partnership','growth','["prepare-partner-review","schedule-meeting"]'),
 ('system-veteran-partnership','veteran-partnership','Veteran Partnership','growth','["prepare-partner-review","schedule-meeting"]'),
 ('system-community-outreach','community-outreach','Community Outreach','growth','["prepare-partner-review","create-follow-up"]')
on conflict do nothing;

insert into approval_policies (id, action_type, requires_approval, minimum_role) values
 ('system-crm-write','prepare_crm_record',true,'ORGANIZATION_OWNER'),
 ('system-ghl-write','prepare_ghl_contact',true,'ORGANIZATION_OWNER'),
 ('system-opportunity-write','prepare_opportunity',true,'ORGANIZATION_OWNER'),
 ('system-meeting-write','schedule_meeting',true,'ORGANIZATION_OWNER')
on conflict do nothing;
