-- Run this once in the Supabase SQL Editor (same project as before)

-- ══ PRESS FEATURES (press page, editable in admin) ══
create table if not exists press_features (
  id         text primary key,
  outlet     text not null,        -- e.g. "Essence", "Marie Claire"
  headline   text not null,        -- article title
  url        text,                 -- link to the actual article
  image_url  text,
  badge      text default 'Digital', -- e.g. "Digital", "Print", "Podcast"
  sort_order integer default 0,
  status     text default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table press_features enable row level security;

create policy "public can read published press features"
  on press_features for select
  using (status = 'published');

create policy "authenticated users can read all press features"
  on press_features for select
  to authenticated
  using (true);

create policy "authenticated users can insert press features"
  on press_features for insert
  to authenticated
  with check (true);

create policy "authenticated users can update press features"
  on press_features for update
  to authenticated
  using (true);

create policy "authenticated users can delete press features"
  on press_features for delete
  to authenticated
  using (true);

create trigger press_features_set_updated_at
  before update on press_features
  for each row
  execute function set_updated_at();

-- Seed with the current real press features so the page has content immediately.
insert into press_features (id, outlet, headline, url, image_url, badge, sort_order, status) values
  ('press-1', 'Essence', 'Hair Street Style: Rock These Hair Trends Now', 'https://www.essence.com/hair/hair-street-style-rock-these-hair-trends-now/', '/images/nana_yaa_essence.webp', 'Digital', 10, 'published'),
  ('press-2', 'Marie Claire', 'The Best Designer-Style Beach Bags To Carry Everywhere', 'https://www.marieclaire.com/fashion/g22003398/best-beach-bags/', 'https://picsum.photos/seed/press-marieclaire/800/450', 'Digital', 20, 'published')
on conflict (id) do nothing;
