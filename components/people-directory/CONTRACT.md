# People Directory Component Contract

A self-contained staff directory: a headshot card per person, plus unit filter buttons that fade the non-members. Clicking the pressed button clears the filter. Data-agnostic — only the fixture differs.

## Files

- `people-directory.js` — the behavior. Exposes `window.PeopleDirectory.mount(buttonsEl, gridEl, fixture, assetBase, opts)` and the optional `mountCommittee(listEl, fixture)`. Zero fetch; pure DOM.
- `build-fixture.js` — the producer. Parses `content/about_people.md` into the record shape and writes `fixture.js`.
- `people-directory.css` — the widget styles (`.peoplefilters`, `.pfbtn`, `.peoplegrid`, `.pcard` and children). Brand colors via `var(--...)`.
- `fixture.js` — sample data as an inline JS global (`window.PEOPLE_FIXTURE`). NEVER a fetched `.json` (file:// blocks fetch).
- `demo.html` — a standalone, double-clickable host that mounts the widget in isolation, plus the committee surface both populated and empty.

## What it consumes (the fixture)

```js
window.PEOPLE_FIXTURE = {
  groups: [ { code: 'IIDS', label: 'Administrative Core' }, { code: 'RCDS', label: 'RCDS' }, { code: 'GBRC', label: 'GBRC' } ],
  people: [
    { name: '<str>', title: '<str>', unit: '<GROUP code>',
      photo: '<repo-root-relative, e.g. content/assets/people/x.jpg>', email: '<addr>', website: '<url>',
      placeholderPhoto: <bool, optional> },
    ...
  ],
  committee: [ { name: '<str>', url: '<url>', affiliation: '<str>' }, ... ]   // optional
}
```

- `unit` is one of the group codes below, or `''`/`GENERAL` for "does not cleanly fit" — those cards render but never light up under any filter.
- `groups` is declarative (vocabulary + display labels). The buttons themselves are host DOM (see below); `groups` documents which codes/labels a host should render.
- `committee` (added 2026-08-08) is people from the same source file who are not staff — no headshot, no unit, no filter. Optional: a fixture without it is valid, and `mountCommittee()` on an empty list renders nothing and hides the element, so a host can mount it unconditionally.

## What it produces

On `mount()` the component renders one `.pcard` per person into `gridEl`, then wires the buttons:

- Click a `.pfbtn[data-unit=CODE]` → every `.pcard` whose `data-unit` ≠ CODE gets `.dim`; the button gets `.active`.
- Click the already-active button → filter clears (all cards un-dimmed, no active button).

There is no navigation wire (cards are display-only, with `mailto:` and website links). The seam is the fixture record shape plus the DOM contract, both frozen below.

### Filtering is a state change, not a visual effect (2026-08-08)

Fading a card the keyboard can still reach is a filter that only works for the mouse, so `apply()` also:

- sets `aria-pressed` on every `.pfbtn` beside `.active`, so the pressed state is spoken;
- marks filtered-out cards `inert` **and** `aria-hidden`, and puts `tabindex="-1"` on their links — `inert` alone covers only current browsers;
- writes a count ("Showing 8 of 22 people") into a `.pf-status` element it appends to the filter bar as `aria-live="polite"`, so the change is announced;
- gives the filter bar `role="group"` + `aria-labelledby` pointing at the host's `.pf-label`, assigning that element an id if it has none.

`.pf-status` is the one piece of DOM the component adds outside `gridEl`; a host that supplies its own `.pf-status` inside the filter bar keeps it.

### Two derived presentation rules

- **Website link text is the hostname**, not the URL. The href keeps the full URL; a card is content, and `/service_center/show_external/3232/` is plumbing.
- **Alt text is descriptive**, per the U of I digital style guide's own example ("A portrait of U of I President Scott Green", not "Scott Green"): `A portrait of <name>, <title>`. A `placeholderPhoto` record says it is a placeholder instead of claiming to be a likeness.

## Frozen

- The group vocabulary codes `RCDS / IIDS / GBRC / GENERAL` (shared with the Knowledge Base component and the backend `VALID_GROUPS`). A person's `unit` must be one of these (or empty).
- The fixture **record field names**: `name`, `title`, `unit`, `photo`, `email`, `website` (and optional `placeholderPhoto`).
- The DOM contract: the host provides a `.peoplefilters` element containing `.pfbtn[data-unit]` buttons and a sibling `.peoplegrid` element; `mount()` renders into the grid and wires the buttons.

## Soft (set per host/instance)

- The button **labels** (e.g. `Administrative Core` for the `IIDS` code) and which units appear.
- The **person-name heading level**, `opts.nameLevel` — `h3` (default, correct in the isolated demo, where the section heading is an `h2`), `h4` or `h5`; anything else falls back to the default. The name is styled by `.pc-name`, so the level changes the outline and nothing else. The component cannot know how deep the host's section sits: on `about.html` the zone title is already an `h3`, so the cards are `h4` there.
- `photo` paths are repo-root-relative (`content/assets/people/...`); the host passes an `assetBase` prefix to `mount()` matching its own depth below the repo root — `../../` for the component demo, `../` for a page in `mockups/`. Only the field name is frozen, not the path or base.
- All copy (`title`, names) and the roster itself.

## Styling rule

Brand colors use `var(--...)` from `shared/tokens.css`, never a literal hex. One incidental non-brand value is a documented literal: `#000` (the empty-photo backing). It is not a token and does not expand the frozen 9-token set.

## Data source

`fixture.js` is **generated** from `content/about_people.md` by `build-fixture.js` — it is not hand-maintained:

```
node components/people-directory/build-fixture.js
```

`content/about_people.md` is the single source of record (each entry carries `Unit:`, `Email:`, `Website:` and a headshot); regenerate the fixture whenever it changes. File order is render order — the file states the ordering rule (unit director first, then other directors, then alphabetical by surname). The generator also reads the `## Steering Committee` bullets (`- [Name](url) — Affiliation`) into `committee`. The record shape emitted here is the frozen seam: **today** a build step (this generator) produces it under the `file://` constraint; **later** the backend `getPeople()` produces the identical shape from the same content, so going live is a one-line swap in the host (`window.PEOPLE_FIXTURE` → `Backend.getPeople()`). Same contract, two producers.

## Register

This component is registered by its row in `MODULES.md` (the module inventory is the manifest — there is no separate fetched manifest file).
