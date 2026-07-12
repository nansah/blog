-- Run this once in the Supabase SQL Editor (same project as before)
-- Run this AFTER the submit-lead Edge Function is deployed and working —
-- once this runs, the leads form will ONLY work through that verified
-- function, not by inserting directly from the browser.

-- ══ CLOSE DIRECT ANON INSERT ON LEADS ══
-- Previously "anyone can submit a lead" allowed any anon request (including
-- a bot hitting the REST API directly, bypassing the website and Turnstile
-- entirely) to insert. The submit-lead Edge Function now handles inserts
-- itself using the service role key, which bypasses RLS — so this policy
-- is no longer needed and removing it closes that gap.
drop policy if exists "anyone can submit a lead" on leads;
