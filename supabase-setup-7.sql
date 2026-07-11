-- Run this once in the Supabase SQL Editor (same project as before)

-- ══ PAST COLLABORATIONS (photo/video portfolio gallery on Work With Me, editable in admin) ══
create table if not exists portfolio_items (
  id         text primary key,
  image_url  text not null,
  video_url  text,               -- optional: photo links out to a video (Reel, YouTube, etc)
  caption    text,
  sort_order integer default 0,
  status     text default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table portfolio_items enable row level security;

create policy "public can read published portfolio items"
  on portfolio_items for select
  using (status = 'published');

create policy "authenticated users can read all portfolio items"
  on portfolio_items for select
  to authenticated
  using (true);

create policy "authenticated users can insert portfolio items"
  on portfolio_items for insert
  to authenticated
  with check (true);

create policy "authenticated users can update portfolio items"
  on portfolio_items for update
  to authenticated
  using (true);

create policy "authenticated users can delete portfolio items"
  on portfolio_items for delete
  to authenticated
  using (true);

create trigger portfolio_items_set_updated_at
  before update on portfolio_items
  for each row
  execute function set_updated_at();

-- Seed with the current placeholder photos so the page has content
-- immediately. Replace these via the admin panel (Site > Past Collaborations)
-- with real photos/videos whenever you're ready.
insert into portfolio_items (id, image_url, caption, sort_order, status) values
  ('pf-1', 'https://picsum.photos/seed/collab-1/600/800', 'Brand collaboration', 10, 'published'),
  ('pf-2', 'https://picsum.photos/seed/collab-2/600/800', 'Sponsored campaign',  20, 'published'),
  ('pf-3', 'https://picsum.photos/seed/collab-3/600/800', 'Event coverage',      30, 'published'),
  ('pf-4', 'https://picsum.photos/seed/collab-4/600/800', 'Product feature',     40, 'published')
on conflict (id) do nothing;
