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
    // Homepage shows only the cover spread; editor and Newsroom keep the full article.
    const coverOnly = root.getAttribute?.('data-pp-magazine') === 'preview';
    const headline = esc(a.title || 'Your next story starts here.');
    const storyLink = '/spotlight/' + (a.id ? '?newsroom-page=' + encodeURIComponent(a.id) : '');
    root.innerHTML = '<article class="pp-magazine" aria-label="Piece Pavilion Newsroom">'+
      '<div class="pp-magazine-masthead"><span>PIECE PAVILION <b>NEWSROOM</b></span><span>'+esc(a.edition || (preview ? 'YOUR EDITION' : ''))+'</span></div>'+
      '<div class="pp-magazine-lead'+(safeImage(a.image) ? ' has-image' : '')+'"><header class="pp-magazine-heading">'+
      '<div class="pp-magazine-kicker">FROM THE PAVILION</div><h2>'+(coverOnly ? '<a href="'+esc(storyLink)+'">'+headline+'</a>' : headline)+'</h2>'+
      (a.dek ? '<p class="pp-magazine-dek">'+esc(a.dek)+'</p>' : '')+
      '<div class="pp-magazine-meta">'+(a.byline ? '<span>By '+esc(a.byline)+'</span>' : '')+(a.date ? '<time datetime="'+esc(a.date)+'">'+esc(a.date)+'</time>' : '')+'</div></header>'+
      figure(a.image,a.imageAlt,a.caption,false)+'</div>'+
      (coverOnly ? '' : '<div class="pp-magazine-copy">'+String(a.body || (preview ? 'Write your article in the editor. Your words and photos will appear here, exactly as they will on the public site after you save.' : '')).split(/\n\s*\n/).filter(Boolean).map(p=>'<p>'+esc(p).replace(/\n/g,'<br>')+'</p>').join('')+'</div>'+
      '<div class="pp-magazine-gallery">'+(Array.isArray(a.photos) ? a.photos.slice(0,6).map(p=>figure(p.url,p.alt,p.caption,true)).join('') : '')+'</div>')+'</article>';
  }
  function renderPages(root, articles) {
    const pages=articles.filter(a=>a && typeof a.title==='string' && a.title.trim());
    if(!pages.length){root.hidden=true;root.replaceChildren();return;}
    root.hidden=false;
    let index=0, turning=false, timer;
    const params=new URLSearchParams(global.location?.search || '');
    const requested=params.get('newsroom-page');
    const selected=pages.findIndex(a=>a.id===requested);
    if(selected>=0)index=selected;
    const nav=document.createElement('nav');nav.className='pp-magazine-pages';nav.setAttribute('aria-label','Newsroom pages');
    const back=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');
    back.type=next.type='button';back.textContent='← Back';next.textContent='Next Page →';
    label.className='pp-magazine-page-count';label.setAttribute('role','status');label.setAttribute('aria-live','polite');label.setAttribute('aria-atomic','true');
    nav.append(back,label,next);
    const stage=document.createElement('div');stage.className='pp-magazine-book';
    const sheet=document.createElement('div');sheet.className='pp-magazine-sheet';stage.append(sheet);
    root.replaceChildren(nav,stage);
    function buttons(){back.setAttribute('aria-disabled',String(turning||index===0));next.setAttribute('aria-disabled',String(turning||index===pages.length-1));label.textContent='Page '+(index+1)+' of '+pages.length;}
    function show(){render(sheet,pages[index],false);buttons();}
    function go(direction){
      if(turning||index+direction<0||index+direction>=pages.length)return;
      const reduce=global.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      let leaf;
      if(!reduce){
        leaf=sheet.cloneNode(true);leaf.className='pp-magazine-turn '+(direction>0?'pp-turn-forward':'pp-turn-back');
        leaf.setAttribute('aria-hidden','true');leaf.inert=true;
        leaf.querySelectorAll('a,button,input,textarea,select,[tabindex]').forEach(el=>el.setAttribute('tabindex','-1'));
        stage.style.minHeight=stage.getBoundingClientRect().height+'px';stage.append(leaf);turning=true;
      }
      index+=direction;show();
      // Stable page links survive reload, without adding a browser-history entry per turn.
      if(global.history?.replaceState && pages[index].id){
        const url=new URL(global.location.href);url.searchParams.set('newsroom-page',pages[index].id);
        global.history.replaceState(global.history.state,'',url);
      }
      if(leaf){
        let finished=false;
        const done=()=>{if(finished)return;finished=true;global.clearTimeout(timer);leaf.remove();stage.style.minHeight='';turning=false;buttons();};
        leaf.addEventListener('animationend',done,{once:true});timer=global.setTimeout(done,850);
      }
    }
    back.addEventListener('click',()=>go(-1));next.addEventListener('click',()=>go(1));show();
  }
  async function mount(root) {
    const coverOnly=root.getAttribute?.('data-pp-magazine')==='preview';
    try {
      // Both surfaces use the same published order and stable story IDs.
      const r=await fetch('/magazine/pages.json',{cache:'no-store',credentials:'omit'});
      if(!r.ok)throw new Error('Newsroom unavailable');
      const data=await r.json();
      if(coverOnly){
        if(!Array.isArray(data.pages))throw new Error('Newsroom page list unavailable');
        const featured=data.pages.find(a=>a.id===data.layout?.homepageId) || data.pages.find(a=>a.id==='front') || data.pages[0];
        render(root,featured || empty,false);
      }
      else if(Array.isArray(data.pages))renderPages(root,data.pages);
      else throw new Error('Newsroom page list unavailable');
    } catch (_) {
      // A cached frontend or staged backend deployment still shows the original story.
      try {
        const r=await fetch('/magazine/data.json',{cache:'no-store',credentials:'omit'});if(!r.ok)throw new Error();render(root,{...await r.json(),id:'front'},false);
        if(!coverOnly){const notice=document.createElement('p');notice.className='pp-magazine-page-error';notice.setAttribute('role','status');notice.textContent='Additional Newsroom pages could not be loaded. Please refresh to try again.';root.prepend(notice);root.hidden=false;}
      }
      catch (_) {root.hidden=true;}
    }
  }
  global.PPMagazine = {empty,esc,safeImage,render,renderPages,mount};
  if (typeof document !== 'undefined') document.querySelectorAll('[data-pp-magazine]').forEach(mount);
})(typeof window !== 'undefined' ? window : globalThis);

