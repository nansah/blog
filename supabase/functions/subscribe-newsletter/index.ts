// Supabase Edge Function: subscribe-newsletter
//
// Verifies a Cloudflare Turnstile token server-side, then adds the email
// to the homepage newsletter's Resend audience. Kept separate from
// submit-lead since this is a different audience/segment and doesn't need
// the worksheet email or a `leads` table row.
//
// Required secrets (set via `supabase secrets set`):
//   TURNSTILE_SECRET_KEY   - from the Cloudflare Turnstile dashboard
//   RESEND_API_KEY         - from the Resend dashboard (needs Full access,
//                             not just "Sending access", to manage contacts)

const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

const RESEND_AUDIENCE_ID = 'cea2ff4c-5a16-412e-9c27-f1739edb2299';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const { email, turnstileToken } = await req.json();

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

    const res = await fetch(`https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), unsubscribed: false }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('Resend audience sync rejected:', res.status, detail);
      return json({ error: 'Subscription failed' }, 500);
    }

    return json({ success: true });
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
});
