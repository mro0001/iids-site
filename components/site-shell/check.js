/* Standing check for the site-shell component.
   Run:  node components/site-shell/check.js

   There is no DOM in node and no jsdom in this repo, so this stubs the handful of DOM
   surfaces site-shell.js touches (HTMLElement, customElements, getAttribute, innerHTML,
   dataset) and drives the real connectedCallback. It asserts on the actual rendered HTML,
   not on a reimplementation of it. */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let failures = 0;
function ok(label, cond, detail) {
  if (cond) { console.log('  ok   ' + label); return; }
  failures++;
  console.log('  FAIL ' + label + (detail ? '\n         ' + detail : ''));
}

/* ---------------------------------------------------------------- DOM stub */

function FakeNode(attrs, inner) {
  this._attrs = attrs || {};
  this.innerHTML = inner || '';
  this.dataset = {};
}
FakeNode.prototype.getAttribute = function (n) {
  return Object.prototype.hasOwnProperty.call(this._attrs, n) ? this._attrs[n] : null;
};
/* wireToggle bails out when it cannot find its nodes; the rendered markup is what we assert on. */
FakeNode.prototype.querySelector = function () { return null; };
FakeNode.prototype.addEventListener = function () {};

const registry = {};
const sandbox = {
  HTMLElement: function HTMLElement() {},
  Reflect: Reflect,
  Object: Object,
  console: console,
  customElements: {
    get: function (n) { return registry[n]; },
    define: function (n, C) { registry[n] = C; }
  }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, 'site-shell.js'), 'utf8'),
  sandbox,
  { filename: 'site-shell.js' }
);

function render(elementName, attrs, inner) {
  const C = registry[elementName];
  if (!C) throw new Error('element not registered: ' + elementName);
  const node = new FakeNode(attrs, inner);
  C.prototype.connectedCallback.call(node);
  return node.innerHTML;
}

/* ------------------------------------------------------------------ checks */

console.log('site-shell: element registration');
ok('<site-nav> registered', !!registry['site-nav']);
ok('<site-footer> registered', !!registry['site-footer']);
ok('SiteShell.setModel exposed', typeof sandbox.SiteShell.setModel === 'function');

console.log('site-shell: public nav');
const pub = render('site-nav', { active: 'resources' });
const MODEL = sandbox.SiteShell.DEFAULT_MODEL;
MODEL.public.links.forEach(function (l) {
  ok('renders link "' + l.label + '"', pub.indexOf('>' + l.label + '<') !== -1);
});
ok('renders the intranet lock', pub.indexOf('class="lock"') !== -1);
ok('marks exactly one active link', (pub.match(/class="here"/g) || []).length === 1);
ok('active link is Resources',
  /class="here" href="resources\.html" aria-current="page">Resources</.test(pub));
ok('the active link carries aria-current="page"',
  (pub.match(/aria-current="page"/g) || []).length === 1,
  '.here is a color change only — aria-current is what tells AT which page this is');
ok('inactive links carry no aria-current',
  !/href="about\.html"[^>]*aria-current/.test(pub));
ok('the lock glyph is hidden from assistive technology',
  pub.indexOf('<span aria-hidden="true">🔒</span> Intranet') !== -1,
  'in the label it announces as "locked padlock Intranet"');
ok('no model label carries a decorative glyph',
  !/[\u{1F300}-\u{1FAFF}]/u.test(
    MODEL.public.links.concat([MODEL.public.lock, MODEL.public.cta])
      .map(function (l) { return l.label; }).join(' ')));

console.log('site-shell: nav drift fix');
ok('the knowledge base is in the one canonical nav',
  MODEL.public.links.some(function (l) { return l.label === 'Knowledge base'; }),
  'this item used to exist on kb.html and kb_entry.html only');

/* Michael, 2026-08-10: AI4UI is a project, not a unit of IIDS. It was removed from the nav
   and from the footer's Units column. The page and its content files were deliberately kept
   for a future project record, so nothing stops the link being pasted back in — this is what
   catches that. The units column is RCDS and GBRC, which are units, so the heading stands. */
console.log('site-shell: AI4UI is a project, not a unit');
const unitsCol = MODEL.public.footer.columns.filter(function (c) { return c.heading === 'Units'; })[0];
ok('no nav item labels AI4UI',
  !MODEL.public.links.some(function (l) { return /AI4UI/i.test(l.label); }));
ok('no nav item links to ai4ui.html',
  !MODEL.public.links.some(function (l) { return /ai4ui\.html/i.test(l.href); }));
ok('the footer Units column still exists', !!unitsCol);
ok('the Units column lists RCDS and GBRC only',
  !!unitsCol && unitsCol.links.map(function (l) { return l.label; }).join(',') === 'RCDS,GBRC',
  unitsCol ? 'found: ' + unitsCol.links.map(function (l) { return l.label; }).join(', ') : '');
ok('AI4UI appears nowhere in the rendered public shell',
  pub.indexOf('AI4UI') === -1 && render('site-footer', { variant: 'landing' }, '').indexOf('AI4UI') === -1);

console.log('site-shell: label casing');
/* Sentence case for UI labels; proper nouns and initialisms keep their own casing. */
['Knowledge base', 'Work with us', 'Research enabled by IIDS'].forEach(function (label) {
  var all = MODEL.public.links.concat(MODEL.public.footer.columns.reduce(function (a, c) {
    return a.concat(c.links);
  }, [])).concat([MODEL.public.cta]);
  ok('uses sentence case for "' + label + '"',
    all.some(function (l) { return l.label === label; }));
});

console.log('site-shell: mobile menu and accessibility');
ok('skip link is the first element rendered',
  pub.indexOf('<a class="skip" href="#main">Skip to main content</a>') === 0,
  'the skip link must precede <header> to be the first tab stop (WCAG 2.4.1)');
ok('renders a real <button> toggle', /<button class="navtoggle" type="button"/.test(pub));
ok('toggle starts collapsed', pub.indexOf('aria-expanded="false"') !== -1);
ok('toggle is labelled', pub.indexOf('aria-label="Open navigation menu"') !== -1);
const controls = pub.match(/aria-controls="([^"]+)"/);
ok('aria-controls is present', !!controls);
ok('aria-controls points at the rendered list',
  !!controls && pub.indexOf('<ul id="' + controls[1] + '">') !== -1,
  controls ? 'aria-controls=' + controls[1] : '');

/* The skip link is only half the bypass. Its target has to be focusable, or activating it
   moves the scroll position and location.hash and leaves document.activeElement on <body> —
   measured in Chromium before this assertion existed, on all 27 pages. A negative tabindex
   makes the region programmatically focusable without adding a tab stop. CONTRACT.md makes
   `id="main" tabindex="-1"` the host-page requirement; this is what enforces it. */
console.log('site-shell: host pages expose a focusable skip target');
const hostDirs = [
  path.join(__dirname, '..', '..', 'mockups'),
  __dirname
];
let hostPages = 0, hostBad = [];
hostDirs.forEach(function (dir) {
  fs.readdirSync(dir).filter(function (f) { return /\.html$/.test(f); }).forEach(function (f) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    if (src.indexOf('id="main"') === -1) return;      // pages with no main region
    hostPages++;
    if (src.indexOf('id="main" tabindex="-1"') === -1) hostBad.push(path.basename(dir) + '/' + f);
  });
});
ok('every host page with #main makes it focusable (tabindex="-1")',
  hostPages > 0 && hostBad.length === 0,
  hostBad.length ? 'missing on ' + hostBad.join(', ') : 'checked ' + hostPages + ' pages');

console.log('site-shell: intranet variant');
const intra = render('site-nav', { variant: 'intranet', active: 'home' });
ok('renders the intranet link set', intra.indexOf('>Content Manager<') !== -1);
ok('intranet variant renders the skip link too',
  intra.indexOf('<a class="skip" href="#main">Skip to main content</a>') === 0);
ok('omits the intranet lock', intra.indexOf('class="lock"') === -1);
ok('carries the exit CTA', intra.indexOf('>Exit to public site<') !== -1);
/* GBRC is the public-only sentinel. It used to be AI4UI, until AI4UI stopped being a
   nav item on 2026-08-10 — see the AI4UI assertion in the public-nav section above. */
ok('does not leak public-only links', intra.indexOf('>GBRC<') === -1);

console.log('site-shell: unknown variant falls back');
const bogus = render('site-nav', { variant: 'not-a-variant' });
ok('unknown variant renders the public nav', bogus.indexOf('>GBRC<') !== -1);

console.log('site-shell: footer');
/* The render above left the public nav as the page variant, which is what an interior
   public page looks like: <site-nav> then <site-footer> with no variant of its own. */
const footInterior = render('site-footer', {}, 'Page specific note with <a href="x.html">a link</a>.');
ok('preserves the page note verbatim',
  footInterior.indexOf('Page specific note with <a href="x.html">a link</a>.') !== -1);
ok('wraps the note in .disclaimer', /<p class="disclaimer">/.test(footInterior));
ok('an interior page gets the column grid, not just the landing',
  footInterior.indexOf('class="foot"') !== -1,
  'columns follow the model; interior footers used to carry no links at all');
ok('the Accessibility link is sitewide and live',
  footInterior.indexOf('https://www.uidaho.edu/policies/web-accessibility') !== -1,
  'a Title II-adjacent expectation cannot live on one page; /access 404s (2026-09)');
/* GBRC is an application at /gbrc/ that exists only when the site is served. Rendered
   links point at the static stand-in and carry the served path for the runtime upgrade. */
ok('GBRC links render the stand-in with the served path in data-portal',
  footInterior.indexOf('href="gbrc.html" data-portal="/gbrc/"') !== -1 &&
  render('site-nav', {}).indexOf('href="gbrc.html" data-portal="/gbrc/"') !== -1,
  'expected href="gbrc.html" data-portal="/gbrc/" in both nav and footer');
ok('Events is reachable from any footer', footInterior.indexOf('>Events<') !== -1);
ok('the contact column deep-links its routes',
  ['#general', '#proposals', '#partnerships'].every(function (id) {
    return footInterior.indexOf('contact.html' + id) !== -1;
  }),
  'three links to bare contact.html promised routing the page did not deliver');

const footWide = render('site-footer', { variant: 'landing' }, 'Landing note.');
ok('landing stays an accepted alias', footWide.indexOf('class="foot"') !== -1);
MODEL.public.footer.columns.forEach(function (c) {
  ok('footer renders column "' + c.heading + '"',
    footWide.indexOf('<h2>' + c.heading + '</h2>') !== -1);
});
/* Heading level is the document outline, not type size. The footer renders on every page
   and page content stops at h3, so at h5 it skipped a level everywhere — h1 -> h5 on
   kb.html. h2 makes the columns siblings of the page's own top-level sections. */
ok('footer column headings are h2, not a level the page outline skips to',
  footWide.indexOf('<h5>') === -1 && (footWide.match(/<h2>/g) || []).length ===
    MODEL.public.footer.columns.length,
  'the footer is a top-level page region; h5 after an h1 or h3 is a skipped level');

const footIntranet = render('site-footer', { variant: 'intranet' }, 'Intranet note.');
ok('a model with no columns still gets the simple footer',
  footIntranet.indexOf('class="foot"') === -1);

/* Variant inheritance: an intranet page declares variant on <site-nav> only, so the footer
   must not fall through to the public columns. Order matters — the nav render is what sets
   the page variant, exactly as it does in the document. */
render('site-nav', { variant: 'intranet', active: 'home' });
const footAfterIntranetNav = render('site-footer', {}, 'Intranet page note.');
ok('a bare footer adopts the nav variant',
  footAfterIntranetNav.indexOf('class="foot"') === -1 &&
  footAfterIntranetNav.indexOf('Contact by need') === -1,
  'intranet pages declare the variant once, on <site-nav>');
render('site-nav', { active: 'about' });                    // back to a public page

const footNoNote = render('site-footer', { variant: 'intranet' }, '');
ok('omits .disclaimer when the page supplies no note',
  footNoNote.indexOf('disclaimer') === -1);

console.log('site-shell: model is swappable');
sandbox.SiteShell.setModel({
  public: {
    brandSub: 'Swapped', brandHref: '#', links: [{ id: 'x', href: '#x', label: 'Swapped Link' }],
    lock: null, cta: { href: '#', label: 'Swapped CTA' },
    footer: { tagline: 'Swapped tagline', columns: [] }
  }
});
const swapped = render('site-nav', {});
ok('renders the injected model', swapped.indexOf('>Swapped Link<') !== -1);
ok('drops the default model', swapped.indexOf('>GBRC<') === -1);
sandbox.SiteShell.setModel(null);
ok('setModel(null) restores the default',
  render('site-nav', {}).indexOf('>GBRC<') !== -1);

console.log('site-shell: brand contract');
const allOutput = pub + intra + footInterior + footWide;
const hex = allOutput.match(/#[0-9a-fA-F]{6}\b/g);
ok('no literal brand hex in rendered markup', !hex, hex ? 'found ' + hex.join(', ') : '');
/* The Shell renders with no network at all — a file:// page cannot fetch (MODULES.md). Since
   2026-09 exactly one fetch is allowed: the portal probe in upgradePortals(), which returns on
   file: before it can run. Render paths stay fetch-free; a second fetch is a regression. */
const shellSrc = fs.readFileSync(path.join(__dirname, 'site-shell.js'), 'utf8');
ok('the only fetch in the runtime is the guarded portal probe',
  shellSrc.split('fetch(').length === 2 &&
  shellSrc.indexOf('fetch(') > shellSrc.indexOf('function upgradePortals') &&
  /function upgradePortals\(\) \{[\s\S]*?protocol === 'file:'\) return;[\s\S]*?global\.fetch\(/.test(shellSrc),
  'render paths must not fetch; only upgradePortals() may probe, after its file: guard');

console.log('');
if (failures) { console.log('site-shell: ' + failures + ' check(s) FAILED'); process.exit(1); }
console.log('site-shell: all checks passed');
