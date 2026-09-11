/* Provenance chrome toggle. The wireframe's legend, [migrate text] tags, zone borders and
   file paths are notes to the team; readers get plain sections (mockup.css, "PROVENANCE
   CHROME"). ?provenance=1 or the footer button turns them on, ?provenance=0 turns them
   off, and the last choice persists per browser. Load after site-shell.js so the footer
   exists when the button is appended. */
(function () {
  var KEY = 'iids.provenance';
  var q = new URLSearchParams(location.search);
  var on = false;
  if (q.has('provenance')) {
    on = q.get('provenance') !== '0';
  } else {
    try { on = localStorage.getItem(KEY) === '1'; } catch (e) { on = false; }
  }

  function label(v) { return (v ? 'Hide' : 'Show') + ' content provenance'; }

  function apply(v) {
    document.body.classList.toggle('show-provenance', v);
    try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) { /* private mode */ }
    var b = document.getElementById('provenanceToggle');
    if (b) b.textContent = label(v);
  }

  function mountButton() {
    if (document.getElementById('provenanceToggle')) return;
    var host = document.querySelector('site-footer footer .wrap');
    if (!host) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'provenanceToggle';
    b.className = 'provenance-toggle';
    b.textContent = label(document.body.classList.contains('show-provenance'));
    b.addEventListener('click', function () {
      apply(!document.body.classList.contains('show-provenance'));
    });
    host.appendChild(b);
  }

  apply(on);
  mountButton();
  if (!document.getElementById('provenanceToggle')) {
    document.addEventListener('DOMContentLoaded', mountButton);
  }
})();
