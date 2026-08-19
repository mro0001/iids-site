# KB Search Component Contract

Search over KB entries. Two parts: a **pure** `search()` ranking function (the seam that survives
a future DB/server backend) and a thin `mount()` UI. Pure DOM, zero fetch — file://-safe. Sibling to
`components/knowledge-base/` (browse); it reuses that widget's `.itemlist` classes and the frozen
`?group=&item=&id=` detail wire.

## Files
- `kb-search.js` — `window.KBSearch`: the pure `search`, `deriveFacets`, `applyFilters` and
  `readState`, plus the `mount` and `mountFaceted` UI layers.
- `kb-search.css` — result styles (`.kbsearch` input, `.kbsnippet`, `.kbresult-gist`) and the
  faceted browse (`.kbf-*`: facet rows, pills, chips, count, reset, empty state).
- `fixture.js` — inline `window.KB_SEARCH_FIXTURE` sample (never a fetched `.json`).
- `demo.html` — standalone host mounting the widget in isolation.
- `check.js` — standing check. Runs the pure functions against the **real** generated store
  (`backend/kb-data/kb-data.generated.js`), not a fixture, so the facet assertions are made
  against the corpus that actually ships.

## `search(entries, query, opts)` — FROZEN
- Consumes an `entries` **array** of KBItem-shaped records; it NEVER reads `window.KB_DATA` or any
  source. Adding entries or swapping to a DB/API changes the producer, not this function.
- Returns `Result[]`, `Result = { id, group, title, gist, score, matchedField, snippet }` (frozen
  field names), sorted by `score` desc then `title` asc.
- **Additive (optional):** `Result.adoption` mirrors the entry's `adoption` key (`''` when the
  entry has none). Added so result rows can badge draft entries; consumers reading only the frozen
  fields keep working.
- **Additive (optional):** `Result.entry_type` mirrors the entry's `entry_type` (`''` when
  absent) — same discipline as `adoption`. Added so the faceted UI can tier and color guide
  rows; the pure functions' ordering is untouched.
- Searches the record's **searchable fields** (currently `title, keywords, tags, gist, body`);
  described this way — not "the body" — so it stays true if bodies later move out of the store.
- AND semantics: every query term must match some field. `opts` (soft): `weights, limit, snippetLen`.

## Permission filtering — FROZEN (upstream)
`search()` knows nothing about `visibility`, roles, or auth. The **host** passes an already-filtered
set (`kb.html` → `visibility:'public'` entries; `intranet.html` → all). This is the single shared
gate with browse; search can never surface an entry the host didn't include.

## `deriveFacets(entries, labels)` — FROZEN shape

Returns `[{ key, label, control, options: [{ value, count }] }]`. Pill options are sorted by
count descending; `select` options are sorted alphabetically by display label, because a long
list is scanned for a known term rather than read from the top.

Facet **options are derived from the entries at runtime**, never hardcoded — adding an entry
with a new topic adds that topic to the filter. A facet offering fewer than two distinct values
is omitted entirely rather than offering empty options: today the Unit filter shows IIDS and
RCDS on the public page and every group on the intranet.

**Additive (optional):** each option also carries `label`, its display form. `labels` is an
optional host map `{ facetKey: { value: 'Label' } }`; where it has no entry the label is
sentence-cased from the slug, and a value already carrying an uppercase letter (a display code
like `RCDS`) is left untouched. `value` is unaffected — it stays the frozen key the URL state
and `applyFilters` use — so a consumer reading only `value`/`count` keeps working. The map lives
with the **host** (`kb.html`), not this component, which still knows no facet value.

Current facets: `group` (Unit), `track` (Kind) and `topic` (Topic) from the `track:`/`topic:`
tag namespaces, and `type` (Entry type) from `entry_type`. Which facets exist is **soft**.

## `applyFilters(entries, state)` — FROZEN

`state = { q, group, track, type, topic }`. Facets narrow first, then `search()` ranks what
survives — so `search()` keeps its frozen behavior and never sees a filtered-out entry. With no
query the surviving entries are returned alphabetically by title. Returns the same `Result[]`
shape as `search()` in both cases, so consumers need only one renderer.

`applyFilters(entries, { q })` is exactly `search(entries, q)`. This is asserted in `check.js`.

## `readState(searchString)` — FROZEN

Parses `?q=&group=&track=&type=&topic=` into a state object, ignoring unknown keys. Paired with
an internal `writeState` that mirrors state into the URL via `history.replaceState`, so a
filtered view is linkable and survives the back button. The write is wrapped in `try/catch`
because a `file://` page can throw `SecurityError`; filtering still works there, only the
shareable URL is lost.

## `mount()` and `mountFaceted()` — SOFT
Wires an `<input>` to a list element; debounced; empty query → `opts.onClear()`. Renders results with
the browse `.itemlist` classes + a `.kbsnippet`, linking via the frozen wire. DOM/CSS are soft.
`mountFaceted` passes `opts.labels` through to `deriveFacets` and renders option labels (and the
active-filter chips) from it; the URL still carries the raw `value`.
Both render paths append a `.kb-draftbadge` **Draft** badge after the title of any result whose
`adoption` is `'draft'` — a draft policy must be recognizable from the row, not only after opening
the entry.

`mountFaceted` additionally tiers its list: results whose `entry_type` is `'guide'` render
**before** all other results, as a stable partition — order *within* each tier is exactly the
pure functions' frozen order (score under a query, alphabetical without one). Guide rows carry
`li.kbf-r-guide` (gold rail + wash) and a `.kb-guidebadge` **Guide** chip so the distinction
never rests on color alone; other rows carry `li.kbf-r-entry`. The count line reports the two
tiers separately when guides are present. All of this is soft UI, mirroring the draft-badge
precedent.

## Soft
Ranking weights, tokenization, snippet length, debounce, and all of `mount`'s DOM/CSS.

## Register
Registered by its row in `MODULES.md`.
