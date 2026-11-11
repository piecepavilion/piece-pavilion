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
  root.PPBreakingNews = { render: render, safeUrl: safeUrl, fitContent: fitContent };
})(typeof window !== 'undefined' ? window : globalThis);
