-- Run this once in the Supabase SQL Editor (same project as before)

-- ══ CONTENT PIPELINE (admin-only planning board) ══
-- Kanban-style tracker for posts from idea through publish, separate
-- from the live "posts" table — cards here represent work-in-progress
-- planning, not published content. Purely internal, so no public read
-- policy (unlike posts/faves).
create table if not exists pipeline_items (
  id                     text primary key,
  title                  text not null,
  stage                  text not null default 'idea'
                         check (stage in ('idea','researching','testing','drafting','editing','seo_links','images','scheduled','published','update_needed')),
  content_type           text,   -- 'Commerce' | 'Shopping/SEO' | 'Fashion' | 'Beauty News' | 'Feature'
  target_month           text,   -- 'YYYY-MM' — which month this counts toward for the mix tally
  keyword                text,
  products_needed        text,
  testing_dates          text,
  affiliate_opportunity  text,
  photo_video            text,
  social_deliverable     text,
  url                    text,
  sort_order             integer default 0,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

alter table pipeline_items enable row level security;

create policy "authenticated users can read pipeline items"
  on pipeline_items for select
  to authenticated
  using (true);

create policy "authenticated users can insert pipeline items"
  on pipeline_items for insert
  to authenticated
  with check (true);

create policy "authenticated users can update pipeline items"
  on pipeline_items for update
  to authenticated
  using (true);

create policy "authenticated users can delete pipeline items"
  on pipeline_items for delete
  to authenticated
  using (true);

-- Reuses the set_updated_at() function created for the posts table.
create trigger pipeline_items_set_updated_at
  before update on pipeline_items
  for each row
  execute function set_updated_at();
