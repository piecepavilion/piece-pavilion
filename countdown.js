/* Reusable homepage countdown. Published configuration only; carousel is retained. */
(function () {
  'use strict';
  var box = document.getElementById('homepage-countdown');
  var carousel = document.getElementById('hero-carousel');
  if (!box || !carousel) return;
  var clock = box.querySelector('[data-countdown-clock]');
  var title = box.querySelector('[data-countdown-title]');
  var message = box.querySelector('[data-countdown-message]');
  var target = box.querySelector('[data-countdown-target]');
  var status = box.querySelector('[data-countdown-status]');
  var confetti = box.querySelector('[data-countdown-confetti]');
  var actions = document.createElement('div');
  actions.className = 'countdown-actions';
  var link = document.createElement('a');
  link.className = 'countdown-link';
  link.hidden = true;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  actions.appendChild(link);
  box.appendChild(actions);
  function updateLink(complete) {
    var label = active && active[complete ? 'afterLinkLabel' : 'linkLabel'];
    var raw = active && active[complete ? 'afterLinkUrl' : 'linkUrl'];
    var url = null;
    if (typeof raw === 'string' && !/[\u0000-\u0020\u007f-\u009f]/.test(raw) && /^https?:\/\//i.test(raw)) {
      try {
        var parsed = new URL(raw);
        if ((parsed.protocol === 'https:' || parsed.protocol === 'http:') && !parsed.username && !parsed.password) url = parsed.href;
      } catch (_) {}
    }
    link.hidden = !(typeof label === 'string' && label.trim() && url);
    link.textContent = link.hidden ? '' : label.trim();
    if (link.hidden) link.removeAttribute('href');
    else link.href = url;
  }
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var active = null, lastKey = '', refreshing = false, viewable = true;
  var AFTER_DEFAULT = 'Countdown complete. Check for updates.';
  function updateMotion() { box.classList.toggle('countdown-paused', document.hidden || !viewable); }
  function updateFallDistance() { box.style.setProperty('--confetti-fall', (box.clientHeight + 32) + 'px'); }
  function pad(value) { return String(value).padStart(2, '0'); }
  function clearCelebration() { box.classList.remove('countdown-complete'); confetti.replaceChildren(); }
  function celebrate() {
    var afterTitle = typeof active.afterTitle === 'string' && active.afterTitle.trim() ? active.afterTitle : 'Countdown complete';
    if (title.textContent !== afterTitle) title.textContent = afterTitle;
    var after = typeof active.afterMessage === 'string' && active.afterMessage.trim() ? active.afterMessage : AFTER_DEFAULT;
    if (message.textContent !== after) message.textContent = after;
    if (!box.classList.contains('countdown-complete')) {
      box.classList.add('countdown-complete');
      status.textContent = after;
      updateFallDistance();
    }
    updateMotion();
    if (active.confettiEnabled === false || motion.matches) { confetti.replaceChildren(); return; }
    if (confetti.childElementCount) return;
    var colors = ['#f3c22d','#5db6ef','#f2779d','#9cddac','#be9cf0'];
    for (var i=0;i<64;i++) {
      var piece=document.createElement('i');
      piece.style.setProperty('--x', ((i * 37) % 100) + '%');
      piece.style.setProperty('--delay', (-((i % 19) * 0.19)) + 's');
      piece.style.setProperty('--duration', (2.2 + (i % 7) * 0.23) + 's');
      piece.style.setProperty('--color', colors[i % colors.length]);
      confetti.appendChild(piece);
    }
  }
  function tick() {
    if (!active) return;
    var remaining=Math.max(0,Math.ceil((Date.parse(active.endsAt)-Date.now())/1000));
    var days=Math.floor(remaining/86400), hours=Math.floor(remaining%86400/3600), mins=Math.floor(remaining%3600/60), secs=remaining%60;
    var dayUnit=box.querySelector('[data-countdown-days]');
    dayUnit.hidden=days===0;
    dayUnit.querySelector('strong').textContent=pad(days);
    box.querySelector('[data-countdown-hours]').textContent=pad(hours);
    box.querySelector('[data-countdown-minutes]').textContent=pad(mins);
    box.querySelector('[data-countdown-seconds]').textContent=pad(secs);
    clock.setAttribute('aria-label',(days?days+' days, ':'')+hours+' hours, '+mins+' minutes, '+secs+' seconds remaining');
    updateLink(!remaining);
    if (!remaining) celebrate();
    else if (box.classList.contains('countdown-complete')) {
      clearCelebration(); status.textContent = '';
      title.textContent = typeof active.title === 'string' ? active.title : 'Countdown';
      message.textContent = typeof active.message === 'string' ? active.message : '';
    }
  }
  function apply(config) {
    box.dispatchEvent(new CustomEvent('countdown-hearts-change', {detail: !!config && config.enabled === true && config.heartsEnabled !== false && Number.isFinite(Date.parse(config.endsAt))}));
    if (!config || config.enabled!==true || !Number.isFinite(Date.parse(config.endsAt))) {
      active=null; updateLink(false); lastKey=''; box.hidden=true; carousel.hidden=false; clearCelebration(); return;
    }
    var key=JSON.stringify([config.endsAt,config.title,config.message,config.afterTitle,config.afterMessage,config.timeZone,config.linkLabel,config.linkUrl,config.afterLinkLabel,config.afterLinkUrl,config.heartsEnabled,config.confettiEnabled]);
    if (key===lastKey) { tick(); return; }
    clearCelebration(); lastKey=key; active=config;
    title.textContent=typeof config.title==='string'?config.title:'Countdown';
    message.textContent=typeof config.message==='string'?config.message:'';
    status.textContent='';
    var date=new Date(config.endsAt);
    try { target.textContent=date.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short',timeZone:config.timeZone||'UTC'})+' · '+(config.timeZone||'UTC'); }
    catch (_) { target.textContent=date.toISOString(); }
    target.dateTime=date.toISOString();
    carousel.hidden=true; box.hidden=false; tick();
  }
  async function refresh() {
    if(refreshing) return; refreshing=true;
    try {
      var response=await fetch('/countdown/config.json',{cache:'no-store',credentials:'omit'});
      if(response.ok) apply(await response.json());
    } catch (_) { /* Keep last good state, or the original carousel on first load. */ }
    finally {refreshing=false;}
  }
  motion.addEventListener('change',function(){
    if(motion.matches) confetti.replaceChildren();
    else tick();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function(entries){ viewable=entries[0].isIntersecting; updateMotion(); }).observe(box);
  }
  if ('ResizeObserver' in window) { new ResizeObserver(updateFallDistance).observe(box); }
  setInterval(tick,1000);
  setInterval(function(){if(!document.hidden)refresh();},15000);
  document.addEventListener('visibilitychange',function(){updateMotion();if(!document.hidden){tick();refresh();}});
  refresh();
})();

/* Shared countdown likes, independent of countdown configuration and timer. */
(function () {
  'use strict';
  var box = document.getElementById('homepage-countdown');
  if (!box || box.querySelector('.countdown-like')) return;
  var key = 'pp_countdown_like_device_v1';
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
  var device = null, heartsVisible = false;
  var liked = false, pending = false, initialized = false, version = 0, operation = null;
  var button = document.createElement('button');
  button.className = 'countdown-like';
  button.type = 'button';
  button.hidden = true;
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-label', 'Like this countdown');
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg><span class="countdown-like-count">…</span>';
  var count = button.querySelector('.countdown-like-count');
  var status = document.createElement('span');
  status.className = 'countdown-like-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.hidden = true;
  var actions = box.querySelector('.countdown-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'countdown-actions';
    box.appendChild(actions);
  }
  actions.appendChild(button);
  box.appendChild(status);
  function updateButton() {
    button.disabled = pending || !device;
    button.setAttribute('aria-busy', String(pending));
    button.setAttribute('aria-pressed', String(liked));
    button.classList.toggle('is-liked', liked);
    var label = !device ? 'Enable browser storage to like' : !initialized ? 'Retry loading likes' : operation ? (operation.liked ? 'Retry adding your like' : 'Retry removing your like') : liked ? 'Unlike this countdown' : 'Like this countdown';
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
      heart.className = 'countdown-floating-heart';
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
    if (!heartsVisible || pending || (method === 'GET' && operation) || (method === 'POST' && (!device || !initialized))) return;
    if (method === 'POST' && !operation) {
      try { operation = { device: device, liked: !liked, operationId: newId(), expectedVersion: version }; }
      catch (_) { status.textContent = 'Could not save. Please try again.'; return; }
    }
    pending = true;
    updateButton();
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 10000);
    try {
      var response = await fetch('/api/countdown-likes' + (method === 'GET' && device ? '?device=' + encodeURIComponent(device) : ''), {
        method: method, cache: 'no-store', credentials: 'same-origin', signal: controller.signal,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {},
        body: method === 'POST' ? JSON.stringify(operation) : undefined
      });
      if (method === 'POST' && response.status === 409) {
        render(await response.json());
        operation = null;
        status.textContent = 'The heart count changed. Showing the latest state.';
        return;
      }
      if (!response.ok) throw new Error('Request failed');
      var data = await response.json();
      if (method === 'POST' && (typeof data.added !== 'boolean' || typeof data.removed !== 'boolean')) throw new Error('Invalid like response');
      render(data);
      if (method === 'POST') operation = null;
      status.textContent = !device ? 'Enable browser storage to like.' : method === 'POST' ? (data.liked ? 'Thanks for the love!' : 'Like removed.') : '';
      if (method === 'POST' && data.added && heartsVisible) burst();
    } catch (_) {
      status.textContent = method === 'POST' ? 'Could not confirm the change. Tap the heart to retry.' : 'Likes unavailable. Tap the heart to retry.';
    } finally {
      clearTimeout(timeout);
      pending = false;
      updateButton();
    }
  }
  button.addEventListener('click', function () { request(initialized && device ? 'POST' : 'GET'); });
  box.addEventListener('countdown-hearts-change', function (event) {
    var wasVisible = heartsVisible;
    heartsVisible = event.detail === true;
    button.hidden = status.hidden = !heartsVisible;
    box.classList.toggle('countdown-has-likes', heartsVisible);
    if (!heartsVisible) box.querySelectorAll('.countdown-floating-heart').forEach(function (heart) { heart.remove(); });
    if (heartsVisible && !wasVisible) {
      if (!device) { try { device = deviceId(); } catch (_) {} }
      updateButton();
      request('GET');
    }
  });
  setInterval(function () { if (!document.hidden && !box.hidden) request('GET'); }, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !box.hidden) request('GET'); });
})();

