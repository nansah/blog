// Supabase Edge Function: submit-comment
//
// Verifies a Cloudflare Turnstile token server-side before inserting into
// the `comments` table with status='pending'. There is no INSERT policy
// letting the browser write to `comments` directly (see the RLS setup) -
// this function is the only path in, mirroring submit-lead, so a bot
// hitting the Supabase REST API directly can't bypass verification the
// way it could with a simple "anon insert" policy.
//
// Comments land as 'pending' and only appear on the site once approved
// via the admin Comments panel - this function never marks anything
// 'approved' itself.
//
// Required secrets (set via `supabase secrets set`, already set for the
// other functions in this project):
//   TURNSTILE_SECRET_KEY      - from the Cloudflare Turnstile dashboard
//   SUPABASE_URL               - auto-provided by Supabase at runtime
//   SUPABASE_SERVICE_ROLE_KEY  - auto-provided by Supabase at runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const { postId, name, body, turnstileToken } = await req.json();

    if (!postId || !name || !body || !turnstileToken
      || typeof postId !== 'string' || typeof name !== 'string' || typeof body !== 'string') {
      return json({ error: 'Missing required fields' }, 400);
    }

    const cleanName = name.trim().slice(0, 80);
    const cleanBody = body.trim().slice(0, 2000);
    if (!cleanName || !cleanBody) return json({ error: 'Missing required fields' }, 400);

    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: TURNSTILE_SECRET, response: turnstileToken }),
    });
    const verifyData = await verifyRes.json();

    if (!verifyData.success) {
      return json({ error: 'Verification failed' }, 403);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Confirm the post actually exists so comments can't get attached to
    // an arbitrary/made-up post_id.
    const { data: post } = await supabase.from('posts').select('id').eq('id', postId).maybeSingle();
    if (!post) return json({ error: 'Post not found' }, 404);

    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      name: cleanName,
      body: cleanBody,
      status: 'pending',
    });

    if (error) return json({ error: error.message }, 500);

    return json({ success: true });
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
});
