/* capability-statement — the three claims in the landing-page brand statement, one
   sentence each, as a stacked list with the title left and the sentence right.

   Pure DOM, zero fetch — file://-safe. Host provides a container element; call
   CapabilityStatement.mount(containerEl, fixture).

   No interaction. An earlier version made these expandable cards, each opening to the
   sentence plus a concrete "for example" block. Both were cut (MO, 2026-08-08): with the
   sentence always visible beside its title there is nothing left to reveal, and a click
   that only re-shows visible text is a control that lies about having content behind it. */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* The row heading's level depends on where the band sits in the host's outline, which the
     component cannot know: h3 under a section h2 (the demo), h2 directly under the landing
     page's h1. Anything outside h2-h4 falls back to the default rather than emitting a tag
     the host did not intend. */
  var LEVELS = { h2: 1, h3: 1, h4: 1 };
  function level(opts) {
    var l = opts && String(opts.headingLevel || '').toLowerCase();
    return LEVELS[l] ? l : 'h3';
  }

  /* Pure: items -> html. Kept separate from mount() so check.js can run it against the
     real generated fixture with no DOM. */
  function renderRows(items, opts) {
    var h = level(opts);
    var list = (items || []).filter(function (it) {
      return it && String(it.title || '').trim() && String(it.statement || '').trim();
    });
    if (!list.length) return '';
    return list.map(function (it) {
      return '<div class="cs-row"' + (it.id ? ' data-cap="' + esc(it.id) + '"' : '') + '>' +
               '<' + h + ' class="cs-title">' + esc(it.title) + '</' + h + '>' +
               '<p class="cs-statement">' + esc(it.statement) + '</p>' +
             '</div>';
    }).join('');
  }

  /* mount with an empty or malformed fixture renders nothing and never throws — a landing
     page that loses its content band is better than a landing page that dies. */
  function mount(containerEl, fixture, opts) {
    if (!containerEl) return [];
    var items = (fixture && fixture.items) || [];
    containerEl.innerHTML = renderRows(items, opts);
    return items;
  }

  window.CapabilityStatement = { mount: mount, renderRows: renderRows };
})();
