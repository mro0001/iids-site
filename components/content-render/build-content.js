/* Producer (the "Shell" renderer, build-step form): reads content/*.md section bodies,
   renders the markdown to HTML, and writes content-render.generated.js as an inline global
   window.CONTENT = { <key>: "<html>", ... }. A page mounts each section from that global.
   file://-safe (no fetch). A backend content-read service produces the same shape later.
   Run:  node components/content-render/build-content.js

   Minimal, no-dependency markdown: headings, paragraphs, unordered lists, bold, italic,
   inline code, [links](url), and <autolinks>. Internal "## Needs" sections and the leading
   H1 (the page supplies its own section heading) are dropped. Line-based, so it does not
   depend on blank lines around headings/lists. */
const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '../../content');
const OUT = path.join(__dirname, 'content-render.generated.js');

// sections a page currently renders (extend as more pages consume content)
const KEYS = ['ai4ui_overview', 'ai4ui_projects', 'ai4ui_news', 'ai4ui_events', 'ai4ui_resources', 'ai4ui_contact', 'about_mission', 'about_origin', 'home_who_we_are', 'contact_by_need', 'contact_core_contacts'];

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escAttr(s) { return esc(s).replace(/"/g, '&quot;'); }

// %%% cannot occur in our markdown, so placeholders survive esc()/bold/italic and restore cleanly.
function inline(s) {
  var store = [];
  function stash(html) { store.push(html); return '%%%' + (store.length - 1) + '%%%'; }
  s = s.replace(/`([^`]+)`/g, function (_, c) { return stash('<code>' + esc(c) + '</code>'); });
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, t, u) { return stash('<a href="' + escAttr(u) + '">' + esc(t) + '</a>'); });
  s = s.replace(/<((?:https?:\/\/|mailto:)[^>\s]+)>/g, function (_, u) { return stash('<a href="' + escAttr(u) + '">' + esc(u) + '</a>'); });
  s = s.replace(/<([^>@\s]+@[^>\s]+)>/g, function (_, e) { return stash('<a href="mailto:' + escAttr(e) + '">' + esc(e) + '</a>'); });
  s = esc(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/%%%(\d+)%%%/g, function (_, i) { return store[+i]; });
  return s;
}

function render(md) {
  md = md.replace(/^<!--[\s\S]*?-->\s*/, '');       // strip frozen header
  md = md.replace(/^#\s+[^\n]*\n/, '');             // drop leading H1 (page supplies its heading)
  md = md.replace(/\n##\s+Needs[\s\S]*$/, '\n');    // drop internal Needs section
  var lines = md.replace(/\r/g, '').split('\n');
  var out = [];
  var i = 0;
  var isItem = l => /^-\s+/.test(l.trim());
  var isHead = l => /^#{1,6}\s+/.test(l);
  while (i < lines.length) {
    var line = lines[i];
    if (!line.trim()) { i++; continue; }
    // `### Title {#id}` — an optional explicit id, so a page's deep-link targets live in
    // the content file rather than in hand-written anchors around it.
    var h = line.match(/^(#{1,6})\s+(.*?)(?:\s+\{#([a-z][a-z0-9_-]*)\})?\s*$/);
    if (h) {
      out.push('<h' + h[1].length + (h[3] ? ' id="' + h[3] + '"' : '') + '>' +
        inline(h[2]) + '</h' + h[1].length + '>');
      i++; continue;
    }
    if (isItem(line)) {
      var items = [];
      while (i < lines.length && isItem(lines[i])) { items.push('<li>' + inline(lines[i].trim().replace(/^-\s+/, '')) + '</li>'); i++; }
      out.push('<ul>' + items.join('') + '</ul>');
      continue;
    }
    var para = [];
    while (i < lines.length && lines[i].trim() && !isHead(lines[i]) && !isItem(lines[i])) { para.push(lines[i].trim()); i++; }
    out.push('<p>' + inline(para.join(' ')) + '</p>');
  }
  return out.join('\n');
}

var content = {};
KEYS.forEach(function (key) {
  content[key] = render(fs.readFileSync(path.join(CONTENT_DIR, key + '.md'), 'utf8'));
});

var banner =
  '/* GENERATED from content/*.md by build-content.js — do not edit by hand.\n' +
  '   Regenerate:  node components/content-render/build-content.js\n' +
  '   The content files are the single source of record; this file is derived.\n' +
  '   A backend content-read service produces the same window.CONTENT shape later.\n' +
  '   NEVER a fetched .json — a double-clicked file:// page cannot fetch it. */\n';

fs.writeFileSync(OUT, banner + 'window.CONTENT = ' + JSON.stringify(content, null, 2) + ';\n');
console.log('Rendered ' + KEYS.length + ' sections: ' + KEYS.join(', '));
