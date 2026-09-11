/* Standing check for news-archive's pure functions, run against the REAL generated store
   rather than a fixture — 114 published news items (117 extracted, minus 3 verbatim
   reposts; backend/news-data/CONTRACT.md, Normalization), plus hand-added stories since
   2026-09.
   Run:  node components/news-archive/check.js

   search/deriveYears/filterByYear/applyFilters/readState/excerpt are pure, so they need no
   DOM. mount() is the soft UI layer and is not exercised here; demo.html covers it by eye. */
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

/* Both files are browser IIFEs that only need `window` at load time. readState uses
   URLSearchParams, which Node provides globally. */
const sandbox = { console: console, URLSearchParams: URLSearchParams };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const rel of ['../../backend/news-data/news-data.generated.js', 'news-archive.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, rel), 'utf8'), sandbox, { filename: rel });
}
const NA = sandbox.window.NewsArchive;
const DATA = sandbox.window.NEWS_DATA;
const NEWS = DATA.news;

console.log('\nnews-archive: the store');
/* 114 migrated from the old site + stories added by hand since 2026-09 (CONTRACT.md,
   "Adding a story by hand"). Bump this with every addition; it is the drift guard. */
ok('115 news items', NEWS.length === 115, 'got ' + NEWS.length);
ok('5 event formats', DATA.events.length === 5, 'got ' + DATA.events.length);
ok('every item has a title', NEWS.every((n) => n.title && n.title.trim()));
ok('every item has an ISO date', NEWS.every((n) => /^\d{4}-\d{2}-\d{2}$/.test(n.date)));
ok('every item has a body', NEWS.every((n) => n.body && n.body.trim()));
ok('ids are unique', new Set(NEWS.map((n) => n.id)).size === NEWS.length);
ok('sorted newest first',
  NEWS.every((n, i) => i === 0 || NEWS[i - 1].date >= n.date));
/* The scrape decoded UTF-8 as cp1252; news.json is repaired by
   backend/news-data/repair-encoding.py. No repaired store may carry the signatures. */
ok('no mojibake signatures anywhere in the store', (() => {
  const sig = /â€|Ã[a-zA-Z¡-¿]|Â/;
  const rows = NEWS.concat(DATA.events);
  return !rows.some((r) => Object.keys(r).some(
    (k) => typeof r[k] === 'string' && sig.test(r[k])));
})());
/* The old site reposted stories under new newsids; the store dedupes them
   (backend/news-data/CONTRACT.md, Normalization). None may return. */
ok('no two items share an identical title and body', (() => {
  const seen = new Set();
  return NEWS.every((n) => {
    const key = n.title + '\u0000' + n.body;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
})());
/* Copy fixes from backend/news-data/CONTRACT.md, Normalization. The journal is Science,
   not SCIENCE; the store carries no other all-caps occurrence. */
ok('the journal Science is not shouted',
  !NEWS.some((n) => /\bSCIENCE\b/.test(n.title + ' ' + n.body)));
ok('the documented range holds (2018–2026)',
  NEWS[NEWS.length - 1].date.startsWith('2018') && NEWS[0].date.startsWith('2026'),
  NEWS[NEWS.length - 1].date + ' … ' + NEWS[0].date);

console.log('\nnews-archive: year derivation');
const years = NA.deriveYears(NEWS);
ok('nine years present', years.length === 9, 'got ' + years.length);
ok('newest year first', years[0].year === '2026' && years[years.length - 1].year === '2018');
ok('counts sum to the whole archive',
  years.reduce((a, y) => a + y.count, 0) === NEWS.length);
ok('years are derived, not hardcoded',
  NA.deriveYears([{ date: '1999-01-01' }]).map((y) => y.year).join() === '1999');
ok('an item with no date is not counted as a year',
  NA.deriveYears([{ date: '' }, { date: null }]).length === 0);

console.log('\nnews-archive: filtering');
ok('filterByYear narrows to that year',
  NA.filterByYear(NEWS, '2019').every((n) => n.date.startsWith('2019')));
ok('filterByYear count matches the derived count',
  NA.filterByYear(NEWS, '2019').length === years.find((y) => y.year === '2019').count);
ok('no year returns everything', NA.filterByYear(NEWS, '').length === NEWS.length);

console.log('\nnews-archive: search');
ok('empty query returns everything', NA.search(NEWS, '').length === NEWS.length);
ok('a known term matches', NA.search(NEWS, 'genomics').length > 0);
ok('search is case-insensitive',
  NA.search(NEWS, 'GENOMICS').length === NA.search(NEWS, 'genomics').length);
ok('search covers the body, not just the title', (() => {
  const hits = NA.search(NEWS, 'genomics');
  return hits.some((h) => !/genomics/i.test(h.title) && /genomics/i.test(h.body));
})());
ok('multi-term search is AND, not OR', (() => {
  const a = NA.search(NEWS, 'research');
  const b = NA.search(NEWS, 'research computing');
  return b.length <= a.length;
})());
ok('nonsense returns nothing', NA.search(NEWS, 'zzzzqqqq').length === 0);

console.log('\nnews-archive: composition and URL state');
ok('applyFilters composes year and query', (() => {
  const rows = NA.applyFilters(NEWS, { year: '2019', q: 'data' });
  return rows.every((r) => r.date.startsWith('2019') &&
    /data/i.test(r.title + ' ' + r.body));
})());
ok('readState parses both keys', (() => {
  const s = NA.readState('?q=ai&year=2024');
  return s.q === 'ai' && s.year === '2024';
})());
ok('readState defaults to empty', (() => {
  const s = NA.readState('');
  return s.q === '' && s.year === '';
})());
ok('writeState round-trips', (() => {
  const s = { q: 'ai fellow', year: '2024' };
  const r = NA.readState(NA.writeState(s));
  return r.q === s.q && r.year === s.year;
})());
ok('a clean state writes a clean URL', NA.writeState({ q: '', year: '' }) === '');

console.log('\nnews-archive: display helpers');
ok('excerpt leaves a short body alone', NA.excerpt('Short body.', 260) === 'Short body.');
ok('excerpt truncates on a word boundary and marks itself', (() => {
  const out = NA.excerpt('word '.repeat(200), 60);
  return out.length <= 61 && out.endsWith('…') && !/\s…$/.test(out);
})());
ok('formatDate is human-readable',
  NA.formatDate('2025-04-18') === 'April 18, 2025', 'got ' + NA.formatDate('2025-04-18'));
ok('formatDate passes a bad value through', NA.formatDate('n/a') === 'n/a');

console.log('\nnews-archive: events store');
const EV = DATA.events;
ok('every event has an id and a title', EV.every((e) => e.id && e.title));
ok('event ids are unique', new Set(EV.map((e) => e.id)).size === EV.length);
ok('every event declares a status', EV.every((e) => e.status));
ok('no event claims to be upcoming', !EV.some((e) => /upcoming|active/i.test(e.status)),
  'the source has no future-dated event; the page must not imply otherwise');
/* U.S. editorial style, per the CONTRACT's copy-fix pass. */
ok('events carry no British spellings', !EV.some((e) =>
  /\bprogramme\b/i.test([e.summary, e.detail, e.title].filter(Boolean).join(' '))));
/* The one live pathway off this page. A continuation link with no label renders as
   generic text, which defeats the point of naming where a format still runs. */
ok('a continuation link carries a label',
  EV.every((e) => !e.continues_url || (e.continues_label && e.continues_label.trim())));
ok('the superseded workshops name their continuation',
  !!(EV.find((e) => e.id === 'event-workshops') || {}).continues_url);
ok('last_held is a date the page can render', EV.every((e) =>
  e.last_held == null || /^\d{4}(-\d{2}(-\d{2})?)?$/.test(e.last_held)));

console.log(
  '\n  ' + NEWS.length + ' news items across ' + years.length + ' years (' +
  years[years.length - 1].year + '–' + years[0].year + '); ' + EV.length + ' event formats.'
);

if (failures) { console.log('\nnews-archive: ' + failures + ' FAILED\n'); process.exit(1); }
console.log('\nnews-archive: all checks passed\n');
