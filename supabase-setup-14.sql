-- Run this once in the Supabase SQL Editor (same project as before)

-- ══ LINK PIPELINE CARDS TO REAL DRAFT POSTS ══
-- "Create Draft Post" on a pipeline card creates a real row in `posts`
-- and links back to it here, so the card can show its live draft/
-- published status instead of just a manually-set stage label.
alter table pipeline_items add column if not exists linked_post_id text references posts(id) on delete set null;
