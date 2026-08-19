# news-archive — Contract

**Realized** (2026-08-07). The 114-item IIDS news archive as a searchable, year-filtered list.
Consumed by `mockups/news.html`.

Loads as a plain `<script src>` and exposes `window.NewsArchive`. Zero `fetch` — a
double-clicked `file://` page renders it.

## Consumes

An array of **news items**, passed in by the host. Item shape: `backend/news-data/CONTRACT.md`.
The component never reads `window.NEWS_DATA`; the host resolves the store, as on every other
browse surface in this repo.

## Frozen

- **Global name** `NewsArchive`; entry point `mount(root, items, opts)`.
- **The pure functions** `search`, `deriveYears`, `filterByYear`, `applyFilters`, `readState`,
  `writeState`, `excerpt`, `formatDate` — no DOM, so `check.js` runs them against the real
  114-item store rather than a fixture.
- **Years are derived from the data, never hardcoded.** The archive stops in 2025 today and
  should not need a code change when it does not.
- **Search is AND across terms**, over title *and* body. An OR search across 114 items hands
  the archive back to the reader unchanged, which is not a search.
- **Filter state is mirrored into the URL** (`?q=`, `?year=`) so a narrowed view is linkable,
  and a clean state writes a clean URL.
- **`mount` with an empty array renders the empty state**, never throws.

## Soft

- All markup, class names and styling.
- `opts.excerpt` (default 260 characters), `opts.state` (skip URL reading; used by the demo),
  `opts.assetBase` — the host's prefix to the repo root (`'../'` for a page in `mockups/`).
  Image paths in the store are repo-root-relative, the same contract people-directory uses.
- `opts.headingLevel` — the level story titles render at, default **2**. On `news.html` the
  list sits directly under the page's `h1`, so an `h3` would skip a level; `demo.html` mounts
  under its own `h2`s and passes 3. Styling hangs off `.na-title`, so the level is free.
- Whether the list paginates. It does not today: 114 rows with lazy-loaded images is an
  acceptable archive page, and the year pills are the real navigation.

## Two display rules worth stating

- **A missing image collapses its column.** Twelve of the 114 items have no image; the row must
  not leave a hole where one would be.
- **A broken image removes itself.** Images now live in the repo (`content/assets/news/`), so
  this should never fire; it stays as a guard, because an archive that degrades to a clean text
  list is worth more than one showing a wall of broken-image boxes.

## Isolation

`demo.html` renders the component against `fixture.js` with no other module loaded: five items
across three years, one with no image, one whose body must be cut to an excerpt, plus the empty
result state.

`node components/news-archive/check.js` runs 42 assertions against the **real** generated store,
including the data-integrity guards that keep the normalization passes applied: no
UTF-8-as-cp1252 mojibake signature, no two items with an identical title and body, no shouted
`SCIENCE`, no British spellings in the events copy, and a labelled `continues_url` wherever a
format has one (`backend/news-data/CONTRACT.md`, Normalization).

## Register

Row in `MODULES.md`.
