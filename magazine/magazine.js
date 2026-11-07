(function (global) {
  'use strict';
  const empty = {version:1,edition:'',title:'',dek:'',body:'',byline:'',date:'',image:'',imageAlt:'',caption:'',photos:[],updatedAt:''};
  const esc = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeImage = value => /^\/magazine\/img\/[a-f0-9-]{36}$/i.test(value || '') ? value : '';
  function figure(url, alt, caption, extra) {
    if (!safeImage(url)) return '';
    return '<figure class="pp-magazine-photo '+(extra ? 'pp-magazine-extra' : '')+'"><img src="'+esc(url)+'" alt="'+esc(alt)+'" loading="lazy">'+(caption ? '<figcaption>'+esc(caption)+'</figcaption>' : '')+'</figure>';
  }
  function render(root, data, preview) {
    const a = Object.assign({}, empty, data || {});
    if (!a.title.trim() && !preview) { root.hidden = true; root.replaceChildren(); return; }
    root.hidden = false;
    root.innerHTML = '<article class="pp-magazine" aria-label="Piece Pavilion magazine">'+
      '<div class="pp-magazine-masthead"><span>PIECE PAVILION <b>JOURNAL</b></span><span>'+esc(a.edition || (preview ? 'YOUR EDITION' : ''))+'</span></div>'+
      '<div class="pp-magazine-lead'+(safeImage(a.image) ? ' has-image' : '')+'"><header class="pp-magazine-heading">'+
      '<div class="pp-magazine-kicker">FROM THE PAVILION</div><h2>'+esc(a.title || 'Your next story starts here.')+'</h2>'+
      (a.dek ? '<p class="pp-magazine-dek">'+esc(a.dek)+'</p>' : '')+
      '<div class="pp-magazine-meta">'+(a.byline ? '<span>By '+esc(a.byline)+'</span>' : '')+(a.date ? '<time datetime="'+esc(a.date)+'">'+esc(a.date)+'</time>' : '')+'</div></header>'+
      figure(a.image,a.imageAlt,a.caption,false)+'</div>'+
      '<div class="pp-magazine-copy">'+String(a.body || (preview ? 'Write your article in the editor. Your words and photos will appear here, exactly as they will on the public site after you save.' : '')).split(/\n\s*\n/).filter(Boolean).map(p=>'<p>'+esc(p).replace(/\n/g,'<br>')+'</p>').join('')+'</div>'+
      '<div class="pp-magazine-gallery">'+(Array.isArray(a.photos) ? a.photos.slice(0,6).map(p=>figure(p.url,p.alt,p.caption,true)).join('') : '')+'</div></article>';
  }
  async function mount(root) {
    try {
      const r = await fetch('/magazine/data.json', {cache:'no-store',credentials:'omit'});
      if (!r.ok) throw new Error('Magazine unavailable');
      render(root, await r.json(), false);
    } catch (_) { root.hidden = true; }
  }
  global.PPMagazine = {empty,esc,safeImage,render,mount};
  if (typeof document !== 'undefined') document.querySelectorAll('[data-pp-magazine]').forEach(mount);
})(typeof window !== 'undefined' ? window : globalThis);
