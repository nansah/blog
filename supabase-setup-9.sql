-- Run this once in the Supabase SQL Editor (same project as before)

-- ══ FOCAL POINT (which part of an image stays visible when cropped) ══
-- Adds focal_x/focal_y (0-100, percentage from top-left) to both the blog
-- posts' featured images and press feature thumbnails. Defaults to 50/50
-- (dead center), matching the existing behavior when unset.

alter table posts
  add column if not exists focal_x integer default 50,
  add column if not exists focal_y integer default 50;

alter table press_features
  add column if not exists focal_x integer default 50,
  add column if not exists focal_y integer default 50;
