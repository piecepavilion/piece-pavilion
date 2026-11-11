/* Shared, text-only Breaking News renderer for the homepage and staff preview. */
(function (root) {
  'use strict';
  function safeUrl(raw, httpsOnly) {
    if (typeof raw !== 'string' || !/^https?:\/\//i.test(raw) || /[\u0000-\u0020\u007f-\u009f\\<>]/.test(raw)) return '';
    try {
      var url = new URL(raw);
      if (url.username || url.password || !url.hostname || (httpsOnly ? url.protocol !== 'https:' : !['http:', 'https:'].includes(url.protocol))) return '';
      return url.href;
    } catch (_) { return ''; }
  }
  function palette(raw) {
    var color = typeof raw === 'string' && /^#[0-9a-f]{6}$/i.test(raw) ? raw.toLowerCase() : '#862d3c';
    if (color === '#862d3c') return { background: 'linear-gradient(145deg,#862d3c,#4e1725 85%)', ink: '#fff6f3', link: '#ffe8b9', heading: '#ff9aa7', sweep: '#ffc1c8', border: '#ffffff30', scrollbar: '#ffffff66' };
    var rgb = [1,3,5].map(function (i) { var v = parseInt(color.slice(i,i+2),16)/255; return v <= .04045 ? v/12.92 : Math.pow((v+.055)/1.055,2.4); });
    var light = .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
    var darkText = (light+.05)/.05 >= 1.05/(light+.05);
    return { background: color, ink: darkText ? '#000000' : '#ffffff', link: darkText ? '#000000' : '#ffffff', heading: darkText ? '#5c071b' : '#ffe0e5', sweep: darkText ? '#39000e' : '#fff0f3', border: darkText ? '#00000030' : '#ffffff30', scrollbar: darkText ? '#00000066' : '#ffffff66' };
  }
  function applyPalette(box, raw) {
    var colors = palette(raw);
    Object.keys(colors).forEach(function (key) { box.style.setProperty('--breaking-' + key, colors[key]); });
  }
  var watchedBoxes = new WeakSet();
  function fitContent(box) {
    var area = box.querySelector('.breaking-content');
    if (!area || !area.clientHeight || !area.clientWidth) return;
    var narrow = area.clientWidth < 340, base = narrow ? 14 : 15.2;
    for (var step = 0; step <= 8; step++) {
      box.style.setProperty('--breaking-body-size', Math.max(12, base - step * .4) + 'px');
      box.style.setProperty('--breaking-title-size', Math.max(15, (narrow ? 17 : 18.4) - step * .5) + 'px');
      box.style.setProperty('--breaking-content-gap', Math.max(7, 12 - step) + 'px');
      box.style.setProperty('--breaking-max-image-height', Math.max(90, (narrow ? 160 : 180) - step * 12) + 'px');
      if (area.scrollHeight <= area.clientHeight + 1) break;
    }
  }
  function scheduleFit(box) {
    if (root.requestAnimationFrame) root.requestAnimationFrame(function () { fitContent(box); });
    else fitContent(box);
  }
  function watchSize(box) {
    if (watchedBoxes.has(box)) return;
    watchedBoxes.add(box);
    var area = box.querySelector('.breaking-content');
    if (area && root.ResizeObserver) new root.ResizeObserver(function () { scheduleFit(box); }).observe(area);
    if (root.document && root.document.fonts) root.document.fonts.ready.then(function () { scheduleFit(box); });
  }
  function render(box, config) {
    var c = config || {};
    applyPalette(box, c.backgroundColor);
    box.classList.toggle('breaking-motion', c.motionEnabled === true);
    var isBlog = c.contentType === 'blog';
    var article = isBlog ? (c.blog || {}) : null;
    var headline = box.querySelector('[data-breaking-headline]');
    if (headline) {
      headline.textContent = isBlog ? (typeof article.title === 'string' ? article.title : '') : (typeof c.title === 'string' ? c.title : '');
      headline.hidden = !headline.textContent;
    }
    if (article) c = {
      message: article.excerpt, imageUrl: article.imageUrl, imageAlt: article.imageAlt,
      imageWidth: c.imageWidth, imageText: article.imageText,
      linkLabel: typeof article.linkLabel === 'string' ? article.linkLabel : 'Read article', linkUrl: article.url
    };
    var image = box.querySelector('[data-breaking-image]');
    var media = box.querySelector('[data-breaking-media]');
    var imageText = box.querySelector('[data-breaking-image-text]');
    var message = box.querySelector('[data-breaking-message]'), link = box.querySelector('[data-breaking-link]');
    message.textContent = typeof c.message === 'string' ? c.message : '';
    message.hidden = !message.textContent;
    var src = safeUrl(c.imageUrl, true);
    image.alt = typeof c.imageAlt === 'string' ? c.imageAlt : '';
    var width = (Number.isInteger(c.imageWidth) ? Math.max(20, Math.min(100, c.imageWidth)) : 100) + '%';
    image.style.width = media ? '100%' : width;
    if (media) { media.style.width = width; media.hidden = !src || image.hidden; }
    if (imageText) {
      imageText.textContent = typeof c.imageText === 'string' ? c.imageText : '';
      imageText.hidden = !src || !imageText.textContent;
    }
    if (image.getAttribute('src') !== src) {
      image.hidden = !src;
      if (media) { media.hidden = !src; media.style.setProperty('--breaking-image-ratio', '3'); }
      if (src) image.src = src;
      else image.removeAttribute('src');
    }
    image.onerror = function () { image.hidden = true; if (media) media.hidden = true; scheduleFit(box); };
    image.onload = function () {
      image.hidden = !image.getAttribute('src');
      if (media) {
        media.hidden = image.hidden;
        if (image.naturalWidth > 0 && image.naturalHeight > 0) media.style.setProperty('--breaking-image-ratio', String(image.naturalWidth / image.naturalHeight));
      }
      scheduleFit(box);
    };
    if (image.complete && image.naturalWidth > 0) image.onload();
    var href = safeUrl(c.linkUrl), label = typeof c.linkLabel === 'string' ? c.linkLabel.trim() : '';
    link.hidden = !(href && label);
    link.textContent = link.hidden ? '' : label;
    if (link.hidden) link.removeAttribute('href'); else link.href = href;
    watchSize(box); scheduleFit(box);
  }
  root.PPBreakingNews = { render: render, safeUrl: safeUrl, fitContent: fitContent, palette: palette };
})(typeof window !== 'undefined' ? window : globalThis);
