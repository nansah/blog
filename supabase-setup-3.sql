-- Run this once in the Supabase SQL Editor (same project as before)

-- ══ SOCIAL LINKS (URLs + follower counts, editable in admin) ══
create table if not exists social_links (
  id         text primary key,       -- e.g. 'instagram', 'tiktok', 'youtube', 'pinterest', 'twitter'
  platform   text not null,          -- display name, e.g. 'Instagram'
  url        text default '#',
  handle     text,                   -- e.g. '@nanayaa.ansah'
  followers  text,                   -- e.g. '250k' — free text so you can format however you like
  sort_order integer default 0,
  updated_at timestamptz default now()
);

alter table social_links enable row level security;

-- Public (including anonymous visitors) can read — needed to render links on every page.
create policy "public can read social links"
  on social_links for select
  using (true);

-- Only signed-in users (you) can edit them.
create policy "authenticated users can update social links"
  on social_links for update
  to authenticated
  using (true);

create policy "authenticated users can insert social links"
  on social_links for insert
  to authenticated
  with check (true);

create trigger social_links_set_updated_at
  before update on social_links
  for each row
  execute function set_updated_at();

-- Seed the 5 platforms with your current placeholder values —
-- edit these anytime from the admin dashboard.
insert into social_links (id, platform, url, handle, followers, sort_order) values
  ('instagram', 'Instagram', '#', '@nanayaa.ansah', '250k', 1),
  ('tiktok',    'TikTok',    '#', '@nanayaa.ansah', '180k', 2),
  ('youtube',   'YouTube',   '#', 'nana yaa ansah', '75k',  3),
  ('pinterest', 'Pinterest', '#', '@nanayaa.ansah', '40k',  4),
  ('twitter',   'Twitter',   '#', '@nanayaa.ansah', '',     5)
on conflict (id) do nothing;
