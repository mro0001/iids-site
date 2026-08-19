/* Site Shell — the page skeleton (header + footer) as two custom elements.
   Contract: components/site-shell/CONTRACT.md

   Light DOM on purpose: no shadow root, so shared/tokens.css and mockup.css keep styling
   .nav / .brand / .cta / footer exactly as they did when this markup was pasted into each
   page by hand. No class was renamed.

   file://-safe: zero fetch. MODULES.md binds the Shell factor-out to a build-time include or
   an inline-<script> Web Component precisely because a double-clicked file:// page cannot
   fetch a partial — it would silently render no navigation at all.

   Usage:  <site-nav active="resources"></site-nav>
           <site-footer>Optional per-page disclaimer, preserved as .disclaimer.</site-footer> */
(function (global) {
  'use strict';

  /* The single source of record for site navigation. Previously this list lived, copy-pasted,
     in every page in mockups/ — which is how kb.html and kb_entry.html came to show a
     "Knowledge Base" item that the other six public pages did not. */
  var DEFAULT_MODEL = {
    public: {
      brandSub: 'Interdisciplinary Data Sciences',
      brandHref: 'landing_placeholder.html',
      links: [
        { id: 'about', href: 'about.html', label: 'About' },
        { id: 'projects', href: 'projects.html', label: 'Projects' },
        { id: 'resources', href: 'resources.html', label: 'Resources' },
        { id: 'kb', href: 'kb.html', label: 'Knowledge base' },
        /* News only. Events is reachable from the News page and from the site footer,
           which renders on every page; two more items here would push the nav's overflow
           point up into laptop widths. */
        { id: 'news', href: 'news.html', label: 'News' },
        /* RCDS and GBRC only. AI4UI was removed as a nav item on 2026-08-10 (Michael):
           it is a project, not a unit of IIDS, so it does not belong in a list of units.
           mockups/ai4ui.html and content/ai4ui_*.md are kept and are now intentionally
           reached from the Projects browse via the ai4ui record, not from the nav. */
        { id: 'rcds', href: 'portal.html', label: 'RCDS' },
        { id: 'gbrc', href: '/gbrc/', label: 'GBRC' },
        { id: 'contact', href: 'contact.html', label: 'Contact' }
      ],
      /* The padlock is decoration: as part of the label a screen reader announces
         "locked padlock Intranet". It rides in `icon`, which linkHTML hides from AT. */
      lock: null,
      /* The CTA lands on Resources (client, 2026-08-14) — the streamlined router —
         reversing the section map's earlier repoint to the hub (work_with_iids_map.md
         "The nav change is one line"). The hub keeps Connect and the tracks; Connect
         moves to Resources once the intake is settled. Yes, the CTA and the Resources
         nav item now share a target — the CTA is the emphasis, not a distinct room. */
      cta: { href: 'resources.html', label: 'Work with us' },
      footer: {
        tagline: 'Institute for Interdisciplinary Data Sciences, University of Idaho.',
        columns: [
          {
            /* Deep links, not three copies of contact.html: a column that promises
               routing has to land on the route. The ids are contact.html's contract. */
            heading: 'Contact by need',
            links: [
              { href: 'contact.html#general', label: 'General inquiries' },
              { href: 'contact.html#proposals', label: 'Proposals and grants' },
              { href: 'contact.html#partnerships', label: 'Partnership outreach' }
            ]
          },
          {
            /* AI4UI was dropped from this column on 2026-08-10 with the nav item: it is a
               project, not a unit. What remains — RCDS and GBRC — are genuinely units, so
               the heading is left exactly as it is. Whether "Units" is the right word for
               them is a separate open decision and is not being answered here. */
            heading: 'Units',
            links: [
              { href: 'portal.html', label: 'RCDS' },
              { href: '/gbrc/', label: 'GBRC' }
            ]
          },
          {
            heading: 'Our work',
            links: [
              { href: 'projects.html', label: 'Research enabled by IIDS' },
              { href: 'kb.html', label: 'Knowledge base' },
              { href: 'resources.html', label: 'Services and rates' },
              { href: 'news.html', label: 'News archive' },
              { href: 'events.html', label: 'Events' }
            ]
          },
          {
            heading: 'University',
            links: [
              { href: 'https://www.uidaho.edu/research', label: 'U of I Research' },
              { href: 'https://www.uidaho.edu/access', label: 'Accessibility' },
              { href: 'https://www.uidaho.edu/directory', label: 'Directory' }
            ]
          }
        ]
      }
    },
    intranet: {
      brandSub: 'Intranet',
      brandHref: 'landing_placeholder.html',
      links: [
        { id: 'home', href: 'intranet.html', label: 'Home' },
        { id: 'apps', href: 'intranet.html#apps', label: 'Apps' },
        { id: 'kb', href: 'intranet.html#kb', label: 'Knowledge Base' },
        { id: 'content', href: 'intranet_content.html', label: 'Content Manager' }
      ],
      lock: null,
      cta: { href: 'landing_placeholder.html', label: 'Exit to public site' },
      footer: {
        tagline: 'Institute for Interdisciplinary Data Sciences, University of Idaho.',
        columns: []
      }
    }
  };

  var MODEL = DEFAULT_MODEL;
  var seq = 0;
  /* The variant the page's <site-nav> rendered. A <site-footer> with no variant of its own
     adopts it, so a page declares "this is the intranet" once instead of twice — and an
     intranet page does not fall through to the public footer's columns. <site-nav> always
     precedes <site-footer> in document order, so it has always upgraded first. */
  var pageVariant = null;

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function attr(s) { return esc(s).replace(/"/g, '&quot;'); }

  function variantOf(node, fallback) {
    var v = node.getAttribute('variant');
    if (v === 'landing') return 'public';       // landing is a footer layout, not a nav model
    if (MODEL[v]) return v;
    if (!v && fallback && MODEL[fallback]) return fallback;
    return 'public';
  }

  function linkHTML(link, active, cls) {
    var classes = [];
    var here = !!(link.id && link.id === active);
    if (cls) classes.push(cls);
    if (here) classes.push('here');
    /* .here is a color change and nothing else; aria-current is how a screen-reader user
       learns which page they are on (WCAG 4.1.2). An icon is decoration — hidden from AT,
       which reads the label that follows it. */
    return '<li><a' + (classes.length ? ' class="' + classes.join(' ') + '"' : '') +
      ' href="' + attr(link.href) + '"' + (here ? ' aria-current="page"' : '') + '>' +
      (link.icon ? '<span aria-hidden="true">' + esc(link.icon) + '</span> ' : '') +
      esc(link.label) + '</a></li>';
  }

  /* ------------------------------------------------------------------ <site-nav> */

  function renderNav(node) {
    var variant = variantOf(node);
    var m = MODEL[variant];
    var active = node.getAttribute('active') || '';
    pageVariant = variant;
    var menuId = 'site-nav-menu-' + (++seq);

    var items = m.links.map(function (l) { return linkHTML(l, active, null); });
    if (m.lock) items.push(linkHTML(m.lock, active, 'lock'));

    /* The skip link precedes the header so it is the first tab stop on every page
       (WCAG 2.4.1). Host pages expose id="main" tabindex="-1" on their main content
       container — that requirement is part of the contract (CONTRACT.md). Without the
       tabindex the target is not focusable: activating the link moved the scroll position
       and set location.hash but left document.activeElement on <body>, so the bypass was
       visual only and screen readers kept reading from the top. */
    node.innerHTML =
      '<a class="skip" href="#main">Skip to main content</a>' +
      '<header>' +
        '<nav class="nav">' +
          '<a class="brand" href="' + attr(m.brandHref) + '">' +
            '<span class="mark">I</span>' +
            '<span>IIDS<small>' + esc(m.brandSub) + '</small></span>' +
          '</a>' +
          '<button class="navtoggle" type="button" aria-expanded="false" ' +
            'aria-controls="' + menuId + '" aria-label="Open navigation menu">' +
            '<span class="navtoggle-bar"></span>' +
            '<span class="navtoggle-bar"></span>' +
            '<span class="navtoggle-bar"></span>' +
          '</button>' +
          '<ul id="' + menuId + '">' + items.join('') + '</ul>' +
          '<a class="cta" href="' + attr(m.cta.href) + '">' + esc(m.cta.label) + '</a>' +
        '</nav>' +
      '</header>';

    wireToggle(node);
  }

  function wireToggle(node) {
    var nav = node.querySelector('.nav');
    var btn = node.querySelector('.navtoggle');
    if (!nav || !btn) return;

    function setOpen(open) {
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', (open ? 'Close' : 'Open') + ' navigation menu');
    }

    btn.addEventListener('click', function () {
      setOpen(!nav.classList.contains('open'));
    });

    node.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        setOpen(false);
        btn.focus();
      }
    });
  }

  /* --------------------------------------------------------------- <site-footer> */

  /* True when the first painted background behind `el` is dark enough that white text is the
     readable choice (WCAG relative luminance). The footer band is painted by the page —
     mockup.css and the landing page's own stylesheet — and a page can load the shell without
     either, in which case the band is the white body. Measuring beats assuming: the footer
     column headings used to take their white from `.foot h5` in those two files, so the
     shell now asks what it is standing on rather than hard-coding a color. */
  function onDarkBand(el) {
    if (!global.getComputedStyle) return false;
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
      var m = /^rgba?\(([^)]+)\)/.exec(global.getComputedStyle(n).backgroundColor || '');
      if (!m) continue;
      var p = m[1].split(',').map(parseFloat);
      if (p.length > 3 && p[3] === 0) continue;          // transparent: keep walking up
      var lin = p.slice(0, 3).map(function (v) {
        v = v / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return (0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]) < 0.18;
    }
    return false;
  }

  function renderFooter(node) {
    var m = MODEL[variantOf(node, pageVariant)];

    /* Content authored inside the element is this page's own disclaimer. Preserve it —
       including any links — so pages keep their specific wireframe note. */
    var note = node.innerHTML.trim();

    var brand = '<div class="brand"><span class="mark">I</span><span>IIDS</span></div>';
    var body;

    /* The columns are the model's, not the landing page's. They used to render only under
       variant="landing", which left every interior page with a footer carrying no links at
       all — the Accessibility link and the only footer path to Events existed on one page
       of the site. A model with no columns (intranet) still gets the simple footer. */
    if (m.footer.columns.length) {
      body =
        '<div class="foot">' +
          '<div>' + brand + '<p>' + esc(m.footer.tagline) + '</p></div>' +
          /* h2, not h5. The footer is a top-level page region, so its column headings are
             siblings of the page's own top-level sections. At h5 the footer skipped a level
             on every page that rendered it — h3 -> h5 on about/landing/contact, h2 -> h5 on
             ai4ui/events/news, h1 -> h5 on kb — because page content stops at h3. Heading
             level is the document outline, not type size: `.foot h2` in site-shell.css keeps
             the small uppercase treatment `.foot h5` had. */
          m.footer.columns.map(function (col) {
            return '<div><h2>' + esc(col.heading) + '</h2><ul>' +
              col.links.map(function (l) {
                return '<li><a href="' + attr(l.href) + '">' + esc(l.label) + '</a></li>';
              }).join('') +
            '</ul></div>';
          }).join('') +
        '</div>';
    } else {
      body = brand + '<p>' + esc(m.footer.tagline) + '</p>';
    }

    node.innerHTML =
      '<footer>' +
        '<div class="wrap">' +
          body +
          (note ? '<p class="disclaimer">' + note + '</p>' : '') +
        '</div>' +
      '</footer>';

    /* Stylesheets in <head> are render-blocking, so the band's color is already resolvable
       here; site-shell.css keys `.foot.on-dark h2` off this. */
    var foot = node.querySelector && node.querySelector('.foot');
    if (foot && foot.classList && onDarkBand(foot)) foot.classList.add('on-dark');
  }

  /* ------------------------------------------------------------------- register */

  function define(name, render) {
    if (global.customElements && !global.customElements.get(name)) {
      var Element = function () { return Reflect.construct(HTMLElement, [], Element); };
      Element.prototype = Object.create(HTMLElement.prototype);
      Element.prototype.constructor = Element;
      Object.setPrototypeOf(Element, HTMLElement);
      Element.prototype.connectedCallback = function () {
        if (this.dataset.rendered) return;
        this.dataset.rendered = '1';
        render(this);
      };
      global.customElements.define(name, Element);
    }
  }

  define('site-nav', renderNav);
  define('site-footer', renderFooter);

  global.SiteShell = {
    /* Swap the navigation model. Call before the elements upgrade (i.e. in a script tag
       above them, or before DOMContentLoaded). demo.html uses this with fixture.js. */
    setModel: function (model) { MODEL = model || DEFAULT_MODEL; },
    getModel: function () { return MODEL; },
    DEFAULT_MODEL: DEFAULT_MODEL
  };
})(window);
