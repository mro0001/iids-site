/* Standing check for capability-statement.
   Run: node components/capability-statement/check.js   (must exit 0)

   Runs the pure renderer against the REAL generated fixture, not a hand-written one, so a
   content edit that breaks the shape fails here rather than on the landing page. */
'use strict';
const fs = require('fs');
const path = require('path');

global.window = {};
require('./capability-statement.js');
require('./fixture.js');
const CS = global.window.CapabilityStatement;
const FIX = global.window.CAPABILITY_FIXTURE;

let failed = 0;
function ok(label, cond, detail) {
  if (cond) { console.log('  ok    ' + label); }
  else { failed++; console.log('  FAIL  ' + label + (detail ? ' — ' + detail : '')); }
}

console.log('capability-statement: module surface');
ok('global CapabilityStatement exists', !!CS);
ok('mount is a function', typeof CS.mount === 'function');
ok('renderRows is a function (pure, DOM-free)', typeof CS.renderRows === 'function');

console.log('capability-statement: the generated fixture');
ok('fixture exists with an items array', !!FIX && Array.isArray(FIX.items));
ok('fixture is non-empty', FIX.items.length > 0, 'got ' + (FIX.items || []).length);
ok('every item has a title and a statement',
  FIX.items.every(it => String(it.title || '').trim() && String(it.statement || '').trim()));
ok('every id is unique', new Set(FIX.items.map(i => i.id)).size === FIX.items.length);

console.log('capability-statement: fixture is in sync with the content file');
const md = fs.readFileSync(path.join(__dirname, '../../content/home_capabilities.md'), 'utf8');
const body = md.replace(/^<!--[\s\S]*?-->\s*/, '').replace(/\n##\s+Needs[\s\S]*$/, '\n');
const heads = (body.match(/^##\s+(.*)$/gm) || []).map(h => h.replace(/^##\s+/, '').trim());
ok('one fixture item per "## " heading in the content file',
  heads.length === FIX.items.length, heads.length + ' headings vs ' + FIX.items.length + ' items');
ok('titles match the content headings in order',
  heads.join('|') === FIX.items.map(i => i.title).join('|'),
  heads.join('|') + '  vs  ' + FIX.items.map(i => i.title).join('|'));
ok('no item statement leaks the internal Needs section',
  FIX.items.every(i => !/how this file is used|approved by michael/i.test(i.statement)));

console.log('capability-statement: the DOM contract');
const html = CS.renderRows(FIX.items);
ok('one .cs-row per item', (html.match(/class="cs-row"/g) || []).length === FIX.items.length);
ok('each row carries a .cs-title', (html.match(/class="cs-title"/g) || []).length === FIX.items.length);
ok('the default heading level is h3', (html.match(/<h3 class="cs-title">/g) || []).length === FIX.items.length);
ok('headingLevel h2 is honored (the landing page mounts this way)',
  (CS.renderRows(FIX.items, { headingLevel: 'h2' }).match(/<h2 class="cs-title">[\s\S]*?<\/h2>/g) || []).length === FIX.items.length);
ok('an unsupported heading level falls back to h3, never emits the tag asked for',
  (() => {
    const out = CS.renderRows(FIX.items, { headingLevel: 'script' });
    return out.indexOf('<script') === -1 && (out.match(/<h3 class="cs-title">/g) || []).length === FIX.items.length;
  })());
ok('each row carries a .cs-statement', (html.match(/class="cs-statement"/g) || []).length === FIX.items.length);
ok('rows render in fixture order',
  html.indexOf(FIX.items[0].title) < html.indexOf(FIX.items[FIX.items.length - 1].title));
ok('no literal brand hex in rendered markup', !/#[0-9a-f]{6}/i.test(html));

console.log('capability-statement: escaping and resilience');
const nasty = CS.renderRows([{ id: 'x', title: 'A & B', statement: '<script>alert(1)</script> "q" \'p\'' }]);
ok('title ampersand is escaped', nasty.indexOf('A &amp; B') !== -1);
ok('statement markup is escaped, not injected', nasty.indexOf('<script>') === -1);
ok('quotes are escaped', nasty.indexOf('&quot;') !== -1 && nasty.indexOf('&#39;') !== -1);
ok('item missing a statement is dropped, not half-rendered',
  CS.renderRows([{ title: 'Only a title' }]) === '');
ok('item missing a title is dropped', CS.renderRows([{ statement: 'Only a statement' }]) === '');
ok('empty array renders empty, does not throw', CS.renderRows([]) === '');
ok('null/undefined render empty, do not throw',
  CS.renderRows(null) === '' && CS.renderRows(undefined) === '');
let threw = false;
try { CS.mount(null, null); } catch (e) { threw = true; }
ok('mount(null, null) does not throw', !threw);

console.log(failed ? '\n' + failed + ' capability-statement check(s) FAILED.' : '\nAll capability-statement checks passed.');
process.exit(failed ? 1 : 0);
