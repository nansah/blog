-- Run this once in the Supabase SQL Editor (same project as before)

-- ══ INSTAGRAM FEED (homepage photo grid, editable in admin) ══
create table if not exists instagram_photos (
  id         text primary key,
  image_url  text not null,
  post_url   text,              -- link to the actual Instagram post
  caption    text,
  sort_order integer default 0,
  status     text default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table instagram_photos enable row level security;

create policy "public can read published instagram photos"
  on instagram_photos for select
  using (status = 'published');

create policy "authenticated users can read all instagram photos"
  on instagram_photos for select
  to authenticated
  using (true);

create policy "authenticated users can insert instagram photos"
  on instagram_photos for insert
  to authenticated
  with check (true);

create policy "authenticated users can update instagram photos"
  on instagram_photos for update
  to authenticated
  using (true);

create policy "authenticated users can delete instagram photos"
  on instagram_photos for delete
  to authenticated
  using (true);

create trigger instagram_photos_set_updated_at
  before update on instagram_photos
  for each row
  execute function set_updated_at();
