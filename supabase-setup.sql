-- Run this once in the Supabase SQL Editor for your project
-- (Dashboard → SQL Editor → New query → paste → Run)

create table if not exists posts (
  id           text primary key,
  title        text not null,
  slug         text,
  content      text,
  excerpt      text,
  category     text,
  tags         text[] default '{}',
  image        text,
  read_time    text,
  status       text default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Row Level Security: anyone can read published posts, only signed-in
-- users (you, via Supabase Auth) can create/edit/delete anything.
alter table posts enable row level security;

create policy "public can read published posts"
  on posts for select
  using (status = 'published');

create policy "authenticated users can read all posts"
  on posts for select
  to authenticated
  using (true);

create policy "authenticated users can insert posts"
  on posts for insert
  to authenticated
  with check (true);

create policy "authenticated users can update posts"
  on posts for update
  to authenticated
  using (true);

create policy "authenticated users can delete posts"
  on posts for delete
  to authenticated
  using (true);

-- Keep updated_at current on every edit
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger posts_set_updated_at
  before update on posts
  for each row
  execute function set_updated_at();
