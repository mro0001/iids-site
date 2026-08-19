/* Standing check for project-spotlight's pure functions, run against the REAL generated store
   rather than a fixture — 126 published records (96 grants + AI4UI + its 29 subprojects).
   Run:  node components/project-spotlight/check.js

   spotlightItems/leadName/firstSentence/byline are pure, so they need no DOM. mount() is the
   soft UI layer and is not exercised here; demo.html covers it by eye. */
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

/* Both files are browser IIFEs that only need `window` at load time. */
const sandbox = { console: console };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const rel of ['../../backend/projects-data/projects-data.generated.js', 'project-spotlight.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, rel), 'utf8'), sandbox, { filename: rel });
}
const PS = sandbox.window.ProjectSpotlight;
const ITEMS = sandbox.window.PROJECTS_DATA.items;

console.log('\nproject-spotlight: PI name extraction');
ok('plain name passes through', PS.leadName('Michael Maughan') === 'Michael Maughan');
ok('affiliation suffix is cut',
  PS.leadName('Zachariah B. Etienne, Professor, Department of Physics, University of Idaho') === 'Zachariah B. Etienne');
ok('parenthetical role is cut',
  PS.leadName('Jason W. Karl (Lead PI, U of I Drone Lab)') === 'Jason W. Karl');
ok('co-PIs after a semicolon are cut',
  PS.leadName('Michael S. Strickland (PI); Zachary Kayler (Co-PI)') === 'Michael S. Strickland');
ok('a middle initial is NOT treated as a sentence end',
  PS.leadName('Frederick M. Ytreberg, Department of Physics') === 'Frederick M. Ytreberg');
ok('an in-name nickname survives the paren cut',
  PS.leadName('Frederick M. (Marty) Ytreberg, Department of Physics') === 'Frederick M. (Marty) Ytreberg',
  'got ' + JSON.stringify(PS.leadName('Frederick M. (Marty) Ytreberg, Department of Physics')));
ok('a prose lead-in is stripped',
  PS.leadName('Program direction listed as Holly Wichman (Distinguished Professor)') === 'Holly Wichman');
ok('a pair of co-leads is kept whole',
  PS.leadName('Lisette Waits and Paul Hohenlohe (co-directors)') === 'Lisette Waits and Paul Hohenlohe');

console.log('\nproject-spotlight: the name guard');
ok('an organization is rejected', !PS.looksLikeName('University of Idaho Library'));
ok('a department is rejected', !PS.looksLikeName('Department of Biological Sciences'));
ok('a bare surname is rejected', !PS.looksLikeName('Ytreberg'));
ok('a person is accepted', PS.looksLikeName('Andrew Tranmer'));
ok('two co-leads are accepted', PS.looksLikeName('Roger Lew and Mariana Dobre'));

console.log('\nproject-spotlight: byline');
ok('splits on a real sentence end',
  PS.firstSentence('One thing happened. Another thing happened.') === 'One thing happened.');
ok('does not split on a middle initial',
  PS.firstSentence('Frederick M. Ytreberg leads it. Next.') === 'Frederick M. Ytreberg leads it.');
ok('does not split on U.S.',
  PS.firstSentence('Grown in U.S. potato fields across Idaho. Next.') === 'Grown in U.S. potato fields across Idaho.');
ok('a single-sentence description survives whole',
  PS.firstSentence('Only one sentence here.') === 'Only one sentence here.');
ok('truncation lands on a word boundary and marks itself', (() => {
  const out = PS.byline('x'.repeat(10) + ' ' + 'word '.repeat(80) + '. Next.', 60);
  return out.length <= 61 && out.endsWith('…') && !out.includes('  ');
})());

console.log('\nproject-spotlight: selection against the real store (126 records)');
const active = ITEMS.filter(i => String(i.status || '').trim() === 'Active');
const sel = PS.spotlightItems(ITEMS);
/* 126 records, but a DIFFERENT 126 since the 2026-08-14 rebuild: 96 source-verified grants,
   the AI4UI record, and its 29 subprojects. It was 126 before the rebuild too, which is a
   coincidence and not a reason to read this number as unchanged.

   The AI4UI record carries no `lead`, so the name guard keeps it out of the rotation — the
   intended behaviour for a record with no PI to put in large type. It stays discoverable on
   the browse page, which is where a record with nobody to name belongs. */
ok('the store still holds 126 records', ITEMS.length === 126, 'got ' + ITEMS.length);
ok('every selected record is Active',
  sel.every(s => active.some(a => a.objectid === s.objectid)));
ok('no non-Active record leaks in', (() => {
  const bad = ITEMS.filter(i => String(i.status || '').trim() !== 'Active');
  return !sel.some(s => bad.some(b => b.objectid === s.objectid));
})());
ok('every selected record has a title, a PI and a byline',
  sel.every(s => s.title && s.pi && s.byline));
ok('every PI clears the name guard', sel.every(s => PS.looksLikeName(s.pi)));
ok('no byline exceeds the cap', sel.every(s => s.byline.length <= 221));
ok('no byline opens with provenance prose',
  !sel.some(s => /^(no public|no web|internal records)/i.test(s.byline)));
ok('objectids are unique', new Set(sel.map(s => s.objectid)).size === sel.length);
ok('the selection is non-trivial (>40 of the Active set)',
  sel.length > 40, 'selected ' + sel.length + ' of ' + active.length);

console.log('\nproject-spotlight: shuffle is deterministic');
const a = PS.spotlightItems(ITEMS), b = PS.spotlightItems(ITEMS);
ok('two calls give the same order', a.map(x => x.objectid).join() === b.map(x => x.objectid).join());

console.log(
  '\n  ' + sel.length + ' of ' + active.length + ' Active projects are spotlight-eligible; ' +
  sel.filter(s => s.truncated).length + ' bylines truncated.'
);

if (failures) { console.log('\nproject-spotlight: ' + failures + ' FAILED\n'); process.exit(1); }
console.log('\nproject-spotlight: all checks passed\n');
