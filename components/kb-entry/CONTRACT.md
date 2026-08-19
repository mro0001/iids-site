# KB Entry Component Contract

Renders **one** human-facing knowledge base entry into a root element, in the template order
Michael set: **Title · Source (as a link) · Body · footer(created_date, last_updated)**. Pure DOM,
zero fetch — file://-safe. It is the render half of the KB; the browser widget
(`components/knowledge-base/`) lists entries and links here.

## Files

- `kb-entry.js` — behavior. Exposes `window.KBEntry.mount(rootEl, entry)` and `window.KBEntry.render(markdown)`. Zero fetch; pure DOM.
- `kb-entry.css` — styles (`.kbentry` and children). Brand colors via `var(--...)` from `shared/tokens.css`.
- `fixture.js` — one **synthetic** sample entry as an inline JS global (`window.KB_ENTRY_FIXTURE`). NEVER a fetched `.json` (file:// blocks fetch).
- `demo.html` — a standalone, double-clickable host that mounts the renderer in isolation.

## What it consumes (the entry record)

```js
window.KB_ENTRY_FIXTURE = {
  id:            '<slug>',                 // kb-data id
  group:         'IIDS',                   // RCDS | IIDS | GBRC | GENERAL
  title:         '<noun-led title>',       // the entry H1
  source:        '<display text>',         // e.g. "IIDS Standard Admin Procedures (PDF)"
  source_url:    '<url or null>',          // optional; when present, source renders as a link
  body:          '<markdown string>',      // rendered by render() — subset below
  gist:          '<one plain sentence>',   // optional subtitle
  created_date:  '2026-07-17',             // system-managed (git / write API)
  last_updated:  '2026-07-17',             // system-managed; bumps on edit
  adoption:      'draft',                  // optional, additive: draft | adopted (kb-data key)
  // carried but not rendered by this component: tags, entry_type, keywords, related, visibility
}
```

### Draft banner (`adoption` — additive, optional)

When `entry.adoption === 'draft'`, `mount()` renders a `.kbentry-draft` banner between the gist
and the source callout, styled like the `.kbentry-flag` red block: **"DRAFT — under review. Not
adopted institute policy; figures pending verification."** Any other value — including the key
being absent, which is the case for every pre-existing entry — renders nothing, so consumers
supplying only the frozen fields keep working unchanged. Draft status is rendered from this
metadata, never inferred from body prose.

## What it produces (the render — FROZEN field names)

`mount(rootEl, entry)` sets `rootEl.innerHTML` to an `<article class="kbentry">` containing, in order:
group eyebrow, **title**, optional **gist**, **source** (an `<a>` when `source_url` is set, else
plain text), **body**, and a **footer** with `created_date` / `last_updated`.

The record field names it reads are **frozen**: `group, title, source, source_url, body, gist,
created_date, last_updated`. Consumers (kb-data, the detail page) must supply those names.

### Markdown subset `render()` supports (FROZEN scope)

`## ` / `### ` headings, `-` bullet lists (one level of nesting via 2-space indent), `**bold**`,
`*italic*` (single `*`, one line, applied after bold so a `**` pair is never read as two single
markers), `> ` blockquotes (consecutive `>` lines, body running this same block subset, rendered as
`<blockquote>`), thematic breaks (a line of three or more `*`, `-` or `_` → `<hr>`, tested before
the italic and bullet rules), `[text](url)` links (incl. `mailto:`), `![alt](url)` images, GFM pipe tables (a `| … |` header row
+ a `|---|---|` separator + body rows; cells run the inline subset, escaped `\|` stays literal in a
cell), paragraphs, fenced code blocks (` ``` `) rendered verbatim as <pre><code> (no inline
processing inside), and disclosures (`:::details Summary text` … `:::`) rendered as
`<details><summary>` + a `.kbentry-disclosure` body that runs this same block subset; the first
bare `:::` closes it, nesting is not supported, and `:::details` with no summary text is left as
an ordinary paragraph. Review flags (`:::flag` … `:::`) render as an always-open
`.kbentry-flag` block running the same body subset — an authoring affordance marking content a
human must still verify, styled off-brand so it cannot be skimmed past; every instance is a to-do
and none should survive to launch. Backslash-escaped punctuation (`\[`, `\_`, `\|`, …) is unescaped for display.
KB embeds (`{{kb: <id>}}` / `{{kb: <id> | full}}` on their own line, id = store slug
`[a-z0-9-]+`) render as `.kbentry-embed` placeholder divs; the host fills them with
`KBEntry.hydrate(rootEl, entries, opts)` — `entries` is the store THE HOST PAGE loaded (the
payload stays the visibility gate), `opts.detailPage` (default `kb_entry.html`) is the card
link target. Cards show title + gist (+ a Draft chip when the target carries
`adoption: 'draft'`); `| full` transcludes the target's live body, ONE level deep — markers
inside a transcluded body always hydrate as cards, so cycles cannot recurse. An id the
passed store does not contain renders a `.kbentry-embed-missing` stub. Malformed markers
fall through as literal paragraph text.
Text is HTML-escaped before formatting. This is intentionally the subset the authored
`content/kb/**` entries use — not full CommonMark.

## Frozen

- `window.KBEntry.mount(rootEl, entry)` signature and the `KB_ENTRY_FIXTURE` global name.
- The entry record field names listed above.
- The markdown subset scope (adding syntax is soft; removing supported syntax is not).

## Soft

- Prose styling, the DOM inside `.kbentry`, and the markdown renderer internals.
- `window.KBEntry.hydrate(rootEl, entries, opts)` — additive API; string replacement on
  `innerHTML`, no DOM walking, so it runs in the node harness. `mount()`/`render()` are
  unchanged and never touch a store.
- `created_date` / `last_updated` are **system-managed** by the producer (git history or the write
  API); this component only displays them.

## Styling rule

Brand colors use `var(--...)` from `shared/tokens.css`, never a literal hex.

## Register

Registered by its row in `MODULES.md` (the module inventory is the manifest).
