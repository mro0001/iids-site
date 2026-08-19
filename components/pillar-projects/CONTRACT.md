# AI4UI Pillar Projects Component Contract

Two (or more) expandable pillar cards. Clicking a card drops down the list of projects that fall under that pillar. Built for the AI4UI Overview; data-agnostic — only the fixture differs.

## Files

- `pillar-projects.js` — the behavior. Exposes `window.PillarProjects.mount(containerEl, fixture)`. Zero fetch; pure DOM.
- `pillar-projects.css` — the widget styles (`.pillars`, `.pp-card`, `.pp-head`, `.pp-list` and children). Brand colors via `var(--...)`.
- `fixture.js` — data as an inline JS global (`window.PILLARS_FIXTURE`), **generated** from content (see Data source). NEVER a fetched `.json` (file:// blocks fetch).
- `build-fixture.js` — the producer. Parses `content/ai4ui_projects.md` into the record shape and writes `fixture.js`.
- `demo.html` — a standalone, double-clickable host that mounts the widget in isolation.

## What it consumes (the fixture)

```js
window.PILLARS_FIXTURE = {
  note: '<str, optional>',
  pillars: [
    { id: '<str>', title: '<str>', blurb: '<str, optional>',
      projects: [ { name: '<str>', status: '<str, optional>' }, ... ] },
    ...
  ]
}
```

`note` is an optional caveat about the data itself (today: `Illustrative list — final roster pending`). It renders under each card's project list when present and not at all when absent, so a producer serving real records simply omits it. It is data, never markup: the caveat was hardcoded in the component until 2026-08-08, which meant the fixture→backend swap would have left it on the page under real data.

## What it produces

On `mount()` the component renders one `.pp-card` per pillar into `containerEl`. Each card has a clickable header; clicking toggles the `.open` class, which reveals that card's `.pp-list` (its projects) and rotates the caret. Cards open and close independently (accordion-style, multi-open). Display-only — no navigation wire.

## Frozen

- The fixture **record shape**: a `pillars` array of `{ id, title, projects[] }`, each project `{ name }` (with optional `blurb`, `status`, and an optional top-level `note`).
- The DOM contract: the host provides a single container element; `mount()` renders the cards into it and wires the headers. Open state is the `.pp-card.open` class.

## Soft (set per host/instance)

- The pillar and project copy, the number of pillars, the `status` vocabulary, whether a `blurb` is shown, and whether the producer emits a `note`.

## Data source

`fixture.js` is **generated** from `content/ai4ui_projects.md` by `build-fixture.js` (`node components/pillar-projects/build-fixture.js`) — that content file is the single source of record; regenerate whenever it changes. The record shape is the frozen seam: **today** a build step produces it under the `file://` constraint; **later** a backend `getPillarProjects()` produces the identical `{ pillars: [...] }` shape from a live projects database, so going live is a one-line host swap (`window.PILLARS_FIXTURE` → `Backend.getPillarProjects()`). Same contract, two producers.

## Styling rule

Brand colors use `var(--...)` from `shared/tokens.css`, never a literal hex. One incidental non-brand value is a documented literal: `#6a6a6a` (the illustrative-note text). It is not a token and does not expand the frozen token set.

## Register

Registered by its row in `MODULES.md` (the module inventory is the manifest — there is no separate fetched manifest file).
