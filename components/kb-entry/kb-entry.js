/* KB entry renderer. Pure DOM, zero fetch — file://-safe. Renders ONE knowledge
   base entry record (see CONTRACT.md) into a root element:
   Title · Source (linked when source_url is present) · Body (markdown subset) ·
   footer (created_date, last_updated). Brand colors via var() from shared/tokens.css.
   Call KBEntry.mount(rootEl, entry). */
(function () {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Inline markdown: escape, then ![alt](url) images (before links, since an
  // image contains a link pattern), then [text](url) links, then **bold**, then
  // *italic* (after bold, so a ** pair is already consumed and cannot be read as
  // two single markers), then unescape backslash-escaped punctuation
  // (e.g. \[ \_ \| ) for display.
  function inline(s) {
    return esc(s)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/\\([\\`*_{}\[\]()#+.!|>-])/g, '$1');
  }

  // Split a table row into trimmed cells, respecting escaped pipes (\|).
  function cells(row) {
    return row.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/)
      .map(function (c) { return c.trim(); });
  }

  // GFM table: header row, a |---|---| separator, then body rows.
  function table(rows) {
    var head = cells(rows[0]);
    var html = '<table><thead><tr>';
    head.forEach(function (c) { html += '<th>' + inline(c) + '</th>'; });
    html += '</tr></thead><tbody>';
    rows.slice(2).forEach(function (r) {
      html += '<tr>';
      cells(r).forEach(function (c) { html += '<td>' + inline(c) + '</td>'; });
      html += '</tr>';
    });
    return html + '</tbody></table>';
  }

  // Bullet list with one level of nesting (indent >= 2 spaces becomes a sub-list).
  function list(items) {
    var html = '<ul>';
    for (var k = 0; k < items.length; k++) {
      if (items[k].indent >= 2) continue;
      html += '<li>' + inline(items[k].text);
      var subs = [], j = k + 1;
      while (j < items.length && items[j].indent >= 2) { subs.push(items[j].text); j++; }
      if (subs.length) {
        html += '<ul>' + subs.map(function (t) { return '<li>' + inline(t) + '</li>'; }).join('') + '</ul>';
      }
      html += '</li>';
      k = j - 1;
    }
    return html + '</ul>';
  }

  // Block markdown: ##/### headings, - bullet lists, paragraphs.
  function render(md) {
    var lines = String(md == null ? '' : md).split('\n');
    var html = '', i = 0;
    while (i < lines.length) {
      var line = lines[i];
      if (/^\s*$/.test(line)) { i++; continue; }
      if (/^\s*```/.test(line)) {
        var code = [];
        i++;
        while (i < lines.length && !/^\s*```/.test(lines[i])) { code.push(lines[i]); i++; }
        if (i < lines.length) i++; // consume the closing fence
        html += '<pre><code>' + esc(code.join('\n')) + '</code></pre>';
        continue;
      }
      // KB embed: "{{kb: <id>}}" or "{{kb: <id> | full}}" on its own line — a
      // placeholder the host fills via KBEntry.hydrate() from the store IT
      // loaded. The marker stores a pointer, never a copy, so an embedded
      // entry can't fork or go stale. Ids are store slugs ([a-z0-9-]);
      // anything else falls through to the paragraph rule and ships literal.
      var em = line.match(/^\s*\{\{\s*kb:\s*([a-z0-9-]+)\s*(?:\|\s*(card|full)\s*)?\}\}\s*$/);
      if (em) {
        html += '<div class="kbentry-embed" data-kb-id="' + em[1] +
                '" data-kb-mode="' + (em[2] || 'card') + '"></div>';
        i++; continue;
      }
      // Disclosure: ":::details Summary" … ":::" — a collapsed block whose body
      // runs the same block subset. Nesting is not supported: the first bare
      // ":::" closes it.
      var d = line.match(/^\s*:::\s*details\s+(.*\S)\s*$/);
      if (d) {
        var inner = [];
        i++;
        while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) { inner.push(lines[i]); i++; }
        if (i < lines.length) i++; // consume the closing :::
        html += '<details><summary>' + inline(d[1]) + '</summary>' +
                '<div class="kbentry-disclosure">' + render(inner.join('\n')) + '</div></details>';
        continue;
      }
      // Review flag: ":::flag" … ":::" — an unmissable red block marking content a
      // human still has to verify. Same body subset as a disclosure, but always open,
      // because the point is that it cannot be skimmed past. Every one is a to-do:
      // these are authoring scaffolding and should be gone before launch.
      if (/^\s*:::\s*flag\s*$/.test(line)) {
        var flagged = [];
        i++;
        while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) { flagged.push(lines[i]); i++; }
        if (i < lines.length) i++; // consume the closing :::
        html += '<div class="kbentry-flag" role="note">' + render(flagged.join('\n')) + '</div>';
        continue;
      }
      // Thematic break: a line of three or more *, - or _ and nothing else. Must be
      // tested before the italic and bullet rules, which would otherwise claim it —
      // the migrated RCDS docs use "* * *" as a section rule.
      if (/^\s*(\*\s*){3,}$|^\s*(-\s*){3,}$|^\s*(_\s*){3,}$/.test(line)) {
        html += '<hr>'; i++; continue;
      }
      // Blockquote: consecutive "> " lines. The body runs the same block subset,
      // so a quote can carry bullets or a table.
      if (/^\s*>\s?/.test(line)) {
        var quoted = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          quoted.push(lines[i].replace(/^\s*>\s?/, '')); i++;
        }
        html += '<blockquote>' + render(quoted.join('\n')) + '</blockquote>';
        continue;
      }
      var h = line.match(/^(#{2,6})\s+(.*)$/);
      if (h) { html += '<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>'; i++; continue; }
      // GFM table: a "| … |" row followed by a "|---|---|" separator line.
      if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length &&
          /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1]) && lines[i + 1].indexOf('-') !== -1) {
        var rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(lines[i]); i++; }
        html += table(rows);
        continue;
      }
      if (/^\s*-\s+/.test(line)) {
        var items = [];
        while (i < lines.length) {
          var m = lines[i].match(/^(\s*)-\s+(.*)$/);
          if (!m) break;
          items.push({ indent: m[1].length, text: m[2] });
          i++;
        }
        html += list(items);
        continue;
      }
      var para = [];
      while (i < lines.length && !/^\s*$/.test(lines[i]) &&
             !/^#{2,6}\s+/.test(lines[i]) && !/^\s*-\s+/.test(lines[i]) &&
             !/^\s*```/.test(lines[i]) && !/^\s*\|.*\|\s*$/.test(lines[i]) &&
             !/^\s*>\s?/.test(lines[i]) &&
             !/^\s*\{\{\s*kb:\s*[a-z0-9-]+\s*(?:\|\s*(?:card|full)\s*)?\}\}\s*$/.test(lines[i])) {
        para.push(lines[i]); i++;
      }
      html += '<p>' + inline(para.join(' ')) + '</p>';
    }
    return html;
  }

  // Adoption banner: driven by the entry's `adoption` header key, never by body
  // prose — a draft policy must be unmistakable even to a reader who skips the
  // opening line. Absence of the key (and 'adopted') renders nothing.
  var DRAFT_BANNER = 'DRAFT — under review. Not adopted institute policy; ' +
    'figures pending verification.';

  function mount(root, e) {
    if (!root || !e) return;
    var src = e.source_url
      ? '<a href="' + esc(e.source_url) + '">' + esc(e.source) + '</a>'
      : esc(e.source);
    var foot = '';
    if (e.created_date) foot += '<span>Created ' + esc(e.created_date) + '</span>';
    if (e.last_updated) foot += '<span>Last updated ' + esc(e.last_updated) + '</span>';
    root.innerHTML =
      '<article class="kbentry">' +
        '<p class="kbentry-group">' + esc(e.group) + ' &middot; Knowledge Base</p>' +
        '<h1 class="kbentry-title">' + esc(e.title) + '</h1>' +
        (e.gist ? '<p class="kbentry-gist">' + esc(e.gist) + '</p>' : '') +
        (e.adoption === 'draft' ? '<p class="kbentry-draft" role="note">' + DRAFT_BANNER + '</p>' : '') +
        '<p class="kbentry-source"><span class="kbentry-label">Source</span> ' + src + '</p>' +
        '<div class="kbentry-body">' + render(e.body) + '</div>' +
        '<footer class="kbentry-foot">' + foot + '</footer>' +
      '</article>';
  }

  // ---- KB embeds ------------------------------------------------------------
  // Card / transclusion HTML for ONE embed target. Pure: entries in, string out.
  function embedHtml(id, mode, entries, opts, depth) {
    var t = null, k;
    for (k = 0; k < entries.length; k++) { if (entries[k].id === id) { t = entries[k]; break; } }
    if (!t) return '<div class="kbentry-embed-missing">This entry isn’t available here.</div>';
    var href = esc((opts && opts.detailPage) || 'kb_entry.html') + '?id=' + esc(t.id);
    if (mode === 'full') {
      return '<section class="kbentry-embedfull">' +
        '<h3 class="kbentry-embedfull-title"><a href="' + href + '">' + esc(t.title) + '</a></h3>' +
        '<div class="kbentry-embedfull-body">' +
          hydrateHtml(render(t.body), entries, opts, depth + 1) +
        '</div></section>';
    }
    return '<a class="kbentry-embedcard" href="' + href + '">' +
      '<span class="kbentry-embedcard-title">' + esc(t.title) +
        (t.adoption === 'draft' ? ' <span class="kbentry-embedcard-draft">Draft</span>' : '') +
      '</span>' +
      (t.gist ? '<span class="kbentry-embedcard-gist">' + esc(t.gist) + '</span>' : '') +
      '</a>';
  }

  // Replace every placeholder in an HTML string. depth > 0 means we are inside
  // a transcluded body: every embed renders as a card there, so transclusion is
  // one level deep and a cycle cannot recurse.
  function hydrateHtml(htmlStr, entries, opts, depth) {
    return String(htmlStr == null ? '' : htmlStr).replace(
      /<div class="kbentry-embed" data-kb-id="([a-z0-9-]+)" data-kb-mode="(card|full)"><\/div>/g,
      function (_, id, mode) {
        return embedHtml(id, depth > 0 ? 'card' : mode, entries, opts, depth);
      });
  }

  // Host entry point. String replacement on innerHTML — no DOM API — so it runs
  // identically in the browser and the node test harness, and it can only
  // resolve against the store the HOST page loaded (the payload stays the gate).
  function hydrate(root, entries, opts) {
    if (!root) return;
    root.innerHTML = hydrateHtml(root.innerHTML, entries || [], opts || {}, 0);
  }

  window.KBEntry = { mount: mount, render: render, hydrate: hydrate };
})();
