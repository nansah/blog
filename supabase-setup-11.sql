-- Run this once in the Supabase SQL Editor (same project as before)

-- ══ BLOG POST SIDEBAR ORDER (drag-to-reorder in admin) ══
-- Four fixed blocks (profile photo, categories, faves CTA, social links)
-- shown in the post-page sidebar. Only the display order is editable —
-- rows always exist, admin just reorders them.
create table if not exists sidebar_blocks (
  id         text primary key,   -- 'profile' | 'categories' | 'faves' | 'social'
  label      text not null,      -- human-readable name shown in admin
  sort_order integer default 0,
  updated_at timestamptz default now()
);

alter table sidebar_blocks enable row level security;

create policy "public can read sidebar blocks"
  on sidebar_blocks for select
  using (true);

create policy "authenticated users can update sidebar blocks"
  on sidebar_blocks for update
  to authenticated
  using (true);

create trigger sidebar_blocks_set_updated_at
  before update on sidebar_blocks
  for each row
  execute function set_updated_at();

insert into sidebar_blocks (id, label, sort_order) values
  ('profile',    'Profile Photo',      10),
  ('categories', 'Blog Categories',    20),
  ('faves',      'Shop My Faves Link', 30),
  ('social',     'Social Media Links', 40)
on conflict (id) do nothing;
