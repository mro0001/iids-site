/* Project browse. Pure DOM, zero fetch — file://-safe. Three parts:
   - ProjectBrowse.search(items, query, opts) -> Result[]        (pure; frozen seam)
   - ProjectBrowse.deriveFacets(items) / .applyFilters(items, state)  (pure)
   - ProjectBrowse.mountFaceted(root, items, opts)               (the browse UI)
   - ProjectBrowse.mountOverview(root, items, opts)              (the at-a-glance band)

   Result = { item, score, matchedField, snippet }. The whole item rides along because a
   project card shows six fields; flattening would only mean re-joining them at render.

   Facet options are derived from the items, never hardcoded, so adding a project with a new
   research area adds that filter by itself and a facet with one value hides itself. */
(function () {
  var FIELDS = [
    { name: 'title', weight: 8 },
    { name: 'subject', weight: 5 },
    { name: 'award_number', weight: 5 },
    { name: 'lead', weight: 4 },
    { name: 'funder', weight: 3 },
    { name: 'program', weight: 3 },
    { name: 'research_area', weight: 3 },
    { name: 'affiliation', weight: 2 },
    { name: 'partners', weight: 2 },
    { name: 'description', weight: 2 },
    { name: 'infrastructure', weight: 1 },
    { name: 'deliverables', weight: 1 },
    { name: 'significance', weight: 1 }
  ];

  /* Values that record the ABSENCE of a value rather than naming one. They are legitimate
     filter options — 'Status: Unknown (33)' narrows the collection usefully — but rendered
     as a styled badge, a headline count or a funder name they read as missing data that
     shipped. Named here so the rule is one place rather than scattered through the markup. */
  var UNRECORDED = { status: 'Unknown', research_area: 'Other', funder_agency: 'Other' };

  /* The one sentence that qualifies a low-confidence record. It renders in two places on a
     card and has to be the same sentence in both, because on a record with no description
     it stops being a tooltip on a badge and becomes the card's only line of prose. */
  var LOW_CONFIDENCE =
    'Internal records attest this project; no public source was found to document it';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function text(item, field) {
    var v = item[field];
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
  /* 'https://hohenlohelab.github.io/x' -> 'hohenlohelab.github.io'. No URL parser: the store is
     read from a file:// page and this only ever sees an http(s) or relative source_url. */
  function hostOf(url) {
    var m = String(url || '').match(/^https?:\/\/(?:www\.)?([^\/?#]+)/i);
    return m ? m[1] : String(url || '').replace(/^\.?\//, '');
  }

  function truncate(s, n) {
    var t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    return t.length <= n ? t : t.slice(0, n).replace(/[\s,;:.]+\S*$/, '') + '…';
  }

  /* Every term must match somewhere (AND), scored by the heaviest field it hit. */
  function search(items, query, opts) {
    opts = opts || {};
    var terms = String(query == null ? '' : query).toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var out = [];
    (items || []).forEach(function (it) {
      var hays = FIELDS.map(function (f) {
        return { name: f.name, weight: f.weight, text: text(it, f.name) };
      });
      var total = 0, bestField = '', bestW = -1, ok = true, proseTerm = null;
      for (var t = 0; t < terms.length; t++) {
        var term = terms[t], tw = 0, tf = '';
        for (var k = 0; k < hays.length; k++) {
          if (hays[k].text.indexOf(term) !== -1 && hays[k].weight > tw) {
            tw = hays[k].weight; tf = hays[k].name;
          }
        }
        if (tw === 0) { ok = false; break; }
        total += tw;
        if (tw > bestW) { bestW = tw; bestField = tf; }
        if ((tf === 'description' || tf === 'significance') && proseTerm === null) proseTerm = term;
      }
      if (!ok) return;
      out.push({
        item: it, score: total, matchedField: bestField,
        snippet: proseTerm ? snippet(it.description || it.significance, proseTerm, opts.snippetLen || 150) : ''
      });
    });
    out.sort(function (a, b) {
      return b.score - a.score || String(a.item.title).localeCompare(String(b.item.title));
    });
    return opts.limit ? out.slice(0, opts.limit) : out;
  }

  /* ---------------------------------------------------------------- facets */

  function one(field) {
    return function (it) { return it[field] ? [String(it[field])] : []; };
  }
  function many(field) {
    return function (it) {
      var v = it[field];
      if (!v) return [];
      return Array.isArray(v) ? v.map(String) : [String(v)];
    };
  }

  var FACETS = [
    { key: 'research_area', label: 'Research area', values: one('research_area') },
    { key: 'status', label: 'Status', values: one('status') },
    { key: 'project_type', label: 'Project type', control: 'select', values: one('project_type') },
    { key: 'funder_agency', label: 'Funder', control: 'select', values: one('funder_agency') },
    /* Driven by the topic cloud rather than a control of its own — the subject vocabulary is
       several hundred mostly-singleton terms, which is a cloud and not a filter list. */
    { key: 'topic', label: 'Topic', control: 'none', values: many('subject') },
    /* Driven by the overview's year histogram — the histogram is already the control, and a
       text search for a year string would match award numbers and prose instead of dates. */
    { key: 'year', label: 'Start year', control: 'none', values: function (it) {
      var y = year(it);
      return y === null ? [] : [String(y)];
    } }
  ];

  function deriveFacets(items) {
    return FACETS.map(function (f) {
      var counts = {};
      (items || []).forEach(function (it) {
        f.values(it).forEach(function (v) { if (v) counts[v] = (counts[v] || 0) + 1; });
      });
      var options = Object.keys(counts).map(function (v) {
        return { value: v, count: counts[v] };
      }).sort(function (a, b) {
        return b.count - a.count || a.value.localeCompare(b.value);
      });
      return { key: f.key, label: f.label, control: f.control || 'pills', options: options };
    }).filter(function (f) { return f.control !== 'none' && f.options.length > 1; });
  }

  function matchesFacets(item, state) {
    for (var i = 0; i < FACETS.length; i++) {
      var f = FACETS[i], want = state[f.key];
      if (!want) continue;
      var vals = f.values(item).map(function (v) { return v.toLowerCase(); });
      if (vals.indexOf(String(want).toLowerCase()) === -1) return false;
    }
    return true;
  }

  function year(item) {
    var d = parseInt(item.date, 10);
    return isNaN(d) ? null : d;
  }

  var SORTS = {
    title: function (a, b) { return String(a.item.title).localeCompare(String(b.item.title)); },
    newest: function (a, b) {
      var ya = year(a.item), yb = year(b.item);
      if (ya === yb) return String(a.item.title).localeCompare(String(b.item.title));
      if (ya === null) return 1;
      if (yb === null) return -1;
      return yb - ya;
    },
    oldest: function (a, b) {
      var ya = year(a.item), yb = year(b.item);
      if (ya === yb) return String(a.item.title).localeCompare(String(b.item.title));
      if (ya === null) return 1;
      if (yb === null) return -1;
      return ya - yb;
    }
  };

  /* applyFilters(items, state) -> Result[]  (pure)
     state = { q, research_area, status, project_type, funder_agency, topic, year, sort }.
     Facets narrow first, then the query ranks what is left, so search() keeps its frozen
     behavior and never sees a filtered-out project. An explicit sort overrides relevance. */
  function applyFilters(items, state) {
    state = state || {};
    var narrowed = (items || []).filter(function (it) { return matchesFacets(it, state); });
    var results;
    if (String(state.q == null ? '' : state.q).trim()) {
      results = search(narrowed, state.q, state);
      if (state.sort && SORTS[state.sort]) results = results.slice().sort(SORTS[state.sort]);
      return results;
    }
    results = narrowed.map(function (it) {
      return { item: it, score: 0, matchedField: '', snippet: '' };
    });
    return results.sort(SORTS[state.sort] || SORTS.title);
  }

  /* ------------------------------------------------------------- URL state */

  function readState(searchStr) {
    var out = { q: '', sort: '' };
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
      window.history.replaceState(null, '', window.location.pathname + qs + window.location.hash);
    } catch (err) { /* file:// — keep filtering, lose only the shareable URL */ }
  }

  /* ------------------------------------------------------------ card (SOFT)

     The one project-card renderer. The browse grid and any other surface that shows
     project cards (the Subprojects section on an entry page) call this, so a card is one
     presentation everywhere rather than two drifting copies.
     o = { detailPage, titleOf, childCount } — the maps are optional; without them the
     Part-of tag and the Includes-N line simply do not render. */

  function cardHtml(r, o) {
    o = o || {};
    var titleOf = o.titleOf || {};
    var childCount = o.childCount || {};
    var it = r.item;
    var href = (o.detailPage == null ? 'project_entry.html' : o.detailPage) +
      '?id=' + encodeURIComponent(it.objectid);
    var span = it.date ? esc(it.date) + (it.end_year && it.end_year !== it.date ? '–' + esc(it.end_year) : '') : '';
    /* Lead is a free-text field and runs to a full title-and-appointment line in places;
       on a card it is an identifier, so it gets cut at a name's worth of characters.
       'Other' as a funder agency names nothing, so the funder string itself is better. */
    var funder = it.funder_agency && it.funder_agency !== UNRECORDED.funder_agency
      ? it.funder_agency : truncate(it.funder, 58);
    var meta = [truncate(it.lead, 58), funder, span]
      .filter(Boolean).map(function (v) { return esc(v); }).join('<span class="pb-dot">·</span>');
    /* `gist` is a one-sentence line written for this slot, so it beats a truncated description
       cut mid-clause. A search snippet still wins over both: while a query is running the card
       has to show WHY it matched. */
    var body = esc(r.snippet || it.gist || truncate(it.description, 190));
    /* Some records carry no description at all: internal records attest the project and no
       public source documents it, so there is nothing about it that a source supports.
       Omitting the description block leaves a title, a badge and an arrow over blank space,
       which reads as a hole in the grid rather than as a record. So the absence gets a
       state of its own — with no description the low-confidence qualifier stops being a
       badge stacked over nothing and becomes the card's explanatory line, the same words
       promoted out of the tooltip into the slot the description would have filled. The
       card then says what it knows (this project exists, we could not document it
       publicly) instead of looking unfinished. */
    var note = !body && it.confidence === 'Low' ? LOW_CONFIDENCE + '.' : '';
    /* A third state, between "described" and "nothing is publicly documented": the award IS
       publicly documented but the funder publishes no description, and the project's own page
       yielded no usable text either. The card would otherwise be a title over blank space. It
       says where the record is documented instead, which is the one thing it does know. */
    if (!body && !note && it.source_url) {
      note = 'No published description. Documented at ' + hostOf(it.source_url) + '.';
    }
    var tags = '';
    if (it.research_area) tags += '<span class="pb-tag">' + esc(it.research_area) + '</span>';
    if (it.status && it.status !== UNRECORDED.status) {
      tags += '<span class="pb-tag pb-tag--status">' + esc(it.status) + '</span>';
    }
    if (it.parent_project && titleOf[it.parent_project]) {
      tags += '<span class="pb-tag pb-tag--partof">Part of: ' + esc(titleOf[it.parent_project]) + '</span>';
    }
    /* The qualifier is what stops 'Low confidence' being read as a judgement on the work,
       so it cannot live in a title attribute alone: that reaches neither keyboard nor
       touch users. Visible text for the mouse, clipped text for everyone else. Skipped
       where the note below already carries the same words in full. */
    if (it.confidence === 'Low' && !note) tags += '<span class="pb-tag pb-tag--low" ' +
      'title="' + esc(LOW_CONFIDENCE) + '">' +
      'Low confidence<span class="pb-sr">: internal records attest this project; no public ' +
      'source was found to document it</span></span>';
    var subs = childCount[it.objectid]
      ? '<span class="pb-cardsubs">Includes ' + childCount[it.objectid] + ' subproject' +
        (childCount[it.objectid] === 1 ? '' : 's') + '</span>'
      : '';
    return '<li class="pb-card"><a href="' + href + '">' +
      '<h3 class="pb-cardtitle">' + esc(it.title) + '</h3>' +
      (tags ? '<span class="pb-tags">' + tags + '</span>' : '') +
      (meta ? '<span class="pb-cardmeta">' + meta + '</span>' : '') +
      (body ? '<span class="pb-cardtext">' + body + '</span>' : '') +
      (note ? '<span class="pb-cardtext pb-cardnote">' +
        '<b class="pb-notelabel">Low confidence</b> ' + esc(note) + '</span>' : '') +
      subs +
      '<span class="pb-arm">Open →</span>' +
      '</a></li>';
  }

  /* cardsHtml(items, opts) -> the card grid as an HTML string, for a host that has its own
     section to put it in. opts as cardHtml's. */
  function cardsHtml(items, o) {
    return '<ul class="pb-cards">' + (items || []).map(function (it) {
      return cardHtml({ item: it, snippet: '' }, o);
    }).join('') + '</ul>';
  }

  /* ---------------------------------------------------------- browse UI (SOFT)

     The filter panel COLLAPSES. With five facets over the full collection the expanded panel is
     taller than the viewport, which pushed every result below the fold. Collapsed is the
     default; active filters stay visible as chips outside the panel, so a narrowed view
     never hides why it is narrow. */

  function mountFaceted(root, items, opts) {
    opts = opts || {};
    /* Subprojects — rows whose parent_project names another record's objectid — are
       SEARCH-ONLY here (decided 2026-08-13). The unqueried grid, the facet options and
       the counts are all top-level, so 126 stays 126; but a running query ranks children
       alongside everything else, wearing a Part-of tag, because a search that cannot find
       real work reads as a gap in the portfolio. The parent's entry page remains the
       canonical child list. */
    var top = (items || []).filter(function (i) { return !i.parent_project; });
    var titleOf = {}, childCount = {};
    (items || []).forEach(function (i) {
      titleOf[i.objectid] = i.title;
      if (i.parent_project) childCount[i.parent_project] = (childCount[i.parent_project] || 0) + 1;
    });
    var facets = deriveFacets(top);
    var state = readState(opts.initialSearch != null ? opts.initialSearch : window.location.search);
    var open = !!opts.filtersOpen;
    var timer = null;

    root.innerHTML =
      '<div class="pb">' +
        '<div class="pb-searchrow">' +
          '<input class="pb-search" type="search" id="pb-q" ' +
            'placeholder="' + esc(opts.placeholder || 'Search projects, people, funders, awards…') + '" ' +
            'aria-label="Search projects">' +
          '<button type="button" class="pb-filtertoggle" aria-expanded="false" aria-controls="pb-facets">' +
            'Filters<span class="pb-activecount" hidden></span>' +
          '</button>' +
        '</div>' +
        '<div class="pb-facets" id="pb-facets" hidden></div>' +
        '<div class="pb-chips" aria-live="polite"></div>' +
        '<div class="pb-meta">' +
          '<span class="pb-count" aria-live="polite"></span>' +
          '<span class="pb-metaright">' +
            '<label class="pb-sortlabel" for="pb-sort">Sort</label>' +
            /* The blank option is whatever applyFilters does with no explicit sort, which
               is relevance while a query is running and A–Z otherwise. Its label follows,
               and the explicit A–Z option appears only when the two differ. */
            '<select class="pb-sort" id="pb-sort">' +
              '<option value="">A–Z</option>' +
              '<option value="title" hidden>A–Z</option>' +
              '<option value="newest">Newest first</option>' +
              '<option value="oldest">Oldest first</option>' +
            '</select>' +
            '<button type="button" class="pb-reset" hidden>Reset</button>' +
          '</span>' +
        '</div>' +
        '<div class="pb-results"></div>' +
      '</div>';

    var qEl = root.querySelector('#pb-q');
    var toggleEl = root.querySelector('.pb-filtertoggle');
    var activeCountEl = root.querySelector('.pb-activecount');
    var facetsEl = root.querySelector('.pb-facets');
    var chipsEl = root.querySelector('.pb-chips');
    var countEl = root.querySelector('.pb-count');
    var sortEl = root.querySelector('.pb-sort');
    var resetEl = root.querySelector('.pb-reset');
    var listEl = root.querySelector('.pb-results');

    facetsEl.innerHTML = facets.map(function (f) {
      if (f.control === 'select') {
        return '<div class="pb-row"><span class="pb-label" id="pb-lbl-' + f.key + '">' + esc(f.label) + '</span>' +
          '<select class="pb-select" data-facet="' + esc(f.key) + '" aria-labelledby="pb-lbl-' + f.key + '">' +
            '<option value="">All</option>' +
            f.options.map(function (o) {
              return '<option value="' + esc(o.value) + '">' + esc(o.value) + ' (' + o.count + ')</option>';
            }).join('') +
          '</select></div>';
      }
      return '<div class="pb-row"><span class="pb-label">' + esc(f.label) + '</span>' +
        '<div class="pb-pills" role="group" aria-label="' + esc(f.label) + '">' +
          '<button type="button" class="pb-pill" data-facet="' + esc(f.key) + '" data-value="">All</button>' +
          f.options.map(function (o) {
            return '<button type="button" class="pb-pill" data-facet="' + esc(f.key) + '" ' +
              'data-value="' + esc(o.value) + '">' + esc(o.value) +
              ' <span class="pb-n">' + o.count + '</span></button>';
          }).join('') +
        '</div></div>';
    }).join('');

    function labelFor(key) {
      for (var i = 0; i < FACETS.length; i++) if (FACETS[i].key === key) return FACETS[i].label;
      return key;
    }
    function activeKeys() {
      return Object.keys(state).filter(function (k) {
        return k !== 'q' && k !== 'sort' && state[k];
      });
    }
    function setOpen(next) {
      open = next;
      facetsEl.hidden = !open;
      toggleEl.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggleEl.classList.toggle('open', open);
    }

    function syncControls() {
      if (qEl.value !== (state.q || '')) qEl.value = state.q || '';
      var ranked = !!String(state.q == null ? '' : state.q).trim();
      sortEl.options[0].textContent = ranked ? 'Relevance' : 'A–Z';
      /* disabled as well as hidden: a browser that ignores hidden on an option would
         otherwise offer A–Z twice while not ranking. */
      sortEl.options[1].hidden = sortEl.options[1].disabled = !ranked;
      sortEl.value = state.sort || '';
      Array.prototype.forEach.call(root.querySelectorAll('.pb-pill'), function (b) {
        var on = (state[b.getAttribute('data-facet')] || '') === b.getAttribute('data-value');
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      Array.prototype.forEach.call(root.querySelectorAll('.pb-select'), function (s) {
        s.value = state[s.getAttribute('data-facet')] || '';
      });
      var n = activeKeys().length;
      activeCountEl.hidden = !n;
      activeCountEl.textContent = n ? String(n) : '';
    }

    function renderChips() {
      var active = activeKeys();
      if (state.q) active.unshift('q');
      chipsEl.innerHTML = active.length ? active.map(function (k) {
        var label = k === 'q' ? 'Search: “' + esc(state.q) + '”' : esc(labelFor(k)) + ': ' + esc(state[k]);
        return '<button type="button" class="pb-chip" data-clear="' + esc(k) + '">' +
          label + '<span class="pb-x" aria-hidden="true">×</span>' +
          '<span class="pb-sr">, remove filter</span></button>';
      }).join('') : '';
      resetEl.hidden = !active.length;
    }

    function card(r) {
      return cardHtml(r, { detailPage: opts.detailPage, titleOf: titleOf, childCount: childCount });
    }

    function render() {
      /* With no query the blank option already means A–Z, so an explicit sort=title would
         select an option the control hides. Same order either way. */
      var ranked = !!String(state.q == null ? '' : state.q).trim();
      if (state.sort === 'title' && !ranked) state.sort = '';
      var results = applyFilters(ranked ? items : top, state);
      /* Subprojects are counted apart from the 'of' total — they are not among the 126, so
         folding them in could show more matches than the collection claims to hold. */
      var nSub = 0;
      results.forEach(function (r) { if (r.item.parent_project) nSub++; });
      countEl.textContent = 'Showing ' + (results.length - nSub) + ' of ' + top.length + ' projects' +
        (nSub ? ', plus ' + nSub + ' subproject' + (nSub === 1 ? '' : 's') : '');
      if (!results.length) {
        listEl.innerHTML = '<p class="pb-empty"><strong>Nothing matches these filters.</strong> ' +
          'Try removing a filter, or clearing the search term.</p>';
      } else {
        listEl.innerHTML = '<ul class="pb-cards">' + results.map(card).join('') + '</ul>';
      }
      renderChips();
      syncControls();
      writeState(state);
      if (opts.onRender) opts.onRender(results, state);
    }

    root.addEventListener('click', function (e) {
      var t = e.target;
      if (!t.closest) return;
      if (t.closest('.pb-filtertoggle')) { setOpen(!open); return; }
      var pill = t.closest('.pb-pill');
      if (pill) { state[pill.getAttribute('data-facet')] = pill.getAttribute('data-value'); render(); return; }
      var chip = t.closest('.pb-chip');
      if (chip) { state[chip.getAttribute('data-clear')] = ''; render(); return; }
      if (t.closest('.pb-reset')) {
        Object.keys(state).forEach(function (k) { state[k] = ''; });
        render();
      }
    });

    root.addEventListener('change', function (e) {
      var el = e.target;
      if (!el || !el.classList) return;
      if (el.classList.contains('pb-select')) { state[el.getAttribute('data-facet')] = el.value; render(); }
      else if (el.classList.contains('pb-sort')) { state.sort = el.value; render(); }
    });

    qEl.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { state.q = qEl.value; render(); }, opts.debounce || 120);
    });

    setOpen(open);
    render();

    return {
      getState: function () { return state; },
      render: render,
      /* setState(patch, focus) — how the overview band drives the browse. Passing
         focus scrolls the results into view, since the band sits above them. */
      setState: function (patch, focus) {
        Object.keys(patch || {}).forEach(function (k) { if (k in state) state[k] = patch[k]; });
        render();
        if (focus && root.scrollIntoView) {
          /* A smooth scroll the user did not ask for can trigger vestibular symptoms. */
          var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        }
      }
    };
  }

  /* -------------------------------------------------------- overview (SOFT)

     A research-area distribution, a year histogram and a topic cloud. Every mark is
     a button that narrows the browse below it: the summary is the way into the collection,
     not a decoration beside it. */

  function mountOverview(root, items, opts) {
    opts = opts || {};
    var browse = opts.browse || null;
    /* Top-level only: a subproject here would count its parent's research area twice and
       put marks on the histogram that the unqueried browse below cannot show. */
    items = (items || []).filter(function (i) { return !i.parent_project; });

    var years = items.map(year).filter(function (y) { return y !== null; }).sort();
    var yearHist = {};
    years.forEach(function (y) { yearHist[y] = (yearHist[y] || 0) + 1; });
    var areaHist = {};
    items.forEach(function (i) {
      if (i.research_area) areaHist[i.research_area] = (areaHist[i.research_area] || 0) + 1;
    });
    /* Topic filtering matches case-insensitively, so the cloud has to count that way or a
       term's count disagrees with what clicking it returns — and the shared-term threshold
       drops terms whose two mentions differ only in case ('lidar' / 'LiDAR'). Counted on a
       casefolded key; displayed as the most frequent surface form, ties going to the more
       capitalized one, which is where the acronyms and proper nouns sit. */
    var topicHist = {};
    items.forEach(function (i) {
      (Array.isArray(i.subject) ? i.subject : []).forEach(function (s) {
        var surface = String(s).trim();
        if (surface.length <= 2) return;
        var k = surface.toLowerCase();
        var g = topicHist[k] || (topicHist[k] = { count: 0, forms: {} });
        g.count++;
        g.forms[surface] = (g.forms[surface] || 0) + 1;
      });
    });
    function surfaceForm(g) {
      return Object.keys(g.forms).sort(function (a, b) {
        return g.forms[b] - g.forms[a] || capitals(b) - capitals(a) || a.localeCompare(b);
      })[0];
    }
    function capitals(s) { return (s.match(/[A-Z]/g) || []).length; }

    var areas = Object.keys(areaHist).map(function (a) { return { value: a, count: areaHist[a] }; })
      .sort(function (a, b) { return b.count - a.count || a.value.localeCompare(b.value); });
    var amax = areas.length ? areas[0].count : 1;

    var yks = Object.keys(yearHist).map(Number).sort(function (a, b) { return a - b; });
    var ymax = yks.reduce(function (m, y) { return Math.max(m, yearHist[y]); }, 1);

    var topics = Object.keys(topicHist)
      .map(function (t) { return { value: surfaceForm(topicHist[t]), count: topicHist[t].count }; })
      .filter(function (t) { return t.count >= (opts.topicMin || 2); })
      .sort(function (a, b) { return a.value.toLowerCase().localeCompare(b.value.toLowerCase()); });
    var tmax = topics.reduce(function (m, t) { return Math.max(m, t.count); }, 1);

    /* Each panel is a <details>. Expanded, the three of them run past three screens on a
       laptop and push the results — the reason anyone opened the page — below the fold. Only
       the research-area distribution opens by default; the rest state their size in the
       summary line so a closed panel still tells you what is in it. */
    function panel(title, hint, open, body) {
      return '<details class="pb-panel"' + (open ? ' open' : '') + '>' +
        '<summary class="pb-h">' + esc(title) + '<span class="pb-hint">' + esc(hint) + '</span></summary>' +
        body + '</details>';
    }

    root.innerHTML =
      '<div class="pb-overview">' +
        (areas.length > 1 ? panel('Research areas', areas.length + ' groups', true,
          '<p class="pb-sub">An editorial grouping, not a funder classification. Select one to filter.</p>' +
          '<div class="pb-bars">' + areas.map(function (a) {
            return '<button class="pb-bar" type="button" data-facet="research_area" data-value="' + esc(a.value) + '">' +
              '<span class="pb-barlabel">' + esc(a.value) + '</span>' +
              '<span class="pb-bartrack"><span class="pb-barfill" style="width:' +
                (100 * a.count / amax).toFixed(1) + '%"></span></span>' +
              '<span class="pb-barnum">' + a.count + '</span></button>';
          }).join('') + '</div>') : '') +

        /* Fiscal year, not project start: `date` is the University of Idaho fiscal year the
           proposal was submitted in (1 July – 30 June, named for the year it ends). Funder
           start dates exist for only a minority of awards, so the collection uses the one
           date every record actually has. The label has to say which, or a reader takes
           these bars for project start years. */
        (yks.length > 1 ? panel('By fiscal year',
          'FY' + yks[0] + '–FY' + yks[yks.length - 1], false,
          '<p class="pb-sub">' + years.length + ' of ' + items.length +
            ' projects carry a fiscal year — the University of Idaho fiscal year the proposal ' +
            'was submitted in, not the project start. Select a year to filter.</p>' +
          /* Only years with data get a bar, so without a break marker 1964, 1980, 1998 and
             2002 sit shoulder to shoulder as if they were consecutive. The marker says the
             axis skips; it is not a time axis and does not pretend to be one. */
          '<div class="pb-years">' + yks.map(function (y, i) {
            var gap = i > 0 && y - yks[i - 1] > 1
              ? '<span class="pb-ygap" aria-hidden="true" title="' + (yks[i - 1] + 1) +
                '–' + (y - 1) + ': no projects on record">⋯</span>' : '';
            return gap +
              '<button class="pb-year" type="button" data-facet="year" data-value="' + y + '" ' +
              'title="' + y + ': ' + yearHist[y] + ' project' + (yearHist[y] === 1 ? '' : 's') + '">' +
              '<span class="pb-ybar" style="height:' +
                Math.max(6, 100 * yearHist[y] / ymax).toFixed(0) + '%"></span>' +
              '<span class="pb-ytick">' + y + '</span></button>';
          }).join('') + '</div>') : '') +

        (topics.length ? panel('Topics', topics.length + ' shared terms', false,
          '<p class="pb-sub">Subject terms carried by two or more projects, sized by how many. ' +
            'Select one to filter.</p>' +
          '<div class="pb-cloud">' + topics.map(function (t) {
            return '<button class="pb-term" type="button" data-facet="topic" data-value="' + esc(t.value) + '" ' +
              'style="font-size:' + (0.78 + 0.85 * (t.count / tmax)).toFixed(2) + 'rem">' +
              esc(t.value) + '<span class="pb-termn">' + t.count + '</span></button>';
          }).join('') + '</div>') : '') +
      '</div>';

    root.addEventListener('click', function (e) {
      if (!browse || !e.target.closest) return;
      var btn = e.target.closest('[data-facet]');
      if (btn) {
        var key = btn.getAttribute('data-facet');
        var patch = {};
        patch[key] = browse.getState()[key] === btn.getAttribute('data-value') ? '' : btn.getAttribute('data-value');
        browse.setState(patch, true);
      }
    });
  }

  window.ProjectBrowse = {
    search: search,
    deriveFacets: deriveFacets,
    applyFilters: applyFilters,
    readState: readState,
    cardsHtml: cardsHtml,
    mountFaceted: mountFaceted,
    mountOverview: mountOverview
  };
})();
