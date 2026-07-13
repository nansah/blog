// Supabase Edge Function: submit-lead
//
// Verifies a Cloudflare Turnstile token server-side before inserting into
// the `leads` table, then syncs the subscriber to Resend (adds them to an
// audience and sends the worksheet). This is the only path that can write
// to `leads` now — the RLS policy that let the browser insert directly
// (anon, with check true) has been dropped, so a bot hitting the Supabase
// REST API directly can no longer bypass verification the way it could
// before.
//
// Required secrets (set via `supabase secrets set`, see deploy notes):
//   TURNSTILE_SECRET_KEY      - from the Cloudflare Turnstile dashboard
//   RESEND_API_KEY            - from the Resend dashboard
//   SUPABASE_URL               - auto-provided by Supabase at runtime
//   SUPABASE_SERVICE_ROLE_KEY  - auto-provided by Supabase at runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const RESEND_AUDIENCE_ID = '0ed862f3-758a-4eba-a384-a8627609ce5e';
const RESEND_FROM = 'Nana Yaa <hi@nanayaaansah.com>';
const WORKSHEET_URL = 'https://nanayaaansah.com/wardrobe_audit_worksheet.pdf';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function syncToResend(email: string, name: string | null) {
  // Best-effort: the lead is already saved in Supabase by the time this
  // runs, so a Resend hiccup shouldn't fail the whole submission. But we
  // DO need to log the actual response body on failure — fetch() only
  // throws on network errors, not on Resend rejecting the request (e.g.
  // an unverified sending domain), so without this a rejection would fail
  // completely silently.
  try {
    const res = await fetch(`https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, first_name: name || undefined, unsubscribed: false }),
    });
    if (!res.ok) console.error('Resend audience sync rejected:', res.status, await res.text());
  } catch (err) {
    console.error('Resend audience sync failed:', err);
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        subject: 'Your Wardrobe Audit Worksheet',
        html: `
          <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1c1712;">
            <h1 style="font-size: 22px; margin-bottom: 12px;">Hi ${name || 'there'},</h1>
            <p style="font-size: 15px; line-height: 1.6;">Thank you for signing up! Here's your Wardrobe Audit Worksheet — my exact step-by-step process for auditing your closet, spotting the gaps, and building a wardrobe you actually love wearing.</p>
            <p style="text-align:center; margin: 28px 0;">
              <a href="${WORKSHEET_URL}" style="background:#b7410e; color:#fff; padding: 14px 28px; text-decoration:none; border-radius: 4px; font-size: 13px; letter-spacing: 0.04em;">Download Your Worksheet</a>
            </p>
            <p style="font-size: 14px; line-height: 1.6; color: #7a6f63;">Thanks for being here — I'm so glad you're part of this.<br>xx Nana Yaa</p>
          </div>
        `,
      }),
    });
    if (!res.ok) console.error('Resend email send rejected:', res.status, await res.text());
  } catch (err) {
    console.error('Resend email send failed:', err);
  }
}

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

    const cleanEmail = email.trim();
    const cleanName = typeof name === 'string' && name.trim() ? name.trim() : null;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase.from('leads').insert({
      email: cleanEmail,
      name: cleanName,
      source: typeof source === 'string' ? source : null,
    });

    if (error) return json({ error: error.message }, 500);

    await syncToResend(cleanEmail, cleanName);

    return json({ success: true });
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
});
