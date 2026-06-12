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

// ===== ANNOUNCEMENT BANNER DISMISS =====
document.querySelectorAll('.announcement-close').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    btn.closest('.announcement-banner').classList.add('hidden');
    sessionStorage.setItem('banner-dismissed', '1');
  });
});
if (sessionStorage.getItem('banner-dismissed')) {
  document.querySelectorAll('.announcement-banner').forEach(b => b.classList.add('hidden'));
}

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

// ===== STATE TILE MAP =====
// Tile-grid USA: [col, row, full name]. Order counts come from the
// #state-data JSON island, refreshed daily by build_state_map.py.
const STATE_GRID = {
  ME: [12, 1, 'Maine'],
  WI: [7, 2, 'Wisconsin'], VT: [11, 2, 'Vermont'], NH: [12, 2, 'New Hampshire'],
  WA: [2, 3, 'Washington'], ID: [3, 3, 'Idaho'], MT: [4, 3, 'Montana'], ND: [5, 3, 'North Dakota'],
  MN: [6, 3, 'Minnesota'], IL: [7, 3, 'Illinois'], MI: [8, 3, 'Michigan'], NY: [10, 3, 'New York'], MA: [11, 3, 'Massachusetts'],
  OR: [2, 4, 'Oregon'], NV: [3, 4, 'Nevada'], WY: [4, 4, 'Wyoming'], SD: [5, 4, 'South Dakota'],
  IA: [6, 4, 'Iowa'], IN: [7, 4, 'Indiana'], OH: [8, 4, 'Ohio'], PA: [9, 4, 'Pennsylvania'],
  NJ: [10, 4, 'New Jersey'], CT: [11, 4, 'Connecticut'], RI: [12, 4, 'Rhode Island'],
  CA: [2, 5, 'California'], UT: [3, 5, 'Utah'], CO: [4, 5, 'Colorado'], NE: [5, 5, 'Nebraska'],
  MO: [6, 5, 'Missouri'], KY: [7, 5, 'Kentucky'], WV: [8, 5, 'West Virginia'], VA: [9, 5, 'Virginia'],
  MD: [10, 5, 'Maryland'], DE: [11, 5, 'Delaware'],
  AZ: [3, 6, 'Arizona'], NM: [4, 6, 'New Mexico'], KS: [5, 6, 'Kansas'], AR: [6, 6, 'Arkansas'],
  TN: [7, 6, 'Tennessee'], NC: [8, 6, 'North Carolina'], SC: [9, 6, 'South Carolina'],
  OK: [5, 7, 'Oklahoma'], LA: [6, 7, 'Louisiana'], MS: [7, 7, 'Mississippi'], AL: [8, 7, 'Alabama'], GA: [9, 7, 'Georgia'],
  HI: [1, 8, 'Hawaii'], AK: [2, 8, 'Alaska'], TX: [5, 8, 'Texas'], FL: [10, 8, 'Florida']
};

const stateMap = document.getElementById('state-map');
if (stateMap) {
  let counts = {};
  try { counts = JSON.parse(document.getElementById('state-data').textContent) || {}; } catch (e) { /* leave empty */ }

  const tooltip = document.createElement('div');
  tooltip.className = 'state-tooltip';
  tooltip.hidden = true;
  stateMap.appendChild(tooltip);

  const showTip = (tile, code) => {
    const n = counts[code] || 0;
    const name = STATE_GRID[code][2];
    tooltip.textContent = n > 0
      ? name + ' — ' + n + (n === 1 ? ' order' : ' orders')
      : name + ' — nothing yet, be the first!';
    tooltip.hidden = false;
    tooltip.style.left = (tile.offsetLeft + tile.offsetWidth / 2) + 'px';
    tooltip.style.top = tile.offsetTop + 'px';
  };
  const hideTip = () => { tooltip.hidden = true; };

  Object.keys(STATE_GRID).forEach((code) => {
    const [col, row, name] = STATE_GRID[code];
    const n = counts[code] || 0;
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'state-tile' + (n > 0 ? ' sold' : '');
    tile.style.gridColumn = col;
    tile.style.gridRow = row;
    tile.textContent = code;
    tile.setAttribute('aria-label', name + ': ' + n + (n === 1 ? ' order' : ' orders'));
    tile.addEventListener('mouseenter', () => showTip(tile, code));
    tile.addEventListener('mouseleave', hideTip);
    tile.addEventListener('focus', () => showTip(tile, code));
    tile.addEventListener('blur', hideTip);
    tile.addEventListener('click', (e) => {
      e.stopPropagation();
      tooltip.hidden ? showTip(tile, code) : hideTip();
    });
    stateMap.appendChild(tile);
  });
  document.addEventListener('click', (e) => {
    if (!stateMap.contains(e.target)) hideTip();
  });
}

// ===== CONFETTI BURST (homepage, once per browser session) =====
(function () {
  if (!document.getElementById('hero')) return;                 // homepage only
  if (sessionStorage.getItem('pp-confetti')) return;            // once per session
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  sessionStorage.setItem('pp-confetti', '1');

  const cv = document.createElement('canvas');
  cv.className = 'confetti-canvas';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  cv.width = window.innerWidth * dpr;
  cv.height = window.innerHeight * dpr;

  const COLORS = ['#e3000b', '#ffce00', '#0057a8', '#1a8a3c', '#ff6600', '#ffffff'];
  // two cannons: bottom-left firing up-right, bottom-right firing up-left
  const parts = [];
  for (let i = 0; i < 170; i++) {
    const fromLeft = i % 2 === 0;
    const angle = (fromLeft ? -75 : -105) + (Math.random() - 0.5) * 50; // degrees, up & inward
    const speed = (11 + Math.random() * 9) * dpr;
    const rad = angle * Math.PI / 180;
    parts.push({
      x: (fromLeft ? 0.08 : 0.92) * cv.width,
      y: cv.height + 10 * dpr,
      vx: Math.cos(rad) * speed,
      vy: Math.sin(rad) * speed,
      w: (5 + Math.random() * 6) * dpr,
      h: (8 + Math.random() * 10) * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.25,
      color: COLORS[(Math.random() * COLORS.length) | 0]
    });
  }

  const t0 = performance.now();
  const DURATION = 3000;
  (function frame(t) {
    const elapsed = (t || performance.now()) - t0;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.globalAlpha = elapsed > DURATION - 700 ? Math.max(0, (DURATION - elapsed) / 700) : 1;
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22 * dpr;          // gravity
      p.vx *= 0.992;               // drag
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
