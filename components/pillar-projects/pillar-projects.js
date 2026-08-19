/* AI4UI Pillar Projects — expandable pillar cards. Pure DOM, zero fetch — file://-safe.
   Host provides a container element; call PillarProjects.mount(containerEl, fixture).
   Clicking a pillar card toggles a dropdown list of the projects in that category.
   Project lists come from the fixture (illustrative placeholder) and will later be served
   by a projects database in the same record shape — see CONTRACT.md.
   The caveat under each list is fixture data (`note`), never markup: a producer serving real
   records omits it and nothing renders, so going live cannot leave a stale caveat behind. */
(function () {
  function esc(s) { return String(s == null ? '' : s); }

  function projectItem(pr) {
    var status = pr.status ? '<span class="pp-status">' + esc(pr.status) + '</span>' : '';
    return '<li><span class="pp-proj">' + esc(pr.name) + '</span>' + status + '</li>';
  }

  function pillarCard(p, note) {
    var items = (p.projects || []).map(projectItem).join('');
    return '<article class="pp-card" data-pillar="' + esc(p.id) + '">'
      + '<button class="pp-head" type="button" aria-expanded="false">'
      +   '<span class="pp-title">' + esc(p.title) + '</span>'
      +   '<span class="pp-caret" aria-hidden="true">&#9656;</span>'
      + '</button>'
      + (p.blurb ? '<p class="pp-blurb">' + esc(p.blurb) + '</p>' : '')
      + '<div class="pp-list">'
      +   '<ul>' + items + '</ul>'
      +   (note ? '<p class="pp-note">' + esc(note) + '</p>' : '')
      + '</div>'
      + '</article>';
  }

  function mount(containerEl, fixture) {
    var pillars = (fixture && fixture.pillars) || [];
    var note = (fixture && fixture.note) || '';
    containerEl.innerHTML = pillars.map(function (p) { return pillarCard(p, note); }).join('');
    containerEl.querySelectorAll('.pp-card').forEach(function (card) {
      var head = card.querySelector('.pp-head');
      head.addEventListener('click', function () {
        var open = card.classList.toggle('open');
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  window.PillarProjects = { mount: mount };
})();
