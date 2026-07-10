-- Run this once in the Supabase SQL Editor (same project as before)
-- Fixes image uploads: instead of embedding the whole photo as base64
-- text directly in the database (which silently truncates/corrupts large
-- images), uploaded files now go into real file storage and only a short
-- URL gets saved to the database.

insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- Anyone can view images (needed so they display on the public site).
create policy "public can view images"
  on storage.objects for select
  using (bucket_id = 'images');

-- Only signed-in users (you) can upload, replace, or delete images.
create policy "authenticated users can upload images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'images');

create policy "authenticated users can update images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'images');

create policy "authenticated users can delete images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'images');
