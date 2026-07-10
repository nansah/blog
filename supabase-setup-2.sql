-- Run this once in the Supabase SQL Editor (same project as before)
-- (Dashboard → SQL Editor → New query → paste → Run)

-- ══ LEADS (Resources page signups, e.g. wardrobe audit worksheet) ══
create table if not exists leads (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  name         text,
  source       text,
  created_at   timestamptz default now()
);

alter table leads enable row level security;

-- Anyone (including anonymous visitors) can submit a signup...
create policy "anyone can submit a lead"
  on leads for insert
  to anon, authenticated
  with check (true);

-- ...but only you (signed in) can view or manage the list.
create policy "authenticated users can read leads"
  on leads for select
  to authenticated
  using (true);

create policy "authenticated users can delete leads"
  on leads for delete
  to authenticated
  using (true);


-- ══ FAVES (Shop My Faves — affiliate links, editable in admin) ══
create table if not exists faves (
  id            text primary key,
  title         text not null,
  brand         text,
  price         text,
  image         text,
  affiliate_url text,
  category      text,
  sort_order    integer default 0,
  status        text default 'draft' check (status in ('draft', 'published')),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table faves enable row level security;

create policy "public can read published faves"
  on faves for select
  using (status = 'published');

create policy "authenticated users can read all faves"
  on faves for select
  to authenticated
  using (true);

create policy "authenticated users can insert faves"
  on faves for insert
  to authenticated
  with check (true);

create policy "authenticated users can update faves"
  on faves for update
  to authenticated
  using (true);

create policy "authenticated users can delete faves"
  on faves for delete
  to authenticated
  using (true);

-- Reuses the set_updated_at() function created for the posts table.
create trigger faves_set_updated_at
  before update on faves
  for each row
  execute function set_updated_at();
