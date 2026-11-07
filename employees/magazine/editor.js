(function () {
  'use strict';
  const $ = id => document.getElementById(id), form = $('editor'), fields = $('fields');
  const keys = ['edition','title','dek','body','byline','date','imageAlt','caption'];
  const clone = a => JSON.parse(JSON.stringify(a));
  let draft = clone(PPMagazine.empty), saved = clone(draft), history = [], busy = false, loaded = false, sessionUndo = false;
  let pageId = 'front', pagesEnabled = false;
  const pages = new Map();
  function rememberPage() { if (pages.has(pageId)) Object.assign(pages.get(pageId), {draft, saved, history}); }
  function anyUnsaved() { rememberPage(); return dirty() || [...pages.values()].some(p => !p.published || comparable(p.draft) !== comparable(p.saved)); }
  function pageControls() {
    const ids = [...pages.keys()], index = ids.indexOf(pageId);
    for (const [id, disabled] of [['new-page',!pagesEnabled],['page-prev',index <= 0],['page-next',index >= ids.length-1],['page-select',ids.length < 2]]) {
      if ($(id)) {
        if(id==='page-prev'||id==='page-next') { $(id).disabled=false;$(id).setAttribute('aria-disabled',String(!loaded||busy||disabled)); }
        else $(id).disabled = !loaded || busy || disabled;
      }
    }
    if ($('page-count')) $('page-count').textContent = 'Page ' + Math.max(1,index+1) + ' of ' + Math.max(1,ids.length);
    const select = $('page-select');
    if (!select) return;
    rememberPage();
    const labels = ids.map((id,i) => {
      const p=pages.get(id), changed=!p.published || comparable(p.draft)!==comparable(p.saved);
      return (i+1)+'. '+(p.draft.title || 'Blank page')+(changed?' · unsaved':'');
    });
    const signature=JSON.stringify(labels);
    if (select.dataset.pages !== signature) {
      select.replaceChildren();
      ids.forEach((id,i)=>{const option=document.createElement('option');option.value=id;option.textContent=labels[i];select.append(option);});
      select.dataset.pages=signature;
    }
    select.value=pageId;
  }
  function switchPage(id) {
    if (!loaded || busy || !pages.has(id) || id===pageId) return;
    rememberPage();pageId=id;
    ({draft,saved,history}=pages.get(id));sessionUndo=false;fill();
    status(dirty()?'This page has unsaved changes. Save to publish.':'Page loaded. Other pages and their unsaved edits are kept in this tab.');
  }
  function newPage() {
    if (!loaded || busy || !pagesEnabled) return;
    rememberPage();
    const id=window.crypto.randomUUID(), blank=clone(PPMagazine.empty);
    pages.set(id,{draft:blank,saved:clone(blank),history:[],published:false});
    switchPage(id);
    status('New blank page. Your other pages are kept. Add your writing, then Save & publish this page.');
    form.elements.title.focus?.();
  }
  const comparable = a => { const {updatedAt,id,createdAt,...content}=a; return JSON.stringify(content); };
  const dirty = () => comparable(draft) !== comparable(saved);
  function status(message, kind) { $('status').textContent = message; $('status').className = kind || ''; }
  function controls() { pageControls(); $('save').disabled = !loaded || busy || !dirty(); $('undo').disabled = !loaded || busy || !history.length; fields.disabled = !loaded || busy; if (window.PPMagazineInline) PPMagazineInline.setDisabled($('preview'), !loaded || busy); }
  function snapshot() { history.push(clone(draft)); if (history.length > 80) history.shift(); }
  function update() {
    PPMagazine.render($('preview'),draft,true);
    if (window.PPMagazineInline) PPMagazineInline.mount($('preview'), draft, (key, value, index, first) => {
      if (!loaded || busy) return;
      // Inputs in the sidebar are single-line for these fields, including paste.
      if (['edition','title','byline','caption'].includes(key)) value = value.replace(/[\r\n]+/g, ' ');
      if (first) snapshot();
      if (index === undefined) { draft[key] = value; form.elements[key].value = value; }
      else {
        draft.photos[index][key] = value;
        const input = $('photos').querySelector('[data-photo-index="'+index+'"][data-photo-key="'+key+'"]');
        if (input) input.value = value;
      }
      status('Unsaved changes. Save to publish.');
      controls();
    });
    controls();
  }
  function fill() { keys.forEach(k => { form.elements[k].value = draft[k] || ''; }); photos(); update(); }
  function edited() { status('Unsaved changes. Save to publish.'); update(); }
  async function api(path, options = {}) {
    const r = await fetch('/employees/api/magazine'+path, {credentials:'same-origin',cache:'no-store',...options});
    const type = r.headers.get('content-type') || '';
    if (r.redirected || !type.includes('application/json')) throw new Error('Your staff sign-in expired. Open the staff portal in a new tab, sign in, then try again. Your edits are still here.');
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || data.message || 'The change could not be saved. Please try again.');
    return data;
  }
  keys.forEach(k => {
    const el = form.elements[k];
    el.addEventListener('focus', () => { sessionUndo = false; });
    el.addEventListener('input', () => { if (!sessionUndo) { snapshot(); sessionUndo = true; } draft[k] = el.value; edited(); });
  });
  function photos() {
    const root = $('photos'); root.replaceChildren();
    (draft.photos || []).forEach((p,i) => {
      const box = document.createElement('div'); box.className = 'photo-edit';
      const img = document.createElement('img'); img.src = PPMagazine.safeImage(p.url); img.alt = p.alt || ''; box.append(img);
      [['alt','Image description',300],['caption','Caption',500]].forEach(([key,label,max]) => {
        const wrap = document.createElement('label'); wrap.textContent = label;
        const input = document.createElement('input'); input.value = p[key] || ''; input.maxLength = max; input.dataset.photoIndex = i; input.dataset.photoKey = key;
        let started = false; input.addEventListener('focus',()=>{started=false;});
        input.addEventListener('input',()=>{if(!started){snapshot();started=true;} draft.photos[i][key]=input.value; edited();});
        wrap.append(input);box.append(wrap);
      });
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'small'; remove.textContent = 'Remove photo';
      remove.addEventListener('click',()=>{snapshot();draft.photos.splice(i,1);photos();edited();});box.append(remove);root.append(box);
    });
  }
  async function upload(input, cover) {
    const file = input.files[0]; if (!file || busy || !loaded) return;
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type) || file.size > 8*1024*1024) { status('Choose a JPG, PNG, WebP or GIF image no larger than 8 MB.','error'); input.value='';return; }
    if (!cover && draft.photos.length >= 6) {status('You can add up to six extra photos. Remove one first.','error');input.value='';return;}
    busy=true;controls();status('Uploading photo. Save to add it to the article.');
    try {
      const data = new FormData(); data.append('file',file);
      const result = await api('/upload',{method:'POST',body:data});
      if(!PPMagazine.safeImage(result.url))throw new Error('The upload returned an invalid image address.');
      snapshot();if(cover) draft.image=result.url;else draft.photos.push({url:result.url,alt:'',caption:''});
      photos();status('Photo uploaded. Add a description, then save to publish.');
    } catch(error) {status(error.message,'error');}
    finally {busy=false;input.value='';update();}
  }
  $('cover-upload').addEventListener('change',e=>upload(e.target,true));
  $('extra-upload').addEventListener('change',e=>upload(e.target,false));
  $('remove-cover').addEventListener('click',()=>{if(!draft.image)return;snapshot();draft.image='';edited();});
  $('undo').addEventListener('click',()=>{if(busy||!history.length)return;draft={...history.pop(),updatedAt:saved.updatedAt};sessionUndo=false;fill();status(dirty()?'Last edit undone. Save to publish this version.':'Back to your saved version.');});
  async function save() {
    if (busy || !loaded || !dirty()) return;
    form.elements.imageAlt.required = !!draft.image;
    if (!form.reportValidity()) return;
    if ((draft.photos || []).some(p => !p.alt.trim())) { status('Add a description for each photo before saving.', 'error'); return; }
    if (!draft.title.trim()) {status('Please enter a headline.','error');return;}
    busy=true;controls();status('Saving your article…');
    try {
      const result=await api(pageId==='front'?'/save':'/pages/'+encodeURIComponent(pageId)+'/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)});
      draft={...clone(PPMagazine.empty),...result};saved=clone(draft);if(pages.has(pageId))pages.get(pageId).published=true;fill();
      status('Saved and published. Public pages may take a moment to refresh.','success');
    } catch(error) {status(error.message,'error');}
    finally {busy=false;controls();}
  }
  $('save').addEventListener('click',save);form.addEventListener('submit',e=>{e.preventDefault();save();});
  $('new-page')?.addEventListener('click',newPage);
  $('page-prev')?.addEventListener('click',()=>{const ids=[...pages.keys()];switchPage(ids[ids.indexOf(pageId)-1]);});
  $('page-next')?.addEventListener('click',()=>{const ids=[...pages.keys()];switchPage(ids[ids.indexOf(pageId)+1]);});
  $('page-select')?.addEventListener('change',e=>switchPage(e.target.value));
  window.addEventListener('beforeunload',e=>{if(anyUnsaved()||busy){e.preventDefault();e.returnValue='';}});
  api('/pages').then(result=>{
    // Only allow new pages after a successful collection response from the backend.
    pagesEnabled=Array.isArray(result.pages);
    const articles=pagesEnabled?result.pages:[result];
    if(!articles.length)throw new Error('No saved Newsroom pages were returned.');
    articles.forEach((article,index)=>{
      const id=article.id || (index===0?'front':null);
      if(!id || pages.has(id))throw new Error('The Newsroom page list could not be loaded safely.');
      const value={...clone(PPMagazine.empty),...article};if(!Array.isArray(value.photos))value.photos=[];
      pages.set(id,{draft:value,saved:clone(value),history:[],published:true});
    });
    pageId=pages.has('front')?'front':pages.keys().next().value;
    ({draft,saved,history}=pages.get(pageId));loaded=true;fill();
    status(draft.title?'Published pages loaded. Edit or add a page, then save to publish.':'Ready for your first article. Nothing publishes until you save.');
  }).catch(error=>{status(error.message+' Reload this page to retry.','error');update();});
  update();
})();

