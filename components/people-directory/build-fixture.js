/* Producer: parses content/about_people.md (the single source of record) into the
   People record shape and writes fixture.js. This is the content->records seam in
   node-build form; the same shape is what a backend getPeople() will later return,
   so wiring to live data becomes a one-line host change.
   Run:  node components/people-directory/build-fixture.js */
const fs = require('fs');
const path = require('path');

const CONTENT = path.join(__dirname, '../../content/about_people.md');
const OUT = path.join(__dirname, 'fixture.js');
const LABELS = { IIDS: 'Administrative Core', RCDS: 'RCDS', GBRC: 'GBRC', GENERAL: 'General' };

const md = fs.readFileSync(CONTENT, 'utf8');

// isolate the "## Staff" section (up to the next "## " heading)
const start = md.indexOf('## Staff');
if (start === -1) throw new Error('No ## Staff section found');
const after = md.indexOf('\n## ', start + 1);
const staff = md.slice(start, after === -1 ? undefined : after);

const first = m => (m ? m[1].trim() : '');
const people = [];
const seen = [];

// each person entry begins with "### "
staff.split(/^### /m).slice(1).forEach(ch => {
  const name = ch.split('\n')[0].trim();
  const img = ch.match(/!\[(.*?)\]\((.+?)\)/);
  const unit = first(ch.match(/- Unit:\s*(\S+)/));
  const rec = {
    name,
    title: first(ch.match(/\*\*(.+?)\*\*/)),
    unit,
    photo: img ? 'content/' + img[2].trim() : '',   // repo-root-relative; host passes assetBase
    email: first(ch.match(/- Email:\s*<(.+?)>/)),
    website: first(ch.match(/- Website:\s*<(.+?)>/)),
  };
  if (img && /placeholder/i.test(img[1])) rec.placeholderPhoto = true;
  people.push(rec);
  if (unit && !seen.includes(unit)) seen.push(unit);
});

/* The steering committee is in the same source file but is not staff: bullets of
   "[Name](url) — Affiliation", no unit and no headshot. Parsed here so the roster keeps one
   source of record; the host renders it with mountCommittee(). */
const committee = [];
const csStart = md.indexOf('## Steering Committee');
if (csStart !== -1) {
  const csAfter = md.indexOf('\n## ', csStart + 1);
  md.slice(csStart, csAfter === -1 ? undefined : csAfter)
    .split('\n')
    .forEach(line => {
      const m = line.match(/^-\s*\[(.+?)\]\((.+?)\)\s*(?:[—–-]\s*(.*))?$/);
      if (m) committee.push({ name: m[1].trim(), url: m[2].trim(), affiliation: (m[3] || '').trim() });
    });
}

const fixture = { groups: seen.map(code => ({ code, label: LABELS[code] || code })), people, committee };

const banner =
  '/* GENERATED from content/about_people.md by build-fixture.js — do not edit by hand.\n' +
  '   Regenerate:  node components/people-directory/build-fixture.js\n' +
  '   content/about_people.md is the single source of record; this file is derived.\n' +
  '   The record shape here is the frozen seam the component consumes and a backend\n' +
  '   getPeople() will later produce (same shape -> one-line swap to live data).\n' +
  '   NEVER a fetched .json — a double-clicked file:// page cannot fetch it. */\n';

fs.writeFileSync(OUT, banner + 'window.PEOPLE_FIXTURE = ' + JSON.stringify(fixture, null, 2) + ';\n');
console.log('Wrote ' + people.length + ' people (+' + committee.length + ' steering committee); groups: '
  + fixture.groups.map(g => g.code).join('/'));
