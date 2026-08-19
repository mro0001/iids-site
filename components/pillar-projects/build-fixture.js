/* Producer: parses content/ai4ui_projects.md (the single source of record) into the
   pillar-projects record shape and writes fixture.js. This is the content->records seam
   in node-build form; a backend getPillarProjects() will later return the same shape,
   so wiring to a live projects database is a one-line host change.
   Run:  node components/pillar-projects/build-fixture.js */
const fs = require('fs');
const path = require('path');

const CONTENT = path.join(__dirname, '../../content/ai4ui_projects.md');
const OUT = path.join(__dirname, 'fixture.js');

/* The caveat travels with the data that earns it. This producer serves a hand-kept roster,
   so it emits `note`; a backend getPillarProjects() over live records omits it and the
   component renders no caveat. Never hardcode it in the component. */
const NOTE = 'Illustrative list — final roster pending';

const md = fs.readFileSync(CONTENT, 'utf8');
const body = md.replace(/^<!--[\s\S]*?-->\s*/, '');   // strip frozen header

const pillars = [];
// each pillar is a "## Pillar N — Title" section (skip "## Needs" etc.)
const sections = body.split(/^## /m).slice(1);
sections.forEach(sec => {
  const heading = sec.split('\n')[0].trim();
  const m = heading.match(/^Pillar\s+(\d+)\s*[—-]\s*(.+)$/);
  if (!m) return;                                     // not a pillar section
  const id = 'pillar' + m[1];
  const blurbLine = (sec.match(/\n\n([^\n#-][^\n]*)/) || [])[1];   // first prose line after heading
  const projects = [];
  sec.split('\n').forEach(line => {
    const pm = line.match(/^-\s+(.+?)\s+[—-]\s+(.+?)\s*$/);        // "- name — status"
    if (pm) projects.push({ name: pm[1].trim(), status: pm[2].trim() });
  });
  pillars.push({ id, title: 'Pillar ' + m[1] + ' — ' + m[2].trim(),
    blurb: blurbLine ? blurbLine.trim() : '', projects });
});

const banner =
  '/* GENERATED from content/ai4ui_projects.md by build-fixture.js — do not edit by hand.\n' +
  '   Regenerate:  node components/pillar-projects/build-fixture.js\n' +
  '   content/ai4ui_projects.md is the single source of record; this file is derived.\n' +
  '   The record shape here is the frozen seam a projects database (getPillarProjects())\n' +
  '   will later produce — same shape, one-line swap to live data.\n' +
  '   NEVER a fetched .json — a double-clicked file:// page cannot fetch it. */\n';

fs.writeFileSync(OUT, banner + 'window.PILLARS_FIXTURE = ' + JSON.stringify({ note: NOTE, pillars }, null, 2) + ';\n');
console.log('Wrote ' + pillars.length + ' pillars: ' +
  pillars.map(p => p.id + '(' + p.projects.length + ')').join(', '));
