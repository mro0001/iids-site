/* Fixture for the site-shell component — a small alternate navigation model.
   Its job is to prove <site-nav>/<site-footer> render from DATA, not from hardcoded markup:
   demo.html loads this and calls SiteShell.setModel(window.SITE_SHELL_FIXTURE), and the
   rendered shell changes accordingly.

   Inline global via <script src>, never a fetched .json — a double-clicked file:// page
   cannot fetch one (MODULES.md, step 3 of the component recipe). */
window.SITE_SHELL_FIXTURE = {
  public: {
    brandSub: 'Fixture — demo model',
    brandHref: '#',
    links: [
      { id: 'one', href: '#one', label: 'Section One' },
      { id: 'two', href: '#two', label: 'Section Two' },
      { id: 'three', href: '#three', label: 'Section Three' }
    ],
    lock: { id: 'locked', href: '#locked', label: 'Locked', icon: '🔒' },
    cta: { href: '#cta', label: 'Primary CTA' },
    footer: {
      tagline: 'Fixture tagline — the shell renders whatever the model supplies.',
      columns: [
        {
          heading: 'Column A',
          links: [
            { href: '#a1', label: 'First link' },
            { href: '#a2', label: 'Second link' }
          ]
        },
        {
          heading: 'Column B',
          links: [
            { href: '#b1', label: 'Third link' },
            { href: '#b2', label: 'Fourth link' }
          ]
        }
      ]
    }
  },
  intranet: {
    brandSub: 'Fixture — intranet',
    brandHref: '#',
    links: [
      { id: 'home', href: '#home', label: 'Home' },
      { id: 'tools', href: '#tools', label: 'Tools' }
    ],
    lock: null,
    cta: { href: '#exit', label: 'Exit' },
    footer: { tagline: 'Fixture intranet footer.', columns: [] }
  }
};
