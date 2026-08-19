# project-entry — Contract

**Realized** (2026-08-07). The single-project renderer: one record as a readable page. Consumed
by `mockups/project_entry.html`, which resolves `?id=` against the project store.

Loads as a plain `<script src>` and exposes `window.ProjectEntry`. Zero `fetch` — a
double-clicked `file://` page renders it.

## Consumes

One **project item**, passed in by the host. Item shape: `backend/projects-data/CONTRACT.md`.
The component never reads `window.PROJECTS_DATA` and never resolves an id; the host does both,
which is where the publication gate belongs.

## Frozen

- **Global name** `ProjectEntry` and the entry point `mount(root, item, opts)`.
- **`mount(root, null)` renders a "not found" state rather than throwing.** A bad `?id=` is a
  normal event on a linkable page.
- **Every field is optional.** An absent field is omitted, never rendered empty. The collection is
  deliberately uneven — a record attested only by internal sources publishes as a stub — and the
  page has to read as sparse-on-purpose rather than broken.
- **A `confidence: Low` record says so in words**, in a note that states what "low" means:
  internal records attest it, no public source documenting it was found, and what appears there
  is only what those internal records support. This is a publication promise, not decoration.
- **With no description, that note takes the description's place.** 15 of the 126 records carry
  no description at all — nothing about them is publicly documented, so there is no description a
  source supports. The note then opens the page body instead of closing it, in the slot where a
  reader looks for what the project is, and its wording follows: "what appears **above**" on a
  record that has a description, "what appears **on this page**" on one that does not, because a
  stub has nothing above to point at. Same sentence, same claim, one position word.
- **`evidence_note` renders in that block and nowhere else.** It names which internal record
  system attests the project, and provenance belongs with the evidence claim rather than in the
  project's description — narrating the internal record as public copy is what put ClickUp folder
  names on the browse cards. The pipeline emits the column only for `confidence: Low` records, so
  nothing ships in the payload that no page shows.
- **A missing record still produces a heading.** `mount(root, null)` renders an `h1` ("Project
  not found"), because the host page has no other h1 and a bad `?id=` must not leave the document
  headingless.

## Soft

- `FACTS` — which fields appear in the record table and in what order (a reading order: who ran
  it, who paid for it, when, on what, and what came out).
- All markup, class names and styling.
- `opts.browsePage` — where the not-found state points back to.
- `opts.items` — the full `PROJECTS_DATA.items` store, passed so the entry can derive its
  parent (`parent_project` names the parent's `objectid`) and its subprojects in both
  directions. Omitting it just omits the Part-of line and the Subprojects section.
- The Subprojects section renders `ProjectBrowse.cardsHtml` when the host page loads the
  project-browse assets — a subproject card IS a project card, one presentation site-wide —
  and falls back to a plain linked list when it does not.

## Field rules worth stating

**An in-site `source_url` is a continuation, not a citation.** A `source_url` with no scheme
(`ai4ui.html`) points at a page on this site, which means two things the external rendering gets
wrong: it must not open in a new tab or announce that it does, and it does not belong at the
foot of the page under a heading a reader skips. Such a record CONTINUES somewhere — the page it
names is the rest of it — so the link is rendered directly under the description as a primary
action, in the same verb the browse card uses (`Open …`), and the Source section is omitted.
Records citing an external source are untouched: a citation is exactly what those are. The label
is the record's own title, falling back to a generic destination past 48 characters, where a
title stops reading as a place to go and starts reading as a sentence.

`location_basis` renders only when `location` does. Alone it answers a question the page never
asked ("no project site named in the record").

`deliverables` is dropped when its only content is the URL already rendered as the Source link.
Today that is every record carrying one — a "website: <source_url>" row is a duplicate, not a
deliverable — and the rule leaves room for a real one to appear later.

A URL inside any record value is rendered as a link, after escaping. A visible URL you cannot
click, on the same page where the source link works, reads as broken. Suppressed vocabulary:
`status: Unknown` and `research_area: Other` record an absence, so the status pill and the
eyebrow are omitted rather than shown as UNKNOWN and OTHER; both values stay in the data and in
the browse filters.

## Isolation

`demo.html` renders four cases against `fixture.js` with no other module loaded: a fully
documented record, a low-confidence stub carrying almost nothing, a record whose source is a
page on this site, and a missing record.
