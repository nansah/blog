-- Run this once in the Supabase SQL Editor (same project as before)

-- ══ PAST COLLABORATIONS (brand list on Work With Me page, editable in admin) ══
create table if not exists brands (
  id         text primary key,
  name       text not null,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table brands enable row level security;

create policy "public can read brands"
  on brands for select
  using (true);

create policy "authenticated users can insert brands"
  on brands for insert
  to authenticated
  with check (true);

create policy "authenticated users can update brands"
  on brands for update
  to authenticated
  using (true);

create policy "authenticated users can delete brands"
  on brands for delete
  to authenticated
  using (true);

create trigger brands_set_updated_at
  before update on brands
  for each row
  execute function set_updated_at();

-- Seed with the current brand list so the page has content immediately.
insert into brands (id, name, sort_order) values
  ('brand-1',  'Piece of Cake',     10),
  ('brand-2',  'Giorgio Armani',    20),
  ('brand-3',  'Sable Labs',        30),
  ('brand-4',  'Remedy',            40),
  ('brand-5',  'Maison Margiela',   50),
  ('brand-6',  'Glowbar',           60),
  ('brand-7',  'Estée Lauder',      70),
  ('brand-8',  'Macy''s',           80),
  ('brand-9',  'Hotel Collection',  90),
  ('brand-10', 'Hyper Skin',        100),
  ('brand-11', 'Ben-Amun',          110),
  ('brand-12', 'EXPRESS',           120)
on conflict (id) do nothing;
