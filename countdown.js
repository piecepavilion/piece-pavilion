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
    if (motion.matches || confetti.childElementCount) return;
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
    if (!remaining) celebrate();
    else if (box.classList.contains('countdown-complete')) {
      clearCelebration(); status.textContent = '';
      title.textContent = typeof active.title === 'string' ? active.title : 'Countdown';
      message.textContent = typeof active.message === 'string' ? active.message : '';
    }
  }
  function apply(config) {
    if (!config || config.enabled!==true || !Number.isFinite(Date.parse(config.endsAt))) {
      active=null; lastKey=''; box.hidden=true; carousel.hidden=false; clearCelebration(); return;
    }
    var key=JSON.stringify([config.endsAt,config.title,config.message,config.afterTitle,config.afterMessage,config.timeZone]);
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

