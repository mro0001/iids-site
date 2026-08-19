/* Producer: parses content/home_capabilities.md into the capability-statement record
   shape and writes fixture.js as an inline JS global.

   Run:  node components/capability-statement/build-fixture.js

   content/home_capabilities.md is the single source of record; fixture.js is derived.
   NEVER a fetched .json — a double-clicked file:// page cannot fetch it and the band
   would silently blank. The record shape here is the frozen seam a content service
   (getCapabilities()) will later produce: same shape, one-line swap to live data. */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '../../content/home_capabilities.md');
const OUT = path.join(__dirname, 'fixture.js');

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parse(md) {
  md = md.replace(/^<!--[\s\S]*?-->\s*/, '');        // frozen header
  md = md.replace(/^#\s+[^\n]*\n/, '');              // leading H1 (the page supplies its own)
  md = md.replace(/\n##\s+Needs[\s\S]*$/, '\n');     // internal Needs section never ships

  const items = [];
  const lines = md.replace(/\r/g, '').split('\n');
  let cur = null;
  for (const line of lines) {
    const h = line.match(/^##\s+(.*)$/);
    if (h) {
      if (cur) items.push(cur);
      cur = { id: slug(h[1]), title: h[1].trim(), statement: '' };
      continue;
    }
    if (cur && line.trim()) {
      cur.statement = (cur.statement ? cur.statement + ' ' : '') + line.trim();
    }
  }
  if (cur) items.push(cur);
  return items.filter(function (it) { return it.title && it.statement; });
}

const items = parse(fs.readFileSync(SRC, 'utf8'));
if (!items.length) {
  console.error('capability-statement: parsed 0 items from ' + SRC + ' — refusing to write an empty fixture.');
  process.exit(1);
}

fs.writeFileSync(OUT,
  '/* GENERATED from content/home_capabilities.md by build-fixture.js — do not edit by hand.\n' +
  '   Regenerate:  node components/capability-statement/build-fixture.js\n' +
  '   content/home_capabilities.md is the single source of record; this file is derived.\n' +
  '   NEVER a fetched .json — a double-clicked file:// page cannot fetch it. */\n' +
  'window.CAPABILITY_FIXTURE = ' + JSON.stringify({ items: items }, null, 2) + ';\n'
);
console.log('capability-statement: wrote ' + items.length + ' items -> ' + path.relative(process.cwd(), OUT));
