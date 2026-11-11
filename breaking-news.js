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
  function render(box, config) {
    var c = config || {};
    var isBlog = c.contentType === 'blog';
    var article = isBlog ? (c.blog || {}) : null;
    var headline = box.querySelector('[data-breaking-headline]');
    if (headline) {
      headline.textContent = article && typeof article.title === 'string' ? article.title : '';
      headline.hidden = !headline.textContent;
    }
    if (article) c = {
      message: article.excerpt, imageUrl: article.imageUrl, imageAlt: article.imageAlt,
      imageWidth: c.imageWidth, linkLabel: 'Read article', linkUrl: article.url
    };
    var image = box.querySelector('[data-breaking-image]');
    var message = box.querySelector('[data-breaking-message]'), link = box.querySelector('[data-breaking-link]');
    message.textContent = typeof c.message === 'string' ? c.message : '';
    message.hidden = !message.textContent;
    var src = safeUrl(c.imageUrl, true);
    image.alt = typeof c.imageAlt === 'string' ? c.imageAlt : '';
    image.style.width = (Number.isInteger(c.imageWidth) ? Math.max(20, Math.min(100, c.imageWidth)) : 100) + '%';
    if (image.getAttribute('src') !== src) {
      image.hidden = !src;
      if (src) image.src = src;
      else image.removeAttribute('src');
    }
    image.onerror = function () { image.hidden = true; };
    image.onload = function () { image.hidden = !image.getAttribute('src'); };
    var href = safeUrl(c.linkUrl), label = typeof c.linkLabel === 'string' ? c.linkLabel.trim() : '';
    link.hidden = !(href && label);
    link.textContent = link.hidden ? '' : label;
    if (link.hidden) link.removeAttribute('href'); else link.href = href;
  }
  root.PPBreakingNews = { render: render, safeUrl: safeUrl };
})(typeof window !== 'undefined' ? window : globalThis);
