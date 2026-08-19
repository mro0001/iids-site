'use strict';
const assert = require('assert');
global.window = {};
require('../knowledge-base.js');
const { fixtureFromData } = global.window.KBBrowser;

const store = {
  groups: ['RCDS', 'IIDS', 'GBRC', 'GENERAL'],
  entries: [
    { id: 'rcds-a', group: 'RCDS', title: 'A', gist: 'a', visibility: 'public' },
    { id: 'rcds-b', group: 'RCDS', title: 'B', gist: 'b', visibility: 'public' },
    { id: 'iids-x', group: 'IIDS', title: 'X', gist: 'x', visibility: 'internal' },
  ],
};

// No filter → all entries (today's intranet behavior).
const all = fixtureFromData(store, { detailPage: 'd.html' });
assert.strictEqual(all.items.RCDS.length, 2);
assert.strictEqual(all.items.IIDS.length, 1);
assert.deepStrictEqual(all.groups, ['RCDS', 'IIDS', 'GBRC', 'GENERAL'], 'groups unchanged');

// visibility:public → only public entries; internal dropped.
const pub = fixtureFromData(store, { detailPage: 'd.html', visibility: 'public' });
assert.strictEqual(pub.items.RCDS.length, 2, 'both public RCDS kept');
assert.strictEqual(pub.items.IIDS.length, 0, 'internal IIDS filtered out');
assert.deepStrictEqual(pub.groups, ['RCDS', 'IIDS', 'GBRC', 'GENERAL'], 'all four groups still present');
assert.strictEqual(pub.detailPage, 'd.html', 'other opts preserved');

// visibility:internal → only internal.
const int = fixtureFromData(store, { visibility: 'internal' });
assert.strictEqual(int.items.IIDS.length, 1);
assert.strictEqual(int.items.RCDS.length, 0);
console.log('visibility.test.js: PASS');
