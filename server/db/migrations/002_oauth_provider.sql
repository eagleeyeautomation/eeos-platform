create table if not exists eeos_oauth_clients (
  id bigserial primary key,
  client_id text not null unique,
  client_secret_hash text not null,
  name text not null,
  redirect_uris jsonb not null default '[]'::jsonb,
  scopes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz
);

create index if not exists eeos_oauth_clients_active_idx
  on eeos_oauth_clients (client_id)
  where disabled_at is null;

create table if not exists eeos_oauth_authorization_codes (
  id bigserial primary key,
  code_hash text not null unique,
  client_id text not null references eeos_oauth_clients (client_id) on delete cascade,
  redirect_uri text not null,
  code_challenge text not null,
  scope text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index if not exists eeos_oauth_authorization_codes_client_idx
  on eeos_oauth_authorization_codes (client_id, expires_at)
  where consumed_at is null;

create table if not exists eeos_oauth_refresh_tokens (
  id bigserial primary key,
  token_hash text not null unique,
  client_id text not null references eeos_oauth_clients (client_id) on delete cascade,
  subject text not null,
  scope text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  replaced_by_hash text
);

create index if not exists eeos_oauth_refresh_tokens_active_idx
  on eeos_oauth_refresh_tokens (client_id, expires_at)
  where revoked_at is null;
