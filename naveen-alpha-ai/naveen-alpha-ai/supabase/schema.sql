-- NAVEEN ALPHA AI — optional persistence schema (Supabase / PostgreSQL)
-- The app works without this (conversations persist in the browser's localStorage).
-- Enable RLS so each user only sees their own rows.

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  instructions text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  title text not null default 'New chat',
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('system','user','assistant')),
  content text not null,
  attachments jsonb not null default '[]'::jsonb,
  model text,
  created_at timestamptz not null default now()
);
create index if not exists messages_conv_idx on messages(conversation_id, created_at);

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  name text not null,
  mime text not null,
  size_bytes bigint not null,
  storage_path text,
  extracted_text text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists model_settings (
  user_id uuid primary key references users(id) on delete cascade,
  default_model text not null default 'naveen-alpha',
  temperature numeric not null default 0.7,
  system_prompt text not null default ''
);

create table if not exists usage (
  id bigserial primary key,
  user_id uuid references users(id) on delete set null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  rating smallint not null check (rating in (-1, 1)),
  comment text,
  created_at timestamptz not null default now()
);

alter table users enable row level security;
alter table projects enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table files enable row level security;
alter table model_settings enable row level security;
alter table usage enable row level security;
alter table feedback enable row level security;

create policy "own user" on users for all using (auth.uid() = id);
create policy "own projects" on projects for all using (auth.uid() = user_id);
create policy "own conversations" on conversations for all using (auth.uid() = user_id);
create policy "own messages" on messages for all using (
  exists (select 1 from conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy "own files" on files for all using (auth.uid() = user_id);
create policy "own settings" on model_settings for all using (auth.uid() = user_id);
create policy "own usage" on usage for select using (auth.uid() = user_id);
create policy "own feedback" on feedback for all using (auth.uid() = user_id);
