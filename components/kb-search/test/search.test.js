'use strict';
const assert = require('assert');
global.window = {};
require('../kb-search.js');
const { search } = global.window.KBSearch;

const store = [
  { id: 'a', group: 'RCDS', title: 'BLAST', gist: 'search sequences',
    keywords: ['blastn', 'ncbi'], tags: ['track:applications', 'topic:sequence-search'],
    body: 'To use BLAST, load the ncbi-blast module. Run blastn against the database.' },
  { id: 'b', group: 'RCDS', title: 'Slurm', gist: 'the cluster scheduler',
    keywords: ['slurm', 'sbatch'], tags: ['track:tutorials'],
    body: 'Submit jobs with sbatch. The scheduler is slurm on the cluster.' },
  { id: 'c', group: 'IIDS', title: 'Travel', gist: 'travel policy',
    keywords: ['travel'], tags: [],
    body: 'Book travel and file expenses. A blast of paperwork, casually mentioned.' },
];

// Empty / whitespace query → no results.
assert.deepStrictEqual(search(store, ''), []);
assert.deepStrictEqual(search(store, '   '), []);

// "blast": title hit (a) outranks body-only hit (c); both returned.
const r1 = search(store, 'blast');
assert.strictEqual(r1[0].id, 'a', 'title match ranks first');
assert.ok(r1.some((r) => r.id === 'c'), 'body-only match included');
assert.ok(r1.find((r) => r.id === 'a').score > r1.find((r) => r.id === 'c').score, 'title score > body score');
assert.strictEqual(r1.find((r) => r.id === 'a').matchedField, 'title');

// Snippet only when BODY was the winning field for a term.
assert.strictEqual(r1.find((r) => r.id === 'a').snippet, '', 'no snippet when title won');
assert.ok(r1.find((r) => r.id === 'c').snippet.length > 0, 'snippet when body won');
assert.ok(/blast/i.test(r1.find((r) => r.id === 'c').snippet), 'snippet contains the term');

// AND semantics: every term must match somewhere.
const r2 = search(store, 'sbatch scheduler');
assert.deepStrictEqual(r2.map((r) => r.id), ['b'], 'only the entry matching BOTH terms');
const r3 = search(store, 'sbatch travel');
assert.deepStrictEqual(r3, [], 'no entry matches both terms');

// Arrays (keywords/tags) are searched; matchedField reflects the winning field.
assert.strictEqual(search(store, 'sbatch')[0].matchedField, 'keywords');
assert.ok(search(store, 'sequence-search').some((r) => r.id === 'a'), 'tags searched');

// limit + robustness (missing/unknown fields safe).
assert.strictEqual(search(store, 'blast', { limit: 1 }).length, 1);
assert.doesNotThrow(() => search([{ id: 'x', group: 'RCDS', title: 'X', extra: 1 }], 'x'));
assert.strictEqual(search([{ id: 'x', group: 'G', title: 'OnlyTitle' }], 'onlytitle')[0].id, 'x');

// adoption is mirrored into results ('' when the entry has none).
const draftStore = [
  { id: 'p', group: 'IIDS', title: 'Policy: P', gist: 'g', keywords: [], tags: [],
    adoption: 'draft', body: 'policy body' },
  { id: 'q', group: 'IIDS', title: 'Policy: Q', gist: 'g', keywords: [], tags: [],
    body: 'policy body' },
];
const rd = search(draftStore, 'policy');
assert.strictEqual(rd.find((r) => r.id === 'p').adoption, 'draft', 'draft entry → adoption in result');
assert.strictEqual(rd.find((r) => r.id === 'q').adoption, '', 'no adoption key → empty string');

console.log('search.test.js: PASS');
