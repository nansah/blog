-- Run this once in the Supabase SQL Editor (same project as before)

-- ══ SHOP THIS POST (per-post product links: ShopMy, Amazon, etc.) ══
-- Rendered as a "Shop This Post" grid under the article body. Each entry
-- is { name, url, image } — image is optional.
alter table posts add column if not exists shop_links jsonb default '[]'::jsonb;
