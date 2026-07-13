/* ============================================
   THE NYC EDIT — Interactive JS
   ============================================ */

const header      = document.getElementById('header');
const mobileToggle = document.getElementById('mobileToggle');
const mobileMenu  = document.getElementById('mobileMenu');
const scrollTopBtn = document.getElementById('scrollTopBtn');
const nlForm      = document.getElementById('newsletterForm');
const navSearchButtons = document.querySelectorAll('.nav-search');

// ── Sticky nav + scroll-to-top visibility ──────────────────────────────────
window.addEventListener('scroll', () => {
  const scrolled = window.scrollY > 60;
  if (header) header.classList.toggle('scrolled', scrolled);
  if (scrollTopBtn) scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
}, { passive: true });

// ── Mobile menu ────────────────────────────────────────────────────────────
if (mobileToggle && mobileMenu) {
  mobileToggle.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    mobileToggle.classList.toggle('open', open);
    mobileToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });

  // Close mobile menu when a link is tapped
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      mobileToggle.classList.remove('open');
    });
  });
}

// ── Scroll to top ──────────────────────────────────────────────────────────
if (scrollTopBtn) {
  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ── Newsletter form ────────────────────────────────────────────────────────
const nlFormLoadedAt = Date.now();
if (nlForm) {
  nlForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn   = nlForm.querySelector('button');
    const input = document.getElementById('newsletterEmail');
    const note  = document.getElementById('newsletterNote');
    const email = input.value.trim();
    if (!email) return;

    // Bot check: honeypot field filled, or submitted implausibly fast.
    // Fail silently with a fake success so bots don't learn to adapt.
    const honeypot = document.getElementById('newsletterCompany')?.value.trim();
    const tooFast  = Date.now() - nlFormLoadedAt < 1500;
    if (honeypot || tooFast) {
      nlForm.reset();
      return;
    }

    const turnstileToken = nlForm.querySelector('[name="cf-turnstile-response"]')?.value;
    if (!turnstileToken) {
      if (note) { note.textContent = 'Please complete the verification check, then try again.'; note.style.color = '#c0392b'; }
      return;
    }

    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Subscribing…';

    let error = null;
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/subscribe-newsletter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, turnstileToken }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) error = result.error || 'Subscription failed';
    } catch {
      error = 'Network error';
    }

    if (typeof turnstile !== 'undefined') turnstile.reset();
    btn.disabled = false;

    if (error) {
      btn.textContent = original;
      if (note) { note.textContent = 'Something went wrong — please try again.'; note.style.color = '#c0392b'; }
      return;
    }

    btn.textContent = 'You\'re in! ✓';
    btn.style.background = '#4ade80';
    btn.style.borderColor = '#4ade80';
    if (note) { note.textContent = 'no spam, ever. unsubscribe at any time.'; note.style.color = ''; }
    nlForm.reset();

    setTimeout(() => {
      btn.textContent = original;
      btn.style.background = '';
      btn.style.borderColor = '';
    }, 3500);
  });
}

// ── Intersection Observer — reveal on scroll ───────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── Stagger post cards ─────────────────────────────────────────────────────
const cardObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const cards = entry.target.querySelectorAll('.post-card.reveal');
      cards.forEach((card, i) => {
        setTimeout(() => card.classList.add('in-view'), i * 110);
      });
      cardObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.05 });

const postsGrid = document.querySelector('.posts-grid');
if (postsGrid) cardObserver.observe(postsGrid);

// ── Stagger Instagram grid ─────────────────────────────────────────────────
const igObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.ig-item.reveal').forEach((item, i) => {
        setTimeout(() => item.classList.add('in-view'), i * 80);
      });
      igObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.05 });

const igGrid = document.querySelector('.ig-grid');
if (igGrid) igObserver.observe(igGrid);

// ── Lightweight site search overlay ───────────────────────────────────────
const searchIndex = [
  { title: 'Home', group: 'Main', href: '/' },
  { title: 'Lifestyle', group: 'Category', href: '/lifestyle' },
  { title: 'Fashion', group: 'Category', href: '/fashion' },
  { title: 'Faith', group: 'Category', href: '/faith' },
  { title: 'Beauty', group: 'Category', href: '/beauty' },
  { title: 'Latest Posts', group: 'Section', href: '/#blog' },
  { title: 'All Posts', group: 'Section', href: '/blog' },
  { title: 'About Nana Yaa', group: 'Section', href: '/about' },
  { title: 'Shop My Faves', group: 'Connect', href: '/faves' },
  { title: 'Work With Me', group: 'Connect', href: '/work-with-me' },
  { title: 'Press & Media', group: 'Connect', href: '/press' },
  { title: 'Resources', group: 'Connect', href: '/resources' },
  { title: 'Contact', group: 'Connect', href: '/contact' },
];

let searchOverlay;
let searchInput;
let searchResults;

function renderSearchResults(query = '') {
  if (!searchResults) return;

  const term = query.trim().toLowerCase();
  const matches = searchIndex.filter(item => (
    item.title.toLowerCase().includes(term) || item.group.toLowerCase().includes(term)
  ));

  if (!matches.length) {
    searchResults.innerHTML = '<div class="search-empty">No matches yet. Try lifestyle, fashion, faith, or beauty.</div>';
    return;
  }

  searchResults.innerHTML = matches.map(item => (
    `<a class="search-result-item" href="${item.href}">
      <div>
        <strong>${item.title}</strong>
        <span>${item.group}</span>
      </div>
      <i class="fas fa-arrow-right"></i>
    </a>`
  )).join('');
}

function openSearchOverlay() {
  if (!searchOverlay) return;
  searchOverlay.classList.add('open');
  document.body.classList.add('search-open');
  renderSearchResults('');
  if (searchInput) searchInput.focus();
}

function closeSearchOverlay() {
  if (!searchOverlay) return;
  searchOverlay.classList.remove('open');
  document.body.classList.remove('search-open');
}

function ensureSearchOverlay() {
  searchOverlay = document.getElementById('siteSearchOverlay');
  if (!searchOverlay) {
    const wrapper = document.createElement('div');
    wrapper.id = 'siteSearchOverlay';
    wrapper.className = 'search-overlay';
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.innerHTML = `
      <div class="search-panel" role="dialog" aria-modal="true" aria-label="Site search">
        <div class="search-panel-top">
          <i class="fas fa-search" aria-hidden="true"></i>
          <input class="search-input" type="text" placeholder="Search pages and sections..." aria-label="Search" />
          <button class="search-close" type="button" aria-label="Close search"><i class="fas fa-times"></i></button>
        </div>
        <div class="search-results"></div>
      </div>
    `;
    document.body.appendChild(wrapper);
    searchOverlay = wrapper;
  }

  searchInput = searchOverlay.querySelector('.search-input');
  searchResults = searchOverlay.querySelector('.search-results');
  const closeBtn = searchOverlay.querySelector('.search-close');
  const panel = searchOverlay.querySelector('.search-panel');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderSearchResults(e.target.value);
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeSearchOverlay);
  }

  if (searchOverlay) {
    searchOverlay.addEventListener('click', (e) => {
      if (e.target === searchOverlay) closeSearchOverlay();
    });
  }

  if (panel) {
    panel.addEventListener('click', (e) => e.stopPropagation());
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchOverlay.classList.contains('open')) {
      closeSearchOverlay();
    }
  });
}

if (navSearchButtons.length) {
  ensureSearchOverlay();
  navSearchButtons.forEach(btn => {
    btn.addEventListener('click', openSearchOverlay);
  });
}

// ── Smooth anchor scrolling (respects fixed header height) ────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = (header ? header.offsetHeight : 0) + 16;
    window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
  });
});

// ── Inject published posts from Supabase into category pages ──────────────
(async function renderRemotePosts() {
  const grid = document.querySelector('.posts-grid');
  if (!grid || typeof supabaseClient === 'undefined') return;

  // Detect which category page we're on
  const path = window.location.pathname.toLowerCase();
  const isHome = path === '/' || path === '' || path.endsWith('/index.html');
  const pageCat = path.includes('lifestyle') ? 'Lifestyle'
    : path.includes('fashion')  ? 'Fashion'
    : path.includes('faith')    ? 'Faith'
    : path.includes('beauty')   ? 'Beauty'
    : null;

  let query = supabaseClient.from('posts').select('*').eq('status', 'published').order('published_at', { ascending: false });
  if (pageCat) query = query.eq('category', pageCat);
  if (isHome) query = query.limit(6);

  const { data: relevant, error } = await query;
  if (error || !relevant || !relevant.length) return;

  const fmtDate = iso => {
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }); }
    catch { return ''; }
  };
  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  relevant.forEach(post => {
    const card = document.createElement('article');
    card.className = 'post-card reveal admin-post';
    card.innerHTML = `
      <a href="/post/${esc(post.slug || post.id)}" class="post-card-link" style="display:block;text-decoration:none;color:inherit;">
        <div class="post-img-wrap">
          ${post.image
            ? `<img src="${esc(post.image)}" alt="${esc(post.title)}" loading="lazy" style="object-position: ${post.focal_x ?? 50}% ${post.focal_y ?? 50}%;" />`
            : `<div style="width:100%;padding-top:68%;background:linear-gradient(135deg,#2b241c,#1c1712);position:relative;"><span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Lora',serif;font-size:22px;color:#a9603f;opacity:.5;">✦</span></div>`
          }
        </div>
        <div class="post-body">
          ${post.category ? `<span class="section-tag" style="font-size:9px;margin-bottom:6px;display:inline-block;">${esc(post.category)}</span>` : ''}
          <h3 class="post-title">${esc(post.title)}</h3>
          ${post.excerpt ? `<p class="post-excerpt">${esc(post.excerpt)}</p>` : ''}
          <div style="margin-top:10px;font-size:11px;color:#7a6f63;display:flex;gap:12px;flex-wrap:wrap;">
            ${post.published_at ? `<span>${fmtDate(post.published_at)}</span>` : ''}
            ${post.read_time    ? `<span>${esc(post.read_time)}</span>`       : ''}
          </div>
        </div>
      </a>
    `;
    grid.appendChild(card);
    // Observe the new card for reveal animation
    revealObserver.observe(card);
  });
})();

// ── Live per-category post counts (e.g. homepage "Explore by Category") ───
(async function renderCategoryCounts() {
  const catSpans   = document.querySelectorAll('[data-cat-count]');
  const totalSpans = document.querySelectorAll('[data-post-count]');
  if ((!catSpans.length && !totalSpans.length) || typeof supabaseClient === 'undefined') return;

  const { data, error } = await supabaseClient.from('posts').select('category').eq('status', 'published');
  if (error || !data) return;

  const counts = {};
  data.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });

  catSpans.forEach(span => {
    const cat = span.dataset.catCount;
    const n = counts[cat] || 0;
    span.textContent = n ? `${n} post${n !== 1 ? 's' : ''}` : 'coming soon';
  });

  totalSpans.forEach(span => { span.textContent = data.length; });
})();

// ── Live social links + follower counts (editable in admin) ───────────────
(async function renderSocialLinks() {
  if (typeof supabaseClient === 'undefined') return;

  const { data, error } = await supabaseClient.from('social_links').select('*');
  if (error || !data) return;

  const byId = {};
  data.forEach(l => { byId[l.id] = l; });

  // A URL typed without "https://" (e.g. "instagram.com/you") is a valid
  // relative link as far as the browser is concerned, so it'd silently
  // point back at this site instead of Instagram. Normalize it here so it
  // always works regardless of how it was entered in the admin panel.
  const normalizeUrl = url => {
    if (!url || url === '#') return '';
    return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
  };

  // Every social icon site-wide (footer, about section, etc.) is matched by
  // its existing aria-label — no extra markup needed for the icon links.
  // Platforms with no real profile URL set are hidden instead of showing a
  // dead "#" link.
  const labelMap = { Instagram: 'instagram', TikTok: 'tiktok', YouTube: 'youtube', Pinterest: 'pinterest', Twitter: 'twitter' };
  document.querySelectorAll('a[aria-label]').forEach(a => {
    const id = labelMap[a.getAttribute('aria-label')];
    if (!id) return;
    const url = normalizeUrl(byId[id]?.url);
    if (url) {
      a.href = url;
    } else {
      a.style.display = 'none';
    }
  });

  // Explicit hooks for follower counts, handles, and CTA links.
  document.querySelectorAll('[data-social-count]').forEach(el => {
    const l = byId[el.dataset.socialCount];
    if (l?.followers) el.textContent = l.followers;
  });
  document.querySelectorAll('[data-social-handle]').forEach(el => {
    const l = byId[el.dataset.socialHandle];
    if (l?.handle) el.textContent = l.handle;
  });
  document.querySelectorAll('[data-social-link]').forEach(el => {
    const url = normalizeUrl(byId[el.dataset.socialLink]?.url);
    if (url) el.href = url;
  });
})();

// ── Live Instagram feed grid (homepage, editable in admin) ────────────────
(async function renderInstagramFeed() {
  const grid = document.getElementById('igFeedGrid');
  if (!grid || typeof supabaseClient === 'undefined') return;

  const { data, error } = await supabaseClient
    .from('instagram_photos')
    .select('*')
    .eq('status', 'published')
    .order('sort_order', { ascending: true })
    .limit(8);

  if (error || !data || !data.length) return; // keep the placeholder photos

  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  grid.innerHTML = data.map(p => `
    <a href="${esc(p.post_url || '#')}" class="ig-item reveal" target="_blank" rel="noopener">
      <img src="${esc(p.image_url)}" alt="${esc(p.caption || 'Instagram post')}" loading="lazy" />
      <div class="ig-overlay"><i class="fab fa-instagram"></i></div>
    </a>
  `).join('');

  grid.querySelectorAll('.reveal').forEach(el => {
    if (typeof revealObserver !== 'undefined') revealObserver.observe(el);
    else el.classList.add('in-view');
  });
})();

// ── Live "past collaborations" brand list (editable in admin) ─────────────
(async function renderBrands() {
  const grid = document.getElementById('brandsGrid');
  if (!grid || typeof supabaseClient === 'undefined') return;

  const { data, error } = await supabaseClient
    .from('brands')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error || !data || !data.length) return; // keep the placeholder brands

  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  grid.innerHTML = data.map(b => `<div class="brand-item reveal">${esc(b.name)}</div>`).join('');

  grid.querySelectorAll('.reveal').forEach(el => {
    if (typeof revealObserver !== 'undefined') revealObserver.observe(el);
    else el.classList.add('in-view');
  });
})();

// ── Live "past collaborations" portfolio gallery (editable in admin) ──────
(async function renderPortfolioGallery() {
  const grid = document.getElementById('portfolioGallery');
  if (!grid || typeof supabaseClient === 'undefined') return;

  const { data, error } = await supabaseClient
    .from('portfolio_items')
    .select('*')
    .eq('status', 'published')
    .order('sort_order', { ascending: true });

  if (error || !data || !data.length) return; // keep the placeholder photos

  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  grid.innerHTML = data.map(p => {
    const caption = p.caption ? `<span class="page-gallery-caption">${esc(p.caption)}</span>` : '';
    return p.video_url
      ? `<a href="${esc(p.video_url)}" class="page-gallery-item reveal" target="_blank" rel="noopener">
          <img src="${esc(p.image_url)}" alt="${esc(p.caption || 'Past collaboration')}" loading="lazy" />
          <span class="page-gallery-video-badge"><i class="fas fa-play"></i></span>
          ${caption}
        </a>`
      : `<div class="page-gallery-item reveal">
          <img src="${esc(p.image_url)}" alt="${esc(p.caption || 'Past collaboration')}" loading="lazy" />
          ${caption}
        </div>`;
  }).join('');

  grid.querySelectorAll('.reveal').forEach(el => {
    if (typeof revealObserver !== 'undefined') revealObserver.observe(el);
    else el.classList.add('in-view');
  });
})();

// ── Live press features (Press page, editable in admin) ───────────────────
(async function renderPressFeatures() {
  const asSeenGrid = document.getElementById('asSeenGrid');
  const featuresGrid = document.getElementById('pressFeaturesGrid');
  if ((!asSeenGrid && !featuresGrid) || typeof supabaseClient === 'undefined') return;

  const { data, error } = await supabaseClient
    .from('press_features')
    .select('*')
    .eq('status', 'published')
    .order('sort_order', { ascending: true });

  if (error || !data || !data.length) return; // keep the placeholder features

  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  if (asSeenGrid) {
    const outlets = [...new Set(data.map(p => p.outlet).filter(Boolean))];
    asSeenGrid.innerHTML = outlets.map(o => `
      <div class="as-seen-item reveal">
        <i class="fas fa-newspaper"></i>
        <span>${esc(o)}</span>
      </div>
    `).join('');
    asSeenGrid.querySelectorAll('.reveal').forEach(el => {
      if (typeof revealObserver !== 'undefined') revealObserver.observe(el);
      else el.classList.add('in-view');
    });
  }

  if (featuresGrid) {
    featuresGrid.innerHTML = data.map(p => `
      <div class="press-feature-card reveal">
        <div class="press-feature-img">
          <img src="${esc(p.image_url || 'https://picsum.photos/seed/' + esc(p.id) + '/800/450')}" alt="${esc(p.outlet)} feature" style="object-position: ${p.focal_x ?? 50}% ${p.focal_y ?? 50}%;" />
          <span class="press-feature-badge">${esc(p.badge || 'Digital')}</span>
        </div>
        <div class="press-feature-body">
          <p class="press-feature-outlet">${esc(p.outlet)}</p>
          <h3>${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">"${esc(p.headline)}"</a>` : `"${esc(p.headline)}"`}</h3>
        </div>
      </div>
    `).join('');
    featuresGrid.querySelectorAll('.reveal').forEach(el => {
      if (typeof revealObserver !== 'undefined') revealObserver.observe(el);
      else el.classList.add('in-view');
    });
  }
})();
