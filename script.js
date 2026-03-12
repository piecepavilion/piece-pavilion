// ===== SIDEBAR TOGGLE =====
const sidebarTab     = document.getElementById('sidebar-tab');
const sidebar        = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const sidebarClose   = document.getElementById('sidebar-close');

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('open');
  sidebarTab.classList.add('open');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('open');
  sidebarTab.classList.remove('open');
}

sidebarTab.addEventListener('click', () => {
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});

sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

// Close on link click
sidebar.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', closeSidebar);
});

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

// ===== FEATURED FILTER TABS =====
const filterTabs = document.querySelectorAll('.filter-tab');
const featuredItems = document.querySelectorAll('.featured-item');

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
