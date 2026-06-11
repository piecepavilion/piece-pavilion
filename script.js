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

// ===== HERO PRODUCT CAROUSEL =====
const heroCarousel = document.getElementById('hero-carousel');
if (heroCarousel) {
  const cards = heroCarousel.querySelectorAll('.hero-card');
  const dots = heroCarousel.querySelectorAll('.hero-dots .dot');
  let idx = 0;
  let timer = null;

  const show = (i) => {
    cards[idx].classList.remove('active');
    if (dots[idx]) dots[idx].classList.remove('active');
    idx = (i + cards.length) % cards.length;
    cards[idx].classList.add('active');
    if (dots[idx]) dots[idx].classList.add('active');
  };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (cards.length > 1 && !reducedMotion) {
    const start = () => { if (!timer) timer = setInterval(() => show(idx + 1), 3200); };
    const stop = () => { clearInterval(timer); timer = null; };
    start();
    // pause while the visitor is looking at / about to click a card
    heroCarousel.addEventListener('mouseenter', stop);
    heroCarousel.addEventListener('mouseleave', start);
    heroCarousel.addEventListener('focusin', stop);
    heroCarousel.addEventListener('focusout', start);
  }
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
