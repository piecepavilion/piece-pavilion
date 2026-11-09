'use strict';
const $=id=>document.getElementById(id);
let busy=false, loaded=false, dirty=false, target=null;
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function linkConfig(labelId,urlId,phase){
 const rawLabel=$(labelId).value,rawUrl=$(urlId).value;
 const label=rawLabel.trim(),url=rawUrl.trim();
 if(/[<>\u0000-\u001f\u007f]/.test(rawLabel)||label.length>80)throw Error(phase+' link name must be plain text, at most 80 characters, without angle brackets or control characters.');
 if(/[\u0000-\u001f\u007f]/.test(rawUrl)||url.length>2048)throw Error(phase+' link URL must be at most 2048 characters without control characters.');
 if(Boolean(label)!==Boolean(url))throw Error(phase+' link needs both a name and URL, or leave both blank.');
 if(url){let parsed;try{parsed=new URL(url);}catch{throw Error(phase+' link needs a full http:// or https:// URL.');}
 if(!/^https?:\/\//i.test(url)||!['http:','https:'].includes(parsed.protocol)||!parsed.hostname||parsed.username||parsed.password)throw Error(phase+' link needs an HTTP(S) URL without a username or password.');}
 return {label,url};
}
function config(){
 const timeZone=$('zone').value.trim();
 try{new Intl.DateTimeFormat('en',{timeZone}).format();}catch{throw Error('Enter a valid IANA time zone, such as America/New_York.');}
 if(!timeZone)throw Error('Enter a time zone.');
 const enabled=$('enabled').checked,title=$('title').value.trim(),afterTitle=$('afterTitle').value.trim(),message=$('message').value.trim(),afterMessage=$('afterMessage').value.trim();
 for(const [label,value,limit] of [['Headline during countdown',title,120],['Headline after countdown',afterTitle,120],['Text during countdown',message,600],['Text after countdown',afterMessage,600],['Time zone',timeZone,100]]){if(value.length>limit)throw Error(label+' is too long.');if(/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw Error(label+' must be plain text without angle brackets.');}
 if(enabled&&!title)throw Error('Add a title before enabling the countdown.');
 const date=$('date').value,time=$('time').value;
 if((enabled||date||time)&&(!date||!time))throw Error('Choose both a target date and time.');
 const during=linkConfig('linkLabel','linkUrl','During-countdown'),after=linkConfig('afterLinkLabel','afterLinkUrl','After-countdown');
 return {enabled,heartsEnabled:$('heartsEnabled').checked,title,afterTitle,message,afterMessage,linkLabel:during.label,linkUrl:during.url,afterLinkLabel:after.label,afterLinkUrl:after.url,timeZone,endsAt:date&&time?CountdownTime.toInstant(date,time,timeZone):null};
}
async function api(path,body){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 try{
 const r=await fetch('/employees/api/countdown/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:controller.signal});
 if(r.status===401||r.status===403)throw Error('Your staff session has expired. Sign in again, then reload settings.');
 let data;try{data=await r.json();}catch{throw Error('Could not read the server response. Reload settings to check the saved state.');}
 if(!r.ok||data.ok===false)throw Error(data.error||'Request failed. Reload settings to check the saved state.');
 return data;
 }catch(e){if(e.name==='AbortError')throw Error('The request timed out. Its outcome is unknown; reload settings before trying again.');throw e;}finally{clearTimeout(timeout);}
}
function setBusy(value){busy=value;$('fields').disabled=value||!loaded;$('retry').disabled=value;}
function showLive(p){$('live').textContent=p&&p.enabled?'Currently published: countdown enabled'+(p.title?' · '+p.title:''):'Currently published: carousel (countdown disabled)';}
function fill(c){c=c||{};$('enabled').checked=c.enabled===true;$('heartsEnabled').checked=c.heartsEnabled!==false;$('title').value=c.title||'';$('afterTitle').value=c.afterTitle||'';$('message').value=c.message||'';$('afterMessage').value=c.afterMessage||'';['linkLabel','linkUrl','afterLinkLabel','afterLinkUrl'].forEach(id=>$(id).value=typeof c[id]==='string'?c[id]:'');$('zone').value=c.timeZone||'UTC';$('date').value='';$('time').value='';if(c.endsAt){const local=CountdownTime.localFields(c.endsAt,$('zone').value);$('date').value=local.date;$('time').value=local.time;}dirty=false;preview();}
async function load(){if(busy)return;setBusy(true);$('retry').hidden=true;try{const data=await api('get');fill(data.draft||data.published);showLive(data.published);loaded=true;status('Saved settings loaded.');}catch(e){status(e.message,true);$('retry').hidden=false;}finally{setBusy(false);}}
function preview(){
 $('previewTitle').textContent=$('title').value.trim()||'Countdown title';$('previewMessage').textContent=$('message').value;$('preview').classList.toggle('off',!$('enabled').checked);
 try{const c=config();target=c.endsAt?Date.parse(c.endsAt):null;$('previewNote').textContent=!c.enabled?'Disabled draft: publishing will show the carousel.':c.endsAt?'Target: '+new Date(c.endsAt).toLocaleString(undefined,{timeZone:c.timeZone,timeZoneName:'short'})+'.':'';}catch(e){target=null;$('previewNote').textContent=e.message;}tick();
}
function tick(){
 $('previewHeart').hidden=!$('heartsEnabled').checked;
 const after=$('previewState').value==='after'||($('previewState').value==='auto'&&target!==null&&target<=Date.now());
 $('previewTitle').textContent=after?($('afterTitle').value.trim()||'Countdown complete'):($('title').value.trim()||'Countdown title');
 $('previewMessage').textContent=after?($('afterMessage').value.trim()||'Countdown complete. Check for updates.'):$('message').value;
 const link=$('previewLink');link.hidden=true;link.removeAttribute('href');link.textContent='';
 try{const c=linkConfig(after?'afterLinkLabel':'linkLabel',after?'afterLinkUrl':'linkUrl',after?'After-countdown':'During-countdown');if(c.url){link.href=c.url;link.textContent=c.label;link.hidden=false;}}catch{}
 const total=after||target===null?0:Math.max(0,Math.ceil((target-Date.now())/1000));const values=[Math.floor(total/86400),Math.floor(total/3600)%24,Math.floor(total/60)%60,total%60];['days','hours','minutes','seconds'].forEach((id,i)=>$(id).textContent=String(values[i]).padStart(2,'0'));
}
async function write(publish){if(busy||!loaded)return;let c;try{c=config();}catch(e){status(e.message,true);return;}setBusy(true);status(publish?'Publishing…':'Saving draft…');try{await api(publish?'publish':'save',c);dirty=false;if(publish)showLive(c);status(publish?(c.enabled?'Published. The homepage countdown is enabled.':'Published. The homepage carousel is restored.'):'Draft saved. The live homepage is unchanged.');}catch(e){status(e.message,true);$('retry').hidden=false;}finally{setBusy(false);}}
$('previewState').addEventListener('change',tick);
$('form').addEventListener('input',()=>{dirty=true;preview();status('Unsaved draft changes.');});$('form').addEventListener('submit',event=>{event.preventDefault();write(true);});$('save').addEventListener('click',()=>write(false));$('retry').addEventListener('click',()=>{if(!dirty||confirm('Reload saved settings and discard unsaved changes?'))load();});window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});setInterval(tick,1000);load();


