/* Project entry — the single-project renderer. Pure DOM, zero fetch (file://-safe).
   ProjectEntry.mount(root, item, opts) renders one item from window.PROJECTS_DATA.

   Every field is optional. A field with no value is omitted rather than rendered empty,
   because the collection is deliberately uneven: a record that internal sources attest but
   no public source documents publishes as a stub, and the page has to say so rather than
   look broken. That is what the confidence note is for. */
(function () {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function val(item, field) {
    var v = item[field];
    if (v == null) return '';
    if (Array.isArray(v)) return v.join('; ');
    return String(v).trim();
  }

  /* Ordered because this is a reading order, not a schema: who ran it, who paid for it,
     when, on what, and what came out. */
  var FACTS = [
    { key: 'lead', label: 'Lead' },
    { key: 'affiliation', label: 'Affiliation' },
    { key: 'partners', label: 'Partners' },
    { key: 'funder', label: 'Funder' },
    { key: 'award_number', label: 'Award number' },
    { key: 'program', label: 'Program' },
    { key: 'infrastructure', label: 'Infrastructure used' },
    { key: 'deliverables', label: 'Deliverables' },
    { key: 'subject', label: 'Subjects' },
    { key: 'location', label: 'Location' },
    { key: 'location_basis', label: 'How the location was assigned' }
  ];

  /* Values that record the absence of a value rather than naming one. Kept in the data and
     in the browse filters, where 'Status: Unknown (33)' is a real narrowing; suppressed as
     page chrome, where a badge reading UNKNOWN looks like a rendering failure. */
  var UNRECORDED = { status: 'Unknown', research_area: 'Other' };

  function span(item) {
    var a = val(item, 'date'), b = val(item, 'end_year');
    if (a && b && a !== b) return a + '–' + b;
    return a || b || '';
  }

  /* The arrow is aria-hidden, so without the clipped span a screen-reader user gets no cue
     at all that the link leaves the site. */
  function linkOut(url) {
    var label = String(url).replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (label.length > 62) label = label.slice(0, 60) + '…';
    return '<a class="pe-source" href="' + esc(url) + '" rel="noopener noreferrer" target="_blank">' +
      esc(label) + ' <span aria-hidden="true">↗</span>' +
      '<span class="pe-sr"> (opens in a new tab)</span></a>';
  }

  /* A source that is a page on THIS site is not a citation, and rendering it as one gets two
     things wrong: it opens in a new tab and says so, and it sits at the foot of the record
     under the heading a reader skips. A record whose source is in-site is a record that
     CONTINUES somewhere — the page is the rest of it — so it links under the description,
     where a reader is looking for the next step, in the same words the browse card uses to
     open a record ('Open …'). Records citing an external source are untouched: they keep the
     Source section at the bottom, because a citation is exactly what those are. */
  function isInSite(url) {
    return !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(String(url).trim());
  }
  /* Past this length the link stops reading as a destination and starts reading as a
     sentence, so it falls back to naming the destination generically. */
  var GO_MAX = 48;
  function linkOn(url, title) {
    var t = String(title == null ? '' : title).trim();
    var label = (t && t.length <= GO_MAX) ? 'Open ' + t : 'Open the project page';
    return '<p class="pe-continue"><a class="pe-cta" href="' + esc(url) + '">' +
      esc(label) + ' <span aria-hidden="true">→</span></a></p>';
  }

  /* A URL inside a record value is a link, the same as the Source link is. This runs on
     ALREADY-ESCAPED text, so the anchor is the only markup it introduces and an entity in
     the href ('&amp;') decodes back to the character the browser needs. A quote ends a URL
     (several values quote a sentence containing one) and trailing sentence punctuation is
     peeled off the match rather than linked. */
  var URL_IN_TEXT = /https?:\/\/[^\s<>"'’]+/g;
  function linkify(escaped) {
    return escaped.replace(URL_IN_TEXT, function (m) {
      var tail = '';
      while (/[.,)\]]$/.test(m)) { tail = m.slice(-1) + tail; m = m.slice(0, -1); }
      return '<a class="pe-source" href="' + m + '" rel="noopener noreferrer">' + m + '</a>' + tail;
    });
  }

  /* One URL, and it is the source link already rendered below — a Deliverables row that
     repeats it verbatim is a duplicate, not a deliverable. */
  function duplicatesSource(item) {
    var src = val(item, 'source_url');
    if (!src) return false;
    var urls = val(item, 'deliverables').match(URL_IN_TEXT) || [];
    function norm(u) { return String(u).replace(/[.,)\]]+$/, '').replace(/\/$/, '').toLowerCase(); }
    return urls.length === 1 && norm(urls[0]) === norm(src);
  }

  function truncate(s, n) {
    var t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    return t.length <= n ? t : t.slice(0, n).replace(/[\s,;:.]+\S*$/, '') + '…';
  }

  function mount(root, item, opts) {
    opts = opts || {};
    if (!root) return;
    /* A bad ?id= still has to produce a page with a heading: the host has no other h1. */
    if (!item) {
      root.innerHTML = '<h1 class="pe-missing">Project not found</h1>' +
        (opts.browsePage ? '<p class="pe-missing"><a href="' + esc(opts.browsePage) +
          '">Back to all projects</a></p>' : '');
      return;
    }

    /* The parent/child relationship is one column, parent_project = the parent's objectid,
       derived here in both directions from opts.items (the full store — the browse hides
       subprojects, so the page cannot re-derive this from what the browse shows). A child
       whose parent row is withheld gets no Part-of line: the id alone names nothing. */
    var all = opts.items || [];
    var parent = val(item, 'parent_project')
      ? all.filter(function (i) { return i.objectid === item.parent_project; })[0]
      : null;
    var children = all.filter(function (i) { return i.parent_project === item.objectid; })
      .sort(function (a, b) { return String(a.title).localeCompare(String(b.title)); });

    var tags = [];
    if (val(item, 'status') && val(item, 'status') !== UNRECORDED.status) {
      tags.push({ text: val(item, 'status'), cls: '' });
    }
    if (val(item, 'project_type')) tags.push({ text: val(item, 'project_type'), cls: '' });
    var years = span(item);
    if (years) tags.push({ text: years, cls: '' });

    /* location_basis explains a location. On its own it reads as an answer to a question the
       page never asked ("no project site named in the record"), so it rides with location. */
    var facts = FACTS.filter(function (f) {
      if (!val(item, f.key)) return false;
      if (f.key === 'location_basis' && !val(item, 'location')) return false;
      if (f.key === 'deliverables' && duplicatesSource(item)) return false;
      return true;
    });

    /* The low-confidence note, built before the markup because WHERE it goes depends on
       whether there is a description. With one, it is a footnote under a page that has
       already said something. Without one — and 15 records have no description, because
       nothing about them is publicly documented — the description slot is exactly where a
       reader looks for what the project is, so the note fills that slot instead of trailing
       a page with no narrative in it. Same words either way; only 'above' has to move with
       it, since on a stub there is nothing above to point at. */
    var hasDescription = !!val(item, 'description');
    var src = val(item, 'source_url');
    var continues = src && isInSite(src);
    var note = val(item, 'confidence') === 'Low'
      ? '<p class="pe-note' + (hasDescription ? '' : ' pe-note--lead') + '">' +
        '<strong>Evidence: low confidence.</strong> Internal IIDS records ' +
        'attest this engagement, but no public source documenting it was found. What appears ' +
        (hasDescription ? 'above' : 'on this page') +
        ' is only what those internal records support.' +
        /* Which record system attests it. This is the ONLY place provenance renders:
           it belongs with the evidence claim, not in the project's description. */
        (val(item, 'evidence_note') ? ' ' + esc(val(item, 'evidence_note')) : '') +
        '</p>'
      : '';

    root.innerHTML =
      '<article class="pe">' +
        (val(item, 'research_area') && val(item, 'research_area') !== UNRECORDED.research_area
          ? '<p class="pe-eyebrow">' + esc(val(item, 'research_area')) + '</p>' : '') +
        '<h1 class="pe-title">' + esc(val(item, 'title')) + '</h1>' +
        (tags.length ? '<p class="pe-tags">' + tags.map(function (t) {
          return '<span class="pe-tag">' + esc(t.text) + '</span>';
        }).join('') + '</p>' : '') +

        (parent
          ? '<p class="pe-partof">Part of <a href="?id=' +
            encodeURIComponent(parent.objectid) + '">' + esc(parent.title) + '</a></p>' : '') +

        (hasDescription
          ? '<div class="pe-body"><p>' + esc(val(item, 'description')) + '</p></div>'
          : note) +

        (continues ? linkOn(src, val(item, 'title')) : '') +

        /* The funder's own abstract, verbatim. It sits BELOW the short description rather than
           replacing it because the two do different jobs: the description is written to be read
           at a glance, the abstract is the primary source and runs long (median ~2,400 chars).
           Rendered in a <blockquote> and attributed, because it is quoted, not authored here —
           the same discipline the KB applies to ported text. Paragraph breaks in the source are
           preserved; nothing else about it is touched. */
        (val(item, 'abstract')
          ? '<section class="pe-section pe-abstract">' +
            '<h2>Abstract</h2>' +
            '<blockquote class="pe-abstracttext">' +
            String(val(item, 'abstract')).split(/\n{2,}/).map(function (p) {
              return '<p>' + esc(p.replace(/\s*\n\s*/g, ' ').trim()) + '</p>';
            }).join('') +
            '</blockquote>' +
            (src
              ? '<p class="pe-abstractcite">Quoted from <a href="' + esc(src) + '"' +
                (isInSite(src) ? '' : ' rel="noopener"') + '>the funder\'s public award record</a>.</p>'
              : '') +
            '</section>' : '') +

        /* Subprojects render as the browse's own cards — one card presentation site-wide,
           not a second copy that drifts — which needs project-browse.js and .css on the
           host page. A host that loads neither still gets the plain linked list.
           detailPage '' keeps the links on this page: '?id=<child>'. */
        (children.length
          ? '<section class="pe-section"><h2>Subprojects</h2>' +
            (window.ProjectBrowse && window.ProjectBrowse.cardsHtml
              ? window.ProjectBrowse.cardsHtml(children, { detailPage: '' })
              : '<ul class="pe-subs">' +
                children.map(function (c) {
                  return '<li><a href="?id=' + encodeURIComponent(c.objectid) + '">' +
                    esc(c.title) + '</a>' +
                    (val(c, 'description')
                      ? '<span class="pe-subtext">' + esc(truncate(c.description, 160)) + '</span>'
                      : '') +
                    '</li>';
                }).join('') + '</ul>') +
            '</section>' : '') +

        (val(item, 'significance')
          ? '<section class="pe-section"><h2>Why it matters</h2><p>' +
            esc(val(item, 'significance')) + '</p></section>' : '') +

        (facts.length
          ? '<section class="pe-section"><h2>Record</h2><dl class="pe-facts">' +
            facts.map(function (f) {
              return '<div class="pe-fact"><dt>' + esc(f.label) + '</dt><dd>' +
                linkify(esc(val(item, f.key))) + '</dd></div>';
            }).join('') + '</dl></section>' : '') +

        (src && !continues
          ? '<section class="pe-section"><h2>Source</h2><p>' + linkOut(src) + '</p></section>'
          : '') +

        (hasDescription ? note : '') +
      '</article>';
  }

  window.ProjectEntry = { mount: mount, FACTS: FACTS };
})();
