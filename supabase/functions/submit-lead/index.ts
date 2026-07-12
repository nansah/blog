// Supabase Edge Function: submit-lead
//
// Verifies a Cloudflare Turnstile token server-side before inserting into
// the `leads` table. This is the only path that can write to `leads` now —
// the RLS policy that let the browser insert directly (anon, with check
// true) has been dropped, so a bot hitting the Supabase REST API directly
// can no longer bypass verification the way it could before.
//
// Required secrets (set via `supabase secrets set`, see deploy notes):
//   TURNSTILE_SECRET_KEY   - from the Cloudflare Turnstile dashboard
//   SUPABASE_URL            - auto-provided by Supabase at runtime
//   SUPABASE_SERVICE_ROLE_KEY - auto-provided by Supabase at runtime

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
    const { email, name, source, turnstileToken } = await req.json();

    if (!email || typeof email !== 'string' || !turnstileToken) {
      return json({ error: 'Missing required fields' }, 400);
    }

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
    const { error } = await supabase.from('leads').insert({
      email: email.trim(),
      name: typeof name === 'string' ? name.trim() : null,
      source: typeof source === 'string' ? source : null,
    });

    if (error) return json({ error: error.message }, 500);
    return json({ success: true });
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
});
