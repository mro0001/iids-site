/* People Directory — a filterable staff grid. Pure DOM, zero fetch — file://-safe.
   Host provides a .peoplefilters element (with .pfbtn[data-unit] buttons) and a sibling
   .peoplegrid element, plus a fixture. Call PeopleDirectory.mount(buttonsEl, gridEl, fixture, assetBase, opts).
   assetBase is the host's prefix to the repo root (photo paths in the fixture are
   repo-root-relative): '../../' for the component demo, '../' for a page in mockups/.

   Behavior: renders one headshot card per person on mount; clicking a unit button dims
   the non-members; clicking the already-active button clears the filter (shows all).

   Filtering is a state change, not a visual effect: the pressed button carries
   aria-pressed, filtered-out cards leave the tab order and the accessibility tree, and a
   polite status line reports the count. Fading cards a keyboard user can still tab into is
   a filter that only works for the mouse.

   The unfiltered state is applied on mount rather than assumed, so aria-pressed and the
   count are right at first paint — silently, since the status line only becomes a live
   region once that first pass is done. */
(function () {
  /* Card names sit under whatever heading the host used for the section, which the
     component cannot know: h3 in the isolated demo, h4 inside about.html's zone. */
  var LEVELS = { h3: 1, h4: 1, h5: 1 };
  function nameLevel(opts) {
    var l = opts && String(opts.nameLevel || '').toLowerCase();
    return LEVELS[l] ? l : 'h3';
  }

  /* The href is the full URL; the link TEXT is the host, because a card is content and a
     path like /service_center/show_external/3232/ is plumbing. */
  function siteLabel(url) {
    var host = String(url || '').replace(/^[a-z]+:\/\//i, '').replace(/^www\./i, '').split('/')[0];
    return host || 'Website';
  }

  function card(p, base, h) {
    var contact = '';
    if (p.email) {
      contact += '<a class="pc-email" href="mailto:' + p.email + '">' + p.email + '</a>';
    }
    if (p.website) {
      contact += '<a class="pc-web" href="' + p.website + '" target="_blank" rel="noopener">'
        + siteLabel(p.website) + '</a>';
    }
    var photoClass = 'pc-photo' + (p.placeholderPhoto ? ' pc-photo--placeholder' : '');
    var src = (base || '') + p.photo;
    /* Descriptive alt, per the U of I digital style guide ("A portrait of U of I President
       Scott Green", not "Scott Green"). A placeholder says so rather than claiming to be
       a likeness of the person. */
    var alt = (p.placeholderPhoto ? 'Placeholder headshot standing in for a portrait of ' : 'A portrait of ')
      + p.name + (p.title ? ', ' + p.title : '');
    var photo = p.photo
      ? '<div class="' + photoClass + '"><img src="' + src + '" alt="' + alt + '" loading="lazy"></div>'
      : '<div class="pc-photo pc-photo--none"></div>';
    return '<article class="pcard" data-unit="' + (p.unit || '') + '">'
      + photo
      + '<' + h + ' class="pc-name">' + p.name + '</' + h + '>'
      + '<p class="pc-title">' + (p.title || '') + '</p>'
      + '<div class="pc-contact">' + contact + '</div>'
      + '</article>';
  }

  function mount(buttonsEl, gridEl, fixture, assetBase, opts) {
    var people = (fixture && fixture.people) || [];
    var h = nameLevel(opts);
    gridEl.innerHTML = people.map(function (p) { return card(p, assetBase, h); }).join('');
    var cards = gridEl.querySelectorAll('.pcard');
    var btns = buttonsEl.querySelectorAll('.pfbtn');
    var active = null;

    /* The buttons are a labelled group, not three loose controls. */
    var label = buttonsEl.querySelector('.pf-label');
    if (label) {
      if (!label.id) label.id = 'pfLabel';
      buttonsEl.setAttribute('role', 'group');
      buttonsEl.setAttribute('aria-labelledby', label.id);
    }

    /* Filtering is silent for a screen-reader user without this: the grid changes off-screen
       and nothing announces.

       It is created — and an adopted one is stripped — WITHOUT live semantics, because the
       first-paint count at the end of mount() has to land silently. A region that is already
       live while the page is painting can be spoken before the reader has touched anything,
       which is a page that shouts on arrival. aria-live goes on after that first pass, so
       only filter clicks announce. */
    var status = buttonsEl.querySelector('.pf-status');
    if (!status) {
      status = document.createElement('span');
      status.className = 'pf-status';
      buttonsEl.appendChild(status);
    }
    status.removeAttribute('aria-live');

    /* `interactive` marks a filter click as against the first paint. It gates the `filtering`
       class, which swaps the card transition to the opacity/grayscale fade: setting it on
       mount would cost every card its hover ease before anyone had clicked anything. */
    function apply(unit, interactive) {
      if (interactive) gridEl.classList.add('filtering');
      btns.forEach(function (b) {
        var on = b.dataset.unit === unit;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      var shown = 0;
      cards.forEach(function (c) {
        var show = !unit || c.dataset.unit === unit;
        if (show) shown++;
        c.classList.toggle('dim', !show);
        /* inert covers modern browsers; aria-hidden plus untabbable links cover the rest. */
        if (show) { c.removeAttribute('inert'); c.removeAttribute('aria-hidden'); }
        else { c.setAttribute('inert', ''); c.setAttribute('aria-hidden', 'true'); }
        c.querySelectorAll('a').forEach(function (a) {
          if (show) a.removeAttribute('tabindex');
          else a.setAttribute('tabindex', '-1');
        });
      });
      status.textContent = unit
        ? 'Showing ' + shown + ' of ' + cards.length + ' people'
        : 'Showing all ' + cards.length + ' people';
    }

    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var u = btn.dataset.unit;
        if (u === active) { active = null; apply(null, true); }   // click the pressed button to clear
        else { active = u; apply(u, true); }
      });
    });

    /* The unfiltered state is a state, so it is applied rather than assumed: this is what
       puts aria-pressed on the buttons and a true count in the status line at first paint.
       Set only on click, the count read "" until someone filtered, and the initial button
       state was written in two places instead of one. */
    apply(null);
    status.setAttribute('aria-live', 'polite');
  }

  /* Optional second surface: the steering committee, which is people from the same source
     file but not staff — no headshot, no unit, no filter. Renders nothing when the fixture
     carries no committee, so a host can mount it unconditionally. */
  function mountCommittee(listEl, fixture) {
    if (!listEl) return 0;
    var members = (fixture && fixture.committee) || [];
    listEl.innerHTML = members.map(function (m) {
      var name = m.url
        ? '<a href="' + m.url + '" target="_blank" rel="noopener">' + m.name + '</a>'
        : m.name;
      return '<li><span class="sc-name">' + name + '</span>'
        + (m.affiliation ? '<span class="sc-aff">' + m.affiliation + '</span>' : '')
        + '</li>';
    }).join('');
    listEl.hidden = !members.length;
    return members.length;
  }

  window.PeopleDirectory = { mount: mount, mountCommittee: mountCommittee };
})();
