// ===== STICKY HEADER SHADOW =====
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 10);
});

// ===== MOBILE DRAWER =====
const hamburger    = document.getElementById('hamburger');
const drawer       = document.getElementById('drawer');
const drawerOverlay = document.getElementById('drawer-overlay');
const drawerClose  = document.getElementById('drawer-close');

function openDrawer() {
  drawer.classList.add('open');
  drawerOverlay.classList.add('open');
  hamburger.classList.add('open');
}

function closeDrawer() {
  drawer.classList.remove('open');
  drawerOverlay.classList.remove('open');
  hamburger.classList.remove('open');
}

hamburger.addEventListener('click', openDrawer);
drawerClose.addEventListener('click', closeDrawer);
drawerOverlay.addEventListener('click', closeDrawer);

// Close drawer and scroll to section when a link is clicked
drawer.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', () => closeDrawer());
});

// ===== FADE-IN ON SCROLL =====
const fadeEls = document.querySelectorAll('.card, .feature, .section-header, .contact-inner h2, .contact-inner p');

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
