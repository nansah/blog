// Server-renders the post-card grid on category listing pages (lifestyle,
// fashion, beauty, faith) and the all-posts page (blog), same reasoning as
// api/post.js: the grid is normally empty in the static HTML and only fills
// in via a client-side Supabase fetch (script.js renderRemotePosts), so
// crawlers previously saw ~1 sentence of intro copy and nothing else on
// these indexed URLs. The client script still runs after load and replaces
// the grid the same way it always has.

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://qjhdkfygwsmtnjuxgork.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaGRrZnlnd3NtdG5qdXhnb3JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2ODgwMTAsImV4cCI6MjA5OTI2NDAxMH0.sIqLSOwpCc02SE_KDQ7KGU4OdguYTtUo1XQlA4ISTio';

const PAGES = {
  lifestyle: { file: 'lifestyle.html', category: 'Lifestyle' },
  fashion: { file: 'fashion.html', category: 'Fashion' },
  beauty: { file: 'beauty.html', category: 'Beauty' },
  faith: { file: 'faith.html', category: 'Faith' },
  blog: { file: 'blog.html', category: null },
};

const TEMPLATES = Object.fromEntries(
  Object.entries(PAGES).map(([key, { file }]) => [key, fs.readFileSync(path.join(process.cwd(), file), 'utf8')])
);

const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmtDate = iso => {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
  } catch {
    return '';
  }
};

// Mirrors the card markup script.js's renderRemotePosts() builds client-side.
function cardHTML(post) {
  const catSlug = post.category ? esc(post.category.toLowerCase()) + '/' : '';
  const focalPos = `${post.focal_x ?? 50}% ${post.focal_y ?? 50}%`;
  return `
    <article class="post-card reveal admin-post in-view">
      <a href="/blog/${catSlug}${esc(post.slug || post.id)}" class="post-card-link" style="display:block;text-decoration:none;color:inherit;">
        <div class="post-img-wrap">
          ${post.image
            ? `<img src="${esc(post.image)}" alt="${esc(post.title)}" loading="lazy" style="object-position: ${focalPos};" />`
            : `<div style="width:100%;padding-top:68%;background:linear-gradient(135deg,#2b241c,#1c1712);position:relative;"><span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Lora',serif;font-size:22px;color:#a9603f;opacity:.5;">✦</span></div>`
          }
        </div>
        <div class="post-body">
          ${post.category ? `<span class="section-tag" style="font-size:9px;margin-bottom:6px;display:inline-block;">${esc(post.category)}</span>` : ''}
          <h3 class="post-title">${esc(post.title)}</h3>
          ${post.excerpt ? `<p class="post-excerpt">${esc(post.excerpt)}</p>` : ''}
          <div style="margin-top:10px;font-size:11px;color:#7a6f63;display:flex;gap:12px;flex-wrap:wrap;">
            ${post.published_at ? `<span>${fmtDate(post.published_at)}</span>` : ''}
            ${post.read_time ? `<span>${esc(post.read_time)}</span>` : ''}
          </div>
        </div>
      </a>
    </article>
  `;
}

async function fetchPosts(category) {
  let url = `${SUPABASE_URL}/rest/v1/posts?select=*&status=eq.published&order=published_at.desc`;
  if (category) url += `&category=eq.${encodeURIComponent(category)}`;
  const r = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
  if (!r.ok) return [];
  return r.json();
}

module.exports = async (req, res) => {
  const key = String(req.query.page || '').toLowerCase();
  const pageConf = PAGES[key];
  const template = TEMPLATES[key];

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!pageConf || !template) {
    res.status(404).send('Not found');
    return;
  }

  let posts = [];
  try {
    posts = await fetchPosts(pageConf.category);
  } catch {
    // Supabase unreachable — fall back to the plain client-rendered shell.
  }

  if (!posts.length) {
    res.status(200).send(template);
    return;
  }

  const grid = posts.map(cardHTML).join('');
  const out = template.replace(
    '<div class="posts-grid page-posts-grid"></div>',
    () => `<div class="posts-grid page-posts-grid">${grid}</div>`
  );

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
  res.status(200).send(out);
};
