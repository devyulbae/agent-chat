-- Agent Chat core schema
create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('freeform','department','squad')),
  created_at timestamptz not null default now()
);

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  persona text not null,
  status text not null default 'active',
  organization_id uuid references organizations(id) on delete set null,
  unit_name text,
  created_at timestamptz not null default now()
);

create table if not exists credentials (
  id uuid primary key default gen_random_uuid(),
  owner_agent_id uuid references agents(id) on delete cascade,
  provider text not null,
  label text not null,
  secret_encrypted text not null,
  key_version text not null default 'v1',
  token_expires_at timestamptz,
  last_used_at timestamptz,
  last_rotated_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_id uuid references organizations(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references channels(id) on delete cascade,
  sender_agent_id uuid references agents(id) on delete set null,
  thread_id uuid,
  body text not null,
  created_at timestamptz not null default now()
);
