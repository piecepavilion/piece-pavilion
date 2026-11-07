const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('creative hints are manual guidance and preserve editor form hooks',()=>{
 const html=read('employees/magazine/index.html');
 for(const phrase of ['Behind the scenes','A build diary','Collector’s picks','A news update','Tell a story with your photos','Markdown symbols will show as typed'])assert.ok(html.includes(phrase),phrase);
 for(const field of ['edition','title','dek','body','byline','date','imageAlt','caption'])assert.equal((html.match(new RegExp('name="'+field+'"','g'))||[]).length,1);
 for(const id of ['cover-upload','extra-upload','remove-cover','save','undo','photos','preview'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
 for(const id of ['headline-tip','intro-tip','article-tip'])assert.ok(html.includes('aria-describedby="'+id+'"')&&html.includes('id="'+id+'"'));
 assert.doesNotMatch(html,/onclick=|onchange=|oninput=/i);
 assert.match(html,/id="save"[^>]*disabled>Save &amp; publish/);
});
test('Newsroom names preserve existing routes, slideshow and article renderer',()=>{
 const home=read('index.html'),staff=read('employees/content/index.html'),slides=read('spotlight/index.html'),portal=read('employees/index.html'),render=read('magazine/magazine.js');
 assert.equal((home.match(/href="\/spotlight\/">Newsroom<\/a>/g)||[]).length,2);
 assert.match(slides,/<title>Piece Pavilion — Newsroom<\/title>/);
 assert.match(slides,/fetch\('\/spotlight\/data.json/);
 assert.match(staff,/Newsroom article/);assert.match(staff,/Newsroom slideshow/);
 assert.match(staff,/data-pane="magazine"/);assert.match(staff,/data-pane="spotlight"/);
 assert.match(staff,/\/employees\/magazine\/\?embed=1/);assert.match(staff,/\/employees\/spotlight\/\?embed=1/);
 assert.match(portal,/Three tabs, one place/);assert.match(render,/<b>NEWSROOM<\/b>/);
 assert.doesNotMatch(read('employees/spotlight/index.html'),/>Spotlight Editor</);
});
