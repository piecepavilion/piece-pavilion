(function (global) {
  'use strict';
  const postPath = /^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)\/$/;
  const thumbPath = /^\/(?:thumb|images|img|assets)\/[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp|gif|avif)$/i;
  const make=(tag,cls,value)=>{
    const el=document.createElement(tag);
    if(cls) el.className=cls;
    if(value) el.textContent=value;
    return el;
  };
  async function blogs() {
    const res=await fetch('/blog/',{cache:'no-cache',credentials:'omit'});
    if(!res.ok) throw new Error('Published blogs could not be loaded.');
    const doc=new DOMParser().parseFromString(await res.text(),'text/html');
    const items=new Map();
    for(const card of doc.querySelectorAll('a.blog-card')){
      const href=card.getAttribute('href') || '';
      const match=href.match(postPath), title=card.querySelector('h2')?.textContent.trim();
      if(!match || !title || items.has(match[1])) continue;
      const rawImage=card.querySelector('img')?.getAttribute('src')||'';
      const image=thumbPath.test(rawImage) && !rawImage.split('/').includes('..') ? rawImage : '';
      items.set(match[1],{id:match[1],href,title,image,summary:card.querySelector('.blog-card-body p')?.textContent.trim()||''});
    }
    if(!items.size) throw new Error('No published blog posts are available.');
    return [...items.values()];
  }
  function renderBlog(root,post) {
    const story=make('article','pp-magazine');
    const top=make('div','pp-magazine-masthead','PIECE PAVILION');
    top.append(make('b','', 'BLOG'));
    const lead=make('div','pp-magazine-lead'+(post.image?' has-image':''));
    const heading=make('header','pp-magazine-heading');
    heading.append(make('div','pp-magazine-kicker','FEATURED STORY'));
    const title=make('h2'), link=make('a','',post.title);
    link.href=post.href;title.append(link);heading.append(title);
    if(post.summary) heading.append(make('p','pp-magazine-dek',post.summary));
    const action=make('a','pp-feature-link','Read the blog →');action.href=post.href;
    heading.append(action);lead.append(heading);
    if(post.image){
      const wrap=make('figure','pp-magazine-photo');
      const img=make('img');img.src=post.image;img.alt='';img.loading='lazy';
      img.addEventListener('error',()=>{wrap.remove();lead.classList.remove('has-image');},{once:true});
      wrap.append(img);lead.append(wrap);
    }
    story.append(top,lead);root.replaceChildren(story);root.hidden=false;
  }
  function caption(root,value) {
    if(typeof value==='string' && value.trim() && !root.hidden) root.append(make('p','pp-feature-caption',value.trim()));
  }
  global.PPFeatured={blogs,renderBlog,caption};
})(window);
