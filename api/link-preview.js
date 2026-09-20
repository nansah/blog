// Fetches a shop link's Open Graph image/title server-side (avoids the
// browser CORS restrictions a client-side fetch would hit) so the admin
// editor's "Shop This Post" links can auto-fill a product image instead
// of requiring a manually pasted image URL. Best-effort: some retailers
// (notably Amazon) sometimes block non-browser requests, in which case
// this just returns empty and the editor falls back to manual entry.

const metaTag = (html, prop) => {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return '';
};

const decodeEntities = s => String(s || '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");

module.exports = async (req, res) => {
  const url = String(req.query.url || '');
  res.setHeader('Content-Type', 'application/json');

  if (!/^https?:\/\//i.test(url)) {
    res.status(400).json({ error: 'Invalid URL', image: '', title: '' });
    return;
  }

  try {
    const r = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    const html = await r.text();
    const image = decodeEntities(metaTag(html, 'og:image') || metaTag(html, 'twitter:image'));
    const title = decodeEntities(metaTag(html, 'og:title') || metaTag(html, 'twitter:title'));
    res.status(200).json({ image, title });
  } catch {
    res.status(200).json({ image: '', title: '' });
  }
};
