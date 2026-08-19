# project-browse — Contract

**Realized** (2026-08-07). Search and faceted browse over the project store, plus the
at-a-glance band that sits above it. Consumed by `mockups/projects.html`.

Loads as a plain `<script src>` and exposes `window.ProjectBrowse`. Zero `fetch` — a
double-clicked `file://` page renders it.

## Consumes

An **array of project items**, passed in by the host. The component never reads
`window.PROJECTS_DATA` itself; the host owns which records it hands over, the same discipline
`kb-search` follows for the KB's visibility gate. Item shape: `backend/projects-data/CONTRACT.md`.
Only `objectid` and `title` are assumed present.

## Produces

`Result = { item, score, matchedField, snippet }` — the whole item rides along, because a project
card renders six fields and flattening would only mean re-joining them at render.

## Frozen

- **Global name** `ProjectBrowse` and the four pure functions:
  - `search(items, query, opts) -> Result[]` — every term must match somewhere (AND), scored by
    the heaviest field it hit. Field weights are soft; AND semantics are not.
  - `deriveFacets(items) -> [{key, label, control, options: [{value, count}]}]`
  - `applyFilters(items, state) -> Result[]`
  - `readState(searchString) -> state`
- **Facets are derived from the items, never hardcoded.** Adding a project with a new research
  area adds that filter by itself; a facet with fewer than two distinct values hides itself.
  `check.js` fails the build if a facet value appears as a literal in the logic.
- **Facets narrow before the query ranks.** `search()` never sees a filtered-out project. With a
  query running and no explicit sort the order is relevance, and the sort control says so — its
  default option reads `Relevance` while ranking and `A–Z` otherwise, with `sort=title` offered
  as the explicit A–Z only when the two differ.
- **A displayed count equals what clicking it returns.** Topic filtering matches
  case-insensitively, so the topic cloud counts on a casefolded key and displays the most
  frequent surface form; `lidar` and `LiDAR` are one term with one count.
- **Filter state lives in the URL** (`?q=&research_area=&status=&project_type=&funder_agency=&topic=&year=&sort=`),
  so a narrowed view is linkable. `topic` and `year` have no panel control — the topic cloud and
  the start-year histogram set them; `year` filters on the parsed `date` field, never on text,
  because a year string also appears inside award numbers and prose. Writing it is guarded: a
  `file://` page that throws on `replaceState` keeps filtering and loses only the shareable URL.

## Soft

- `mountFaceted(root, items, opts)` and `mountOverview(root, items, opts)` — the whole UI layer:
  markup, class names, styling, the collapsed-by-default filter panel, the
  research-area bars, the year histogram and the topic cloud.
- **Subprojects are search-only** (2026-08-13). Both mounts accept the full store; rows whose
  `parent_project` names another record's `objectid` are excluded from the unqueried grid, the
  facet options, the overview and every count — but a running query ranks them alongside
  everything else, tagged `Part of: <parent>`, and counted apart ("…, plus N subprojects").
  Parent cards say "Includes N subprojects"; the parent's entry page is the canonical child
  list. The four pure functions know nothing of this — the split happens in the mounts.
- `opts`: `detailPage`, `placeholder`, `filtersOpen`, `debounce`, `snippetLen`, `limit`,
  `initialSearch`, `onRender`; `mountOverview` takes `browse` (a handle from `mountFaceted`) and
  `topicMin`.
- The handle returned by `mountFaceted`: `{ getState, render, setState(patch, focus) }`.
  `setState` is how the overview band drives the browse it sits above.
- `cardsHtml(items, opts)` — the card grid as an HTML string, for a host with its own section
  to put it in (the entry page's Subprojects section). One card renderer serves every surface,
  so a project card is one presentation site-wide. `opts.detailPage` as in `mountFaceted`
  (pass `''` to keep links on the calling page).
- Field weights, sort options, which facets are pills and which are selects.

## Four deliberate UI decisions

**The filter panel is collapsed by default.** Five facets over 126 projects is taller than the
viewport, and an expanded panel pushed every result below the fold. Active filters stay visible
as chips *outside* the panel, so a narrowed view never hides why it is narrow, and the toggle
carries a count.

**The overview panels are `<details>`, and only the research-area distribution opens.** Expanded,
the three panels run past three screens before the first result. Each closed summary states its
own size (`12 groups`, `1964–2025`, `71 shared terms`) so a closed panel still says what is in it.

**A value that records an absence is a filter, not a badge.** `status: Unknown` and
`research_area: Other` are real, useful filter options — `Status: Unknown (33)` narrows the
collection — but rendered as a styled pill, a headline count or a funder name they read as
missing data that shipped. So: the status pill is suppressed at `Unknown`, the stat band counts
research areas excluding `Other`, and a card whose `funder_agency` is `Other` shows the funder
string instead. They stay in the filter panel, and the vocabulary lives in one place
(`UNRECORDED`) rather than in the markup. Related counting promises the band keeps: the funding
tile says *with named funding* (one of the 87 is funded by U of I's own research office, so
"externally funded" would be wrong), and the year range is labelled *project start years on
record* — the earliest is a program's founding year, decades before IIDS existed.

**No description is a state, not a gap.** 15 of the 126 records have no description: internal
records attest the project and no public source documents it, so there is nothing about it that a
source supports. Omitting the description block on its own left a title, a badge and an arrow
over blank space, which reads as a hole in the grid. So on those cards the low-confidence
qualifier stops being a badge and becomes the card's explanatory line — the same sentence,
promoted out of the tooltip into the slot the description would have filled, set on the alt
surface behind a dashed rule so it reads as a statement about the evidence rather than as a
project summary. The badge and the note never both appear, and a low-confidence record that *does*
have a description is untouched. The sentence lives in one constant (`LOW_CONFIDENCE`) so the two
renderings cannot drift; it is never written back into `description`, because provenance belongs
in `evidence_note` and renders only in project-entry's low-confidence block.

## Standing check

`node components/project-browse/check.js` — runs the pure functions against the real generated
store (126 projects), asserts store hygiene (unique ids, no internal QA field, no publication
hold, no field narrating the internal record instead of the project, `evidence_note` only on
low-confidence records, every description-less record low-confidence so the card's designed empty
state always has its sentence), facet derivation, filter/search composition, the year filter (every
histogram bar count equals its filter count), sort monotonicity, URL round-trip, and the
no-hardcoded-values rule. Must exit 0.

`demo.html` builds the component in isolation against `fixture.js` with no other module loaded.
