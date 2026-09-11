/* Standing check for content-render: what actually reaches the public page.
   Run:  node components/content-render/check.js

   Two failure modes this guards, both of which have happened:

   1. The generated store drifting from the markdown, so an edit to a content file silently
      does not appear on the site.
   2. Internal editorial notes rendering as body copy. The contract strips the header, the H1
      and `## Needs` — everything else is page text by definition. Provenance notes, review
      flags and owner assignments written into the body therefore ship to readers. On
      2026-08-07 six of the eight rendered sections were doing this, and the About page opened
      every card with "Migrated from the old About page…". */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const HERE = __dirname;
const ROOT = path.resolve(HERE, '..', '..');
const GEN = path.join(HERE, 'content-render.generated.js');

let failures = 0;
function ok(label, cond, detail) {
  if (cond) { console.log('  ok   ' + label); return; }
  failures++;
  console.log('  FAIL ' + label + (detail ? '\n         ' + detail : ''));
}

function load() {
  const sandbox = { console: console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(GEN, 'utf8'), sandbox, { filename: 'content-render.generated.js' });
  return sandbox.window.CONTENT;
}

console.log('\ncontent-render: the store is current');
const before = fs.readFileSync(GEN, 'utf8');
execFileSync(process.execPath, [path.join(HERE, 'build-content.js')], { cwd: ROOT, stdio: 'pipe' });
const after = fs.readFileSync(GEN, 'utf8');
ok('rebuilding produces no change (store matches the content files)', before === after,
  'run `node components/content-render/build-content.js` and commit the result');

const CONTENT = load();
const keys = Object.keys(CONTENT);

console.log('\ncontent-render: every mounted key resolves');
ok('the store is not empty', keys.length > 0);

/* Explicit heading ids — `### Title {#id}` — carry the footer's deep-link targets
   (site-shell.js "Contact by need": #general, #proposals, #partnerships) inside the
   rendered body, so the contact page has no hand-written anchors to drift. */
ok('contact_by_need renders explicit heading ids',
  typeof CONTENT.contact_by_need === 'string' &&
  ['general', 'proposals', 'partnerships'].every(function (id) {
    return CONTENT.contact_by_need.indexOf('<h3 id="' + id + '">') !== -1;
  }),
  'expected <h3 id="general|proposals|partnerships"> in the rendered contact_by_need');
ok('the {#id} suffix never leaks into rendered text',
  keys.every(function (k) { return !/\{#[\w-]+\}/.test(CONTENT[k]); }));

ok('every value is a non-empty HTML string',
  keys.every((k) => typeof CONTENT[k] === 'string' && CONTENT[k].trim()));

/* Which keys the pages actually mount, read out of the mockups rather than assumed. */
const mounted = new Set();
for (const f of fs.readdirSync(path.join(ROOT, 'mockups')).filter((f) => f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(ROOT, 'mockups', f), 'utf8');
  const re = /data-content="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) mounted.add(m[1]);
}
const missing = [...mounted].filter((k) => !CONTENT[k]);
ok('every data-content slot in mockups/ has a section in the store',
  missing.length === 0, 'missing: ' + missing.join(', '));

console.log('\ncontent-render: `## Needs` is stripped');
const needsLeak = keys.filter((k) => /<h2[^>]*>\s*Needs\s*<\/h2>/i.test(CONTENT[k]));
ok('no rendered section contains a Needs heading', needsLeak.length === 0,
  needsLeak.join(', '));

console.log('\ncontent-render: no editorial notes in page copy');
/* Phrases that mean the sentence is addressed to us, not to a site visitor. */
const INTERNAL = [
  [/migrated from/i, 'provenance note'],
  [/editorial cleanup/i, 'provenance note'],
  [/light polish/i, 'provenance note'],
  [/needs? review/i, 'review flag'],
  [/⚑/, 'review flag'],
  [/note for redesign/i, 'redesign note'],
  [/placeholder \((new|migrate|partial)\)/i, 'status marker'],
  [/\bMO,? 20\d\d\b/, 'initialled decision note'],
  [/\bmichael to \b/i, 'owner assignment'],
  [/before launch\b/i, 'launch task'],
  [/\bTBD\b/, 'unresolved marker'],
  [/keep in sync with/i, 'maintenance instruction'],
  [/\bmust be updated\b/i, 'maintenance instruction'],
  /* Evasions found by the 2026-08-08 content review: phrases that shipped as page copy
     without matching any pattern above. Verify/confirm annotations belong in `## Needs`. */
  [/retired for public use/i, 'naming note'],
  [/illustrative until/i, 'placeholder marker'],
  [/wired to the/i, 'implementation note'],
  [/derived from the/i, 'provenance note'],
  [/on the live page/i, 'reviewer-facing note'],
  [/working name/i, 'naming note'],
  [/\bverify\b/i, 'verification flag'],
  [/\bconfirm( owner| the)?\b/i, 'verification flag']
];
const found = [];
for (const k of keys) {
  const text = CONTENT[k].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  for (const [re, kind] of INTERNAL) {
    const m = re.exec(text);
    if (m) found.push(`${k}: ${kind} — "${text.slice(Math.max(0, m.index - 20), m.index + 70).trim()}"`);
  }
}
ok('no rendered section addresses the team instead of the reader',
  found.length === 0, found.join('\n         '));

console.log('\n  ' + keys.length + ' rendered sections; ' + mounted.size + ' slots mounted across mockups/.');

if (failures) { console.log('\ncontent-render: ' + failures + ' FAILED\n'); process.exit(1); }
console.log('\ncontent-render: all checks passed\n');
