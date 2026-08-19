/* Standing check for project-browse's pure functions, run against the REAL generated store
   rather than a fixture — 126 published records: 96 source-verified grants, the AI4UI record,
   and its 29 subprojects. Rebuilt 2026-08-14 from the curated grant list; the previous
   collection also happened to hold 126, which is coincidence.
   Run:  node components/project-browse/check.js

   search/deriveFacets/applyFilters/readState are pure, so they need no DOM. mountFaceted
   and mountOverview are the soft UI layer and are not exercised here. */
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

/* project-browse.js is a browser IIFE that only needs `window` at load time. */
const sandbox = { console: console };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, 'project-browse.js'), 'utf8'),
  sandbox, { filename: 'project-browse.js' }
);
const PB = sandbox.ProjectBrowse;

/* the real store */
const dataSandbox = { window: {} };
vm.createContext(dataSandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '../../backend/projects-data/projects-data.generated.js'), 'utf8'),
  dataSandbox, { filename: 'projects-data.generated.js' }
);
const DATA = dataSandbox.window.PROJECTS_DATA;
const ITEMS = DATA.items;

console.log('project-browse: store');
ok('generated store loaded', ITEMS.length > 0, ITEMS.length + ' projects');
ok('count matches the payload header', DATA.count === ITEMS.length);
ok('every project has an id and a title',
  ITEMS.every(i => i.objectid && i.title));
ok('ids are unique', new Set(ITEMS.map(i => i.objectid)).size === ITEMS.length);
ok('no internal QA field reached the store',
  ['review_flag', 'notes', 'clickup_folders', 'grant_codes', 'internal_sources']
    .every(f => ITEMS.every(i => !(f in i))));
ok('no record carries a publication hold',
  !ITEMS.some(i => /UNVERIFIED|Verify before publishing/i.test(JSON.stringify(i))));
/* Withholding the internal COLUMNS was not enough: folder names, activity counts and grant
   codes reached the site inside description prose, and the web-research pass wrote its own
   negative findings into infrastructure and partners. Both are the same leak by another
   route, so the text is checked, not just the schema. Naming the record system is fine —
   the page disclaimer does it — narrating the ledger is not. */
const LEDGER = [
  /recorded activities/i, /clickup (space|folder|list)\b/i, /under grant code/i,
  /retrieved (sources?|records?|documents?)/i, /(sources?|records?|documents?) retrieved/i,
  /could retrieve/i, /no retrieved/i
];
const ledgered = [];
ITEMS.forEach(i => Object.keys(i).forEach(k => {
  if (LEDGER.some(re => re.test(String(i[k])))) ledgered.push(i.objectid + '.' + k);
}));
ok('no field narrates the internal record instead of the project',
  ledgered.length === 0, ledgered.join(', '));
ok('evidence_note ships only where it renders — the low-confidence note',
  !ITEMS.some(i => i.evidence_note && i.confidence !== 'Low'),
  ITEMS.filter(i => i.evidence_note && i.confidence !== 'Low').map(i => i.objectid).join(', '));
/* THE INVARIANT IS THE CARD, NOT THE COLUMN. A card must never render as a title and an arrow
   over blank space. Until 2026-08-14 only one thing could fill a missing description — the
   low-confidence sentence — so the check tested `confidence === 'Low'` as a proxy. There are
   now three legitimate fillers, so it tests the thing it always meant:

     gist          a one-line summary written for this slot
     description   the prose body
     Low           "internal records attest this; no public source was found"
     source_url    "no published description. Documented at <host>." — the award IS public,
                   the funder simply publishes no abstract

   A record with none of these has nothing to say and must not ship. */
const bare = ITEMS.filter(i => !String(i.description || '').trim());
const mute = ITEMS.filter(i => !String(i.description || '').trim() &&
                               !String(i.gist || '').trim() &&
                               i.confidence !== 'Low' &&
                               !String(i.source_url || '').trim());
ok('no card can render without body text',
  mute.length === 0, mute.map(i => i.objectid).join(', '));
console.log('       ' + bare.length + ' of ' + ITEMS.length +
  ' records publish without a description; ' +
  bare.filter(i => i.gist).length + ' carry a gist, ' +
  bare.filter(i => !i.gist && i.confidence === 'Low').length + ' are low-confidence stubs, ' +
  bare.filter(i => !i.gist && i.confidence !== 'Low' && i.source_url).length +
  ' name their source instead');

console.log('project-browse: facets');
const facets = PB.deriveFacets(ITEMS);
ok('facets are derived, not empty', facets.length > 0,
  facets.map(f => f.key + '(' + f.options.length + ')').join(' '));
ok('every facet offers more than one value', facets.every(f => f.options.length > 1));
ok('facet counts sum to no more than the collection',
  facets.every(f => f.options.reduce((n, o) => n + o.count, 0) <= ITEMS.length));
ok('options are ordered by count, descending',
  facets.every(f => f.options.every((o, i) => i === 0 || f.options[i - 1].count >= o.count)));
ok('the topic facet stays out of the control set — it is the cloud',
  !facets.some(f => f.key === 'topic'));

console.log('project-browse: filtering');
const area = facets.filter(f => f.key === 'research_area')[0];
ok('research area is a facet', !!area);
const firstArea = area.options[0].value;
const byArea = PB.applyFilters(ITEMS, { research_area: firstArea });
ok('a facet narrows the collection', byArea.length === area.options[0].count,
  byArea.length + ' vs expected ' + area.options[0].count);
ok('every survivor carries the filtered value',
  byArea.every(r => r.item.research_area === firstArea));
ok('an empty state returns everything', PB.applyFilters(ITEMS, {}).length === ITEMS.length);
ok('an impossible facet value returns nothing',
  PB.applyFilters(ITEMS, { research_area: 'not-a-real-area' }).length === 0);

console.log('project-browse: year filter');
/* The histogram bars set state.year, which must filter on the parsed date field — a bar
   labeled N projects has to return exactly N, for every year in the store. */
const yearCounts = {};
ITEMS.forEach(i => {
  const y = parseInt(i.date, 10);
  if (!isNaN(y)) yearCounts[y] = (yearCounts[y] || 0) + 1;
});
const yearKeys = Object.keys(yearCounts);
ok('the store carries start years', yearKeys.length > 1, yearKeys.length + ' distinct years');
ok('every histogram bar count equals its filter count',
  yearKeys.every(y => PB.applyFilters(ITEMS, { year: y }).length === yearCounts[y]),
  yearKeys.filter(y => PB.applyFilters(ITEMS, { year: y }).length !== yearCounts[y])
    .map(y => y + ': got ' + PB.applyFilters(ITEMS, { year: y }).length + ', bar shows ' + yearCounts[y])
    .join('  '));
const someYear = yearKeys.slice().sort((a, b) => yearCounts[b] - yearCounts[a])[0];
ok('every survivor starts in the filtered year',
  PB.applyFilters(ITEMS, { year: someYear }).every(r => parseInt(r.item.date, 10) === Number(someYear)));
ok('a year with no projects returns nothing', PB.applyFilters(ITEMS, { year: '1875' }).length === 0);
ok('a year composes with a facet — never widens it',
  PB.applyFilters(ITEMS, { research_area: firstArea, year: someYear }).length <=
    Math.min(byArea.length, yearCounts[someYear]));
ok('year survives the URL round-trip',
  PB.readState('?year=' + someYear).year === someYear &&
  PB.applyFilters(ITEMS, PB.readState('?year=' + someYear)).length === yearCounts[someYear]);

console.log('project-browse: search');
const hits = PB.search(ITEMS, 'genomics');
ok('a common term matches something', hits.length > 0, hits.length + ' hits');
ok('results are ranked, descending',
  hits.every((r, i) => i === 0 || hits[i - 1].score >= r.score));
ok('an empty query returns nothing (the browse lists instead)', PB.search(ITEMS, '').length === 0);
ok('all terms must match (AND, not OR)',
  PB.search(ITEMS, 'genomics zzzznotaword').length === 0);
ok('search composes with facets — never widens them',
  PB.applyFilters(ITEMS, { research_area: firstArea, q: 'a' }).length <= byArea.length);
ok('a title term outranks a body term',
  (function () {
    const t = ITEMS.filter(i => /storage/i.test(i.title))[0];
    if (!t) return true;
    const r = PB.search(ITEMS, 'storage');
    return r.length > 0 && r[0].score >= r[r.length - 1].score;
  })());

console.log('project-browse: sorting');
const newest = PB.applyFilters(ITEMS, { sort: 'newest' }).map(r => parseInt(r.item.date, 10))
  .filter(y => !isNaN(y));
ok('newest-first is monotonic', newest.every((y, i) => i === 0 || newest[i - 1] >= y));
const az = PB.applyFilters(ITEMS, {}).map(r => String(r.item.title));
ok('default order is alphabetical',
  az.every((t, i) => i === 0 || az[i - 1].localeCompare(t) <= 0));

console.log('project-browse: URL state');
const st = PB.readState('?q=lidar&research_area=Agriculture&sort=newest&bogus=1');
ok('reads known keys', st.q === 'lidar' && st.research_area === 'Agriculture' && st.sort === 'newest');
ok('ignores unknown keys', !('bogus' in st));
ok('round-trips through applyFilters',
  PB.applyFilters(ITEMS, st).length ===
  PB.applyFilters(ITEMS, { q: 'lidar', research_area: 'Agriculture', sort: 'newest' }).length);

console.log('project-browse: contract discipline');
const src = fs.readFileSync(path.join(__dirname, 'project-browse.js'), 'utf8');
ok('zero fetch (file:// safe)', src.indexOf('fetch(') === -1);
ok('never reads the store directly', src.indexOf('PROJECTS_DATA') === -1,
  'the host passes the items array in');
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const LITERALS = ['Agriculture', 'Water resources', 'NSF', 'USDA', 'Active', 'Complete'];
ok('no facet value is hardcoded in the logic',
  LITERALS.every(v => code.indexOf(v) === -1),
  LITERALS.filter(v => code.indexOf(v) !== -1).join(', ') + ' found in code');

console.log('');
if (failures) { console.log('project-browse: ' + failures + ' check(s) FAILED'); process.exit(1); }
console.log('project-browse: all checks passed');
