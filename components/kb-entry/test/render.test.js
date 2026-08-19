'use strict';
const assert = require('assert');
global.window = {};
require('../kb-entry.js');
const { render, mount } = global.window.KBEntry;

// Fenced code block → <pre><code>, content escaped and verbatim.
const md = [
  'Intro paragraph.',
  '',
  '```',
  'module load ncbi-blast',
  '# a comment, not a heading',
  '- not a bullet',
  'echo "<x>" & done',
  '```',
  '',
  '## After',
].join('\n');
const html = render(md);
assert.ok(html.includes('<pre><code>'), 'emits pre/code');
assert.ok(html.includes('module load ncbi-blast'), 'code line preserved');
assert.ok(html.includes('# a comment, not a heading'), 'in-fence # kept literal');
assert.ok(html.includes('- not a bullet'), 'in-fence - kept literal');
assert.ok(!/<li>not a bullet/.test(html), 'code "-" line is NOT a bullet');
assert.ok(!/<h1>a comment/.test(html) && !/<h2>a comment/.test(html), 'code "#" line is NOT a heading');
assert.ok(html.includes('&lt;x&gt;') && html.includes('&amp;'), 'code HTML-escaped');
assert.ok(/<h2>After<\/h2>/.test(html), 'a real ## heading after the fence still renders');

// Existing behaviors still work.
assert.ok(/<h2>Head<\/h2>/.test(render('## Head')), 'heading');
assert.ok(/<li>one<\/li>/.test(render('- one')), 'bullet');
assert.ok(/<strong>b<\/strong>/.test(render('**b**')), 'bold');
assert.ok(/<a href="u">t<\/a>/.test(render('[t](u)')), 'link');

// Images → <img>, NOT a "!"-prefixed link.
const img = render('![slurm logo](http://x.com/logo.png)');
assert.ok(/<img src="http:\/\/x.com\/logo.png" alt="slurm logo">/.test(img), 'image → img tag');
assert.ok(!/<a /.test(img), 'image not rendered as a link');
assert.ok(/<a href="u">t<\/a>/.test(render('[t](u)')), 'plain link still works alongside image rule');

// *italic* → <em>, and it must not break **bold** or eat a bold pair.
assert.ok(/<em>i<\/em>/.test(render('*i*')), 'italic');
assert.ok(/<p>a condition on <em>sponsored<\/em> work<\/p>/.test(render('a condition on *sponsored* work')),
  'italic mid-sentence');
assert.ok(/<strong>b<\/strong>/.test(render('**b**')) && !/<em>/.test(render('**b**')),
  'bold is not re-read as two italics');
const mixed = render('*Second draft. Figures marked **[VERIFY]** must be confirmed.*');
assert.ok(/<em>/.test(mixed) && /<strong>\[VERIFY\]<\/strong>/.test(mixed), 'italic wrapping a bold span');
assert.ok(!/\*/.test(mixed), 'no literal asterisk survives');

// A thematic-break line wins over the italic and bullet rules.
assert.ok(/<hr>/.test(render('* * *')) && !/<em>/.test(render('* * *')), '"* * *" is a rule, not italics');
assert.ok(/<hr>/.test(render('***')) && /<hr>/.test(render('---')) && /<hr>/.test(render('___')),
  '***, --- and ___ are rules');
assert.ok(!/<hr>/.test(render('- one')), 'a real bullet is still a bullet');

// "> " blockquote → <blockquote>, body runs the block subset, no literal "> ".
const bq = render([
  'Lead paragraph.',
  '',
  '> **Dependency:** VERAS is scheduled for replacement.',
  '> The rules survive the system change.',
  '',
  '## After',
].join('\n'));
assert.ok(/<blockquote>/.test(bq) && /<\/blockquote>/.test(bq), 'emits blockquote');
assert.ok(bq.includes('<strong>Dependency:</strong>'), 'inline markdown inside the quote');
assert.ok(!/&gt;\s/.test(bq), 'no literal "&gt; " leaks into the output');
assert.ok(/<p>Lead paragraph\.<\/p>/.test(bq), 'the paragraph before does not swallow the quote');
assert.ok(/<h2>After<\/h2>/.test(bq), 'content after the quote still renders');
assert.ok(/<blockquote><ul><li>one<\/li><\/ul><\/blockquote>/.test(render('> - one')),
  'a quote can carry the block subset');

// Backslash-escaped punctuation is unescaped for display.
assert.ok(/<p>\[x\] _y_<\/p>/.test(render('\\[x\\] \\_y\\_')), 'backslash-escapes unescaped');

// GFM table → <table> with header + body cells; separator row not shown.
const tbl = [
  '| Command | Slurm |',
  '|---|---|',
  '| submit | sbatch \\[script\\] |',
  '| mem | --mem=\\[M\\|G\\] |',
].join('\n');
const th = render(tbl);
assert.ok(/<table>[\s\S]*<\/table>/.test(th), 'table element');
assert.ok(/<thead>[\s\S]*<th>Command<\/th>[\s\S]*<th>Slurm<\/th>[\s\S]*<\/thead>/.test(th), 'header cells');
assert.ok(/<td>submit<\/td>/.test(th), 'body cell');
assert.ok(/<td>sbatch \[script\]<\/td>/.test(th), 'escaped brackets unescaped in cell');
assert.ok(/<td>--mem=\[M\|G\]<\/td>/.test(th), 'escaped pipe preserved inside cell (not split)');
assert.ok(!/\|\s*---/.test(th) && !/&lt;td&gt;/.test(th), 'separator row not rendered as content');
console.log('render.test.js: PASS');

// Disclosure: ":::details Summary" … ":::" → <details>/<summary>, body runs the
// same block subset, and a bare ":::" closes it.
const dmd = [
  'Lead paragraph.',
  '',
  ':::details Conditions of use',
  'Shared storage is for **active research data only**.',
  '',
  '- no personal backups',
  '- no FERPA data',
  ':::',
  '',
  '## After',
].join('\n');
const dhtml = render(dmd);
assert.ok(/<details><summary>Conditions of use<\/summary>/.test(dhtml), 'emits details/summary');
assert.ok(dhtml.includes('<strong>active research data only</strong>'), 'inline markdown inside');
assert.ok(/<li>no personal backups<\/li>/.test(dhtml), 'bullets inside the disclosure');
assert.ok(dhtml.includes('</details>'), 'disclosure is closed');
assert.ok(!dhtml.includes(':::'), 'no literal ::: leaks into the output');
assert.ok(/<h2>After<\/h2>/.test(dhtml), 'content after the disclosure still renders');
// A ":::details" with no summary text is not a disclosure.
assert.ok(!/<details>/.test(render(':::details')), 'bare :::details is not a disclosure');

// Draft banner: driven by adoption:'draft' in the record, never by body prose.
const BANNER = 'DRAFT — under review. Not adopted institute policy; figures pending verification.';
const baseEntry = {
  group: 'IIDS', title: 'Policy: T', source: 'S', source_url: null,
  gist: 'g', body: '## H\n\nBody.', created_date: '2026-08-08', last_updated: '2026-08-08',
};
const draftRoot = {};
mount(draftRoot, Object.assign({ adoption: 'draft' }, baseEntry));
assert.ok(draftRoot.innerHTML.includes('class="kbentry-draft"'), 'draft entry renders the banner element');
assert.ok(draftRoot.innerHTML.includes(BANNER), 'banner carries the standard wording');
assert.ok(draftRoot.innerHTML.indexOf('kbentry-draft') < draftRoot.innerHTML.indexOf('kbentry-source'),
  'banner sits above the source callout');

const plainRoot = {};
mount(plainRoot, baseEntry);
assert.ok(!plainRoot.innerHTML.includes('kbentry-draft'), 'no adoption key → no banner');
const adoptedRoot = {};
mount(adoptedRoot, Object.assign({ adoption: 'adopted' }, baseEntry));
assert.ok(!adoptedRoot.innerHTML.includes('kbentry-draft'), 'adoption: adopted → no banner');
console.log('draft banner asserts: PASS');

// KB embed marker: "{{kb: id}}" / "{{kb: id | full}}" on its own line → a
// placeholder div the host hydrates from its store. Malformed markers are NOT
// silently dropped — they fall through as paragraph text so review sees them.
var emb = render('Intro.\n\n{{kb: rcds-slurm}}\n\n{{kb: iids-travel | full}}\n\n## After');
assert.ok(emb.includes('<div class="kbentry-embed" data-kb-id="rcds-slurm" data-kb-mode="card"></div>'),
  'bare marker → card placeholder');
assert.ok(emb.includes('<div class="kbentry-embed" data-kb-id="iids-travel" data-kb-mode="full"></div>'),
  '| full marker → full placeholder');
assert.ok(/<h2>After<\/h2>/.test(emb), 'content after markers still renders');
var emb2 = render('Prose line.\n{{kb: rcds-slurm}}');
assert.ok(emb2.includes('data-kb-id="rcds-slurm"'), 'marker after a prose line (no blank) is not swallowed');
assert.ok(!render('{{kb: Bad_ID}}').includes('kbentry-embed'), 'uppercase/underscore id is not a marker');
assert.ok(render('{{kb: Bad_ID}}').includes('{{kb: Bad_ID}}'), 'malformed marker ships literal (visible in review)');
assert.ok(!render('{{kb: rcds-slurm | fulll}}').includes('kbentry-embed'), 'bad mode is not a marker');
assert.ok(render('```\n{{kb: rcds-slurm}}\n```').includes('<pre><code>'), 'marker inside a fence stays code');
assert.ok(!render('```\n{{kb: rcds-slurm}}\n```').includes('kbentry-embed'), 'fenced marker is not a placeholder');
console.log('embed marker asserts: PASS');

// hydrate(): fills placeholders from the entries the HOST passes — the store
// the page loaded is the permission gate; hydrate can never surface more.
var hstore = [
  { id: 'a-one', title: 'Entry One', gist: 'First gist.', body: 'Body one.', visibility: 'public' },
  { id: 'a-two', title: 'Entry Two', gist: 'Second gist.',
    body: 'Two intro.\n\n{{kb: a-one}}\n\n{{kb: a-draft | full}}', visibility: 'public' },
  { id: 'a-draft', title: 'Draft Policy', gist: 'D gist.', body: 'Draft body.',
    adoption: 'draft', visibility: 'public' },
];
var hroot = { innerHTML: render('{{kb: a-one}}') };
window.KBEntry.hydrate(hroot, hstore, { detailPage: 'kb_entry.html' });
assert.ok(hroot.innerHTML.includes('kbentry-embedcard'), 'card class');
assert.ok(hroot.innerHTML.includes('href="kb_entry.html?id=a-one"'), 'card links the detail page');
assert.ok(hroot.innerHTML.includes('Entry One') && hroot.innerHTML.includes('First gist.'), 'title + gist');
assert.ok(!hroot.innerHTML.includes('data-kb-id'), 'no unhydrated placeholder left');

var froot = { innerHTML: render('{{kb: a-two | full}}') };
window.KBEntry.hydrate(froot, hstore, {});
assert.ok(froot.innerHTML.includes('kbentry-embedfull'), 'full transclusion wrapper');
assert.ok(froot.innerHTML.includes('Two intro.'), 'transcluded body rendered');
assert.ok(froot.innerHTML.includes('kbentry-embedcard') && froot.innerHTML.includes('Entry One'),
  'marker INSIDE a transcluded body hydrates as a card');
assert.ok((froot.innerHTML.match(/kbentry-embedfull-body/g) || []).length === 1,
  'one level deep: a | full inside a transclusion is demoted to a card');

var droot = { innerHTML: render('{{kb: a-draft}}') };
window.KBEntry.hydrate(droot, hstore, {});
assert.ok(droot.innerHTML.includes('kbentry-embedcard-draft'), 'draft chip on a draft target');
assert.ok(droot.innerHTML.includes('>Draft<'), 'chip says Draft');
var proot = { innerHTML: render('{{kb: a-one}}') };
window.KBEntry.hydrate(proot, hstore, {});
assert.ok(!proot.innerHTML.includes('kbentry-embedcard-draft'), 'no chip on a non-draft target');

var mroot = { innerHTML: render('{{kb: no-such-id}}') };
window.KBEntry.hydrate(mroot, hstore, {});
assert.ok(mroot.innerHTML.includes('kbentry-embed-missing'), 'missing id → stub');
assert.ok(!mroot.innerHTML.includes('no-such-id'), 'stub does not echo the id');

var plain = { innerHTML: render('## H\n\nPlain body.') };
var before = plain.innerHTML;
window.KBEntry.hydrate(plain, hstore, {});
assert.ok(plain.innerHTML === before, 'a body with no markers is untouched');
console.log('hydrate asserts: PASS');
