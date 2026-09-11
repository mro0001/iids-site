# Site Shell Component Contract

The **Shell** module, realized. The page skeleton every other component mounts inside: the
sticky header (brand, navigation, primary CTA, mobile menu) and the footer.

Before this component the header and footer were copy-pasted into every page in `mockups/`
and the active link was hand-set. That had already drifted — `kb.html` and `kb_entry.html`
carried a "Knowledge Base" nav item the other six public pages did not, so the item appeared
and vanished as a visitor moved through the site. Navigation now has one source of record.

## Files

- `site-shell.js` — the runtime. Defines the navigation model and registers two custom
  elements, `<site-nav>` and `<site-footer>`. Light DOM (no shadow root) so `shared/tokens.css`
  and `mockups/mockup.css` continue to style the shell exactly as before.
- `site-shell.css` — shell-owned layout: element display, the mobile menu, and the responsive
  behavior of `.nav`. Loaded by every page that uses the shell.
- `fixture.js` — a small alternate navigation model (`window.SITE_SHELL_FIXTURE`) proving the
  elements render from data rather than from hardcoded markup.
- `demo.html` — a standalone, double-clickable host rendering both variants against the fixture.

## Why a Web Component and not an include

`MODULES.md` binds the Shell factor-out: a build-time include or an inline-`<script>` Web
Component, **never** a `fetch()`ed partial — a double-clicked `file://` page cannot fetch one
and the shell would silently vanish. Custom elements let a page declare `<site-nav active="…">`
with no mount call and no build step, and they degrade to an empty element rather than a broken
layout if the script fails to load.

## What it consumes

A **navigation model**, either the built-in default in `site-shell.js` or one supplied by
`window.SiteShell.setModel(model)` before the elements upgrade:

```js
{
  <variant>: {
    brandSub: string,            // small text under the "IIDS" wordmark
    brandHref: string,
    links:  [ { id, href, label, icon? } ],
    lock:   { id, href, label, icon? } | null,   // the gold-outlined intranet marker, if any
    cta:    { href, label },
    footer: { tagline, columns: [ { heading, links: [ { href, label } ] } ] }
  }
}
```

Two variants ship: `public` (nine links plus the intranet lock) and `intranet` (four links,
"Exit to public site" CTA).

`icon` is optional. When present it renders before the label inside an
`aria-hidden="true"` span, so a decorative glyph stays out of the accessible name — the lock
announces as "Intranet", not "locked padlock Intranet". Put nothing in `icon` that carries
meaning of its own.

## The DOM contract (FROZEN)

- `<site-nav>` renders a `<header><nav class="nav">…` using the existing `.nav`, `.brand`,
  `.mark`, `.cta`, and `.lock` classes. **No class was renamed** — every existing rule in
  `mockup.css` and `intranet.css` still applies.
- **Skip link:** before the `<header>`, `<site-nav>` renders
  `<a class="skip" href="#main">Skip to main content</a>` as the page's first tab stop
  (WCAG 2.4.1 Bypass Blocks). `site-shell.css` keeps it visually hidden until focused.
  **Host pages must expose `id="main" tabindex="-1"` on their main content container**
  (their `<main>` where one exists); every page in `mockups/` does, and
  `check.js` fails if one stops doing so. The `tabindex` is not optional: without it the
  target is not focusable, so activating the link scrolls and sets `location.hash` while
  `document.activeElement` stays on `<body>` — the bypass is then visual only and a screen
  reader keeps reading from the top. A negative value adds no tab stop.
- `<site-footer>` renders a `<footer>` using the existing `.brand`, `.foot`, and `.disclaimer`
  classes.
- **Footer columns follow the model, not the page.** A footer renders the four-column `.foot`
  grid whenever its model defines `footer.columns`, on every page — previously only
  `variant="landing"` did, which left every interior page with a footer of brand and tagline
  and no links: the Accessibility link (now `uidaho.edu/policies/web-accessibility`; the old `/access` path 404s as of 2026-09) existed on one page of the site and
  the only footer path to Events was the landing. The intranet model defines no columns, so
  intranet pages still get the simple footer. `.foot` is styled in `mockups/mockup.css`
  (the landing page keeps its own copy, since it owns that band's color).
- **Footer column headings are `<h2>`.** The footer is a top-level page region, so its
  headings sit beside the page's own top-level sections. They rendered as `<h5>` at first,
  which skipped a level on every page that shows the columns — page content stops at `h3`,
  and `kb.html` went `h1` straight to `h5`. Heading level is the document outline, not the
  type size: `site-shell.css` carries the small uppercase treatment forward as `.foot h2`.
  The `.foot h5` rules still sitting in `mockups/mockup.css` and the landing page's inline
  `<style>` match nothing now and should be folded in by whoever next edits those files.
  The white heading color those rules carried belongs to the dark footer band, which the
  page paints, not the shell: `<site-footer>` measures the background behind the rendered
  `.foot` and adds `class="on-dark"` when white is the readable choice, and `site-shell.css`
  keys `.foot.on-dark h2` off it. Without that measurement `hero_variants.html`, which loads
  the shell but neither `mockup.css` nor the landing's styles, printed white on white.
- Attributes:
  - `variant="public|intranet|landing"` — which model entry to render. `landing` is an
    accepted alias for `public`, kept because pages still pass it; it no longer selects a
    footer layout (see below). A `<site-footer>` with no `variant` adopts the variant its
    page's `<site-nav>` rendered, falling back to `public` when a page has no nav.
  - `active="<link id>"` — marks that link with `.here` **and** `aria-current="page"`, so
    the current page is exposed to assistive technology and not only to sighted users
    (WCAG 4.1.2). A page sets this instead of hand-editing an anchor.
- **Footer note passthrough:** any content authored inside `<site-footer>…</site-footer>` is
  preserved and rendered as the `.disclaimer` paragraph. This keeps each page's specific
  wireframe disclaimer, including its links, while the rest of the footer stays shared.

## Frozen

- The two element names, the `variant` and `active` attribute names, and the class names listed
  above. Pages depend on all of them.
- The footer note passthrough behavior.

## Soft

- The navigation model's contents (links may be added, reordered, or relabeled — that is the
  point of having one source), the mobile breakpoint, and everything in `site-shell.css`.
- **Portal links.** A model link may carry `portal: '<served path>'`. The shell renders it as
  `data-portal` on the anchor, keeps `href` on the static stand-in (`gbrc.html`), and after
  the elements upgrade probes `GET /api/health`; only when the server reports
  `gbrc_frontend_built: true` are all `a[data-portal]` on the page rewritten to the served
  path. From file:// or a static host the stand-in stays, so the link never 404s.

## Accessibility

The mobile toggle is a real `<button>` carrying `aria-expanded`, `aria-controls`, and an
`aria-label`, and `aria-expanded` is kept in sync when the menu opens and closes. The menu
closes on `Escape` and returns focus to the toggle. The active link carries
`aria-current="page"`; decorative glyphs ride in `icon` and are `aria-hidden`. The toggle's
own boundary uses `--border-control` (≥ 3:1, WCAG 1.4.11), not the decorative hairline.

## Styling rule

Brand colors use `var(--…)` from `shared/tokens.css`. No literal brand hex. The shell adds no
color of its own — it inherits whatever the page's stylesheet defines for `.nav` and `site-footer footer` (since 2026-09 the dark band rules in `mockups/mockup.css` are scoped to the Shell's footer, so a page's bare `footer{…}` rule loses to them).

## Register

Registered by the **Shell** row in `MODULES.md`, which this component fills (that row's contract
was previously `TBD`).
