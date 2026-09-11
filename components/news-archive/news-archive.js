/* news-archive — the IIDS news archive (114 migrated items plus stories added since) as a
   searchable, year-filtered list.

   Loads as a plain <script src> and exposes window.NewsArchive. Zero fetch, so a
   double-clicked file:// page renders it.

   Same discipline as kb-search and project-browse: search / deriveYears / applyFilters /
   readState are pure and checked; mount() is the soft UI layer. Filter state is mirrored
   into the URL so a narrowed view is linkable. */
(function (window) {
  'use strict';

  /* ── pure ──────────────────────────────────────────────────────────────────── */

  function norm(s) { return String(s == null ? '' : s).toLowerCase(); }

  /* Every term must appear somewhere in title or body. AND, not OR — an archive search
     narrows; an OR search over 114 items returns the archive back at you. */
  function search(items, query) {
    var terms = norm(query).split(/\s+/).filter(Boolean);
    if (!terms.length) return (items || []).slice();
    return (items || []).filter(function (it) {
      var hay = norm(it.title) + ' ' + norm(it.body);
      return terms.every(function (t) { return hay.indexOf(t) > -1; });
    });
  }

  /* Years present in the data, newest first, each with its count. Never hardcoded. */
  function deriveYears(items) {
    var counts = {};
    (items || []).forEach(function (it) {
      var y = String(it.date || '').slice(0, 4);
      if (/^\d{4}$/.test(y)) counts[y] = (counts[y] || 0) + 1;
    });
    return Object.keys(counts).sort().reverse().map(function (y) {
      return { year: y, count: counts[y] };
    });
  }

  function filterByYear(items, year) {
    if (!year) return (items || []).slice();
    return (items || []).filter(function (it) {
      return String(it.date || '').slice(0, 4) === String(year);
    });
  }

  function applyFilters(items, state) {
    state = state || {};
    return search(filterByYear(items, state.year), state.q);
  }

  /* URL <-> state. Only non-empty values are written, so a clean view has a clean URL. */
  function readState(searchString) {
    var p = new window.URLSearchParams(searchString || '');
    return { q: p.get('q') || '', year: p.get('year') || '' };
  }
  function writeState(state) {
    var p = new window.URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.year) p.set('year', state.year);
    var s = p.toString();
    return s ? '?' + s : '';
  }

  function excerpt(body, max) {
    var b = String(body || '').replace(/\s+/g, ' ').trim();
    max = max || 260;
    if (b.length <= max) return b;
    var cut = b.lastIndexOf(' ', max - 1);
    return b.slice(0, cut > 60 ? cut : max - 1).replace(/[\s,;:.]+$/, '') + '…';
  }

  function formatDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return String(iso || '');
    var MON = ['January','February','March','April','May','June',
               'July','August','September','October','November','December'];
    return MON[+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1];
  }

  /* ── mount ─────────────────────────────────────────────────────────────────── */

  function mount(root, items, opts) {
    if (!root) return null;
    opts = opts || {};
    items = items || [];

    var state = opts.state || readState(window.location ? window.location.search : '');
    /* Prefix from the host page to the repo root: '../' for a page in mockups/, '../../'
       for the component demo. Same contract as people-directory. */
    var assetBase = opts.assetBase || '';
    /* Story titles sit directly under the host page's h1 on news.html, so they must be h2 —
       an h1 -> h3 jump is a skipped level. A host that mounts under its own h2 passes 3. */
    var headingTag = 'h' + (opts.headingLevel || 2);

    root.innerHTML =
      '<div class="na-controls">' +
        '<input class="na-search" type="search" placeholder="Search the archive" ' +
               'aria-label="Search the news archive">' +
        '<button class="na-reset" type="button" hidden>Reset</button>' +
      '</div>' +
      '<div class="na-years" role="group" aria-label="Filter by year"></div>' +
      '<p class="na-count" role="status" aria-live="polite"></p>' +
      '<ol class="na-list"></ol>' +
      '<p class="na-empty" hidden>No stories match that search.</p>';

    var elSearch = root.querySelector('.na-search');
    var elReset  = root.querySelector('.na-reset');
    var elYears  = root.querySelector('.na-years');
    var elCount  = root.querySelector('.na-count');
    var elList   = root.querySelector('.na-list');
    var elEmpty  = root.querySelector('.na-empty');

    deriveYears(items).forEach(function (y) {
      var b = window.document.createElement('button');
      b.type = 'button';
      b.className = 'na-year';
      b.dataset.year = y.year;
      b.textContent = y.year;
      b.setAttribute('aria-pressed', 'false');
      var n = window.document.createElement('span');
      n.className = 'na-yearcount';
      n.textContent = y.count;
      b.appendChild(n);
      b.addEventListener('click', function () {
        state.year = state.year === y.year ? '' : y.year;
        render();
      });
      elYears.appendChild(b);
    });

    elSearch.addEventListener('input', function () { state.q = elSearch.value; render(); });
    elReset.addEventListener('click', function () {
      state = { q: '', year: '' };
      elSearch.value = '';
      render();
      elSearch.focus();
    });

    function render() {
      var rows = applyFilters(items, state);

      elList.innerHTML = '';
      rows.forEach(function (it) {
        var li = window.document.createElement('li');
        li.className = 'na-item';

        if (it.image) {
          var img = window.document.createElement('img');
          img.className = 'na-thumb';
          /* Image paths in the store are repo-root-relative (`content/assets/news/x.jpg`),
             the same convention people-directory uses, so the host supplies the prefix to
             the repo root. An absolute URL is left alone. */
          img.src = /^https?:\/\//.test(it.image) ? it.image : assetBase + it.image;
          img.alt = '';                 /* decorative; the headline carries the meaning */
          img.loading = 'lazy';
          /* Belt and braces: if an image is ever missing, drop it rather than leave a
             broken-image box in the archive. */
          img.addEventListener('error', function () { img.remove(); });
          li.appendChild(img);
        }

        var main = window.document.createElement('div');
        main.className = 'na-main';

        var t = window.document.createElement('time');
        t.className = 'na-date';
        t.dateTime = it.date;
        t.textContent = formatDate(it.date);
        main.appendChild(t);

        var h = window.document.createElement(headingTag);
        h.className = 'na-title';
        h.textContent = it.title;
        main.appendChild(h);

        var p = window.document.createElement('p');
        p.className = 'na-body';
        p.textContent = excerpt(it.body, opts.excerpt || 260);
        main.appendChild(p);

        if (it.source_url) {
          var a = window.document.createElement('a');
          a.className = 'na-source';
          a.href = it.source_url;
          a.rel = 'noopener';
          a.textContent = 'Original story';
          main.appendChild(a);
        }

        li.appendChild(main);
        elList.appendChild(li);
      });

      var filtered = !!(state.q || state.year);
      elCount.textContent = filtered
        ? rows.length + ' of ' + items.length + ' stories'
        : items.length + ' stories, ' + shortRange(items);
      elEmpty.hidden = rows.length > 0;
      elReset.hidden = !filtered;

      Array.prototype.forEach.call(elYears.children, function (b) {
        var on = b.dataset.year === state.year;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '',
          window.location.pathname + writeState(state));
      }
    }

    if (state.q) elSearch.value = state.q;
    render();
    return { render: render, state: function () { return state; } };
  }

  function shortRange(items) {
    var ds = items.map(function (i) { return i.date; }).filter(Boolean).sort();
    if (!ds.length) return '';
    return ds[0].slice(0, 4) + ' to ' + ds[ds.length - 1].slice(0, 4);
  }

  window.NewsArchive = {
    mount: mount,
    search: search,
    deriveYears: deriveYears,
    filterByYear: filterByYear,
    applyFilters: applyFilters,
    readState: readState,
    writeState: writeState,
    excerpt: excerpt,
    formatDate: formatDate
  };
})(typeof window !== 'undefined' ? window : this);
