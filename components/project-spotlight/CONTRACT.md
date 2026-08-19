# project-spotlight — Contract

**Realized** (2026-08-07). A rotating showcase of **currently active** projects: title and PI in
large type, a one-sentence byline, and a link into the full record. Consumed by the Research and
Impact zone of `mockups/about.html`.

Loads as a plain `<script src>` and exposes `window.ProjectSpotlight`. Zero `fetch` — a
double-clicked `file://` page renders it.

## Consumes

The **whole item array**, `window.PROJECTS_DATA.items`. Item shape:
`backend/projects-data/CONTRACT.md`.

This is the one place a component selects rather than being handed a selection, and the reason is
the publication bar. `project-browse` and `project-entry` can render a sparse record *as* a sparse
record, which is the promise the collection makes. A spotlight cannot: it asserts one project
prominently, in large type, under a named person's name. So the selection rule is part of the
component and is checked, not left to each host to reinvent.

## What it selects (SOFT rule, FROZEN intent)

From `items`, a record qualifies when **all** hold:

1. `status` is exactly `Active`.
2. `objectid` and `title` are present.
3. `lead` yields something that reads like a person, via `leadName()` then `looksLikeName()`.
4. `description` yields a first sentence that is not provenance prose.

Against the published 126-record store this selects **61 of the 79 Active projects**. The 18
excluded break down as 16 with no `lead` at all (largely IWRRI workstreams and service tools, plus
the AI4UI project record added 2026-08-10), one naming an organization (JournalMap, led by the
U of I Library), and one whose description opens by reporting that no public source documents it
(Wildmarker).

The AI4UI record is the useful case to keep in view. It arrived Active and well described but with
no `lead`, so the Active set moved 78 → 79 while the eligible set stayed at 61. That is the rule
working, not a gap. Rule 3 exists precisely so nothing goes into 2rem type under a name the store
does not have.

**Nothing is hidden by this.** Every excluded project remains on the browse page and has its own
record page. The spotlight is a showcase, not a census, and `content_map.md` is where the census
lives.

## Two derived fields, and why they are derived

Neither exists in the store, so both are computed here. If either later becomes a real column
upstream, this component should prefer the column and keep these as the fallback.

- **PI name.** `lead` is prose, not a name field. It runs from `Michael Maughan` through
  `Zachariah B. Etienne, Professor, Department of Physics, College of Science, University of
  Idaho` to a full sentence naming who is on which award. `leadName()` takes the name off the
  front: it strips a prose lead-in, protects an in-name nickname (`Frederick M. (Marty)
  Ytreberg`), then cuts at the first `,` `;` or ` (`. It deliberately does **not** cut at `. `,
  which would split a middle initial. `looksLikeName()` then rejects anything carrying an
  organization word, a digit, or more than six words — that guard is what keeps a mangled name
  out of 2rem type.
- **Byline.** There is no one-sentence field; `description` runs 354–1012 characters.
  `firstSentence()` takes the opening sentence, skipping periods that end an initial or a known
  abbreviation (`U.S.`, `et al.`, `Ph.D.`). `byline()` caps it at `maxByline` (default 220) on a
  word boundary. **22 of the 61 are truncated**, and each carries `truncated: true` so a host or
  a check can count them. Truncation is honest here only because the full text is one click away.

## Frozen

- **Global name** `ProjectSpotlight`; entry point `mount(root, items, opts)`.
- **The four pure functions** `spotlightItems`, `leadName`, `firstSentence`, `byline` — pure, no
  DOM, so `check.js` runs them against the real store.
- **`mount` with nothing eligible renders an empty state**, never throws.
- **Auto-rotation is suspended on hover and on keyboard focus, and never starts at all under
  `prefers-reduced-motion: reduce`.** A visible pause control is always present. This is an
  accessibility promise, not styling: a moving banner that cannot be stopped fails WCAG 2.2.2
  (Pause, Stop, Hide), and the Title II deadline is 2027-04-26.
- **The slide's live region tracks the timer**: `aria-live="off"` while the carousel advances
  itself, `polite` whenever the timer is stopped — on pause, on hover, on focus, and (set before
  the swap) on user navigation. The APG carousel pattern requires this; a permanently polite
  region reads the whole slide aloud every `interval` milliseconds.

## The stage holds still

`mount()` renders every slide once at mount, takes the tallest, and sets that as the stage's
`min-height` inline. Titles run 8 to 178 characters and bylines to 220, so the CSS reserve alone
left the band growing and shrinking as it rotated — the page moving under someone mid-sentence.
The measuring pass runs while the live region is still `off`, so it announces nothing, and the CSS
`min-height` remains the floor for a host where nothing can be measured (unattached or hidden).
The measurement is not repeated on resize: a stale reserve only under-reserves, it never clips.

## Soft

- All markup, class names and styling.
- The `Led by ` prefix on the PI line. It is a label, not data — the store has no role field —
  and it stays true for the co-lead pairs the selector accepts, which `PI:` would not.
- `opts.interval` (default 7000ms), `opts.maxByline` (default 220), `opts.shuffle` (integer seed;
  deterministic so a check can assert on it), `opts.entryPage` (default `project_entry.html`).
- The exact selection heuristics, which should get stricter as the upstream data improves.

## Isolation

`demo.html` renders the component against `fixture.js` with no other module loaded: a normal
record, one with a heavily suffixed `lead`, one with a long description that must truncate, and
the empty state.

`node components/project-spotlight/check.js` runs the pure functions against the **real**
generated store, not the fixture.

## Register

Row in `MODULES.md`.
