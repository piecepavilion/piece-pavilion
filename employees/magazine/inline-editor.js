(function (global) {
  'use strict';
  const selector = '.pp-inline-input';
  // Native plain-text controls preserve selection, IME, paste and browser Undo.
  // Never rebuild the preview while its user is typing.
  function resize(input) {
    if (input.tagName !== 'TEXTAREA') return;
    const scrollTop = input.scrollTop;
    input.style.height = 'auto';
    input.style.height = Math.max(input.scrollHeight + 2, 24) + 'px';
    input.scrollTop = scrollTop;
  }
  function setDisabled(root, disabled) {
    root.querySelectorAll(selector).forEach(input => { input.disabled = disabled; });
    root.setAttribute('aria-busy', String(disabled));
  }
  function mount(root, data, onEdit) {
    root.classList.add('is-inline-editor');
    function edit(host, key, label, placeholder, index) {
      if (!host) return;
      const input = document.createElement(key === 'date' ? 'input' : 'textarea');
      input.className = 'pp-inline-input';
      input.dataset.field = key;
      if (index !== undefined) input.dataset.photoIndex = index;
      input.setAttribute('aria-label', label + ' (edit in preview)');
      input.setAttribute('aria-describedby', 'preview-help');
      input.title = 'Edit ' + label.toLowerCase();
      input.placeholder = placeholder;
      input.value = (index === undefined ? data[key] : data.photos[index][key]) || '';
      if (key === 'date') input.type = 'date';
      else {
        input.rows = 1;
        input.maxLength = ({edition:80,title:180,dek:600,body:30000,byline:100,caption:500})[key];
        input.spellcheck = true;
      }
      let started = false;
      input.addEventListener('focus', () => { started = false; });
      input.addEventListener('input', () => {
        if (input.disabled) return;
        if (['edition','title','byline','caption'].includes(key)) {
          const value = input.value.replace(/[\r\n]+/g, ' ');
          if (input.value !== value) {
            const start = input.value.slice(0, input.selectionStart).replace(/[\r\n]+/g, ' ').length;
            const end = input.value.slice(0, input.selectionEnd).replace(/[\r\n]+/g, ' ').length;
            const direction = input.selectionDirection;
            input.value = value;
            input.setSelectionRange(start, end, direction);
          }
        }
        const first = !started;
        started = true;
        onEdit(key, input.value, index, first);
        resize(input);
      });
      // These match the sidebar's single-line inputs without changing IME input.
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.isComposing && ['edition','title','byline','caption'].includes(key)) event.preventDefault();
      });
      host.replaceChildren(input);
      resize(input);
    }
    const heading = root.querySelector('.pp-magazine-heading');
    if (!heading) return;
    edit(root.querySelector('.pp-magazine-masthead > span:last-child'), 'edition', 'Edition', 'Add an edition');
    edit(heading.querySelector('h2'), 'title', 'Headline', 'Write your headline');
    const meta = heading.querySelector('.pp-magazine-meta');
    let dek = heading.querySelector('.pp-magazine-dek');
    if (!dek) { dek = document.createElement('p'); dek.className = 'pp-magazine-dek'; heading.insertBefore(dek, meta); }
    edit(dek, 'dek', 'Introduction', 'Add an introduction');
    const byline = document.createElement('span'); byline.className = 'pp-inline-byline';
    const date = document.createElement('span'); date.className = 'pp-inline-date';
    meta.replaceChildren(byline, date);
    edit(byline, 'byline', 'Byline', 'Add a byline');
    edit(date, 'date', 'Date', '');
    edit(root.querySelector('.pp-magazine-copy'), 'body', 'Article', 'Write your article. Leave a blank line between paragraphs.');
    function caption(figure, index) {
      if (!figure) return;
      let host = figure.querySelector('figcaption');
      if (!host) { host = document.createElement('figcaption'); figure.append(host); }
      edit(host, 'caption', index === undefined ? 'Cover caption' : 'Photo ' + (index + 1) + ' caption', 'Add a caption', index);
    }
    caption(root.querySelector('.pp-magazine-lead > .pp-magazine-photo'));
    const figures = root.querySelectorAll('.pp-magazine-gallery > .pp-magazine-photo');
    let figureIndex = 0;
    (data.photos || []).slice(0, 6).forEach((photo, index) => {
      if (global.PPMagazine.safeImage(photo.url)) caption(figures[figureIndex++], index);
    });
  }
  // Resize when the editor iframe/window width changes, not only when typing.
  global.addEventListener('resize', () => document.querySelectorAll(selector).forEach(resize));
  global.PPMagazineInline = {mount, setDisabled};
})(window);
