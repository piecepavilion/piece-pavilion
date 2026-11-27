(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const endpoint = '/employees/api/magazine/feature';
  const lists = {blog:[],newsroom:[]};
  const selection = {blog:'',newsroom:''};
  const summaries = new Map();
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
    const key=kind+':'+id, original=String(chosen.summary || chosen.dek || '').trim();
    if(kind==='blog') PPFeatured.renderBlog(root,chosen);
    else{
      root.setAttribute('data-pp-magazine','preview');
      PPMagazine.render(root,chosen,false);
      root.removeAttribute('data-pp-magazine');
    }
    for(const link of root.querySelectorAll('a')) link.removeAttribute('href');
    const heading=root.querySelector('.pp-magazine-heading');
    const field=document.createElement('textarea');
    field.id='summary';field.className='pp-magazine-dek';field.rows=2;field.maxLength=300;
    field.setAttribute('aria-label','Edit text under the featured headline');
    field.setAttribute('aria-describedby','summary-help');
    field.placeholder='Tap here to add text to the card';
    field.value=summaries.has(key)?summaries.get(key):original;
    const dek=heading.querySelector('.pp-magazine-dek');
    if(dek) dek.replaceWith(field);
    else heading.querySelector('h2').after(field);
    const count=()=>{$('summary-count').textContent=Math.min(field.value.length,300)+'/300';resizeText(field);};
    field.addEventListener('input',()=>{
      if(field.value.length>300) field.value=field.value.slice(0,300);
      summaries.set(key,field.value);count();
    });
    count();
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
      summaries.clear();
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
  $('reset-summary').addEventListener('click',()=>{
    summaries.delete($('kind').value+':'+$('story').value);
    refreshSummary();
    $('summary')?.focus();
  });
  window.addEventListener('resize',()=>{if($('summary')) resizeText($('summary'));});
  $('caption').addEventListener('input',()=>{$('count').textContent=$('caption').value.length+'/300';});
  $('reload').addEventListener('click',load);
  $('form').addEventListener('submit',async event=>{
    event.preventDefault();
    if($('publish').disabled) return;
    const kind=$('kind').value;
    const change={kind,id:kind==='hidden'?'':$('story').value,caption:$('caption').value,summary:kind==='hidden'?'':(summaries.get(kind+':'+$('story').value)||''),updatedAt:state.updatedAt};
    busy=true;canPublish();status('Publishing…');
    try{
      const saved=await json(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(change)});
      if(saved.kind!==change.kind||saved.id!==change.id||saved.summary!==change.summary.trim()||typeof saved.updatedAt!=='string') throw new Error('Could not confirm the change. Reload to check the live setting.');
      state=saved;showLive();
      status(kind==='hidden'?'Saved. The featured story spot is hidden.':'Saved. Your selection will appear on the public homepage.');
    }catch(error){status(error.message,true);}
    finally{busy=false;canPublish();}
  });
  load();
})();
