# capability-statement — Contract

**Realized** (2026-08-08). The three claims in the landing page's brand statement, one sentence
each, as a stacked list with the title on the left and the sentence on the right. Consumed by the
band directly beneath the hero in `mockups/landing_placeholder.html`.

Loads as a plain `<script src>` and exposes `window.CapabilityStatement`. Zero `fetch` — a
double-clicked `file://` page renders it.

## Why it exists

The hero says IIDS is "the computational infrastructure, expertise, and leadership advancing the
research mission of the University of Idaho." This band is those three nouns and nothing else, so
the claim and its unpacking sit adjacent. It replaced a band of portfolio counts and research-area
tiles, which restated `mockups/projects.html`.

## Files

- `capability-statement.js` — behavior. `window.CapabilityStatement.mount(containerEl, fixture)`.
- `capability-statement.css` — `.cs-row`, `.cs-title`, `.cs-statement`. Brand values via `var(--...)`.
- `fixture.js` — data as an inline JS global (`window.CAPABILITY_FIXTURE`), **generated**. Never a fetched `.json`.
- `build-fixture.js` — the producer. Parses `content/home_capabilities.md` and writes `fixture.js`.
- `demo.html` — standalone, double-clickable host that mounts the component in isolation.
- `check.js` — the standing check.

## Consumes (FROZEN)

```js
window.CAPABILITY_FIXTURE = {
  items: [ { id: '<str, optional>', title: '<str>', statement: '<str>' }, ... ]
}
```

`title` and `statement` are required; a record missing either is dropped rather than rendered
half-empty. `id` is optional and becomes `data-cap` on the row.

## Produces (FROZEN)

One `.cs-row` per item, each containing a `.cs-title` heading and a `<p class="cs-statement">`,
in fixture order. The page owns the section wrapper and the vertical rhythm; the component owns
only the rows.

**Heading level is the host's call** (additive option, 2026-08-08). `mount(containerEl, fixture,
opts)` and `renderRows(items, opts)` take `opts.headingLevel` — `h2`, `h3` or `h4`, anything else
falling back to the default `h3`, which is the pre-existing behavior. The component cannot know
where the band sits in the host's outline: the isolated demo puts it under a section `h2`, so `h3`
is right there, while the landing page gives the band no section heading of its own, so the three
titles are the `h2`s directly under the page `h1`. Styling is class-based, so the level changes the
outline and nothing else.

## Frozen

- **Global name** `CapabilityStatement`; entry point `mount(containerEl, fixture)`.
- **The pure function** `renderRows(items) -> html` — no DOM, so `check.js` runs it against the
  real generated fixture rather than a hand-written one.
- **The record shape** above, and the `.cs-row` / `.cs-title` / `.cs-statement` DOM contract. The
  heading *level* under `.cs-title` is soft (see above); the class is not.
- **All text is escaped.** These sentences are institutional claims edited in a content file by
  someone who is not thinking about HTML.
- **`mount` with an empty or malformed fixture renders nothing and never throws.** A landing page
  that loses one band beats a landing page that dies.
- **`content/home_capabilities.md` is the source of record.** `fixture.js` is derived and is never
  hand-edited.

## Soft

- The number of items. Three today; the parser and the CSS take any count.
- Type scale, column split, and the hairline rules.
- Order, which follows the content file.

## Deliberately not interactive

An earlier version made these expandable cards, each opening to the sentence plus a concrete
"for example" block. Both the accordion and the examples were cut (MO, 2026-08-08). With the
sentence always visible beside its title there is nothing left to reveal, and a control that only
re-shows visible text misrepresents what is behind it. If concrete examples return, they came from
*Insights UI Strategic Plan 2024* — its Pillar 1 and 2 rosters, its inference-server and hosting
commitments, and the Generative AI Research Fellowship.

## Standing check

`node components/capability-statement/check.js` — runs `renderRows` against the real generated
fixture and asserts the record shape, the DOM contract, escaping, drop-on-missing-field, the
empty case, and that the fixture is in sync with `content/home_capabilities.md`. Must exit 0.

`demo.html` builds the component in isolation against `fixture.js` with no other module loaded.
