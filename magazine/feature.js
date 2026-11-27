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
  const cardFields={
    mastLeft:['Top left label',90],mastRight:['Top right label',90],kicker:['Small label above headline',90],
    headline:['Headline',240],summary:['Description under headline',300],linkText:['Read link wording',100],
    byline:['Byline',180],date:['Date label',60],coverCaption:['Cover caption',300],coverAlt:['Cover description for screen readers',300]
  };
  function cardElements(root,kind,ensure) {
    const mast=root.querySelector('.pp-magazine-masthead'),head=root.querySelector('.pp-magazine-heading');
    if(!mast || !head) return {};
    if(kind==='blog' && !mast.querySelector('span')){
      const label=make('span','',mast.firstChild?.nodeValue || '');
      if(mast.firstChild?.nodeType===3) mast.firstChild.replaceWith(label); else mast.prepend(label);
    }
    const heading=head.querySelector('h2');
    const get=(selector,tag,cls,value,parent,after)=>{
      let el=parent.querySelector(selector);
      if(!el && ensure){el=make(tag,cls,value);if(after)after.after(el);else parent.append(el);}
      return el;
    };
    let link=head.querySelector('.pp-feature-link');
    if(!link && ensure){
      link=make('a','pp-feature-link','Read the article →');
      const href=heading.querySelector('a')?.getAttribute('href');
      if(href) link.href=href;
      head.append(link);
    }
    const meta=head.querySelector('.pp-magazine-meta');
    return {
      mastLeft:mast.firstElementChild, mastRight:mast.lastElementChild,
      kicker:head.querySelector('.pp-magazine-kicker'),
      headline:heading.querySelector('a')||heading,
      summary:get('.pp-magazine-dek','p','pp-magazine-dek','',head,heading),
      linkText:link,
      ...(meta?{byline:get('span','span','','',meta),date:get('time','time','','',meta)}:{})
    };
  }
  function applyCover(root,card) {
    const lead=root.querySelector('.pp-magazine-lead');
    if(!lead) return;
    let figure=lead.querySelector('figure'), img=figure?.querySelector('img');
    if(card.coverImage==='none'){figure?.remove();lead.classList.remove('has-image');return;}
    if(/^\/magazine\/img\/[a-f0-9-]{36}$/.test(card.coverImage||'')){
      if(!figure){figure=make('figure','pp-magazine-photo');lead.append(figure);}
      if(!img){img=make('img');figure.prepend(img);}
      img.src=card.coverImage;img.loading='lazy';img.alt='';
      img.addEventListener('error',()=>{if(img.isConnected && img.getAttribute('src')===card.coverImage){figure.remove();lead.classList.remove('has-image');}},{once:true});
      lead.classList.add('has-image');
    }
    if(!img) return;
    if(typeof card.coverAlt==='string') img.alt=card.coverAlt;
    if(typeof card.coverCaption==='string'){
      let cap=figure.querySelector('figcaption');
      if(!card.coverCaption){cap?.remove();return;}
      if(!cap){cap=make('figcaption');figure.append(cap);}
      cap.textContent=card.coverCaption;
    }
  }
  function applyCard(root,kind,card) {
    if(!card || !Object.keys(card).length) return;
    const slots=cardElements(root,kind,Object.hasOwn(card,'linkText')||Object.hasOwn(card,'byline')||Object.hasOwn(card,'date'));
    for(const [key,el] of Object.entries(slots)){
      if(el && Object.hasOwn(card,key) && typeof card[key]==='string'){
        el.textContent=card[key];
        if(key==='headline' && !card[key]) el.closest('h2').hidden=true;
        else if(!card[key]) el.hidden=true;
      }
    }
    if(!Object.hasOwn(card,'linkText') && kind==='newsroom' && slots.linkText)slots.linkText.remove();
    applyCover(root,card);
  }
  global.PPFeatured={blogs,renderBlog,caption,cardFields,cardElements,applyCard,applyCover};
})(window);
