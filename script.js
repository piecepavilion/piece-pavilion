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

// ===== CONFETTI BURST (homepage, once per browser session) =====
(function () {
  if (!document.getElementById('hero')) return;                 // homepage only
  const forced = location.search.indexOf('confetti') !== -1;    // ?confetti = always fire (for testing/demos)
  if (!forced && sessionStorage.getItem('pp-confetti')) return; // once per session
  if (!forced && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  sessionStorage.setItem('pp-confetti', '1');

  const cv = document.createElement('canvas');
  cv.className = 'confetti-canvas';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  cv.width = window.innerWidth * dpr;
  cv.height = window.innerHeight * dpr;

  const COLORS = ['#e3000b', '#ffce00', '#0057a8', '#1a8a3c', '#ff6600', '#ffffff'];
  // burst from the top edge: pieces explode outward/down across the full width
  const parts = [];
  for (let i = 0; i < 180; i++) {
    parts.push({
      x: Math.random() * cv.width,
      y: -(Math.random() * 0.25 + 0.02) * cv.height,   // staggered above the top edge
      vx: (Math.random() - 0.5) * 5 * dpr,
      vy: (4 + Math.random() * 6) * dpr,               // downward burst
      w: (5 + Math.random() * 6) * dpr,
      h: (8 + Math.random() * 10) * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.25,
      color: COLORS[(Math.random() * COLORS.length) | 0]
    });
  }

  const t0 = performance.now() + 350;   // let the page paint first
  const DURATION = 3800;
  (function frame(t) {
    const elapsed = (t || performance.now()) - t0;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.globalAlpha = elapsed > DURATION - 700 ? Math.max(0, (DURATION - elapsed) / 700) : 1;
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06 * dpr;          // light gravity — graceful fall
      p.vx *= 0.995;               // drag
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
