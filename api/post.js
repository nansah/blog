// Server-renders /blog/:category/:slug (and legacy /post/... variants) so the
// article's real title, meta tags, and body text are present in the initial
// HTML response. Previously post.html shipped with a generic shared title
// ("Blog — Nana Yaa Ansah") and an empty #postRoot, with the real content only
// appearing after a client-side Supabase fetch — invisible to crawlers that
// don't execute (or wait long enough for) JS, including AdSense's reviewer.
// The client-side script in post.html still runs after load and re-renders
// the same markup, so nothing about the interactive page changes.

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://qjhdkfygwsmtnjuxgork.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaGRrZnlnd3NtdG5qdXhnb3JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2ODgwMTAsImV4cCI6MjA5OTI2NDAxMH0.sIqLSOwpCc02SE_KDQ7KGU4OdguYTtUo1XQlA4ISTio';

const TEMPLATE = fs.readFileSync(path.join(process.cwd(), 'post.html'), 'utf8');

const esc = s => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmtDate = iso => {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
  } catch {
    return iso || '';
  }
};

const CATEGORY_HREF = { Lifestyle: '/lifestyle', Fashion: '/fashion', Faith: '/faith', Beauty: '/beauty' };

async function fetchPost(slug, id) {
  const filter = slug ? `slug=eq.${encodeURIComponent(slug)}` : `id=eq.${encodeURIComponent(id)}`;
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/posts?select=*&${filter}&status=eq.published&limit=1`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  if (!r.ok) return null;
  const rows = await r.json();
  return rows[0] || null;
}

// Mirrors post.html's own renderPost()/heroHTML so the server-rendered
// markup matches what the client replaces it with on hydration.
function articleHTML(post) {
  const focalPos = `${post.focal_x ?? 50}% ${post.focal_y ?? 50}%`;
  const catHref = CATEGORY_HREF[post.category] || '/';
  const tags = Array.isArray(post.tags) ? post.tags.filter(Boolean) : [];

  const heroHTML = post.image
    ? `<div class="post-hero">
         <img src="${esc(post.image)}" alt="${esc(post.title)}" loading="eager" fetchpriority="high" style="object-position: ${focalPos};" />
         <div class="post-hero-overlay">
           <div class="post-hero-inner">
             ${post.category ? `<span class="section-tag">${esc(post.category)}</span>` : ''}
             <h1 class="post-hero-title">${esc(post.title)}</h1>
             <div class="post-hero-meta">
               <span><i class="fas fa-calendar-alt"></i>${fmtDate(post.published_at || post.created_at)}</span>
               ${post.read_time ? `<span><i class="fas fa-clock"></i>${esc(post.read_time)}</span>` : ''}
               <span><i class="fas fa-user"></i>Nana Yaa Ansah</span>
             </div>
           </div>
         </div>
       </div>`
    : `<div style="background:#2b241c;padding:100px 20px 40px;">
         <div style="max-width:720px;margin:0 auto;color:#fff;">
           ${post.category ? `<span class="section-tag">${esc(post.category)}</span>` : ''}
           <h1 style="font-family:'Lora',serif;font-weight:600;font-size:clamp(26px,5vw,52px);line-height:1.18;margin:12px 0 20px;">${esc(post.title)}</h1>
           <div style="display:flex;gap:20px;font-size:13px;opacity:.75;flex-wrap:wrap;">
             <span><i class="fas fa-calendar-alt"></i> ${fmtDate(post.published_at || post.created_at)}</span>
             ${post.read_time ? `<span><i class="fas fa-clock"></i> ${esc(post.read_time)}</span>` : ''}
           </div>
         </div>
       </div>`;

  return `
    ${heroHTML}
    <div class="article-wrap">
      <div class="article-main">
        ${!post.image ? '' : `<div class="post-meta-bar">
          ${post.category ? `<a href="${catHref}" style="color:inherit;"><span class="badge">${esc(post.category)}</span></a>` : ''}
          <span><i class="fas fa-calendar-alt"></i> ${fmtDate(post.published_at || post.created_at)}</span>
          ${post.read_time ? `<span><i class="fas fa-clock"></i> ${esc(post.read_time)}</span>` : ''}
          <span><i class="fas fa-user"></i> Nana Yaa Ansah</span>
        </div>`}
        ${!post.image ? '' : `<img src="${esc(post.image)}" alt="${esc(post.title)}" loading="lazy" style="object-position: ${focalPos};" class="article-top-image" />`}
        <div class="article-body" id="articleBody">${post.content || '<p>No content.</p>'}</div>
        ${tags.length ? `<div class="post-tags">${tags.map(t => `<span class="post-tag">#${esc(t)}</span>`).join('')}</div>` : ''}
      </div>
      <aside class="post-sidebar" id="postSidebar"></aside>
    </div>
    <nav class="post-nav">
      <a href="${catHref}"><i class="fas fa-arrow-left"></i> Back to ${esc(post.category || 'All Posts')}</a>
    </nav>
  `;
}

function injectHead(html, post) {
  const pageTitle = `${post.title} — Nana Yaa Ansah`;
  const desc = post.excerpt || 'Read on Nana Yaa Ansah, New York City lifestyle influencer.';
  const catSlug = post.category ? post.category.toLowerCase() + '/' : '';
  const url = `https://nanayaaansah.com/blog/${catSlug}${post.slug || post.id}`;
  const image = post.image || 'https://nanayaaansah.com/images/hero-nana-yaa.jpg';

  const swapAttr = (src, id, attr, value) =>
    src.replace(new RegExp(`(id="${id}"[^>]*${attr}=")[^"]*(")`), (_, pre, post_) => `${pre}${esc(value)}${post_}`);

  let out = html.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(pageTitle)}</title>`);
  out = swapAttr(out, 'metaDesc', 'content', desc);
  out = swapAttr(out, 'canonicalLink', 'href', url);
  out = swapAttr(out, 'ogUrl', 'content', url);
  out = swapAttr(out, 'ogTitle', 'content', pageTitle);
  out = swapAttr(out, 'ogDesc', 'content', desc);
  out = swapAttr(out, 'ogImage', 'content', image);
  out = swapAttr(out, 'twTitle', 'content', pageTitle);
  out = swapAttr(out, 'twDesc', 'content', desc);
  out = swapAttr(out, 'twImage', 'content', image);
  out = out.replace('<div id="postRoot"></div>', () => `<div id="postRoot">${articleHTML(post)}</div>`);
  return out;
}

module.exports = async (req, res) => {
  const { slug, id } = req.query;
  let post = null;
  try {
    post = await fetchPost(slug, id);
  } catch {
    // Supabase unreachable — fall back to the plain client-rendered shell
    // rather than a hard error, same as the sitemap function.
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!post) {
    // Real not-found/unpublished posts get a 404 status (avoids a soft-404);
    // the client-side script still renders the friendly "not found" panel.
    res.status(404).send(TEMPLATE);
    return;
  }

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
  res.status(200).send(injectHead(TEMPLATE, post));
};
