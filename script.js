// ===== SIDEBAR / DRAWER TOGGLE =====
const sidebarTab     = document.getElementById('sidebar-tab');     // legacy left-edge tab (blog pages)
const headerBurger   = document.getElementById('header-burger');   // new header hamburger
const sidebar        = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const sidebarClose   = document.getElementById('sidebar-close');

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('open');
  if (sidebarTab) sidebarTab.classList.add('open');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('open');
  if (sidebarTab) sidebarTab.classList.remove('open');
}

function toggleSidebar() {
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
}

if (sidebar) {
  if (sidebarTab)    sidebarTab.addEventListener('click', toggleSidebar);
  if (headerBurger)  headerBurger.addEventListener('click', toggleSidebar);
  if (sidebarClose)  sidebarClose.addEventListener('click', closeSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

  // Close on link click
  sidebar.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', closeSidebar);
  });
}

// ===== STICKY HEADER SHRINK ON SCROLL =====
const siteHeader = document.getElementById('site-header');
if (siteHeader) {
  const onScroll = () => siteHeader.classList.toggle('scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

// ===== TICKER (staff-controllable) =====
// Pattern lifted from the MSW Hub intranet (hub.mswalker.com). A single
// marquee band below the sticky header shows, in order:
//   1. Up to N custom announcement rows (from staff Google Sheet)
//   2. The most recent blog post (fetched from /blog/)
//   3. The first 3 "Just Added" listings (homepage only, read from the
//      #newest grid that pp-ops regenerates hourly)
//
// Every piece is staff-controllable via the "PiecePavilion Site Banner"
// Google Sheet (edited from /employees). Supported fields:
//
//   enabled           YES/NO — master on/off for the whole ticker
//   message           Custom announcement text (shows as a "News" pill)
//   link              URL or LATEST (= auto-link to newest blog post)
//   link_text         CTA label on the custom item ("Read more →")
//   message_2 / link_2 / link_text_2       Second custom row (optional)
//   message_3 / link_3 / link_text_3       Third custom row (optional)
//   show_latest_blog  YES/NO (default YES)
//   show_just_added   YES/NO (default YES)
//   just_added_count  Integer, 1–8 (default 3)
//
// On non-homepage pages, "Just Added" items are automatically skipped
// (there's no #newest grid to read from) — the ticker still shows
// announcements + latest blog, falls back to the single hardcoded item
// if everything else is empty.

const tickerState = {
  // Hardcoded fallback — read from the original HTML during initial render.
  hardcodedAnnouncement: null,
  latestBlog: null,                // {title, href} once fetched
  justAdded: [],                   // {name, price, img, href}[]
  cfg: {
    enabled: true,
    announcements: [],             // [{message, href, cta}]
    showLatestBlog: true,
    showJustAdded: true,
    justAddedCount: 3,
  },
};

const esc = (s) => (s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function tickerBanner() { return document.querySelector('.announcement-banner'); }

function readHardcodedAnnouncement() {
  // The HTML ships with a baseline announcement — grab it before the
  // ticker overwrites that markup.
  const banner = tickerBanner();
  if (!banner) return null;
  const a = banner.querySelector('.announcement-text');
  if (!a) return null;
  const strong = a.querySelector('strong');
  const span = a.querySelector('span');
  return {
    message: strong ? strong.innerHTML : 'New on the blog',
    href: a.getAttribute('href') || '/blog/',
    cta: span ? span.innerHTML : 'Read the latest &rarr;',
  };
}

function readJustAdded() {
  // Read the pp-ops-generated #newest grid. Non-homepage pages won't have
  // this section and will return [].
  return Array.from(document.querySelectorAll('#newest .featured-item'))
    .slice(0, 8)
    .map(a => {
      const h4 = a.querySelector('h4');
      const priceEl = a.querySelector('.featured-price');
      const imgEl = a.querySelector('img');
      const href = a.getAttribute('href');
      if (!h4 || !priceEl || !imgEl || !href) return null;
      let name = h4.textContent.replace(/…\s*$/, '').trim();
      if (name.length > 48) name = name.slice(0, 48).replace(/\s+\S*$/, '') + '…';
      return {
        name,
        price: priceEl.textContent.trim(),
        img: imgEl.getAttribute('src'),
        href,
      };
    })
    .filter(Boolean);
}

function renderTicker() {
  const banner = tickerBanner();
  if (!banner) return;

  // Master off switch (sheet-driven)
  if (!tickerState.cfg.enabled) {
    banner.classList.add('hidden');
    return;
  }

  // Move the banner below the sticky header AND wrap both in a sticky
  // container so the header + ticker stack stays locked to the top of the
  // viewport as a single unit on scroll. Idempotent — we check for the
  // wrapper before creating it again.
  const header = document.getElementById('site-header');
  if (header) {
    let wrapper = header.closest('.sticky-head');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'sticky-head';
      header.parentNode.insertBefore(wrapper, header);
      wrapper.appendChild(header);
    }
    if (banner.parentNode !== wrapper) {
      wrapper.appendChild(banner);
    }
  }

  // Build items.
  const items = [];

  // 1. Custom announcements. Prefer staff sheet rows; if none, fall back
  //    to the hardcoded one so there's always something to show.
  const announcements = tickerState.cfg.announcements.length
    ? tickerState.cfg.announcements
    : (tickerState.hardcodedAnnouncement ? [tickerState.hardcodedAnnouncement] : []);
  announcements.forEach(a => {
    const cta = a.cta ? ' <span style="color:rgba(255,255,255,0.7);font-weight:600;">' + a.cta + '</span>' : '';
    items.push(
      '<a class="ticker-item" href="' + esc(a.href) + '">' +
        '<span class="ticker-pill hot">News</span>' +
        '<span class="ticker-text">' + a.message + cta + '</span>' +
      '</a>'
    );
  });

  // 2. Latest blog post
  if (tickerState.cfg.showLatestBlog && tickerState.latestBlog) {
    const b = tickerState.latestBlog;
    items.push(
      '<a class="ticker-item" href="' + esc(b.href) + '">' +
        '<span class="ticker-pill blog">Latest Blog</span>' +
        '<span class="ticker-text">' + esc(b.title) + '</span>' +
      '</a>'
    );
  }

  // 3. Just Added products
  if (tickerState.cfg.showJustAdded) {
    tickerState.justAdded.slice(0, tickerState.cfg.justAddedCount).forEach(p => {
      items.push(
        '<a class="ticker-item" href="' + esc(p.href) + '" target="_blank" rel="noopener">' +
          '<img src="' + esc(p.img) + '" alt="" loading="lazy">' +
          '<span class="ticker-pill">Just added</span>' +
          '<span class="ticker-text">' + esc(p.name) + '<span class="price">' + esc(p.price) + '</span></span>' +
        '</a>'
      );
    });
  }

  if (!items.length) {
    banner.classList.add('hidden');
    return;
  }

  // Duplicate list so the translateX(-50%) marquee loops seamlessly.
  const sep = '<span class="ticker-sep" aria-hidden="true">•</span>';
  const trackInner = items.join(sep) + sep + items.join(sep);

  banner.innerHTML =
    '<div class="ticker-viewport"><div class="ticker-track">' + trackInner + '</div></div>' +
    '<button class="announcement-close" aria-label="Dismiss">&times;</button>';
  banner.classList.add('ticker');
  banner.classList.remove('hidden');
  // Reveal the banner only after the real ticker content is in place.
  // Hiding it until now prevents a visible transition from the hardcoded
  // single-item fallback to the full marquee on page open.
  requestAnimationFrame(() => banner.classList.add('is-ready'));

  // Dismiss (sessionStorage so it comes back on next visit).
  const closeBtn = banner.querySelector('.announcement-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      banner.classList.add('hidden');
      sessionStorage.setItem('banner-dismissed', 'ticker');
    });
  }
}

// Safety: if renderTicker never runs (script error, bad network), reveal the
// banner anyway after 1.5s so visitors still see the hardcoded fallback.
setTimeout(() => {
  document.querySelectorAll('.announcement-banner:not(.hidden):not(.is-ready)')
    .forEach(b => b.classList.add('is-ready'));
}, 1500);

// --- Boot sequence ---

// Early session-dismiss guard
if (sessionStorage.getItem('banner-dismissed')) {
  document.querySelectorAll('.announcement-banner').forEach(b => b.classList.add('hidden'));
}

// Capture hardcoded announcement BEFORE first render (otherwise it'd be
// gone after the ticker markup replaces it).
tickerState.hardcodedAnnouncement = readHardcodedAnnouncement();
tickerState.justAdded = readJustAdded();
renderTicker();

// Fetch latest blog (ticker enriches once this resolves).
(function loadLatestBlog() {
  fetch('/blog/?_=' + Date.now())
    .then((r) => { if (!r.ok) throw new Error('blog index'); return r.text(); })
    .then((html) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const card = doc.querySelector('a.blog-card');
      if (!card) return;
      const title = (card.querySelector('h2') || {}).textContent || 'Read our latest post';
      const href = card.getAttribute('href') || '/blog/';
      tickerState.latestBlog = { title: title.trim(), href };
      renderTicker();
    })
    .catch(() => {});
})();

(function loadBannerConfig() {
  const banner = tickerBanner();
  if (!banner) return;

  // Primary source: the staff "PiecePavilion Site Banner" Google Sheet
  // (edited from /employees — same Google login). Fallback: /banner.txt.
  const SHEET_CSV = 'https://docs.google.com/spreadsheets/d/1XPxYTHrGU3DyIWGWcyfRhylGV--6P7WmaMWuXrUozts/gviz/tq?tqx=out:csv&sheet=Banner';

  const parseSheetCsv = (txt) => {
    const cfg = {};
    txt.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^"((?:[^"]|"")*)","((?:[^"]|"")*)"/);
      if (!m) return;
      const key = m[1].replace(/""/g, '"').trim();
      const val = m[2].replace(/""/g, '"').trim();
      if (key && key !== 'field' && key !== 'HOW TO USE') cfg[key] = val;
    });
    return cfg;
  };

  const parseTxt = (txt) => {
    const cfg = {};
    txt.split(/\r?\n/).forEach((line) => {
      if (!line || line.charAt(0) === '#') return;
      const i = line.indexOf('=');
      if (i > 0) cfg[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    });
    return cfg;
  };

  const yesish = (v) => v === undefined || v === '' || (v || '').trim().toUpperCase() === 'YES';
  const trueOnly = (v) => (v || '').trim().toUpperCase() === 'YES';

  const resolveLink = (link) => {
    if (!link) return '/blog/';
    const t = link.trim().toUpperCase();
    if (t === 'LATEST') return tickerState.latestBlog ? tickerState.latestBlog.href : '/blog/';
    return link.trim();
  };

  const apply = (cfg) => {
    // Master off switch — treat missing `enabled` as YES (so a brand-new
    // sheet with just announcement rows still works), but an explicit NO
    // suppresses the whole ticker.
    tickerState.cfg.enabled = (cfg.enabled || '').trim().toUpperCase() !== 'NO';

    // Up to 3 announcement rows: message / message_2 / message_3
    const announcements = [];
    const rows = [
      { msg: cfg.message, link: cfg.link, cta: cfg.link_text },
      { msg: cfg.message_2, link: cfg.link_2, cta: cfg.link_text_2 },
      { msg: cfg.message_3, link: cfg.link_3, cta: cfg.link_text_3 },
    ];
    rows.forEach(r => {
      if (!r.msg) return;
      announcements.push({
        message: esc(r.msg),
        href: resolveLink(r.link),
        cta: r.cta ? esc(r.cta) : '',
      });
    });
    tickerState.cfg.announcements = announcements;

    // Section toggles — default YES unless explicit NO.
    tickerState.cfg.showLatestBlog = (cfg.show_latest_blog || '').trim().toUpperCase() !== 'NO';
    tickerState.cfg.showJustAdded = (cfg.show_just_added || '').trim().toUpperCase() !== 'NO';
    const n = parseInt(cfg.just_added_count, 10);
    tickerState.cfg.justAddedCount = (isFinite(n) && n > 0 && n <= 8) ? n : 3;

    renderTicker();
  };

  // cache-busting query so edits appear in ~1 min
  fetch(SHEET_CSV + '&_=' + Date.now())
    .then((r) => { if (!r.ok) throw new Error('sheet unavailable'); return r.text(); })
    .then(parseSheetCsv)
    .catch(() => fetch('/banner.txt?_=' + Date.now())
      .then((r) => { if (!r.ok) throw new Error('no banner.txt'); return r.text(); })
      .then(parseTxt))
    .then(apply)
    .catch(() => { /* both failed — keep the hardcoded fallback banner */ });
})();

// ===== HOMEPAGE "FROM THE BLOG" — auto-fill the 3 newest posts from /blog/ =====
// Reads the blog index (newest-first) and rebuilds the preview grid, so the
// homepage never shows stale posts. Falls back to the hardcoded cards on error.
/* ---------- Blog nav "fresh" indicator ----------
 * If the newest blog post was published within the N-hour window declared
 * on the Blog nav link (data-fresh-window-hours, default 6), add .is-fresh
 * so the dot pulses and the link reads "New Blog". Reads /blog/latest.json
 * which build_blog_latest.py writes with each pp-ops run.
 */
(function markBlogFreshness() {
  const nav = document.getElementById('nav-blog');
  if (!nav) return;
  const windowHours = parseFloat(nav.dataset.freshWindowHours) || 6;
  fetch('/blog/latest.json?t=' + Date.now(), { cache: 'no-store' })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data || !data.published) return;
      const t = Date.parse(data.published);
      if (!isFinite(t)) return;
      const ageHours = (Date.now() - t) / 3_600_000;
      if (ageHours < windowHours) nav.classList.add('is-fresh');
    })
    .catch(() => {});
})();

(function loadBlogPreview() {
  const grid = document.querySelector('.blog-preview-grid');
  if (!grid) return;
  const esc = (s) => (s || '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  fetch('/blog/?_=' + Date.now())
    .then((r) => { if (!r.ok) throw new Error('blog index'); return r.text(); })
    .then((html) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const cards = Array.from(doc.querySelectorAll('a.blog-card')).slice(0, 3);
      if (!cards.length) return;
      grid.innerHTML = cards.map((c) => {
        const href = c.getAttribute('href') || '/blog/';
        const img = c.querySelector('.blog-card-thumb img');
        const thumb = img ? img.getAttribute('src') : '';
        const date = (c.querySelector('.blog-card-date') || {}).textContent || '';
        const title = (c.querySelector('h2') || {}).textContent || '';
        const desc = (c.querySelector('.blog-card-body p') || {}).textContent || '';
        return '<a href="' + esc(href) + '" class="blog-preview-card">' +
          '<div class="blog-preview-thumb"' + (thumb
            ? ' style="background-image:url(\'' + esc(thumb) + '\');background-size:cover;background-position:center;"'
            : '') + '></div>' +
          '<div class="blog-preview-body">' +
            '<span class="blog-preview-date">' + esc(date) + '</span>' +
            '<h3>' + esc(title) + '</h3>' +
            '<p>' + esc(desc) + '</p>' +
            '<span class="blog-preview-link">Read More &rarr;</span>' +
          '</div></a>';
      }).join('');
    })
    .catch(() => { /* keep the hardcoded fallback cards */ });
})();

// ===== FLYER LIGHTBOX =====
const lightbox = document.getElementById('flyer-lightbox');
if (lightbox) {
  const lightboxImg = lightbox.querySelector('.lightbox-img');
  document.querySelectorAll('.announcement-img').forEach(img => {
    img.addEventListener('click', () => {
      lightboxImg.src = img.dataset.full || img.src;
      lightbox.classList.add('open');
    });
  });
  lightbox.querySelector('.lightbox-close').addEventListener('click', () => {
    lightbox.classList.remove('open');
  });
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.classList.remove('open');
  });
}

// ===== FADE-IN ON SCROLL =====
const fadeEls = document.querySelectorAll('.card, .feature, .featured-item, .blog-preview-card, .section-header, .contact-inner h2, .contact-inner p');
fadeEls.forEach(el => el.classList.add('fade-in'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

fadeEls.forEach(el => observer.observe(el));

// ===== BRICKLINK OUTBOUND CLICK TRACKING =====
// Fires a `bricklink_click` GA4 event on any link to the BrickLink store.
// Mark this event as a Key Event in GA4 (Admin > Events) to measure conversions.
document.addEventListener('click', (e) => {
  if (e.target.closest('.add-cart-btn')) return; // cart adds tracked separately
  const a = e.target.closest('a[href*="store.bricklink.com"]');
  if (!a || typeof gtag !== 'function') return;
  const href = a.getAttribute('href') || '';
  const itemMatch = href.match(/itemID=(\d+)/);
  gtag('event', 'bricklink_click', {
    link_url: href,
    item_id: itemMatch ? itemMatch[1] : '',
    link_text: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
    click_location: itemMatch ? 'featured_product' : 'shop_cta',
    page_path: location.pathname
  });
}, { capture: true });

// ===== FEATURED FILTER TABS =====
const filterTabs = document.querySelectorAll('.filter-tab');
const featuredItems = document.querySelectorAll('#featured-grid .featured-item');

filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const filter = tab.dataset.filter;

    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    featuredItems.forEach(item => {
      if (filter === 'all' || item.dataset.category === filter) {
        item.classList.remove('hidden');
      } else {
        item.classList.add('hidden');
      }
    });
  });
});

// ===== CART (localStorage; checkout hands off to BrickLink) =====
const CART_KEY = 'pp-cart';
const STORE_URL = 'https://store.bricklink.com/PiecePavilion';

const cartGet = () => {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; }
};
const cartSet = (items) => {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  cartBadge();
};
function cartBadge() {
  const n = cartGet().reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('.cart-count').forEach((b) => {
    b.textContent = n;
    b.style.display = n ? 'flex' : 'none';
  });
}
cartBadge();

// Add-to-cart buttons live INSIDE the product-card links — swallow the click.
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.add-cart-btn');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const d = btn.dataset;
  const items = cartGet();
  const existing = items.find((i) => i.lot === d.lot);
  if (existing) existing.qty += 1;
  else items.push({ lot: d.lot, no: d.no, name: d.name, price: parseFloat(d.price) || 0, img: d.img, qty: 1 });
  cartSet(items);
  btn.textContent = 'Added ✓';
  btn.classList.add('added');
  setTimeout(() => { btn.textContent = '+ Cart'; btn.classList.remove('added'); }, 1300);
  if (typeof gtag === 'function') gtag('event', 'cart_add', { item_id: d.no, lot_id: d.lot, price: d.price });
}, true);

// ----- cart page -----
const cartRoot = document.getElementById('cart-root');
if (cartRoot) {
  const money = (n) => '$' + n.toFixed(2);

  const reserveMailto = (items) => {
    const lines = items.map((i) =>
      '- ' + i.name + ' (' + i.no + ') x' + i.qty + '  ' + STORE_URL + '?itemID=' + i.lot);
    const body = 'Hi Piece Pavilion,\n\nPlease reserve my cart:\n\n' + lines.join('\n') +
      '\n\nMy BrickLink username:\n\nWhen I plan to check out:\n\nThanks!';
    return 'mailto:piecepavilion@gmail.com?subject=' + encodeURIComponent('Reserve My Cart') +
      '&body=' + encodeURIComponent(body);
  };

  const render = () => {
    const items = cartGet();
    if (!items.length) {
      cartRoot.innerHTML =
        '<div class="cart-empty"><div class="big">🧱</div>' +
        '<p>Your cart is empty &mdash; let’s fix that.</p><br>' +
        '<a class="btn-primary" href="/#featured">Browse the Store &rarr;</a></div>';
      return;
    }
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const rows = items.map((i, idx) =>
      '<div class="cart-row">' +
        '<img src="' + i.img + '" alt="" loading="lazy" />' +
        '<div class="cart-row-info"><h4>' + i.name + '</h4>' +
        '<span class="cart-row-id">' + i.no + '</span></div>' +
        '<span class="cart-qty"><button data-q="-1" data-i="' + idx + '" aria-label="Less">&minus;</button>' +
        i.qty +
        '<button data-q="1" data-i="' + idx + '" aria-label="More">+</button></span>' +
        '<span class="cart-row-price">' + money(i.price * i.qty) + '</span>' +
        '<a class="cart-bl-link" href="' + STORE_URL + '?itemID=' + i.lot + '" target="_blank" rel="noopener">Add on BrickLink ↗</a>' +
        '<button class="cart-remove" data-rm="' + idx + '" aria-label="Remove">&times;</button>' +
      '</div>').join('');

    cartRoot.innerHTML = rows +
      '<div class="cart-summary"><span>' + items.length + ' item' + (items.length > 1 ? 's' : '') +
      '</span><span class="total">' + money(total) + '</span></div>' +
      '<div class="cart-checkout">' +
        '<h3>Ready to check out?</h3>' +
        '<p><strong>Click “Add on BrickLink” next to each item.</strong> Each one opens that exact listing in our BrickLink store — one more click there drops it in your BrickLink cart. Then check out once on BrickLink (secure payment, one shipping charge).</p>' +
        '<a class="btn-primary" href="' + STORE_URL + '?p=PiecePavilion#/cart" target="_blank" rel="noopener">Open My BrickLink Cart →</a>' +
        '<div class="or-divider">or</div>' +
        '<h3>Not ready yet? We’ll hold everything.</h3>' +
        '<p>Send us this cart and we’ll reserve every item with your name on it — free, no deposit. <strong>We hold reserved items for up to 2 weeks</strong>; after that they go back on the shelf. Check out any time within your hold. (<a href="/blog/how-to-reserve-lego/" style="color:var(--red);font-weight:700;">How reserving works</a>)</p>' +
        '<a class="btn-secondary" id="reserve-cart" href="' + reserveMailto(items) + '">Reserve This Cart →</a>' +
      '</div>' +
      '<button class="cart-clear" id="cart-clear">Empty cart</button>';
  };

  cartRoot.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]');
    const q = e.target.closest('[data-q]');
    const items = cartGet();
    if (rm) {
      items.splice(parseInt(rm.dataset.rm, 10), 1);
      cartSet(items); render(); return;
    }
    if (q) {
      const it = items[parseInt(q.dataset.i, 10)];
      it.qty = Math.max(1, it.qty + parseInt(q.dataset.q, 10));
      cartSet(items); render(); return;
    }
    if (e.target.closest('#cart-clear')) {
      cartSet([]); render(); return;
    }
    const bl = e.target.closest('.cart-bl-link');
    if (bl) {
      bl.classList.add('clicked');
      bl.textContent = 'Opened ✓';
      if (typeof gtag === 'function') gtag('event', 'cart_bricklink_click', { link_url: bl.href });
    }
    if (e.target.closest('#reserve-cart') && typeof gtag === 'function') {
      gtag('event', 'cart_reserve_click', { items: cartGet().length });
    }
  });

  render();
}

// ===== HERO US MAP (real-outline SVG, colored by order counts) =====
// Counts come from the #state-data JSON island (refreshed daily by
// build_state_map.py). The SVG (public-domain Wikimedia US map) is fetched
// and inlined so each state path is styleable + clickable.
const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'
};

const usMap = document.getElementById('us-map');
if (usMap) {
  let counts = {};
  try { counts = JSON.parse(document.getElementById('state-data').textContent) || {}; } catch (e) { /* empty */ }

  fetch('/us-map.svg').then((r) => r.text()).then((svg) => {
    usMap.innerHTML = svg;

    const tooltip = document.createElement('div');
    tooltip.className = 'state-tooltip';
    tooltip.hidden = true;
    usMap.appendChild(tooltip);

    const showTip = (el, code) => {
      const n = counts[code] || 0;
      tooltip.textContent = n > 0
        ? STATE_NAMES[code] + ' — ' + n + (n === 1 ? ' order' : ' orders')
        : STATE_NAMES[code] + ' — nothing yet, be the first!';
      tooltip.hidden = false;
      const r = el.getBoundingClientRect();
      const host = usMap.getBoundingClientRect();
      tooltip.style.left = (r.left - host.left + r.width / 2) + 'px';
      tooltip.style.top = (r.top - host.top) + 'px';
    };
    const hideTip = () => { tooltip.hidden = true; };

    Object.keys(STATE_NAMES).forEach((code) => {
      // some states are drawn with multiple paths (MI peninsulas, HI islands)
      usMap.querySelectorAll('g.state path.' + code.toLowerCase()).forEach((el) => {
        if ((counts[code] || 0) > 0) el.classList.add('sold');
        el.addEventListener('mouseenter', () => showTip(el, code));
        el.addEventListener('mouseleave', hideTip);
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          tooltip.hidden ? showTip(el, code) : hideTip();
        });
      });
    });
    document.addEventListener('click', (e) => {
      if (!usMap.contains(e.target)) hideTip();
    });
  }).catch(() => { /* map is decorative — fail quietly */ });
}

// ===== HOMEPAGE WELCOME EFFECT =====
// Normally fires once per browser session as a confetti burst.
// Switches to flying bats during Halloween week — rules:
//   - 2026 only:  Oct 29 through Nov 1 at 00:00 local
//   - 2027+:      Oct 20 through Nov 1 at 06:00 local
// Any other date → confetti.
(function () {
  if (!document.getElementById('hero')) return;                 // homepage only
  const forced     = /[?&](confetti|bats)/.test(location.search);
  const forceBats  = /[?&]bats/.test(location.search);
  const forceConfetti = /[?&]confetti/.test(location.search) && !forceBats;
  const key = 'pp-welcome-' + new Date().toDateString();
  if (!forced && sessionStorage.getItem(key)) return;
  if (!forced && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  sessionStorage.setItem(key, '1');

  function isHalloweenWindow(now) {
    const y = now.getFullYear();
    let start, end;
    if (y === 2026) {
      start = new Date(2026, 9, 28, 21, 20, 0); // Oct 28 2026 21:20 local (bats go!)
      end   = new Date(2026, 10, 1, 0, 0, 0);   // Nov 1  2026 00:00 local
    } else {
      start = new Date(y, 9, 20, 0, 0, 0);      // Oct 20 YY   00:00 local
      end   = new Date(y, 10, 1, 6, 0, 0);      // Nov 1  YY   06:00 local
    }
    return now >= start && now < end;
  }

  const halloween = forceBats || (!forceConfetti && isHalloweenWindow(new Date()));

  const cv = document.createElement('canvas');
  cv.className = 'confetti-canvas';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  cv.width  = window.innerWidth  * dpr;
  cv.height = window.innerHeight * dpr;

  if (halloween) runBats(ctx, cv, dpr);
  else           runConfetti(ctx, cv, dpr);

  function runConfetti(ctx, cv, dpr) {
    const COLORS = ['#e3000b', '#ffce00', '#0057a8', '#1a8a3c', '#ff6600', '#ffffff'];
    const parts = [];
    for (let i = 0; i < 180; i++) {
      parts.push({
        x: Math.random() * cv.width,
        y: -(Math.random() * 0.25 + 0.02) * cv.height,
        vx: (Math.random() - 0.5) * 5 * dpr,
        vy: (4 + Math.random() * 6) * dpr,
        w: (5 + Math.random() * 6) * dpr,
        h: (8 + Math.random() * 10) * dpr,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.25,
        color: COLORS[(Math.random() * COLORS.length) | 0],
      });
    }
    const t0 = performance.now() + 350;
    const DURATION = 3800;
    (function frame(t) {
      const elapsed = (t || performance.now()) - t0;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.globalAlpha = elapsed > DURATION - 700 ? Math.max(0, (DURATION - elapsed) / 700) : 1;
      for (const p of parts) {
        p.x += p.vx;  p.y += p.vy;
        p.vy += 0.06 * dpr;
        p.vx *= 0.995;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (elapsed < DURATION) requestAnimationFrame(frame);
      else cv.remove();
    })(t0);
  }

  function runBats(ctx, cv, dpr) {
    // Little SVG-ish bat silhouettes flying across the top portion of the
    // screen, flapping their wings. Spookier than confetti but not harsh —
    // dark grey/black on a light background, no screen-wide flash.
    const bats = [];
    const N = 12;
    for (let i = 0; i < N; i++) {
      const dir = Math.random() < 0.5 ? 1 : -1;   // flying left-to-right or right-to-left
      bats.push({
        x: dir === 1 ? -40 * dpr - Math.random() * cv.width : cv.width + Math.random() * cv.width * 0.5,
        y: (0.08 + Math.random() * 0.55) * cv.height,
        vx: (1.2 + Math.random() * 1.8) * dpr * dir,
        vy: (Math.random() - 0.5) * 0.4 * dpr,
        size: (18 + Math.random() * 18) * dpr,
        flap: Math.random() * Math.PI * 2,
        flapSpeed: 0.18 + Math.random() * 0.08,
        wobble: Math.random() * 100,
        shade: 20 + Math.floor(Math.random() * 40),  // greyscale
      });
    }

    function drawBat(ctx, b) {
      const s = b.size;
      const flap = Math.sin(b.flap);           // -1 .. 1
      const wingLift = flap * s * 0.35;        // wings up/down
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(b.vx > 0 ? 1 : -1, 1);         // flip for direction
      ctx.fillStyle = 'rgba(' + b.shade + ',' + b.shade + ',' + (b.shade + 10) + ',0.92)';
      // body — small ellipse
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.14, s * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      // head
      ctx.beginPath();
      ctx.arc(0, -s * 0.22, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      // pointy ears
      ctx.beginPath();
      ctx.moveTo(-s * 0.09, -s * 0.3);
      ctx.lineTo(-s * 0.12, -s * 0.44);
      ctx.lineTo(-s * 0.04, -s * 0.34);
      ctx.closePath();
      ctx.moveTo(s * 0.09, -s * 0.3);
      ctx.lineTo(s * 0.12, -s * 0.44);
      ctx.lineTo(s * 0.04, -s * 0.34);
      ctx.closePath();
      ctx.fill();
      // wings — scalloped shapes that extend out from the body, with flap
      // We draw each wing as a 3-scallop bezier curve
      const wy = -s * 0.08;
      // left wing
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, wy);
      ctx.quadraticCurveTo(-s * 0.45, wy - wingLift, -s * 0.9, wy + s * 0.1 - wingLift * 0.6);
      ctx.quadraticCurveTo(-s * 0.65, wy + s * 0.25, -s * 0.5, wy + s * 0.15);
      ctx.quadraticCurveTo(-s * 0.35, wy + s * 0.3, -s * 0.22, wy + s * 0.14);
      ctx.quadraticCurveTo(-s * 0.14, wy + s * 0.22, -s * 0.1, wy + s * 0.08);
      ctx.closePath();
      ctx.fill();
      // right wing (mirror)
      ctx.beginPath();
      ctx.moveTo(s * 0.1, wy);
      ctx.quadraticCurveTo(s * 0.45, wy - wingLift, s * 0.9, wy + s * 0.1 - wingLift * 0.6);
      ctx.quadraticCurveTo(s * 0.65, wy + s * 0.25, s * 0.5, wy + s * 0.15);
      ctx.quadraticCurveTo(s * 0.35, wy + s * 0.3, s * 0.22, wy + s * 0.14);
      ctx.quadraticCurveTo(s * 0.14, wy + s * 0.22, s * 0.1, wy + s * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    const t0 = performance.now();
    const DURATION = 7000;
    (function frame(t) {
      const now = t || performance.now();
      const elapsed = now - t0;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.globalAlpha = elapsed > DURATION - 1200 ? Math.max(0, (DURATION - elapsed) / 1200) : 1;
      for (const b of bats) {
        b.wobble += 0.03;
        b.x += b.vx;
        b.y += b.vy + Math.sin(b.wobble) * 0.6 * dpr;
        b.flap += b.flapSpeed;
        drawBat(ctx, b);
        // wrap around horizontally so bats keep crossing until fade
        if (b.vx > 0 && b.x > cv.width + 60 * dpr) b.x = -60 * dpr;
        if (b.vx < 0 && b.x < -60 * dpr) b.x = cv.width + 60 * dpr;
      }
      if (elapsed < DURATION) requestAnimationFrame(frame);
      else cv.remove();
    })(t0);
  }
})();

// ===== HERO PRODUCT CAROUSEL (sliding, arrows, dots, swipe, 5s auto) =====
const heroCarousel = document.getElementById('hero-carousel');
if (heroCarousel) {
  const track = heroCarousel.querySelector('.hero-track');
  const cards = track.querySelectorAll('.hero-card');
  const dots = heroCarousel.querySelectorAll('.hero-dots .dot');
  let idx = 0;
  let timer = null;

  const render = () => {
    track.style.transform = 'translateX(-' + (idx * 100) + '%)';
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  };
  const go = (i) => { idx = (i + cards.length) % cards.length; render(); };
  // manual navigation resets the clock so the slide you picked stays put
  const restart = () => { clearInterval(timer); timer = setInterval(() => go(idx + 1), 5000); };

  const prev = heroCarousel.querySelector('.hero-arrow.prev');
  const next = heroCarousel.querySelector('.hero-arrow.next');
  if (prev) prev.addEventListener('click', () => { go(idx - 1); restart(); });
  if (next) next.addEventListener('click', () => { go(idx + 1); restart(); });
  dots.forEach((d, i) => d.addEventListener('click', () => { go(i); restart(); }));

  // touch swipe
  let touchX = null;
  heroCarousel.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  heroCarousel.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) { go(idx + (dx < 0 ? 1 : -1)); restart(); }
    touchX = null;
  }, { passive: true });

  if (cards.length > 1) restart();
}

// ===== HEADER "SHOP" DROPDOWN (click to toggle) =====
const navDropdown = document.querySelector('.nav-dropdown');
if (navDropdown) {
  const navToggle = navDropdown.querySelector('.nav-dropdown-toggle');
  navToggle.setAttribute('aria-haspopup', 'true');
  navToggle.setAttribute('aria-expanded', 'false');

  const closeDropdown = () => {
    navDropdown.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  };

  navToggle.addEventListener('click', (e) => {
    e.preventDefault();
    const open = navDropdown.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // close after picking a category
  navDropdown.querySelectorAll('.nav-dropdown-menu a').forEach(a => {
    a.addEventListener('click', closeDropdown);
  });

  // close on outside click or Escape
  document.addEventListener('click', (e) => {
    if (!navDropdown.contains(e.target)) closeDropdown();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDropdown();
  });
}

/* ---------- Viewer counter ----------
 * Shows a running total of pageviews in the header badge. One hit per
 * browser-session so a refresh storm doesn't inflate it. Backed by
 * abacus.jasoncameron.dev — zero-config free Cloudflare Worker; the
 * namespace keys the counter to our site.
 */
(async function viewerCounter() {
  const el = document.getElementById('viewer-count');
  if (!el) return;

  const STORAGE_KEY = 'pp-viewer-count-cached';
  const SESSION_KEY = 'pp-viewer-counted-this-session';
  const ENDPOINT_HIT = 'https://abacus.jasoncameron.dev/hit/piecepavilion.com/views';
  const ENDPOINT_GET = 'https://abacus.jasoncameron.dev/get/piecepavilion.com/views';

  // Show the last cached count instantly so the badge isn't a long em-dash.
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) el.textContent = Number(cached).toLocaleString();
  } catch (_) {}

  // Only increment once per browser session (prevents refresh-pumping).
  let counted = false;
  try { counted = sessionStorage.getItem(SESSION_KEY) === '1'; } catch (_) {}

  try {
    const r = await fetch(counted ? ENDPOINT_GET : ENDPOINT_HIT, { cache: 'no-store' });
    if (!r.ok) throw new Error('http ' + r.status);
    const j = await r.json();
    const n = Number(j.value);
    if (!Number.isNaN(n)) {
      el.textContent = n.toLocaleString();
      try {
        localStorage.setItem(STORAGE_KEY, String(n));
        if (!counted) sessionStorage.setItem(SESSION_KEY, '1');
      } catch (_) {}
    }
  } catch (_) {
    // Offline or counter service down — leave the cached number in place.
  }
})();
