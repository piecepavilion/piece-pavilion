const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const shared=fs.readFileSync(path.join(root,'breaking-news.js'),'utf8');
function el(){return {attrs:{},children:[],hidden:false,style:{setProperty(){}},classList:{s:new Set(),toggle(k,v){if(v)this.s.add(k);else this.s.delete(k)},add(k){this.s.add(k)},remove(k){this.s.delete(k)},contains(k){return this.s.has(k)}},textContent:'',getAttribute(k){return this.attrs[k]??null},setAttribute(k,v){this.attrs[k]=String(v)},removeAttribute(k){delete this.attrs[k]},addEventListener(n,f){this[n]=f},appendChild(e){this.children.push(e)},replaceChildren(){this.children=[]},get childElementCount(){return this.children.length},events:[],dispatchEvent(e){this.events.push(e)},set src(v){this.attrs.src=v},get src(){return this.attrs.src},querySelector(s){return this.nodes[s]??=(el())},nodes:{}}}
function renderer(){const c={window:{},URL};vm.runInNewContext(shared,c);return c.window.PPBreakingNews;}
test('safe URLs and text-only renderer; optional image sizing removal and image failure',()=>{
 const api=renderer(),box=el();api.render(box,{message:'<script>not executable</script>',imageUrl:'https://example.com/x.png',imageAlt:'Photo',imageWidth:45,linkLabel:'Read',linkUrl:'https://example.com/'});
 assert.equal(box.nodes['[data-breaking-message]'].textContent,'<script>not executable</script>');
 const im=box.nodes['[data-breaking-image]'];assert.equal(im.src,'https://example.com/x.png');assert.equal(box.nodes['[data-breaking-media]'].style.width,'45%');assert.equal(im.style.width,'100%');assert.equal(im.hidden,false);im.onerror();assert.equal(im.hidden,true);
 api.render(box,{imageUrl:'javascript:x',linkLabel:'Bad',linkUrl:'javascript:x'});assert.equal(im.getAttribute('src'),null);assert.equal(im.hidden,true);assert.equal(box.nodes['[data-breaking-link]'].hidden,true);
 for(const url of ['javascript:alert(1)','data:image/png;base64,a','https://user:pass@example.com/a','https://example.com/a b'])assert.equal(api.safeUrl(url,true),'');
 assert.equal(api.safeUrl('http://example.com/x',true),'');assert.equal(api.safeUrl('http://example.com/x'),'http://example.com/x');
});
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve()};
function home(){
 const ids={'homepage-countdown':el(),'homepage-breaking-news':el(),'hero-carousel':el()},intervals=[];
 const cfg={enabled:true,heartsEnabled:true,confettiEnabled:false,title:'Before',message:'Before text',afterTitle:'After',afterMessage:'After text',timeZone:'UTC',endsAt:'2020-01-01T00:00:00Z',linkLabel:'Before link',linkUrl:'https://example.com/before',afterLinkLabel:'After link',afterLinkUrl:'https://example.com/after'};
 const state={countdown:cfg,news:{enabled:false,message:'News',heartsEnabled:true},fail:false};
 const c={document:{getElementById:id=>ids[id],createElement:el,addEventListener(){},hidden:false},window:{matchMedia:()=>({matches:false,addEventListener(){}}),PPBreakingNews:renderer()},CustomEvent:function(type,o){this.type=type;this.detail=o.detail},URL,AbortController,Date,Number,setTimeout:()=>1,clearTimeout(){},setInterval:f=>intervals.push(f),fetch:async u=>{if(state.fail)throw Error('offline');return {ok:true,json:async()=>u.includes('section=')?state.news:state.countdown}}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'countdown.js'),'utf8').split('/* Separate shared hearts')[0],c);
 return {ids,state,refresh:()=>intervals[1](),box:ids['homepage-countdown'],news:ids['homepage-breaking-news']};
}
test('countdown remains default, Breaking News replaces it, switching restores all countdown content',async()=>{
 const h=home();await flush();assert.equal(h.box.hidden,false);assert.equal(h.news.hidden,true);assert.equal(h.box.nodes['[data-countdown-title]'].textContent,'After');
 h.state.news={...h.state.news,enabled:true};h.refresh();await flush();assert.equal(h.box.hidden,true);assert.equal(h.news.hidden,false);assert.equal(h.ids['hero-carousel'].hidden,true);
 assert.equal(h.news.nodes['[data-breaking-message]'].textContent,'News');assert.equal(h.news.events.at(-1).detail,true);
 h.state.news={...h.state.news,heartsEnabled:false};h.refresh();await flush();assert.equal(h.news.events.at(-1).detail,false);
 h.state.news={...h.state.news,enabled:false};h.refresh();await flush();assert.equal(h.box.hidden,false);assert.equal(h.news.hidden,true);assert.equal(h.box.nodes['[data-countdown-title]'].textContent,'After');assert.equal(h.box.nodes['[data-countdown-message]'].textContent,'After text');
 assert.equal(h.state.countdown.afterLinkUrl,'https://example.com/after');assert.equal(h.state.countdown.linkUrl,'https://example.com/before');
});
test('failed refresh retains last good card; disabling both restores carousel',async()=>{
 const h=home();h.state.news.enabled=true;await flush();h.state.fail=true;h.refresh();await flush();assert.equal(h.news.hidden,false);
 h.state.fail=false;h.state.news={enabled:false};h.state.countdown={enabled:false};h.refresh();await flush();assert.equal(h.news.hidden,true);assert.equal(h.box.hidden,true);assert.equal(h.ids['hero-carousel'].hidden,false);
});
test('four tabs preserve editors, homepage cache load order and independent hearts identities',()=>{
 const content=fs.readFileSync(path.join(root,'employees/content/index.html'),'utf8'),home=fs.readFileSync(path.join(root,'index.html'),'utf8'),js=fs.readFileSync(path.join(root,'countdown.js'),'utf8');
 assert.equal((content.match(/role="tab"/g)||[]).length,4);for(const route of ['magazine','featured-items','spotlight','breaking-news'])assert.ok(content.includes('/employees/'+route+'/'));
 assert.ok(home.indexOf('/breaking-news.js')<home.indexOf('/countdown.js'));
 assert.match(js,/pp_countdown_like_device_v1/);assert.match(js,/pp_breaking_news_like_device_v1/);assert.match(js,/section=breaking-news/);
});

test('blog renders only selected snapshot and custom content returns unchanged',()=>{
 const api=renderer(),box=el(),custom={message:'Private draft writing',imageUrl:'',linkLabel:'Custom link',linkUrl:'https://example.com/',imageWidth:60};
 const blog={title:'Selected article',excerpt:'Article summary',url:'https://piecepavilion.com/blog/selected-article/',imageUrl:'https://piecepavilion.com/thumb/selected.png',imageAlt:'Article photo'};
 api.render(box,{...custom,contentType:'blog',blog});
 assert.equal(box.nodes['[data-breaking-headline]'].textContent,'Selected article');
 assert.equal(box.nodes['[data-breaking-message]'].textContent,'Article summary');
 assert.equal(box.nodes['[data-breaking-link]'].textContent,'Read article');
 assert.equal(box.nodes['[data-breaking-media]'].style.width,'60%');
 api.render(box,{...custom,contentType:'blog',blog:null});
 assert.equal(box.nodes['[data-breaking-message]'].textContent,'');
 assert.equal(box.nodes['[data-breaking-link]'].hidden,true);
 api.render(box,{...custom,contentType:'custom',blog});
 assert.equal(box.nodes['[data-breaking-headline]'].hidden,true);
 assert.equal(box.nodes['[data-breaking-message]'].textContent,'Private draft writing');
 assert.equal(box.nodes['[data-breaking-link]'].textContent,'Custom link');
});

test('image text and editable blog snapshot remain independent, safe and optional',()=>{
 const api=renderer(),box=el(),blog={title:'Edited card headline',excerpt:'Edited card summary',url:'https://piecepavilion.com/blog/selected/',imageUrl:'https://piecepavilion.com/thumb/selected.png',imageAlt:'Alternate crop',imageText:'Blog image words',linkLabel:'See the full story'};
 const custom={message:'Custom writing',imageText:'Custom image words',imageUrl:'https://example.com/x.png',imageAlt:'Photo',motionEnabled:true};
 api.render(box,{...custom,contentType:'blog',blog});
 assert.equal(box.nodes['[data-breaking-headline]'].textContent,blog.title);assert.equal(box.nodes['[data-breaking-message]'].textContent,blog.excerpt);assert.equal(box.nodes['[data-breaking-link]'].textContent,blog.linkLabel);assert.equal(box.nodes['[data-breaking-image-text]'].textContent,blog.imageText);assert.equal(box.nodes['[data-breaking-media]'].hidden,false);assert.equal(box.classList.contains('breaking-motion'),true);
 api.render(box,{...custom,motionEnabled:false});assert.equal(box.nodes['[data-breaking-image-text]'].textContent,custom.imageText);assert.equal(box.classList.contains('breaking-motion'),false);
 api.render(box,{...custom,imageUrl:''});assert.equal(box.nodes['[data-breaking-media]'].hidden,true);assert.equal(box.nodes['[data-breaking-image-text]'].hidden,true);
 api.render(box,{...custom,imageText:'<img onerror=alert(1)>'});assert.equal(box.nodes['[data-breaking-image-text]'].textContent,'<img onerror=alert(1)>');
 box.nodes['[data-breaking-image]'].onerror();assert.equal(box.nodes['[data-breaking-media]'].hidden,true);
 box.nodes['[data-breaking-image]'].onload();assert.equal(box.nodes['[data-breaking-media]'].hidden,false);
});
test('heading motion is opt-in, red throughout and honors reduced motion',()=>{
 const css=fs.readFileSync(path.join(root,'breaking-news.css'),'utf8');
 assert.match(css,/\.breaking-motion \.breaking-label/);assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/animation:none!important/);assert.match(css,/@keyframes breaking-red-sweep/);
 const frames=css.split('@keyframes breaking-red-sweep')[1].split('@media')[0];assert.doesNotMatch(frames,/visibility|display/);
 const api=renderer(),box=el();api.render(box,{});assert.equal(box.classList.contains('breaking-motion'),false);
});

test('custom title is separate from the permanent heading and selected blog title',()=>{
 const api=renderer(),box=el(),c={title:'My own title',message:'My writing',contentType:'custom',blog:{title:'Original blog title',excerpt:'Blog words',url:'https://piecepavilion.com/blog/selected/',imageUrl:'',imageAlt:''}};
 api.render(box,c);assert.equal(box.nodes['[data-breaking-headline]'].textContent,'My own title');assert.equal(box.nodes['[data-breaking-headline]'].hidden,false);
 api.render(box,{...c,contentType:'blog'});assert.equal(box.nodes['[data-breaking-headline]'].textContent,'Original blog title');
 api.render(box,{...c,title:''});assert.equal(box.nodes['[data-breaking-headline]'].hidden,true);
});

test('content fitting uses smaller readable text without changing card dimensions or truncating content',()=>{
 const api=renderer(),box=el(),area=box.querySelector('.breaking-content'),vars={};box.style.setProperty=(k,v)=>vars[k]=v;area.clientHeight=210;area.clientWidth=295;Object.defineProperty(area,'scrollHeight',{get:()=>Number.parseFloat(vars['--breaking-body-size']||'14')>12.5?260:200});
 api.fitContent(box);assert.ok(parseFloat(vars['--breaking-body-size'])>=12);assert.ok(parseFloat(vars['--breaking-body-size'])<=12.5);assert.ok(parseFloat(vars['--breaking-title-size'])>=15);assert.equal(box.style.height,undefined);
 Object.defineProperty(box.querySelector('.breaking-message'),'clientHeight',{value:0});
 const css=fs.readFileSync(path.join(root,'breaking-news.css'),'utf8');assert.match(css,/overflow-y:auto/);assert.doesNotMatch(css,/line-clamp|text-overflow:ellipsis/);
});

test('countdown zero continues blinking, pauses offscreen and respects reduced motion',()=>{
 const css=fs.readFileSync(path.join(root,'countdown.css'),'utf8');
 assert.match(css,/\.countdown-complete \.countdown-unit strong\{animation:countdown-zero-blink 1\.4s ease-in-out infinite\}/);
 assert.match(css,/\.countdown-paused \.countdown-unit strong\{animation-play-state:paused\}/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.countdown-complete \.countdown-unit strong,\.countdown-confetti i\{animation:none!important\}/);
});
test('completed countdown blinking state clears for future dates, disabled card and Breaking News',async()=>{
 const h=home();await flush();assert.equal(h.box.classList.contains('countdown-complete'),true);assert.equal(h.box.nodes['[data-countdown-seconds]'].textContent,'00');
 h.state.countdown={...h.state.countdown,endsAt:new Date(Date.now()+600000).toISOString()};h.refresh();await flush();assert.equal(h.box.classList.contains('countdown-complete'),false);assert.equal(h.box.nodes['[data-countdown-title]'].textContent,'Before');
 h.state.countdown={...h.state.countdown,endsAt:'2020-01-01T00:00:00Z'};h.refresh();await flush();assert.equal(h.box.classList.contains('countdown-complete'),true);
 h.state.news.enabled=true;h.refresh();await flush();assert.equal(h.box.classList.contains('countdown-complete'),false);assert.equal(h.box.hidden,true);
 h.state.news.enabled=false;h.state.countdown.enabled=false;h.refresh();await flush();assert.equal(h.box.classList.contains('countdown-complete'),false);
});

test('safe background colors keep original maroon by default and body contrast at least 4.5',()=>{
 const api=renderer();assert.equal(api.palette().background,'linear-gradient(145deg,#862d3c,#4e1725 85%)');assert.equal(api.palette('invalid').background,api.palette().background);assert.equal(api.palette('#862D3C').background,api.palette().background);
 function luminance(color){const c=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*c[0]+.7152*c[1]+.0722*c[2];}
 function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
 for(const color of ['#ffffff','#000000','#ff0000','#00ff00','#0000ff','#777777','#888888','#ffff00','#00ffff','#ff00ff']){const p=api.palette(color);assert.equal(p.background,color);assert.ok(contrast(color,p.ink)>=4.5);assert.ok(contrast(color,p.heading)>=3);assert.ok(contrast(color,p.sweep)>=3);}
 const box=el(),vars={};box.style.setProperty=(k,v)=>vars[k]=v;api.render(box,{backgroundColor:'#ffffff'});assert.equal(vars['--breaking-background'],'#ffffff');assert.equal(vars['--breaking-ink'],'#000000');api.render(box,{backgroundColor:'url(https://bad.example/)'});assert.equal(vars['--breaking-background'],api.palette().background);
});

test('stronger heading pulse is smooth, slow and never fully disappears',()=>{
 const css=fs.readFileSync(path.join(root,'breaking-news.css'),'utf8');assert.match(css,/breaking-red-pulse 2.8s ease-in-out infinite/);assert.match(css,/@keyframes breaking-red-pulse\{0%,100%\{opacity:1;[^}]+\}50%\{opacity:\.5;[^}]+\}\}/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.doesNotMatch(css,/opacity:0[;}]/);
});
test('custom card text color applies safely without changing the red heading and resets to automatic',()=>{
 const api=renderer(),automatic=api.palette('#862d3c'),custom=api.palette('#862d3c','#AABBCC');assert.equal(custom.ink,'#aabbcc');assert.equal(custom.link,'#aabbcc');assert.equal(custom.heading,automatic.heading);assert.equal(custom.sweep,automatic.sweep);assert.equal(api.palette('#862d3c','').ink,automatic.ink);assert.equal(api.palette('#862d3c','red').ink,automatic.ink);assert.equal(api.palette('#862d3c','url(https://bad.example/)').ink,automatic.ink);
 const box=el(),vars={};box.style.setProperty=(k,v)=>vars[k]=v;api.render(box,{backgroundColor:'#000000',textColor:'#12ABEF'});assert.equal(vars['--breaking-ink'],'#12abef');assert.equal(vars['--breaking-link'],'#12abef');api.render(box,{backgroundColor:'#000000',textColor:''});assert.equal(vars['--breaking-ink'],'#ffffff');
 assert.ok(api.textContrast('#ffffff','#000000')>20.9);assert.equal(api.textContrast('#ffffff','#ffffff'),1);assert.ok(api.textContrast('#862d3c','')>=4.5);assert.ok(api.textContrast('#862d3c','#862d3c')<4.5);
});
