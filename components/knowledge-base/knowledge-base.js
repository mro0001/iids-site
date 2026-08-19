/* Knowledge Base browser (also drives Apps). Pure DOM, zero fetch — file://-safe.
   Host provides a .groupbtns element (with .gbtn[data-group] buttons) and a sibling
   .itemlist element, plus a fixture. Call KBBrowser.mount(buttonsEl, listEl, fixture).

   Items may be plain strings (Apps / legacy) OR objects {id, title, gist}. When an
   item carries a gist, the list link shows it as a hover tooltip; when it carries an
   id, the detail href adds &id= (authoritative for kb-data). Build a fixture from the
   generated window.KB_DATA store with KBBrowser.fixtureFromData(data, opts). */
(function () {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function buildHref(detailPage, group, name, id) {
    var h = detailPage + '?group=' + encodeURIComponent(group) + '&item=' + encodeURIComponent(name);
    if (id) h += '&id=' + encodeURIComponent(id);
    return h;
  }

  function mount(buttonsEl, listEl, fixture) {
    var btns = buttonsEl.querySelectorAll('.gbtn');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        btns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var g = btn.dataset.group;
        var items = fixture.items[g] || [];
        if (!items.length) {
          listEl.innerHTML = '<p class="hint">No entries in ' + esc(g) + ' yet.</p>';
          return;
        }
        listEl.innerHTML = '<ul>' + items.map(function (it) {
          var isObj = it && typeof it === 'object';
          var name = isObj ? it.title : it;
          var id = isObj ? it.id : null;
          var gist = isObj ? it.gist : null;
          return '<li><a href="' + buildHref(fixture.detailPage, g, name, id) + '">'
            + '<span class="grouptag">' + esc(g) + '</span> '
            + '<span class="kbname">' + esc(name) + '</span>'
            + (gist ? '<span class="gisttip">' + esc(gist) + '</span>' : '')
            + '<span class="arm">Open →</span></a></li>';
        }).join('') + '</ul>';
      });
    });
  }

  /* Build a mount() fixture from the generated window.KB_DATA store.
     opts: { detailPage, addHref?, guidelinesHref?, kind? }. */
  function fixtureFromData(data, opts) {
    opts = opts || {};
    var items = {};
    (data.groups || []).forEach(function (g) { items[g] = []; });
    (data.entries || []).forEach(function (e) {
      if (opts.visibility && e.visibility !== opts.visibility) return;
      (items[e.group] = items[e.group] || []).push({ id: e.id, title: e.title, gist: e.gist });
    });
    return {
      kind: opts.kind || 'kb',
      detailPage: opts.detailPage,
      addHref: opts.addHref,
      guidelinesHref: opts.guidelinesHref,
      groups: data.groups,
      items: items
    };
  }

  window.KBBrowser = { mount: mount, fixtureFromData: fixtureFromData };
})();
