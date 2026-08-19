/* KB search. Pure DOM, zero fetch — file://-safe. Two parts:
   - KBSearch.search(entries, query, opts) -> Result[]   (pure; the frozen seam)
   - KBSearch.mount(inputEl, listEl, entries, opts)       (convenience UI)
   The host passes an ALREADY-FILTERED entries array (visibility/permission is
   applied upstream). Result = {id, group, title, gist, score, matchedField, snippet}
   + additive optional `adoption` ('' when the entry has none) so rows can badge drafts. */
(function () {
  var FIELDS = [
    { name: 'title', weight: 8 },
    { name: 'keywords', weight: 5 },
    { name: 'tags', weight: 5 },
    { name: 'gist', weight: 3 },
    { name: 'body', weight: 1 },
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function hay(entry, field) {
    var v = entry[field];
    if (v == null) return '';
    return (Array.isArray(v) ? v.join(' ') : String(v)).toLowerCase();
  }
  function snippet(body, term, len) {
    var b = String(body == null ? '' : body);
    var idx = b.toLowerCase().indexOf(term);
    if (idx < 0) return '';
    var start = Math.max(0, idx - Math.floor(len / 3));
    var piece = b.slice(start, start + len).replace(/\s+/g, ' ').trim();
    return (start > 0 ? '…' : '') + piece + (start + len < b.length ? '…' : '');
  }

  function search(entries, query, opts) {
    opts = opts || {};
    var fields = opts.weights
      ? FIELDS.map(function (f) { return { name: f.name, weight: opts.weights[f.name] != null ? opts.weights[f.name] : f.weight }; })
      : FIELDS;
    var terms = String(query == null ? '' : query).toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var out = [];
    (entries || []).forEach(function (e) {
      var hays = fields.map(function (f) { return { name: f.name, weight: f.weight, text: hay(e, f.name) }; });
      var total = 0, bestField = '', bestW = -1, ok = true, bodyTerm = null;
      for (var t = 0; t < terms.length; t++) {
        var term = terms[t], tw = 0, tf = '';
        for (var k = 0; k < hays.length; k++) {
          if (hays[k].text.indexOf(term) !== -1 && hays[k].weight > tw) { tw = hays[k].weight; tf = hays[k].name; }
        }
        if (tw === 0) { ok = false; break; }
        total += tw;
        if (tw > bestW) { bestW = tw; bestField = tf; }
        if (tf === 'body' && bodyTerm === null) bodyTerm = term;
      }
      if (!ok) return;
      out.push({
        id: e.id, group: e.group, title: e.title, gist: e.gist || '',
        adoption: e.adoption || '',
        entry_type: e.entry_type || '',
        score: total, matchedField: bestField,
        snippet: bodyTerm ? snippet(e.body, bodyTerm, opts.snippetLen || 120) : '',
      });
    });
    out.sort(function (a, b) { return b.score - a.score || String(a.title).localeCompare(String(b.title)); });
    return opts.limit ? out.slice(0, opts.limit) : out;
  }

  function mount(inputEl, listEl, entries, opts) {
    opts = opts || {};
    var timer = null;
    function render(q) {
      if (!String(q).trim()) { if (opts.onClear) opts.onClear(); return; }
      var results = search(entries, q, opts);
      if (!results.length) { listEl.innerHTML = '<p class="hint">No matches for "' + esc(q) + '".</p>'; return; }
      listEl.innerHTML = '<ul>' + results.map(function (r) {
        var href = opts.detailPage + '?group=' + encodeURIComponent(r.group)
          + '&item=' + encodeURIComponent(r.title) + '&id=' + encodeURIComponent(r.id);
        return '<li><a href="' + href + '">'
          + '<span class="grouptag">' + esc(r.group) + '</span> '
          + '<span class="kbname">' + esc(r.title) + '</span>' + draftBadge(r)
          + (r.gist ? '<span class="kbresult-gist">' + esc(r.gist) + '</span>' : '')
          + (r.snippet ? '<span class="kbsnippet">' + esc(r.snippet) + '</span>' : '')
          + '<span class="arm">Open →</span></a></li>';
      }).join('') + '</ul>';
    }
    inputEl.addEventListener('input', function () {
      clearTimeout(timer);
      var q = inputEl.value;
      timer = setTimeout(function () { render(q); }, opts.debounce || 120);
    });
  }

  /* ==========================================================================
     FACETS — derived from the data, never hardcoded.

     Adding an entry with a new topic adds that topic to the filter automatically, which is
     the same discipline the KB store already uses for groups. A facet offering fewer than
     two distinct values is dropped — today the Unit filter shows IIDS and RCDS on the public
     page and every group on the intranet.
     ========================================================================== */

  function tagNamespace(prefix) {
    return function (entry) {
      return (entry.tags || [])
        .filter(function (t) { return String(t).indexOf(prefix + ':') === 0; })
        .map(function (t) { return String(t).slice(prefix.length + 1); });
    };
  }

  var FACETS = [
    { key: 'group', label: 'Unit', values: function (e) { return e.group ? [e.group] : []; } },
    { key: 'track', label: 'Kind', values: tagNamespace('track') },
    { key: 'type', label: 'Entry type', values: function (e) { return e.entry_type ? [e.entry_type] : []; } },
    { key: 'topic', label: 'Topic', control: 'select', values: tagNamespace('topic') }
  ];

  /* Facet values are storage slugs ('working-with-iids', 'procedural'). A public browse
     control must not read as internal vocabulary, so every option carries a display `label`
     beside its frozen `value`: sentence-cased from the slug, or taken from the host's
     `labels` map where the mechanical form is wrong (acronyms, internal taxonomy words).
     The map belongs to the HOST — this component still knows no facet value. A value that
     already carries an uppercase letter is a display code (RCDS, GBRC) and is left alone. */
  function humanize(v) {
    var s = String(v == null ? '' : v);
    if (/[A-Z]/.test(s)) return s;
    s = s.replace(/-/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function labelOf(facetKey, value, labels) {
    var m = labels && labels[facetKey];
    return (m && m[value]) || humanize(value);
  }

  /* deriveFacets(entries, labels) -> [{ key, label, control, options: [{ value, count, label }] }]
     (pure). Pills stay count-ordered (the frequent kinds first); a select is a long list a
     reader scans for a known term, so it is ordered alphabetically by label instead. */
  function deriveFacets(entries, labels) {
    return FACETS.map(function (f) {
      var counts = {};
      (entries || []).forEach(function (e) {
        f.values(e).forEach(function (v) { if (v) counts[v] = (counts[v] || 0) + 1; });
      });
      var options = Object.keys(counts).map(function (v) {
        return { value: v, count: counts[v], label: labelOf(f.key, v, labels) };
      }).sort(f.control === 'select'
        ? function (a, b) { return a.label.localeCompare(b.label); }
        : function (a, b) { return b.count - a.count || a.value.localeCompare(b.value); });
      return { key: f.key, label: f.label, control: f.control || 'pills', options: options };
    }).filter(function (f) { return f.options.length > 1; });
  }

  function matchesFacets(entry, state) {
    for (var i = 0; i < FACETS.length; i++) {
      var f = FACETS[i], want = state[f.key];
      if (!want) continue;
      if (f.values(entry).indexOf(want) === -1) return false;
    }
    return true;
  }

  function toResult(e) {
    return {
      id: e.id, group: e.group, title: e.title, gist: e.gist || '',
      adoption: e.adoption || '',
      entry_type: e.entry_type || '',
      score: 0, matchedField: '', snippet: ''
    };
  }

  // Guide badge: like the draft badge, a guide must be recognizable from the
  // row itself — the chip doubles as the color coding for color-blind readers.
  function guideBadge(r) {
    return r.entry_type === 'guide' ? ' <span class="kb-guidebadge">Guide</span>' : '';
  }

  // Draft badge: an entry whose adoption is 'draft' must be recognizable as a
  // draft from the result row, not only after opening it.
  function draftBadge(r) {
    return r.adoption === 'draft' ? ' <span class="kb-draftbadge">Draft</span>' : '';
  }

  /* applyFilters(entries, state) -> Result[]  (pure)
     state = { q, group, track, type, topic }. Facets narrow first, then the query ranks what
     is left, so search() keeps its frozen behavior and never sees a filtered-out entry. With
     no query the surviving entries are listed alphabetically. */
  function applyFilters(entries, state) {
    state = state || {};
    var narrowed = (entries || []).filter(function (e) { return matchesFacets(e, state); });
    if (String(state.q == null ? '' : state.q).trim()) return search(narrowed, state.q, state);
    return narrowed.map(toResult).sort(function (a, b) {
      return String(a.title).localeCompare(String(b.title));
    });
  }

  /* ------------------------------------------------------------------ URL state
     A filtered view is linkable and survives the back button. Guarded: a file:// page can
     throw a SecurityError on replaceState, in which case the widget still works and only
     loses its shareable URL. */
  function readState(searchStr) {
    var out = { q: '' };
    FACETS.forEach(function (f) { out[f.key] = ''; });
    String(searchStr || '').replace(/^\?/, '').split('&').forEach(function (pair) {
      if (!pair) return;
      var bits = pair.split('=');
      var k = decodeURIComponent(bits[0]);
      var v = decodeURIComponent((bits[1] || '').replace(/\+/g, ' '));
      if (k in out) out[k] = v;
    });
    return out;
  }

  function writeState(state) {
    var parts = [];
    Object.keys(state).forEach(function (k) {
      if (state[k]) parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(state[k]));
    });
    var qs = parts.length ? '?' + parts.join('&') : '';
    try {
      var base = window.location.pathname + qs + window.location.hash;
      window.history.replaceState(null, '', base);
    } catch (err) { /* file:// — keep filtering, lose only the shareable URL */ }
  }

  /* ------------------------------------------------------------- faceted UI (SOFT) */

  function mountFaceted(root, entries, opts) {
    opts = opts || {};
    var facets = deriveFacets(entries, opts.labels);
    var state = readState(opts.initialSearch != null ? opts.initialSearch : window.location.search);
    var timer = null;

    root.innerHTML =
      '<div class="kbf">' +
        '<div class="kbf-searchrow">' +
          '<input class="kbsearch" type="search" id="kbf-q" ' +
            'placeholder="' + esc(opts.placeholder || 'Search the knowledge base…') + '" ' +
            'aria-label="Search the knowledge base">' +
        '</div>' +
        '<div class="kbf-facets"></div>' +
        '<div class="kbf-chips" aria-live="polite"></div>' +
        '<div class="kbf-meta">' +
          '<span class="kbf-count" aria-live="polite"></span>' +
          '<button type="button" class="kbf-reset">Reset filters</button>' +
        '</div>' +
        '<div class="kbf-results itemlist"></div>' +
      '</div>';

    var qEl = root.querySelector('#kbf-q');
    var facetsEl = root.querySelector('.kbf-facets');
    var chipsEl = root.querySelector('.kbf-chips');
    var countEl = root.querySelector('.kbf-count');
    var resetEl = root.querySelector('.kbf-reset');
    var listEl = root.querySelector('.kbf-results');

    facetsEl.innerHTML = facets.map(function (f) {
      if (f.control === 'select') {
        return '<div class="kbf-row"><span class="kbf-label" id="kbf-lbl-' + f.key + '">' + esc(f.label) + '</span>' +
          '<select class="kbf-select" data-facet="' + esc(f.key) + '" aria-labelledby="kbf-lbl-' + f.key + '">' +
            '<option value="">All</option>' +
            f.options.map(function (o) {
              return '<option value="' + esc(o.value) + '">' + esc(o.label) + ' (' + o.count + ')</option>';
            }).join('') +
          '</select></div>';
      }
      return '<div class="kbf-row"><span class="kbf-label">' + esc(f.label) + '</span>' +
        '<div class="kbf-pills" role="group" aria-label="' + esc(f.label) + '">' +
          '<button type="button" class="kbf-pill" data-facet="' + esc(f.key) + '" data-value="">All</button>' +
          f.options.map(function (o) {
            return '<button type="button" class="kbf-pill" data-facet="' + esc(f.key) + '" ' +
              'data-value="' + esc(o.value) + '">' + esc(o.label) +
              ' <span class="kbf-n">' + o.count + '</span></button>';
          }).join('') +
        '</div></div>';
    }).join('');

    function labelFor(key) {
      for (var i = 0; i < facets.length; i++) if (facets[i].key === key) return facets[i].label;
      return key;
    }

    // A chip names the filter the reader sees, so it uses the option's display label.
    function valueLabelFor(key, value) {
      for (var i = 0; i < facets.length; i++) {
        if (facets[i].key !== key) continue;
        for (var j = 0; j < facets[i].options.length; j++) {
          if (facets[i].options[j].value === value) return facets[i].options[j].label;
        }
      }
      return value;
    }

    function syncControls() {
      qEl.value = state.q || '';
      Array.prototype.forEach.call(root.querySelectorAll('.kbf-pill'), function (b) {
        var on = (state[b.getAttribute('data-facet')] || '') === b.getAttribute('data-value');
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      Array.prototype.forEach.call(root.querySelectorAll('.kbf-select'), function (s) {
        s.value = state[s.getAttribute('data-facet')] || '';
      });
    }

    function renderChips() {
      var active = Object.keys(state).filter(function (k) { return k !== 'q' && state[k]; });
      if (state.q) active.unshift('q');
      chipsEl.innerHTML = active.length ? active.map(function (k) {
        var text = k === 'q' ? 'Search: “' + esc(state.q) + '”'
          : esc(labelFor(k)) + ': ' + esc(valueLabelFor(k, state[k]));
        return '<button type="button" class="kbf-chip" data-clear="' + esc(k) + '">' +
          text + '<span class="kbf-x" aria-hidden="true">×</span>' +
          '<span class="kbf-sr">, remove filter</span></button>';
      }).join('') : '';
      resetEl.hidden = !active.length;
    }

    function render() {
      var ranked = applyFilters(entries, state);
      // Guides lead the list: a curated page outranks the atoms it curates.
      // Stable partition — order WITHIN each tier is untouched (score order
      // under a query, alphabetical without one), so the frozen pure-function
      // ordering is preserved inside its tier.
      var guides = [], atoms = [];
      ranked.forEach(function (r) { (r.entry_type === 'guide' ? guides : atoms).push(r); });
      var results = guides.concat(atoms);
      countEl.textContent = guides.length
        ? 'Showing ' + guides.length + ' guide' + (guides.length === 1 ? '' : 's') + ' and ' +
          atoms.length + ' entr' + (atoms.length === 1 ? 'y' : 'ies') + ' of ' + entries.length
        : 'Showing ' + results.length + ' entr' + (results.length === 1 ? 'y' : 'ies') +
          ' of ' + entries.length;
      if (!results.length) {
        listEl.innerHTML = '<p class="kbf-empty"><strong>Nothing matches these filters.</strong> ' +
          'Try removing a filter, or clearing the search term.</p>';
      } else {
        listEl.innerHTML = '<ul>' + results.map(function (r) {
          var href = (opts.detailPage || '') + '?group=' + encodeURIComponent(r.group) +
            '&item=' + encodeURIComponent(r.title) + '&id=' + encodeURIComponent(r.id);
          return '<li class="' + (r.entry_type === 'guide' ? 'kbf-r-guide' : 'kbf-r-entry') + '">' +
            '<a href="' + href + '">' +
            '<span class="grouptag">' + esc(r.group) + '</span> ' +
            '<span class="kbname">' + esc(r.title) + '</span>' + guideBadge(r) + draftBadge(r) +
            (r.gist ? '<span class="kbresult-gist">' + esc(r.gist) + '</span>' : '') +
            (r.snippet ? '<span class="kbsnippet">' + esc(r.snippet) + '</span>' : '') +
            '<span class="arm">Open →</span></a></li>';
        }).join('') + '</ul>';
      }
      renderChips();
      syncControls();
      writeState(state);
    }

    root.addEventListener('click', function (e) {
      var pill = e.target.closest ? e.target.closest('.kbf-pill') : null;
      if (pill) { state[pill.getAttribute('data-facet')] = pill.getAttribute('data-value'); render(); return; }
      var chip = e.target.closest ? e.target.closest('.kbf-chip') : null;
      if (chip) { state[chip.getAttribute('data-clear')] = ''; render(); return; }
      if (e.target === resetEl) {
        Object.keys(state).forEach(function (k) { state[k] = ''; });
        render();
      }
    });

    root.addEventListener('change', function (e) {
      var sel = e.target;
      if (sel && sel.classList && sel.classList.contains('kbf-select')) {
        state[sel.getAttribute('data-facet')] = sel.value;
        render();
      }
    });

    qEl.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { state.q = qEl.value; render(); }, opts.debounce || 120);
    });

    render();
    return { getState: function () { return state; }, render: render };
  }

  window.KBSearch = {
    search: search,
    mount: mount,
    deriveFacets: deriveFacets,
    applyFilters: applyFilters,
    readState: readState,
    mountFaceted: mountFaceted
  };
})();
