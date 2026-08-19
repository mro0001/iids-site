# Content Render Component Contract

The site's **Shell renderer**: turns content markdown into page HTML. A build step renders each content file's body to HTML and emits an inline global; a page mounts each section from it. This is the platform capability every content-driven section renders through — build once, reused everywhere.

## Files

- `build-content.js` — the producer. Renders listed `content/*.md` bodies (markdown → HTML) and writes `content-render.generated.js`.
- `content-render.js` — the runtime. Exposes `window.ContentRender.mount(el, key)` and `mountAll(root)`. Zero fetch; pure DOM.
- `content-render.css` — typography for rendered content (`.rendered` and children). Brand colors via `var(--...)`.
- `content-render.generated.js` — generated output: `window.CONTENT = { <key>: "<html>" }`. Do not edit by hand.
- `demo.html` — a standalone, double-clickable host that renders sample sections.

## What it consumes

`content/<key>.md` — a content file in the frozen Content shape (header + markdown body). The renderer drops the frozen header, the leading `#` H1 (the page supplies its own section heading), and any internal `## Needs` section, then renders the rest.

Supported markdown: headings, paragraphs, unordered lists, `**bold**`, `*italic*`, `` `code` ``, `[links](url)`, and `<autolinks>`. (Intentionally minimal — extend `inline()`/`render()` as content needs grow.)

## What it produces (FROZEN)

- `window.CONTENT` — an object keyed by section name, each value a rendered HTML string.
- The DOM contract: a page element with `data-content="<key>"` gets `window.CONTENT[key]` injected by `mountAll()`.

## Frozen

- The `window.CONTENT` shape (`{ <key>: "<html>" }`) and the `data-content` mount attribute.
- The set of supported markdown constructs is soft (may grow), but existing output must not change meaning.

## Soft (per host)

- Which keys a page mounts, the `.rendered` styling, and the `KEYS` list the build renders.

## Data source

The content files are the single source of record; `content-render.generated.js` is derived (regenerate with `node components/content-render/build-content.js`). The record is the frozen seam a backend **content-read** service produces later: swap the generated global for `Backend.getSection(...)`-fed HTML at the host. Same `window.CONTENT` shape, two producers.

## Styling rule

Brand colors use `var(--...)`. Documented incidental literals: `#141414` (code background), `#6a6a6a` (missing-content notice). Not tokens.

## Register

Registered by its row in `MODULES.md` (deferred while a concurrent effort holds the manifest uncommitted — add the row when clear).
