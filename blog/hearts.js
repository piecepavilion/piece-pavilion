/* Shared per-article reactions on articles and listing cards. Never fingerprint visitors. */
(function () {
  'use strict';
  var articlePath = location.pathname.match(/^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(?:index\.html)?$/);
  var listing = /^\/blog\/(?:index\.html)?$/.test(location.pathname);
  if ((!articlePath && !listing) || document.querySelector('.blog-reactions')) return;
  var key = 'pp_blog_like_device_v1';
  var validId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  function newId() {
    return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, function (c) { return (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16); });
  }
  function deviceId() {
    var id;
    try { id = localStorage.getItem(key); } catch (_) {}
    if (validId.test(id || '')) return id;
    var cookie = document.cookie.split('; ').find(function (part) { return part.indexOf(key + '=') === 0; });
    if (cookie && validId.test(cookie.slice(key.length + 1))) return cookie.slice(key.length + 1);
    id = newId();
    try { localStorage.setItem(key, id); if (localStorage.getItem(key) === id) return id; } catch (_) {}
    try {
      document.cookie = key + '=' + id + '; Max-Age=315360000; Path=/; SameSite=Lax; Secure';
      if (document.cookie.split('; ').indexOf(key + '=' + id) !== -1) return id;
    } catch (_) {}
    return null;
  }
  var device = null, enabled = false, configPending = false;
  var widgets = [];
  function mount(slug, box, host, subject) {
    subject = subject || "this article";
    var lastRefresh = 0;
  var liked = false, pending = false, initialized = false, version = 0, operation = null;
  var button = document.createElement('button');
  button.className = 'blog-like';
  button.type = 'button';
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-label', 'Like ' + subject);
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg><span class="blog-like-count">…</span>';
  var count = button.querySelector('.blog-like-count');
  var status = document.createElement('span');
  status.className = 'blog-like-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  var actions = box.querySelector('.blog-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'blog-actions';
    box.appendChild(actions);
  }
  actions.appendChild(button);
  box.appendChild(status);
  function updateButton() {
    button.disabled = pending || !enabled || !device;
    button.setAttribute('aria-busy', String(pending));
    button.setAttribute('aria-pressed', String(liked));
    button.classList.toggle('is-liked', liked);
    var label = !device ? 'Enable browser storage to like' : !initialized ? 'Retry loading likes' : operation ? (operation.liked ? 'Retry adding your like' : 'Retry removing your like') : liked ? 'Unlike ' + subject : 'Like ' + subject;
    button.setAttribute('aria-label', label + '. ' + count.textContent + ' total likes');
    button.title = label;
  }
  function render(data) {
    if (!data || !Number.isSafeInteger(data.count) || data.count < 0 || typeof data.liked !== 'boolean' || !Number.isSafeInteger(data.version) || data.version < 0) throw new Error('Invalid response');
    liked = data.liked;
    version = data.version;
    initialized = true;
    count.textContent = data.count.toLocaleString();
  }
  function burst() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (var i = 0; i < 6; i++) {
      var heart = document.createElement('span');
      heart.className = 'blog-floating-heart';
      heart.textContent = '❤️';
      heart.setAttribute('aria-hidden', 'true');
      heart.style.setProperty('--heart-drift', (-70 + i * 22) + 'px');
      heart.style.setProperty('--heart-delay', (i * 0.08) + 's');
      box.appendChild(heart);
      (function (node) { setTimeout(function () { node.remove(); }, 5000); })(heart);
    }
  }
  async function request(method) {
    // An uncertain write must be retried unchanged, never replaced by a new toggle.
    if (!enabled || pending || (method === 'GET' && operation) || (method === 'POST' && (!device || !initialized))) return;
    if (method === 'POST' && !operation) {
      try { operation = { device: device, liked: !liked, operationId: newId(), expectedVersion: version }; }
      catch (_) { status.textContent = 'Could not save. Please try again.'; return; }
    }
    pending = true;
    if (method === "GET") lastRefresh = Date.now();
    updateButton();
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 10000);
    try {
      var response = await fetch('/api/blog-likes?slug=' + encodeURIComponent(slug) + (method === 'GET' && device ? '&device=' + encodeURIComponent(device) : ''), {
        method: method, cache: 'no-store', credentials: 'same-origin', signal: controller.signal,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {},
        body: method === 'POST' ? JSON.stringify(operation) : undefined
      });
      if (response.status === 403 || response.status === 404) { box.hidden = true; return; }
      if (method === 'POST' && response.status === 409) {
        render(await response.json());
        operation = null;
        status.textContent = 'Your like changed in another tab. Showing the latest state.';
        return;
      }
      if (!response.ok) throw new Error('Request failed');
      var data = await response.json();
      if (method === 'POST' && (typeof data.added !== 'boolean' || typeof data.removed !== 'boolean')) throw new Error('Invalid like response');
      render(data);
      if (method === 'POST') operation = null;
      status.textContent = !device ? 'Enable browser storage to like.' : method === 'POST' ? (data.liked ? 'Thanks for the love!' : 'Like removed.') : '';
      if (method === 'POST' && data.added && enabled) burst();
    } catch (_) {
      status.textContent = method === 'POST' ? 'Could not confirm the change. Tap the heart to retry.' : 'Likes unavailable. Tap the heart to retry.';
    } finally {
      clearTimeout(timeout);
      pending = false;
      updateButton();
    }
  }
  button.addEventListener('click', function (event) { if (event) { event.preventDefault(); event.stopPropagation(); } request(initialized && device ? 'POST' : 'GET'); });

    return {
      element: host || box,
      apply: function () {
        box.hidden = !enabled;
        if (!enabled) box.querySelectorAll('.blog-floating-heart').forEach(function (heart) { heart.remove(); });
        updateButton();
      },
      refresh: function (force) {
        if ((!host || visible(host)) && (force || !initialized || Date.now() - lastRefresh > 25000)) request('GET');
      }
    };
  }
  function visible(host) {
    if (host.classList.contains('is-filtered-out') || host.hidden) return false;
    var bounds = host.getBoundingClientRect();
    return bounds.bottom >= -160 && bounds.top <= (window.innerHeight || 800) + 160;
  }
  function makeBox() {
    var box = document.createElement('section');
    box.className = 'blog-reactions';
    box.setAttribute('aria-label', 'Article likes');
    box.hidden = true;
    return box;
  }
  if (articlePath) {
    var article = document.querySelector('.blog-article');
    if (!article) return;
    var box = makeBox();
    var anchor = article.querySelector('.blog-byline') || article.querySelector('h1');
    if (anchor) anchor.after(box); else article.prepend(box);
    widgets.push(mount(articlePath[1], box, null));
  } else {
    document.querySelectorAll('.blog-cards .blog-card').forEach(function (card) {
      var href;
      try { href = new URL(card.getAttribute('href'), location.href); } catch (_) { return; }
      var match = href.pathname.match(/^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(?:index\.html)?$/);
      if (!match || href.origin !== location.origin || card.parentElement.classList.contains('blog-card-shell')) return;
      // Keep the existing article link and its view badge intact. The heart is a
      // sibling, so pressing it cannot follow the article or generate a view.
      var shell = document.createElement('div');
      shell.className = 'blog-card-shell';
      card.before(shell); shell.appendChild(card);
      var box = makeBox(); box.classList.add('blog-card-reactions');
      shell.appendChild(box);
      function syncFilter() { shell.classList.toggle('is-filtered-out', card.classList.contains('is-filtered-out')); }
      syncFilter();
      if ('MutationObserver' in window) new MutationObserver(syncFilter).observe(card, { attributes: true, attributeFilter: ['class'] });
      var heading = card.querySelector('h2');
      var subject = heading ? heading.textContent.trim() : 'this article';
      box.setAttribute('aria-label', subject + ' likes');
      widgets.push(mount(match[1], box, shell, subject));
    });
    if (!widgets.length) return;
  }
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) widgets.forEach(function (widget) { if (widget.element === entry.target) widget.refresh(); });
      });
    }, {rootMargin: '160px'});
    widgets.forEach(function (widget) { observer.observe(widget.element); });
  } else if (listing) {
    var scrolling = false;
    window.addEventListener('scroll', function () {
      if (scrolling) return;
      scrolling = true;
      setTimeout(function () { scrolling = false; if (enabled) widgets.forEach(function (widget) { widget.refresh(); }); }, 200);
    }, {passive: true});
  }
  async function refresh() {
    if (configPending) return;
    configPending = true;
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 10000);
    try {
      var response = await fetch('/api/blog-hearts', { cache: 'no-store', credentials: 'omit', signal: controller.signal });
      if (!response.ok) throw new Error('Configuration unavailable');
      var config = await response.json();
      if (!config || typeof config.enabled !== 'boolean') throw new Error('Invalid configuration');
      enabled = config.enabled;
      if (enabled && !device) { try { device = deviceId(); } catch (_) {} }
      widgets.forEach(function (widget) { widget.apply(); if (enabled) widget.refresh(true); });
    } catch (_) {
      enabled = false;
      widgets.forEach(function (widget) { widget.apply(); });
    } finally { clearTimeout(timeout); configPending = false; }
  }
  refresh();
  setInterval(function () { if (!document.hidden) refresh(); }, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
  window.addEventListener('pageshow', function () { if (!document.hidden) refresh(); });
})();

/* Staff-authored post notes, independent of reactions and view counting. */
(function () {
  'use strict';
  var match = location.pathname.match(/^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(?:index\.html)?$/);
  var article = document.querySelector('article.blog-article');
  if (!match || !article || article.querySelector('.pp-blog-note')) return;
  var anchor = article.querySelector('.blog-byline') || article.querySelector('h1');
  if (!anchor) return;
  fetch('/magazine/data.json?blogNote=' + encodeURIComponent(match[1]), {
    credentials: 'omit', cache: 'no-store'
  }).then(function (response) {
    return response.ok ? response.json() : null;
  }).then(function (data) {
    var note = typeof data?.message === 'string' ? data.message.trim() : '';
    if (!note || note.length > 5000 || article.querySelector('.pp-blog-note')) return;
    if (!document.querySelector('#pp-blog-note-style')) {
      var style = document.createElement('style');
      style.id = 'pp-blog-note-style';
      style.textContent = '.blog-article .pp-blog-note{box-sizing:border-box;margin:12px 0;padding:9px 13px;background:#fff9e8;border:1px solid #eed69b;border-inline-start:3px solid #c9850a;border-radius:8px;color:#3b3124;text-align:start;overflow-wrap:anywhere}.blog-article .pp-blog-note .pp-blog-note-label{display:block;margin:0 0 3px;color:#654313;font:800 .7rem/1.3 Nunito,system-ui,sans-serif;letter-spacing:.05em;text-transform:uppercase}.blog-article .pp-blog-note p{margin:0;font:600 .89rem/1.45 Nunito,system-ui,sans-serif;white-space:pre-wrap;color:inherit}.blog-article .pp-blog-note button{display:inline-block;border:0;background:transparent;color:#7a4500;padding:4px 2px 0;margin:0;font:800 .83rem/1.4 Nunito,system-ui,sans-serif;text-decoration:underline;cursor:pointer}.blog-article .pp-blog-note button:focus-visible{outline:2px solid #164fc8;outline-offset:2px}';
      document.head.appendChild(style);
    }
    var block = document.createElement('aside');
    block.className = 'pp-blog-note';
    block.setAttribute('aria-label', 'Blog note');
    var label = document.createElement('strong');
    label.className = 'pp-blog-note-label';
    label.textContent = 'Blog note';
    var p = document.createElement('p');
    p.id = 'pp-blog-note-message';
    p.textContent = note;
    block.append(label, p);
    if (note.length > 300) {
      var preview = note.slice(0, 260).replace(/\s+\S*$/, '') + '…';
      p.textContent = preview;
      var more = document.createElement('button');
      more.type = 'button';
      more.setAttribute('aria-controls', p.id);
      more.setAttribute('aria-expanded', 'false');
      more.textContent = 'Read full note';
      more.addEventListener('click', function () {
        var open = more.getAttribute('aria-expanded') === 'true';
        p.textContent = open ? preview : note;
        more.setAttribute('aria-expanded', String(!open));
        more.textContent = open ? 'Read full note' : 'Show less';
      });
      block.appendChild(more);
    }
    anchor.after(block); // Read time, then note, then the existing heart box.
  }).catch(function () { /* A missing note never changes the article. */ });
})();

/* Blog views: one 30-second foreground visit per article page load. */
(function countBlogVisitV2() {
  "use strict";
  const match = /^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/index\.html|\/)?$/.exec(location.pathname);
  if (!match || !document.querySelector(".blog-article") || window.__ppBlogVisitV2) return;
  window.__ppBlogVisitV2 = true;

  const slug = match[1], minimum = 30000;
  let activeSince = null, seen = 0, timer = null;
  let ticket = null, startedAt = null, running = false, done = false;
  const visible = () => document.visibilityState === "visible";
  const duration = () => seen + (activeSince === null ? 0 : performance.now() - activeSince);
  const post = (phase, extra) => fetch("/api/views/track", {
    method: "POST", credentials: "same-origin", keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ version: 2, phase, slug, ...extra }),
  });

  function schedule(wait) {
    clearTimeout(timer);
    if (!done && visible() && !running) timer = setTimeout(step, wait);
  }

  async function step() {
    clearTimeout(timer);
    if (done || running) return;
    if (!ticket) {
      if (!visible()) return;
      running = true;
      try {
        const response = await post("start");
        if (!response.ok) { done = true; return; } // No ticket: never increment.
        const result = await response.json();
        if (typeof result.ticket !== "string") { done = true; return; }
        ticket = result.ticket;
        startedAt = performance.now();
      } catch (_) { done = true; return; }
      finally { running = false; }
    }
    const remaining = minimum - duration();
    if (remaining > 0) { schedule(remaining); return; }
    if (performance.now() - startedAt >= 4 * 60 * 1000) {
      // The tab may have been hidden a long time. A fresh server ticket
      // must mature before counting; a resumed tab is still the same visit.
      ticket = null;
      schedule(0);
      return;
    }
    running = true;
    try {
      const response = await post("finish", { ticket });
      if (response.status === 425 || response.status >= 500) {
        running = false;
        schedule(response.status === 425 ? 1000 : 3000);
        return;
      }
      done = true; // Accepted (including replay) or definitively rejected.
    } catch (_) {
      // Retry the same idempotent ticket after transient network errors.
      running = false;
      schedule(3000);
    } finally { running = false; }
  }

  function visibleChanged() {
    if (visible() && activeSince === null) activeSince = performance.now();
    else if (!visible() && activeSince !== null) {
      seen += performance.now() - activeSince;
      activeSince = null;
    }
    void step();
  }

  document.addEventListener("visibilitychange", visibleChanged);
  visibleChanged();
})();
