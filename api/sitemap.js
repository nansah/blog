// Generates sitemap.xml on request (see vercel.json rewrite: /sitemap.xml -> /api/sitemap),
// combining the site's static pages with every published blog post pulled live from Supabase —
// a static file can't stay in sync with posts added/edited through the CMS.

const SUPABASE_URL = 'https://qjhdkfygwsmtnjuxgork.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaGRrZnlnd3NtdG5qdXhnb3JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2ODgwMTAsImV4cCI6MjA5OTI2NDAxMH0.sIqLSOwpCc02SE_KDQ7KGU4OdguYTtUo1XQlA4ISTio';
const SITE = 'https://nanayaaansah.com';

const STATIC_PATHS = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/about', priority: '0.6', changefreq: 'monthly' },
  { path: '/blog', priority: '0.9', changefreq: 'daily' },
  { path: '/lifestyle', priority: '0.7', changefreq: 'weekly' },
  { path: '/fashion', priority: '0.7', changefreq: 'weekly' },
  { path: '/faith', priority: '0.7', changefreq: 'weekly' },
  { path: '/beauty', priority: '0.7', changefreq: 'weekly' },
  { path: '/faves', priority: '0.6', changefreq: 'weekly' },
  { path: '/press', priority: '0.5', changefreq: 'monthly' },
  { path: '/resources', priority: '0.5', changefreq: 'monthly' },
  { path: '/work-with-me', priority: '0.6', changefreq: 'monthly' },
  { path: '/contact', priority: '0.4', changefreq: 'yearly' },
  { path: '/privacy-policy', priority: '0.2', changefreq: 'yearly' },
  { path: '/terms-of-use', priority: '0.2', changefreq: 'yearly' },
  { path: '/disclosure', priority: '0.2', changefreq: 'yearly' },
  { path: '/cookie-policy', priority: '0.2', changefreq: 'yearly' },
];

const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

module.exports = async (req, res) => {
  let posts = [];
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?select=slug,id,category,updated_at,published_at,created_at&status=eq.published`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (r.ok) posts = await r.json();
  } catch {
    // If Supabase is unreachable, still serve the static pages rather than a hard failure.
  }

  const staticEntries = STATIC_PATHS.map(({ path, priority, changefreq }) => `
  <url>
    <loc>${SITE}${path}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('');

  // Mirrors the exact lowercase-category URL scheme post.html's own canonical
  // tag uses, so sitemap entries always match what each page self-reports.
  const postEntries = posts.map(p => {
    const catSlug = p.category ? p.category.toLowerCase() + '/' : '';
    const loc = `${SITE}/blog/${catSlug}${encodeURIComponent(p.slug || p.id)}`;
    const lastmod = (p.updated_at || p.published_at || p.created_at || '').slice(0, 10);
    return `
  <url>
    <loc>${esc(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticEntries}${postEntries}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
};
