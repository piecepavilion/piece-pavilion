(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const endpoint = '/employees/api/magazine/feature';
  const lists = {blog:[],newsroom:[]};
  const selection = {blog:'',newsroom:''};
  const summaries = new Map(), cards = new Map();
  let state, busy=false, loaded=false, failures=[];
  function status(message,error=false){
    $('status').dataset.error=String(error);
    $('status').textContent=message;
  }
  async function json(url,options={}) {
    const res=await fetch(url,{cache:'no-store',credentials:'same-origin',...options});
    const value=await res.json().catch(()=>null);
    if(!res.ok || !value) throw new Error(value?.error || (res.status===401||res.status===403?'Open Staff and sign in again.':'The feature settings are unavailable. Try reloading.'));
    return value;
  }
  function canPublish(){
    const kind=$('kind').value;
    $('publish').disabled=!loaded||busy||(kind!=='hidden'&&!lists[kind]?.some(item=>item.id===$('story').value));
    $('fields').disabled=!loaded||busy;
    $('reload').disabled=busy;
  }
  function resizeText(field){
    field.style.height='auto';
    field.style.height=Math.max(52,field.scrollHeight+2)+'px';
  }
  function refreshSummary(){
    const kind=$('kind').value, id=$('story').value;
    const chosen=lists[kind]?.find(item=>item.id===id);
    const root=$('story-preview');
    root.replaceChildren();
    $('preview-block').hidden=!chosen;
    if(!chosen) return;
    const key=kind+':'+id;
    if(!cards.has(key)) cards.set(key,{});
    const card=cards.get(key);
    if(kind==='blog') PPFeatured.renderBlog(root,chosen);
    else{
      root.setAttribute('data-pp-magazine','preview');
      PPMagazine.render(root,chosen,false);
      root.removeAttribute('data-pp-magazine');
    }
    const originalImageAlt=root.querySelector('.pp-magazine-lead img')?.alt||'';
    const originalImageCaption=root.querySelector('.pp-magazine-lead figcaption')?.textContent.trim()||'';
    PPFeatured.applyCover(root,card);
    const slots=PPFeatured.cardElements(root,kind,true);
    for(const link of root.querySelectorAll('a')) link.removeAttribute('href');
    function fieldFor(k, original){
      const [label,limit]=PPFeatured.cardFields[k];
      const field=document.createElement(k==='summary'?'textarea':'input');
      if(k==='summary'){field.id='summary';field.rows=2;field.className='pp-magazine-dek';}
      else field.type='text';
      field.classList.add('pp-card-field');
      field.maxLength=limit;
      field.setAttribute('aria-label','Edit '+label.toLowerCase());
      field.title=label;
      field.placeholder=label;
      field.value=k==='summary'?(summaries.get(key)??original):(card[k]??original);
      if(k==='summary')field.setAttribute('aria-describedby','summary-help');
      const update=()=>{
        if(k==='summary'){
          summaries.set(key,field.value);resizeText(field);
        }else if(field.value===original)delete card[k];
        else card[k]=field.value;
      };
      field.addEventListener('input',update);
      return field;
    }
    for(const [k,el] of Object.entries(slots)){
      if(!el) continue;
      let original=el.textContent.trim();
      if(k==='mastLeft' && kind==='newsroom'){
        const b=el.querySelector('b');
        if(b)original=el.firstChild?.nodeValue?.trim()||original;
      }
      if(k==='mastRight' && kind==='newsroom'){
        const b=slots.mastLeft.querySelector('b');
        const label=original || b?.textContent.trim() || 'NEWSROOM';
        if(b)b.remove();
        original=label;
      }
      const field=fieldFor(k,original);
      if(k==='summary')el.replaceWith(field);
      else el.replaceChildren(field);
    }
    const lead=root.querySelector('.pp-magazine-lead');
    const imageArea=lead.querySelector('figure')||document.createElement('figure');
    if(!imageArea.isConnected){imageArea.className='pp-magazine-photo pp-empty-cover';lead.append(imageArea);lead.classList.add('has-image');}
    const picker=document.createElement('input');picker.type='file';picker.accept='image/png,image/jpeg,image/webp,image/gif';picker.hidden=true;
    picker.addEventListener('change',async()=>{
      const file=picker.files[0];if(!file)return;
      if(file.size>8*1024*1024){status('Choose an image under 8 MB.',true);return;}
      busy=true;canPublish();status('Uploading cover…');
      try{
        const form=new FormData();form.append('file',file);
        const result=await json('/employees/api/magazine/upload',{method:'POST',body:form});
        if(!/^\/magazine\/img\/[a-f0-9-]{36}$/.test(result.url||''))throw new Error('The cover upload could not be confirmed.');
        card.coverImage=result.url;refreshSummary();status('Cover added to this preview. It is not on the homepage until you publish.');
      }catch(error){status(error.message,true);}
      finally{busy=false;canPublish();}
    });
    const image=imageArea.querySelector('img');
    const coverPicker=document.createElement('label');
    coverPicker.className='pp-cover-picker';
    coverPicker.setAttribute('role','button');
    coverPicker.setAttribute('aria-label',image?'Replace cover image':'Add cover image');
    coverPicker.tabIndex=0;
    coverPicker.title=image?'Tap to replace the cover image':'Tap to add a cover image';
    coverPicker.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();picker.click();}
    });
    if(image){image.before(coverPicker);coverPicker.append(image);}
    else imageArea.prepend(coverPicker);
    coverPicker.htmlFor='feature-cover-input';
    picker.id='feature-cover-input';
    const existing=imageArea.querySelector('figcaption');
    const coverCaption=fieldFor('coverCaption',originalImageCaption);
    const coverAlt=fieldFor('coverAlt',originalImageAlt);
    if(existing)existing.replaceWith(coverCaption);else imageArea.append(coverCaption);
    imageArea.append(coverAlt,picker);
    resizeText($('summary'));
  }
  function refresh(){
    const kind=$('kind').value;
    $('details').hidden=kind==='hidden';
    const story=$('story'); story.replaceChildren();
    if(kind!=='hidden'){
      story.add(new Option('Choose a published story',''));
      for(const item of lists[kind]) story.add(new Option(item.title,item.id));
      story.value=selection[kind]||'';
      if(!story.value) story.selectedIndex=0;
    }
    $('count').textContent=$('caption').value.length+'/300';
    refreshSummary();
    canPublish();
  }
  function showLive(){
    const title=lists[state.kind]?.find(item=>item.id===state.id)?.title;
    $('live').textContent=state.kind==='hidden'?'Live: this spot is hidden.'
      :state.kind==='default'?'Live: the current Newsroom setting still controls this spot until you publish a choice.'
      :title?'Live: '+title:'Saved story is currently unavailable in the public list.';
  }
  async function load(){
    busy=true;canPublish();status('Loading settings and published stories…');
    try{
      const [settings,blog,news]=await Promise.allSettled([json(endpoint),PPFeatured.blogs(),json('/magazine/pages.json')]);
      if(settings.status!=='fulfilled') throw settings.reason;
      state=settings.value;
      summaries.clear();cards.clear();
      if(state.card) cards.set(state.kind+':'+state.id,{...state.card});
      if(state.summary) summaries.set(state.kind+':'+state.id,state.summary);
      lists.blog=blog.status==='fulfilled'?blog.value:[];
      const newsValue=news.status==='fulfilled'?news.value:null;
      lists.newsroom=Array.isArray(newsValue?.pages)?newsValue.pages.filter(page=>typeof page.id==='string'&&typeof page.title==='string'&&page.title.trim()):[];
      failures=[...(blog.status==='rejected'?['blog']:[]),...(!newsValue?['Newsroom']:[])];
      selection.blog=state.kind==='blog'?state.id:'';
      selection.newsroom=state.kind==='newsroom'?state.id:(state.kind==='default'?newsValue?.layout?.homepageId||'':'');
      $('kind').value=state.kind==='default'?'newsroom':state.kind;
      $('caption').value=state.caption||'';
      loaded=true;showLive();refresh();
      status(failures.length?'Could not load '+failures.join(' and ')+' choices. You can still hide the spot or use a loaded list.': '',!!failures.length);
    }catch(error){loaded=false;$('live').textContent='Live setting could not be loaded.';status(error.message,true);}
    finally{busy=false;canPublish();}
  }
  $('kind').addEventListener('change',refresh);
  $('story').addEventListener('change',()=>{selection[$('kind').value]=$('story').value;refreshSummary();canPublish();});
  window.addEventListener('resize',()=>{if($('summary')) resizeText($('summary'));});
  $('caption').addEventListener('input',()=>{$('count').textContent=$('caption').value.length+'/300';});
  $('reload').addEventListener('click',load);
  $('form').addEventListener('submit',async event=>{
    event.preventDefault();
    if($('publish').disabled) return;
    const kind=$('kind').value;
    const change={kind,id:kind==='hidden'?'':$('story').value,caption:$('caption').value,summary:kind==='hidden'?'':(summaries.get(kind+':'+$('story').value)||''),card:kind==='hidden'?{}:(cards.get(kind+':'+$('story').value)||{}),updatedAt:state.updatedAt};
    busy=true;canPublish();status('Publishing…');
    try{
      const saved=await json(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(change)});
      if(saved.kind!==change.kind||saved.id!==change.id||saved.summary!==change.summary.trim()||!saved.card||typeof saved.updatedAt!=='string') throw new Error('Could not confirm the change. Reload to check the live setting.');
      state=saved;showLive();
      status(kind==='hidden'?'Saved. The featured story spot is hidden.':'Saved. Your selection will appear on the public homepage.');
    }catch(error){status(error.message,true);}
    finally{busy=false;canPublish();}
  });
  load();
})();
