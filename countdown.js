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
  var active = null, lastKey = '', refreshing = false;
  function pad(value) { return String(value).padStart(2, '0'); }
  function clearCelebration() { box.classList.remove('countdown-complete'); confetti.replaceChildren(); }
  function celebrate() {
    box.classList.add('countdown-complete');
    status.textContent = 'Countdown complete.';
    if (motion.matches || confetti.childElementCount) return;
    var colors = ['#f3c22d','#5db6ef','#f2779d','#9cddac','#be9cf0'];
    for (var i=0;i<42;i++) {
      var piece=document.createElement('i');
      piece.style.setProperty('--x', ((i * 37) % 100) + '%');
      piece.style.setProperty('--delay', ((i % 13) * 0.17) + 's');
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
    if (!remaining && !box.classList.contains('countdown-complete')) celebrate();
  }
  function apply(config) {
    if (!config || config.enabled!==true || !Number.isFinite(Date.parse(config.endsAt))) {
      active=null; lastKey=''; box.hidden=true; carousel.hidden=false; clearCelebration(); return;
    }
    var key=JSON.stringify([config.endsAt,config.title,config.message,config.timeZone]);
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
  motion.addEventListener('change',function(){if(motion.matches)confetti.replaceChildren();});
  setInterval(tick,1000);
  setInterval(function(){if(!document.hidden)refresh();},15000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden){tick();refresh();}});
  refresh();
})();
