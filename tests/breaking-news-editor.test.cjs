'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {validate,safeUrl,validateBlog,extractBlogs}=require('../employees/breaking-news/editor.js');
const defaults=()=>({enabled:false,message:'',imageUrl:'',imageAlt:'',imageWidth:100,linkLabel:'',linkUrl:'',heartsEnabled:true});
test('defaults and full card validation',()=>{assert.deepEqual(validate(defaults()),defaults());assert.ok(validate({...defaults(),enabled:true,message:'New!\nDetails',imageUrl:'https://example.org/a.png',imageAlt:'Bricks',imageWidth:20,linkLabel:'More',linkUrl:'http://example.org'}));});
test('rejects invalid image sizes, URLs, empty enabled cards, unmatched links, missing alt and markup',()=>{
 for(const change of [{imageWidth:19},{imageWidth:101},{imageWidth:30.5},{enabled:true},{imageUrl:'http://example.org/a.png',imageAlt:'Image'},{imageUrl:'https://example.org/a.png'},{message:'<script>x</script>'},{message:'x'.repeat(1201)},{imageAlt:'x'.repeat(201)},{linkLabel:'More'},{linkUrl:'https://example.org'},{linkLabel:'More',linkUrl:'javascript:alert(1)'},{linkLabel:'More',linkUrl:'https://a:b@example.org'}])assert.throws(()=>validate({...defaults(),...change}),JSON.stringify(change));
 for(const url of ['https://example.org/<img>', 'https://example.org/\\path'])assert.throws(()=>safeUrl(url));assert.equal(safeUrl('http://example.org'),'http://example.org');assert.throws(()=>safeUrl('http://example.org',true));
});
function harness(respond){
 const ids=['contentType','customFields','blogControls','blogSelect','refreshBlogs','blogStatus','form','fields','message','imageUrl','imageAlt','imageWidth','linkLabel','linkUrl','enabled','heartsEnabled','status','reload','save','publish','upload','preview','previewHeart','previewNote','widthValue','live'];
 const els=Object.fromEntries(ids.map(id=>[id,{id,value:id==='imageWidth'?'100':id==='contentType'?'custom':'',checked:id==='heartsEnabled',disabled:false,files:[],classList:{toggle(){}},events:{},children:[],replaceChildren(){this.children=[];},append(child){this.children.push(child);},addEventListener(name,fn){this.events[name]=fn;}}]));
 const requests=[],window={events:{},PPBreakingNews:{render(){}},addEventListener(name,fn){this.events[name]=fn;}};
 let confirmed=false;
 const ctx={URL,AbortController,FormData,setTimeout,clearTimeout,document:{getElementById:id=>els[id],createElement:()=>({})},window,location:{origin:'https://example.org'},confirm:()=>confirmed,fetch:async(path,opts)=>{requests.push({path,opts});return respond(path,opts,requests.length);}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../employees/breaking-news/editor.js'),'utf8'),ctx);
 return {els,requests,window,confirm(v){confirmed=v;},flush:()=>new Promise(resolve=>setImmediate(resolve))};
}
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
test('load failure disables editing and writes',async()=>{const h=harness(()=>response({},503));await h.flush();assert.equal(h.els.fields.disabled,true);assert.equal(h.els.save.disabled,true);assert.equal(h.els.reload.disabled,false);});
test('draft save is separate from publish and duplicate requests are blocked',async()=>{
 let complete;const h=harness((path)=>path.endsWith('/get')?response({draft:defaults(),published:null}):new Promise(resolve=>complete=()=>resolve(response({ok:true,saved:defaults()}))));await h.flush();
 h.els.message.value='Hello';h.els.form.events.input({target:h.els.message});h.els.save.events.click();h.els.save.events.click();assert.equal(h.requests.length,2);assert.match(h.requests[1].path,/\/save$/);assert.equal(h.els.fields.disabled,true);complete();await h.flush();assert.match(h.els.status.textContent,/live homepage is unchanged/);assert.equal(h.els.fields.disabled,false);
});
test('network uncertainty preserves edits and locks writes until confirmed reload',async()=>{
 const h=harness(path=>path.endsWith('/get')?response({draft:defaults(),published:null}):Promise.reject(new TypeError('Network failed')));await h.flush();h.els.message.value='Keep me';h.els.form.events.input({target:h.els.message});h.els.save.events.click();await h.flush();
 assert.equal(h.els.message.value,'Keep me');assert.equal(h.els.save.disabled,true);assert.equal(h.els.fields.disabled,false);assert.match(h.els.status.textContent,/outcome is unknown/);
 h.els.reload.events.click();await h.flush();assert.equal(h.requests.length,2);h.confirm(true);h.els.reload.events.click();await h.flush();assert.equal(h.els.save.disabled,false);assert.equal(h.els.message.value,'');
});
test('validation rejection and expired authentication keep typed text',async()=>{
 const h=harness(path=>path.endsWith('/get')?response({draft:defaults(),published:null}):response({},401));await h.flush();h.els.message.value='Keep typed text';h.els.form.events.input({target:h.els.message});h.els.save.events.click();await h.flush();assert.equal(h.els.message.value,'Keep typed text');assert.equal(h.els.fields.disabled,true);assert.match(h.els.status.textContent,/Sign in again/);
});
test('server validation errors allow correction without discarding text',async()=>{
 const h=harness(path=>path.endsWith('/get')?response({draft:defaults(),published:null}):response({error:'Text is too long'},400));await h.flush();h.els.message.value='Draft';h.els.form.events.input({target:h.els.message});h.els.save.events.click();await h.flush();assert.equal(h.els.message.value,'Draft');assert.equal(h.els.save.disabled,false);assert.match(h.els.status.textContent,/Text is too long/);
});
test('timeout locks writes and beforeunload protects unknown state',async()=>{
 const h=harness(path=>path.endsWith('/get')?response({draft:defaults(),published:null}):Promise.reject(Object.assign(new Error('abort'),{name:'AbortError'})));await h.flush();h.els.save.events.click();await h.flush();assert.equal(h.els.save.disabled,true);assert.match(h.els.status.textContent,/timed out/);let prevented=false;h.window.events.beforeunload({preventDefault(){prevented=true;}});assert.equal(prevented,true);
});
test('malformed success cannot be mistaken for saved state',async()=>{
 const h=harness(path=>path.endsWith('/get')?response({draft:defaults(),published:null}):response({ok:true}));await h.flush();h.els.save.events.click();await h.flush();assert.equal(h.els.save.disabled,true);assert.match(h.els.status.textContent,/outcome is unknown/);
});
test('upload uses magazine endpoint and does not publish',async()=>{
 const h=harness(path=>path.endsWith('/get')?response({draft:defaults(),published:null}):response({url:'/magazine/img/123e4567-e89b-12d3-a456-426614174000'}));await h.flush();h.els.upload.files=[new File(['fake image'],'test.png',{type:'image/png'})];await h.els.upload.events.change();assert.equal(h.requests[1].path,'/employees/api/magazine/upload');assert.equal(h.requests[1].opts.body.get('file').name,'test.png');assert.equal(h.els.imageUrl.value,'https://example.org/magazine/img/123e4567-e89b-12d3-a456-426614174000');assert.equal(h.requests.length,2);assert.match(h.els.status.textContent,/Image uploaded/);
});
const blog=()=>({title:'An article',excerpt:'An excerpt',url:'https://piecepavilion.com/blog/an-article/',imageUrl:'https://piecepavilion.com/thumbnail.png',imageAlt:'An article'});
test('blog mode requires a selection only when enabled and retains inactive custom fields',()=>{
 const c={...defaults(),enabled:true,contentType:'blog',blog:blog(),message:'My writing'};assert.equal(validate(c).message,'My writing');assert.equal(validate(c).blog.title,'An article');assert.throws(()=>validate({...c,blog:null}));assert.ok(validate({...c,enabled:false,blog:null}));assert.throws(()=>validate({...c,contentType:'both'}));
 for(const url of ['https://other.example/blog/an-article/','https://piecepavilion.com/blog/an-article/?x=1','https://piecepavilion.com/blog/an-article/#part','https://piecepavilion.com/blog/','http://piecepavilion.com/blog/an-article/'])assert.throws(()=>validateBlog({...blog(),url}));
});
test('blog extraction reads plain text, canonicalizes links and rejects unsafe or unrelated cards',()=>{
 const card=(href,title='Title <tag>',src='/thumb/article.png')=>({getAttribute:()=>href,querySelector:selector=>selector==='h2'?{textContent:title}:selector==='p'?{textContent:'A short description'}:selector==='img'?{getAttribute:()=>src}:null});
 const result=extractBlogs({querySelectorAll:()=>[card('/blog/article/'),card('https://evil.example/blog/article/'),card('/blog/another/?x=1'),card('/blog/missing/','')]});assert.equal(result.length,1);assert.equal(result[0].url,'https://piecepavilion.com/blog/article/');assert.equal(result[0].imageUrl,'https://piecepavilion.com/thumb/article.png');assert.equal(result[0].title,'Title tag');assert.equal(result[0].imageAlt,result[0].title);
});
test('mode switching and failed list refresh preserve custom writing and saved blog',async()=>{
 const saved={...defaults(),message:'Keep my custom writing',imageUrl:'https://example.org/custom.png',imageAlt:'Custom',linkLabel:'Custom link',linkUrl:'https://example.org',blog:blog(),contentType:'custom'};
 const h=harness(path=>path.endsWith('/get')?response({draft:saved,published:null}):path==='/blog/'?response({},503):response({ok:true,saved}));await h.flush();h.els.contentType.value='blog';h.els.contentType.events.change();await h.flush();assert.equal(h.els.customFields.disabled,true);assert.equal(h.els.customFields.hidden,true);assert.equal(h.els.message.value,saved.message);assert.equal(h.els.imageUrl.value,saved.imageUrl);assert.equal(h.els.blogSelect.value,saved.blog.url);assert.match(h.els.blogStatus.textContent,/saved selection and custom writing are kept/);
 h.els.save.events.click();await h.flush();const payload=JSON.parse(h.requests.at(-1).opts.body);assert.equal(payload.contentType,'blog');assert.equal(payload.blog.url,saved.blog.url);assert.equal(payload.message,saved.message);assert.equal(payload.linkLabel,saved.linkLabel);
 h.els.contentType.value='custom';h.els.contentType.events.change();assert.equal(h.els.customFields.disabled,false);assert.equal(h.els.customFields.hidden,false);assert.equal(h.els.message.value,saved.message);assert.equal(h.els.blogSelect.value,saved.blog.url);
});
