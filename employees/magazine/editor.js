(function () {
  'use strict';
  const $ = id => document.getElementById(id), form = $('editor'), fields = $('fields');
  const keys = ['edition','title','dek','body','byline','date','imageAlt','caption'];
  const clone = a => JSON.parse(JSON.stringify(a));
  let draft = clone(PPMagazine.empty), saved = clone(draft), history = [], busy = false, loaded = false, sessionUndo = false;
  const comparable = a => JSON.stringify({...a, updatedAt:''});
  const dirty = () => comparable(draft) !== comparable(saved);
  function status(message, kind) { $('status').textContent = message; $('status').className = kind || ''; }
  function controls() { $('save').disabled = !loaded || busy || !dirty(); $('undo').disabled = !loaded || busy || !history.length; fields.disabled = !loaded || busy; }
  function snapshot() { history.push(clone(draft)); if (history.length > 80) history.shift(); }
  function update() { PPMagazine.render($('preview'),draft,true); controls(); }
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
        const input = document.createElement('input'); input.value = p[key] || ''; input.maxLength = max;
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
      const result=await api('/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)});
      draft={...clone(PPMagazine.empty),...result};saved=clone(draft);fill();
      status('Saved and published. Public pages may take a moment to refresh.','success');
    } catch(error) {status(error.message,'error');}
    finally {busy=false;controls();}
  }
  $('save').addEventListener('click',save);form.addEventListener('submit',e=>{e.preventDefault();save();});
  window.addEventListener('beforeunload',e=>{if(dirty()||busy){e.preventDefault();e.returnValue='';}});
  api('').then(result=>{draft={...clone(PPMagazine.empty),...result};if(!Array.isArray(draft.photos))draft.photos=[];saved=clone(draft);loaded=true;fill();status(draft.title?'Published article loaded. Edit, then save to publish.':'Ready for your first article. Nothing publishes until you save.');}).catch(error=>{status(error.message+' Reload this page to retry.','error');update();});
  update();
})();
