/* Standing check for kb-search's pure functions, run against the REAL generated KB store
   rather than a fixture.
   Run:  node components/kb-search/check.js

   deriveFacets/applyFilters/readState are pure, so they need no DOM. mountFaceted is the
   soft UI layer and is not exercised here. */
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

/* kb-search.js is a browser IIFE that only needs `window` at load time. */
const sandbox = { console: console };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, 'kb-search.js'), 'utf8'),
  sandbox,
  { filename: 'kb-search.js' }
);
const KBSearch = sandbox.KBSearch;

/* the real store */
const dataSandbox = { window: {} };
vm.createContext(dataSandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '../../backend/kb-data/kb-data.generated.js'), 'utf8'),
  dataSandbox,
  { filename: 'kb-data.generated.js' }
);
const ALL = dataSandbox.window.KB_DATA.entries;
const PUBLIC = ALL.filter(e => e.visibility === 'public');

console.log('kb-search: corpus');
ok('generated store loaded', ALL.length > 0, ALL.length + ' entries');
ok('public subset is non-empty and smaller than the whole',
  PUBLIC.length > 0 && PUBLIC.length < ALL.length,
  PUBLIC.length + ' public of ' + ALL.length);

console.log('kb-search: deriveFacets is data-derived');
const pubFacets = KBSearch.deriveFacets(PUBLIC);
const allFacets = KBSearch.deriveFacets(ALL);
const keysOf = fs2 => fs2.map(f => f.key);

// Unit is offered exactly when the entries in view span more than one group.
// Assert the rule, not the corpus of the day: this originally asserted that the
// public surface never offers Unit, which was true only while every public
// entry was RCDS. Publishing the IIDS policies made it false without anything
// in the component changing.
const groupsIn = es => new Set(es.map(e => e.group).filter(Boolean)).size;
ok('Unit is offered on the public surface iff public entries span 2+ groups',
  (keysOf(pubFacets).indexOf('group') !== -1) === (groupsIn(PUBLIC) > 1),
  groupsIn(PUBLIC) + ' public group(s); public facets: ' + keysOf(pubFacets).join(', '));
ok('Unit is offered on the intranet surface iff all entries span 2+ groups',
  (keysOf(allFacets).indexOf('group') !== -1) === (groupsIn(ALL) > 1),
  groupsIn(ALL) + ' group(s) overall; all facets: ' + keysOf(allFacets).join(', '));
ok('a facet with one value is never offered',
  pubFacets.concat(allFacets).every(f => f.options.length > 1));
ok('Kind and Entry type are offered publicly',
  keysOf(pubFacets).indexOf('track') !== -1 && keysOf(pubFacets).indexOf('type') !== -1);
ok('Topic is a select, not pills',
  (pubFacets.find(f => f.key === 'topic') || {}).control === 'select');
ok('pill options are sorted by count descending', pubFacets.filter(f => f.control === 'pills').every(f => {
  for (let i = 1; i < f.options.length; i++) {
    if (f.options[i - 1].count < f.options[i].count) return false;
  }
  return true;
}));
// A select is a long list scanned for a known term, so it sorts by label instead.
ok('select options are sorted alphabetically by label', pubFacets.filter(f => f.control === 'select').every(f => {
  for (let i = 1; i < f.options.length; i++) {
    if (f.options[i - 1].label.localeCompare(f.options[i].label) > 0) return false;
  }
  return true;
}));

console.log('kb-search: facet values carry a display label');
const LABELS = { track: { 'working-with-iids': 'Working with IIDS' }, type: { procedural: 'How-to' } };
const labelled = KBSearch.deriveFacets(PUBLIC, LABELS);
ok('every option has a non-empty label', labelled.every(f => f.options.every(o => o.label)));
ok('the host map wins where it has an entry', (() => {
  const t = labelled.find(f => f.key === 'track');
  const o = t && t.options.find(x => x.value === 'working-with-iids');
  return !o || o.label === 'Working with IIDS';
})());
ok('an unmapped slug is sentence-cased, not shown raw', (() => {
  const topic = labelled.find(f => f.key === 'topic');
  return topic.options.every(o => o.label.indexOf('-') === -1 &&
    o.label.charAt(0) === o.label.charAt(0).toUpperCase());
})());
ok('a display code (group) is left as it is', (() => {
  const g = labelled.find(f => f.key === 'group');
  return !g || g.options.every(o => o.label === o.value);
})());
ok('labels never change the frozen `value` the URL carries',
  labelled.every(f => {
    const plain = KBSearch.deriveFacets(PUBLIC).find(p => p.key === f.key);
    return f.options.map(o => o.value).sort().join() === plain.options.map(o => o.value).sort().join();
  }));

const track = pubFacets.find(f => f.key === 'track');
ok('Kind option counts match the corpus',
  track && track.options.reduce((n, o) => n + o.count, 0) === PUBLIC.length,
  track ? track.options.map(o => o.value + '=' + o.count).join(', ') : 'missing');

console.log('kb-search: applyFilters');
const none = KBSearch.applyFilters(PUBLIC, {});
ok('no filters returns everything', none.length === PUBLIC.length);
ok('unfiltered listing is alphabetical by title', (() => {
  for (let i = 1; i < none.length; i++) {
    if (String(none[i - 1].title).localeCompare(String(none[i].title)) > 0) return false;
  }
  return true;
})());
ok('results carry the frozen Result fields',
  ['id', 'group', 'title', 'gist', 'score', 'matchedField', 'snippet']
    .every(k => k in none[0]));

console.log('kb-search: adoption flows through to result rows');
const adoptionOf = {};
PUBLIC.forEach(e => { adoptionOf[e.id] = e.adoption || ''; });
ok('every result mirrors its entry\'s adoption (\'\' when the entry has none)',
  none.every(r => r.adoption === adoptionOf[r.id]));
const drafts = PUBLIC.filter(e => e.adoption === 'draft');
ok('the store carries public draft entries (the un-adopted policies)',
  drafts.length > 0, drafts.map(e => e.id).join(', '));
const draftRows = KBSearch.applyFilters(PUBLIC, {}).filter(r => r.adoption === 'draft');
ok('each public draft entry surfaces as a draft-flagged row',
  draftRows.length === drafts.length,
  draftRows.length + ' rows for ' + drafts.length + ' draft entries');
const viaSearch = KBSearch.search(PUBLIC, drafts[0] ? drafts[0].title : '');
ok('search() results carry adoption too',
  !drafts[0] || (viaSearch.length > 0 && viaSearch.some(r => r.id === drafts[0].id && r.adoption === 'draft')));

const firstTrack = track.options[0].value;
const byTrack = KBSearch.applyFilters(PUBLIC, { track: firstTrack });
ok('a facet narrows to exactly its count',
  byTrack.length === track.options[0].count,
  firstTrack + ': got ' + byTrack.length + ', facet says ' + track.options[0].count);

const idsInTrack = new Set(
  PUBLIC.filter(e => (e.tags || []).indexOf('track:' + firstTrack) !== -1).map(e => e.id)
);
ok('every result really carries that facet value',
  byTrack.every(r => idsInTrack.has(r.id)));

console.log('kb-search: facets compose with the query');
const q = 'python';
const qOnly = KBSearch.applyFilters(PUBLIC, { q: q });
const qAndFacet = KBSearch.applyFilters(PUBLIC, { q: q, track: firstTrack });
ok('query alone returns matches', qOnly.length > 0, qOnly.length + ' for "' + q + '"');
ok('adding a facet never widens the result set', qAndFacet.length <= qOnly.length);
ok('facet + query results all satisfy the facet',
  qAndFacet.every(r => idsInTrack.has(r.id)));

console.log('kb-search: search() is unchanged (frozen seam)');
const direct = KBSearch.search(PUBLIC, q);
ok('applyFilters with only a query equals search()',
  direct.length === qOnly.length &&
  direct.every((r, i) => r.id === qOnly[i].id && r.score === qOnly[i].score),
  'search()=' + direct.length + ' applyFilters()=' + qOnly.length);

console.log('kb-search: an impossible combination yields the empty state');
const impossible = KBSearch.applyFilters(PUBLIC, { q: 'zzzznotarealterm', track: firstTrack });
ok('no matches returns an empty array, not an error', Array.isArray(impossible) && impossible.length === 0);

console.log('kb-search: URL state');
const st = KBSearch.readState('?q=slurm&track=tutorials&topic=scheduler');
ok('parses the query term', st.q === 'slurm');
ok('parses facet values', st.track === 'tutorials' && st.topic === 'scheduler');
ok('unset facets default to empty', st.group === '' && st.type === '');
ok('ignores unknown keys', !('bogus' in KBSearch.readState('?bogus=1')));
ok('decodes escaped values', KBSearch.readState('?q=data%20transfer').q === 'data transfer');
ok('handles a plus-encoded space', KBSearch.readState('?q=data+transfer').q === 'data transfer');
ok('empty search string is safe', KBSearch.readState('').q === '');

const roundTrip = KBSearch.readState('?q=gpu&track=' + encodeURIComponent(firstTrack));
ok('a shared URL reproduces its result set',
  KBSearch.applyFilters(PUBLIC, roundTrip).length ===
  KBSearch.applyFilters(PUBLIC, { q: 'gpu', track: firstTrack }).length);

console.log('kb-search: results carry entry_type (additive)');
const etSearch = KBSearch.search(PUBLIC, 'slurm');
ok('search results mirror the entry\'s entry_type', etSearch.length > 0 && etSearch.every(r => {
  const origin = PUBLIC.find(e => e.id === r.id);
  return origin && r.entry_type === (origin.entry_type || '');
}));
const etBrowse = KBSearch.applyFilters(PUBLIC, {});
ok('browse results mirror the entry\'s entry_type', etBrowse.every(r => {
  const origin = PUBLIC.find(e => e.id === r.id);
  return origin && r.entry_type === (origin.entry_type || '');
}));
ok('the corpus yields at least one guide result (the tiered UI has something to pin)',
  etBrowse.some(r => r.entry_type === 'guide'));

console.log('kb-search: contract discipline');
const src = fs.readFileSync(path.join(__dirname, 'kb-search.js'), 'utf8');
ok('zero fetch (file:// safe)', src.indexOf('fetch(') === -1);
ok('never reads the store directly', src.indexOf('KB_DATA') === -1,
  'the host passes an already-filtered entries array; that is the permission gate');
/* Comments legitimately name real values when explaining behavior; what must not happen is a
   facet value baked into the logic. Strip comments, then check. */
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
ok('no facet value is hardcoded in the logic',
  ['RCDS', 'GENERAL', 'tutorials', 'applications', 'procedural', 'substantive']
    .every(v => code.indexOf(v) === -1),
  ['RCDS', 'GENERAL', 'tutorials', 'applications', 'procedural', 'substantive']
    .filter(v => code.indexOf(v) !== -1).join(', ') + ' found in code');

console.log('');
if (failures) { console.log('kb-search: ' + failures + ' check(s) FAILED'); process.exit(1); }
console.log('kb-search: all checks passed');
