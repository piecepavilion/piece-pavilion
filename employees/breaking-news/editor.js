(function () {
'use strict';
const BLOG_ORIGIN='https://piecepavilion.com',DEFAULT_BACKGROUND='#862d3c';
function safeUrl(raw, httpsOnly=false) {
 if (!raw) return '';
 if (raw.length > 2048 || /\s|[<>\\\u0000-\u001f\u007f-\u009f]/.test(raw)) throw Error('Use a full '+(httpsOnly?'HTTPS':'HTTP or HTTPS')+' URL without spaces, angle brackets or backslashes (up to 2,048 characters).');
 let url;try {url=new URL(raw);}catch {throw Error('Use a full '+(httpsOnly?'HTTPS':'HTTP or HTTPS')+' URL.');}
 if (!/^https?:\/\//i.test(raw)||(httpsOnly?url.protocol!=='https:':!['http:','https:'].includes(url.protocol))||!url.hostname||url.username||url.password) throw Error('Use a full '+(httpsOnly?'HTTPS':'HTTP or HTTPS')+' URL without a username or password.');
 return raw;
}
function validBlogUrl(raw,origin=BLOG_ORIGIN) {
 safeUrl(raw,true);const url=new URL(raw);
 if(url.origin!==new URL(origin).origin||!/^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(url.pathname)||url.search||url.hash)throw Error('Choose a published blog from this website.');
 return url.href;
}
function cloneBlog(blog){return blog?{...blog,imageText:blog.imageText??'',linkLabel:blog.linkLabel??'Read article'}:null;}
function blogCustomized(blog,source){if(!blog)return false;if(!source)return true;const a=cloneBlog(blog),b=cloneBlog(source);return ['title','excerpt','imageUrl','imageAlt','imageText','linkLabel'].some(key=>a[key]!==b[key]);}
function validateBlog(blog,origin=BLOG_ORIGIN) {
 if(!blog||typeof blog!=='object')throw Error('Choose a blog before enabling Breaking News.');
 for(const [name,max] of [['title',200],['excerpt',1200],['imageAlt',200]])if(typeof blog[name]!=='string'||blog[name].length>max||/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(blog[name]))throw Error('The selected blog has invalid '+name+'. Refresh the blog list and select it again.');
 for(const [name,max] of [['imageText',120],['linkLabel',80]])if(blog[name]!==undefined&&(typeof blog[name]!=='string'||blog[name].length>max||/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(blog[name])))throw Error('Blog '+name+' must be plain text, up to '+max+' characters.');
 if(!blog.title.trim())throw Error('The selected blog needs a title.');
 validBlogUrl(blog.url,origin);safeUrl(blog.imageUrl,true);
 if(blog.imageUrl&&!blog.imageAlt.trim())throw Error('The selected blog image needs a description.');
 return blog;
}
function extractBlogs(doc,origin=BLOG_ORIGIN) {
 const clean=(text,max)=>(text||'').replace(/[<>\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
 const blogs=new Map();
 for(const card of doc.querySelectorAll('a.blog-card')){try{
  const url=validBlogUrl(new URL(card.getAttribute('href'),origin).href,origin),title=clean(card.querySelector('h2')?.textContent,200);
  const rawImage=card.querySelector('img')?.getAttribute('src'),imageUrl=rawImage?new URL(rawImage,origin).href:'';
  const blog={title,excerpt:clean(card.querySelector('p')?.textContent,1200),url,imageUrl,imageAlt:title,imageText:'',linkLabel:'Read article'};validateBlog(blog,origin);blogs.set(url,blog);
 }catch{}}
 return [...blogs.values()];
}
function validate(c,origin=BLOG_ORIGIN) {
 for (const [key,label,max] of [['message','Text',1200],['imageAlt','Image description',200],['linkLabel','Link name',80]]) {
  if(typeof c[key]!=='string'||c[key].length>max||/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(c[key])) throw Error(label+' must be plain text, up to '+max+' characters, without angle brackets or control characters.');
 }
 if(c.title!==undefined&&(typeof c.title!=='string'||c.title.length>200||/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(c.title)))throw Error('Your title must be plain text, up to 200 characters.');
 if(c.imageText!==undefined&&(typeof c.imageText!=='string'||c.imageText.length>120||/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(c.imageText)))throw Error('Text on image must be plain text, up to 120 characters.');
 if(c.textColor!==undefined&&c.textColor!==''&&(typeof c.textColor!=='string'||!/^#[0-9a-f]{6}$/i.test(c.textColor)))throw Error('Choose automatic text color or a six-digit hex color, such as #ffffff.');
 if(c.backgroundColor!==undefined&&(typeof c.backgroundColor!=='string'||!/^#[0-9a-f]{6}$/i.test(c.backgroundColor)))throw Error('Choose a background color in six-digit hex format, such as #862d3c.');
 if(c.motionEnabled!==undefined&&typeof c.motionEnabled!=='boolean')throw Error('Choose whether to enable heading motion.');
 if(typeof c.enabled!=='boolean'||typeof c.heartsEnabled!=='boolean')throw Error('Choose whether to show Breaking News and its heart.');
 if(!Number.isInteger(c.imageWidth)||c.imageWidth<20||c.imageWidth>100)throw Error('Choose an image width between 20% and 100%.');
 safeUrl(c.imageUrl,true);safeUrl(c.linkUrl);
 if(Boolean(c.linkLabel)!==Boolean(c.linkUrl))throw Error('Add both a link name and URL, or leave both blank.');
 if(c.imageUrl&&!c.imageAlt.trim())throw Error('Add an image description for visitors using a screen reader.');
 if(c.contentType!==undefined&&!['custom','blog'].includes(c.contentType))throw Error('Choose Custom writing or Feature a blog.');
 if(c.blog)validateBlog(c.blog,origin);
 if(c.contentType==='blog'&&c.enabled&&!c.blog)throw Error('Choose a blog before enabling Breaking News.');
 if(c.contentType!=='blog'&&c.enabled&&!(c.title||'').trim()&&!c.message.trim()&&!c.imageUrl)throw Error('Add text or an image before enabling Breaking News.');
 return c;
}
if(typeof module!=='undefined'&&module.exports){module.exports={validate,safeUrl,validateBlog,validBlogUrl,extractBlogs,cloneBlog,blogCustomized};return;}
const $=id=>document.getElementById(id), names=['title','message','imageUrl','imageAlt','imageText','linkLabel','linkUrl'],blogNames={blogTitle:'title',blogExcerpt:'excerpt',blogImageUrl:'imageUrl',blogImageAlt:'imageAlt',blogImageText:'imageText',blogLinkLabel:'linkLabel'};
let busy=false,loaded=false,dirty=false,uncertain=false,blogBusy=false,blogsLoaded=false,selectedBlog=null,blogs=[];
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function controls(){ $('fields').disabled=busy||!loaded;for(const id of ['save','publish','upload','blogUpload'])$(id).disabled=busy||!loaded||uncertain;$('reload').disabled=busy;$('customFields').disabled=$('contentType').value==='blog';$('customFields').hidden=$('contentType').value==='blog';$('blogControls').hidden=$('contentType').value!=='blog';$('refreshBlogs').disabled=busy||!loaded||blogBusy;$('blogSelect').disabled=busy||!loaded||blogBusy;$('blogFields').disabled=busy||!loaded||!selectedBlog;$('blogFields').hidden=!selectedBlog;$('resetBlog').disabled=busy||!loaded||blogBusy||!selectedBlog||!blogs.some(blog=>blog.url===selectedBlog.url); }
function config(){const c={textColor:$('autoTextColor').checked?'':$('textColor').value,backgroundColor:$('backgroundColor').value,motionEnabled:$('motionEnabled').checked,contentType:$('contentType').value,blog:selectedBlog,enabled:$('enabled').checked,heartsEnabled:$('heartsEnabled').checked,imageWidth:Number($('imageWidth').value)};for(const name of names)c[name]=$(name).value.trim();return c;}
function preview(){
 const c=config();$('colorValue').textContent=c.backgroundColor;$('motionYes').setAttribute('aria-pressed',String(c.motionEnabled));$('motionNo').setAttribute('aria-pressed',String(!c.motionEnabled));$('widthValue').textContent=c.imageWidth+'%';
 if($('autoTextColor').checked)$('textColor').value=window.PPBreakingNews.palette(c.backgroundColor,'').ink;
 $('textColorValue').textContent=$('textColor').value+($('autoTextColor').checked?' (automatic)':'');
 const contrast=c.textColor?window.PPBreakingNews.textContrast(c.backgroundColor,c.textColor):null;
 $('textContrastWarning').hidden=!(c.textColor&&contrast<4.5);
 $('textContrastWarning').textContent=c.textColor&&contrast<4.5?'Low contrast: this text color may be hard to read on your background. Choose a clearer color or use automatic readable text color.':'';
 window.PPBreakingNews.applyPalette($('appearancePreview'),c.backgroundColor,c.textColor);
 $('appearancePreview').classList.toggle('breaking-motion',c.motionEnabled);
 const reduced=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 $('motionStatus').textContent=(c.motionEnabled?'On (preview below)':'Off')+(reduced?' · Reduced motion is enabled on your device; the heading stays still.':'');
 window.PPBreakingNews.render($('preview'),c);
 $('previewHeart').hidden=!c.heartsEnabled;
 $('previewNote').textContent=c.enabled?'Publishing this draft replaces the homepage countdown.':'Off: publishing restores your existing countdown or carousel. The draft card is shown below.';
}
function edited(){dirty=true;preview();status(uncertain?'Changes kept here. Reload saved settings to check the last request before saving again.':'Unsaved draft changes.');}
function showLive(c){$('live').textContent=c&&c.enabled?'Currently published: Breaking News.':'Currently published: Breaking News off. Existing countdown or carousel is shown.';}
function fill(c){c=c||{};$('autoTextColor').checked=!(typeof c.textColor==='string'&&/^#[0-9a-f]{6}$/i.test(c.textColor));if(!$('autoTextColor').checked)$('textColor').value=c.textColor.toLowerCase();$('backgroundColor').value=typeof c.backgroundColor==='string'&&/^#[0-9a-f]{6}$/i.test(c.backgroundColor)?c.backgroundColor.toLowerCase():DEFAULT_BACKGROUND;$('contentType').value=c.contentType==='blog'?'blog':'custom';selectedBlog=cloneBlog(c.blog);blogOptions();fillBlog();for(const name of names)$(name).value=typeof c[name]==='string'?c[name]:'';$('enabled').checked=c.enabled===true;$('motionEnabled').checked=c.motionEnabled===true;$('heartsEnabled').checked=c.heartsEnabled!==false;$('imageWidth').value=Number.isInteger(c.imageWidth)?c.imageWidth:100;dirty=false;preview();}
async function request(path,body,upload=false){
 const writing=body!==undefined,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{
  const response=await fetch(path,{method:writing?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:writing&&!upload?{'Content-Type':'application/json'}:{},body:writing?(upload?body:JSON.stringify(body)):undefined,signal:controller.signal});
  if(response.status===401||response.status===403){loaded=false;throw Object.assign(Error('Your staff session has expired. Sign in again at /employees/ in a new tab, then reload saved settings. Copy any unsaved text first.'),{known:true});}
  if(!response.ok){let detail;try{detail=await response.json();}catch{}throw Object.assign(Error(detail&&detail.error||'The server could not complete this request.'),{known:response.status<500});}
  const data=await response.json();
  if(data.ok===false)throw Object.assign(Error(data.error||'Request was rejected.'),{known:true});
  if(writing&&!upload&&(data.ok!==true||!data.saved))throw Error('The saved response could not be confirmed.');
  return data;
 }catch(error){
  if(writing&&!error.known){uncertain=true;throw Error('The request outcome is unknown'+(error.name==='AbortError'?' (timed out)':'')+'. Your typed changes are kept. Reload saved settings before trying again.');}
  if(error.name==='AbortError')throw Error('Loading timed out. Try Reload saved settings.');
  throw error;
 }finally{clearTimeout(timer);}
}
async function load(){
 if(busy)return;busy=true;controls();status('Loading saved settings…');
 try{const data=await request('/employees/api/countdown/breaking-news/get');if(!Object.hasOwn(data,'draft')||!Object.hasOwn(data,'published'))throw Error('Could not read saved settings. Try Reload saved settings.');fill(data.draft||data.published);showLive(data.published);loaded=true;uncertain=false;status('Saved settings loaded.');}
 catch(error){loaded=false;status(error.message,true);}finally{busy=false;controls();}
 if(loaded&&$('contentType').value==='blog'&&!blogsLoaded)loadBlogs();
}
async function write(publish){
 if(busy||!loaded||uncertain)return;let c;try{c=validate(config(),BLOG_ORIGIN);}catch(error){status(error.message,true);return;}
 busy=true;controls();status(publish?'Publishing…':'Saving draft…');
 try{const result=await request('/employees/api/countdown/breaking-news/'+(publish?'publish':'save'),c);dirty=false;if(publish)showLive(result.published||c);status(publish?(c.enabled?'Published. Breaking News is now on the homepage.':'Published. Your existing countdown or carousel is restored.'):'Draft saved. The live homepage is unchanged.');}
 catch(error){status(error.message,true);}finally{busy=false;controls();}
}
async function upload(forBlog=false){
 const input=$(forBlog?'blogUpload':'upload'),file=input.files[0];if(!file||busy||!loaded||uncertain||(forBlog?(!selectedBlog||$('contentType').value!=='blog'):$('contentType').value==='blog'))return;
 if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)||file.size>8*1024*1024||file.size===0){status('Choose a JPG, PNG, WebP or GIF image, up to 8 MB.',true);input.value='';return;}
 busy=true;controls();status('Uploading image…');
 try{const body=new FormData();body.append('file',file);const data=await request('/employees/api/magazine/upload',body,true);if(typeof data.url!=='string'||!/^\/magazine\/img\/[a-zA-Z0-9-]+$/.test(data.url))throw Error('The upload returned an invalid image URL.');const url=new URL(data.url,location.origin).href;if(forBlog){selectedBlog.imageUrl=url;fillBlog();}else $('imageUrl').value=url;dirty=true;preview();status('Image uploaded. Add a description, then Save draft or Publish.');}
 catch(error){status(error.message,true);}finally{input.value='';busy=false;controls();}
}
function fillBlog(){
 for(const [id,key] of Object.entries(blogNames))$(id).value=selectedBlog?selectedBlog[key]||'':'';
 const link=$('blogDestination');link.textContent=selectedBlog?selectedBlog.url:'';if(selectedBlog){try{link.href=validBlogUrl(selectedBlog.url);}catch{link.removeAttribute('href');}}else link.removeAttribute('href');
}
function blogOptions(){
 const select=$('blogSelect');select.replaceChildren();
 function option(value,label){const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);}
 option('','Choose a blog…');
 if(selectedBlog&&!blogs.some(blog=>blog.url===selectedBlog.url))option(selectedBlog.url,selectedBlog.title+' (saved selection)');
 for(const blog of blogs)option(blog.url,blog.title);
 select.value=selectedBlog?selectedBlog.url:'';
}
async function loadBlogs(){
 if(blogBusy||busy||!loaded)return;blogBusy=true;controls();$('blogStatus').textContent='Loading published blogs…';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{
  const response=await fetch('/blog/',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
  if(!response.ok)throw Error('Could not load the published blog list.');
  const parsed=new DOMParser().parseFromString(await response.text(),'text/html');
  const found=extractBlogs(parsed,BLOG_ORIGIN);
  if(!found.length)throw Error('No published blogs could be read from the list.');
  blogs=found;blogsLoaded=true;blogOptions();
  $('blogStatus').textContent=selectedBlog?'Published blogs loaded. Your selected blog snapshot is kept until you choose an article again.':'Choose an article. Nothing is selected automatically.';
 }catch(error){$('blogStatus').textContent=(error.name==='AbortError'?'Loading blogs timed out.':error.message)+' Your saved selection and custom writing are kept. Use Refresh blog list to retry.';}
 finally{clearTimeout(timer);blogBusy=false;controls();}
}
if(typeof window.matchMedia==='function'){const media=window.matchMedia('(prefers-reduced-motion: reduce)');if(typeof media.addEventListener==='function')media.addEventListener('change',()=>{if(loaded)preview();});}
$('resetColor').addEventListener('click',()=>{if(busy||!loaded)return;$('backgroundColor').value=DEFAULT_BACKGROUND;edited();});
for(const [id,value] of [['motionYes',true],['motionNo',false]])$(id).addEventListener('click',()=>{if(busy||!loaded)return;$('motionEnabled').checked=value;edited();});
$('contentType').addEventListener('change',()=>{controls();edited();if($('contentType').value==='blog'&&!blogsLoaded)loadBlogs();});
$('blogSelect').addEventListener('change',()=>{
 const url=$('blogSelect').value;if(selectedBlog&&selectedBlog.url===url)return;
 if(selectedBlog&&blogCustomized(selectedBlog,blogs.find(blog=>blog.url===selectedBlog.url))&&!confirm('Replace your customized homepage blog card with the selected article? Your custom writing and original blog articles will not change.')){$('blogSelect').value=selectedBlog.url;return;}
 selectedBlog=cloneBlog(blogs.find(blog=>blog.url===url));fillBlog();controls();edited();
});
$('resetBlog').addEventListener('click',()=>{const source=selectedBlog&&blogs.find(blog=>blog.url===selectedBlog.url);if(!source||busy||!loaded)return;if(blogCustomized(selectedBlog,source)&&!confirm('Reset this homepage blog card to the article defaults? Your card edits will be replaced; the original blog will not change.'))return;selectedBlog=cloneBlog(source);fillBlog();edited();});
$('refreshBlogs').addEventListener('click',loadBlogs);
$('form').addEventListener('input',event=>{const id=event.target.id;if(id==='textColor')$('autoTextColor').checked=false;if(id==='upload'||id==='blogUpload'||id==='blogSelect')return;if(selectedBlog&&blogNames[id])selectedBlog[blogNames[id]]=event.target.value;edited();});
$('form').addEventListener('submit',event=>{event.preventDefault();write(true);});
$('save').addEventListener('click',()=>write(false));$('upload').addEventListener('change',()=>upload(false));$('blogUpload').addEventListener('change',()=>upload(true));
$('reload').addEventListener('click',()=>{if(!dirty||confirm('Reload saved settings and discard your unsaved changes?'))load();});
window.addEventListener('beforeunload',event=>{if(dirty||busy||uncertain){event.preventDefault();event.returnValue='';}});
load();
})();
