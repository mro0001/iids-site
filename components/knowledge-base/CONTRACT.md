# Knowledge Base Component Contract

A self-contained group-button browser: four unit buttons (RCDS / IIDS / GBRC / GENERAL) that, when clicked, list that group's entries, each linking to a detail page. The same widget also drives the Apps launcher (it is data-agnostic; only the fixture differs).

## Files

- `knowledge-base.js` — the behavior. Exposes `window.KBBrowser.mount(buttonsEl, listEl, fixture)`. Zero fetch; pure DOM.
- `knowledge-base.css` — the widget styles (`.groupbtns`, `.gbtn`, `.itemlist` and children). Brand colors via `var(--...)`.
- `fixture.js` — sample data as an inline JS global (`window.KB_FIXTURE`). NEVER a fetched `.json` (file:// blocks fetch).
- `demo.html` — a standalone, double-clickable host that mounts the widget in isolation.

## What it consumes (the fixture)

```js
window.KB_FIXTURE = {
  kind: 'kb',                         // 'kb' or 'app'
  detailPage: '<path>',               // where an item click navigates
  addHref: '<path>',                  // the "add" action link (host chrome)
  guidelinesHref: '<path>',           // the "guidelines" action link (host chrome)
  groups: ['RCDS','IIDS','GBRC','GENERAL'],
  items: { RCDS:[ item, ... ], IIDS:[...], GBRC:[...], GENERAL:[...] }
  // item = a 'name' string (Apps / legacy) OR an object {id, title, gist} (KB entries)
}
```

## What it produces (the wire — FROZEN)

Clicking an item navigates to:

```
<detailPage>?group=<GROUP>&item=<encodeURIComponent(name)>[&id=<id>]
```

The detail page (`kb_placeholder.html` / `app_placeholder.html`) reads `group` and `item` from the query string. **This `group`/`item` pair is frozen.** When an item is an object with an `id`, the href additionally carries `&id=<id>` — additive, and authoritative for `kb-data` lookups (string items omit it). Build the fixture from the generated store with `KBBrowser.fixtureFromData(window.KB_DATA, {detailPage, addHref, guidelinesHref})`; object items that carry a `gist` render a hover tooltip in the list.

## Frozen

- The four group values `['RCDS','IIDS','GBRC','GENERAL']` must match the `.gbtn` `data-group` attributes in the host DOM.
- The produced query wire `?group=&item=` above.
- The DOM contract: the host provides a `.groupbtns` element containing `.gbtn[data-group]` buttons and a sibling `.itemlist` element; `mount()` wires them.

## Soft (set per host/instance)

- `detailPage`, `addHref`, `guidelinesHref` — host-relative PATHS. The demo uses `../../mockups/kb_placeholder.html`; a page already inside `mockups/` (like `intranet.html`) uses the bare `kb_placeholder.html`. Only the query STRING is frozen, not the path.
- `kind`, and all `items` copy.
- `visibility` (opts) — optional entry filter for `fixtureFromData`. When set (e.g. `'public'`),
  only entries whose record `visibility` matches populate the list; omitted keeps all. Additive:
  the produced fixture shape, `groups` (all four), and the query wire are unchanged. Public pages
  pass `visibility: 'public'`; the intranet omits it.

## Styling rule

Brand colors use `var(--...)` from `shared/tokens.css`, never a literal hex. Two incidental non-brand grays are allowed as documented literals: `#6a6a6a` (the `.hint` text) and `#1c1c1c` (the list-item hover). These are not tokens and do not expand the frozen 9-token set.

## Register

This component is registered by its row in `MODULES.md` (the module inventory is the manifest — there is no separate fetched manifest file).
