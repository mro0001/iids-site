/* project-spotlight — a rotating showcase of currently active projects.

   Loads as a plain <script src> and exposes window.ProjectSpotlight. Zero fetch, so a
   double-clicked file:// page renders it.

   The component is given the whole item array and does its own selecting, because the
   selection rule IS the component: a spotlight asserts a project prominently, in big type,
   naming a real person. That is a higher bar than the browse page, which can afford to show
   a sparse record as a sparse record. Everything that cannot clear the bar stays out of the
   rotation and stays discoverable on the browse page.

   The three pure functions below are the whole of that judgment and are checked against the
   real store by check.js. */
(function (window) {
  'use strict';

  /* ── PI name ────────────────────────────────────────────────────────────────
     `lead` is prose, not a name field. It runs from "Michael Maughan" through
     "Zachariah B. Etienne, Professor, Department of Physics, College of Science,
     University of Idaho" to a full sentence about who is named on which award.
     We take the name off the front and refuse anything that does not look like one. */

  /* Prose that sits in front of the name in a handful of records. */
  var LEADIN = /^(?:program direction (?:is )?listed as|listed as|led by|directed by)\s+/i;

  /* A parenthetical INSIDE a name ("Frederick M. (Marty) Ytreberg", "Lucas J. (Luke)
     Sheneman") rather than a role or an affiliation. Single capitalized word, followed by
     more name. Protected before the paren cut below, then restored. */
  var NICKNAME = /\s\(([A-Z][a-z]+)\)\s(?=[A-Z])/;

  /* Words that mean the value names an organization, not a principal investigator. */
  var ORGWORD = /\b(?:university|universities|institute|library|department|college|office|program|center|centre|network|laboratory|school|division|agency|foundation)\b/i;

  /* Stand-in for a protected nickname while the paren cut runs. NUL is the one character
     that cannot occur in a `lead` value, so it can never collide with real prose. Written
     as the escape, never as a literal 0x00: a literal NUL makes git treat the whole file as
     binary, and every change to the component then vanishes from diffs and from review. */
  var SENTINEL = '\u0000';

  function leadName(lead) {
    if (!lead) return '';
    var s = String(lead).trim().replace(LEADIN, '');

    var nick = null;
    var m = s.match(NICKNAME);
    if (m) { nick = m[1]; s = s.replace(NICKNAME, ' ' + SENTINEL + ' '); }

    /* Cut at the first role or affiliation boundary. Deliberately NOT on ". " — that would
       split "Frederick M. Ytreberg" at the middle initial. */
    var cut = s.search(/[,;]|\s\(/);
    if (cut > -1) s = s.slice(0, cut);

    s = s.replace(new RegExp('\\s*' + SENTINEL + '\\s*'), nick ? ' (' + nick + ') ' : ' ');
    return s.replace(/\s+/g, ' ').trim();
  }

  /* Does the extracted string read as a person (or a pair of co-leads)? */
  function looksLikeName(s) {
    if (!s || s.length > 60) return false;
    if (ORGWORD.test(s)) return false;
    if (!/^[A-ZÀ-Ü]/.test(s)) return false;
    if (/\d/.test(s)) return false;
    var words = s.split(/\s+/);
    return words.length >= 2 && words.length <= 6;
  }

  /* ── byline ─────────────────────────────────────────────────────────────────
     There is no one-sentence field in the store, so the byline is the first sentence of
     `description`, which runs 354–1012 characters. */

  /* A period that ends an initial or a known abbreviation, not a sentence. */
  var ABBR = /(?:^|\s)(?:[A-Z]|U\.S|Dr|Mr|Ms|Mrs|Prof|St|vs|e\.g|i\.e|et al|al|approx|Inc|Ltd|Co|Fig|No|Nos|Jr|Sr|Ph\.D)$/;

  function firstSentence(text) {
    var d = String(text || '').replace(/\s+/g, ' ').trim();
    for (var i = 0; i < d.length; i++) {
      var c = d.charAt(i);
      if (c !== '.' && c !== '!' && c !== '?') continue;
      if (i === d.length - 1) return d;
      if (!/^\s+["'‘“(]?[A-Z]/.test(d.slice(i + 1))) continue;
      if (c === '.' && ABBR.test(d.slice(0, i))) continue;
      return d.slice(0, i + 1);
    }
    return d;
  }

  /* Provenance prose. Truthful in a record, wrong in a showcase: a spotlight that opens
     "No public web source uses the name ..." is asserting the opposite of a highlight. */
  var PROVENANCE = /^(?:no public|no web|no source|no external|internal records|nothing public|the grant recorded)/i;

  function byline(description, max) {
    var s = firstSentence(description);
    if (!s) return '';
    max = max || 220;
    if (s.length <= max) return s;
    var cut = s.lastIndexOf(' ', max - 1);
    if (cut < 60) cut = max - 1;
    return s.slice(0, cut).replace(/[\s,;:.–—-]+$/, '') + '…';
  }

  /* ── selection ──────────────────────────────────────────────────────────────
     Active, with a usable PI name and a usable byline. Order is the store's order; the
     host may shuffle. */
  function spotlightItems(items, opts) {
    opts = opts || {};
    var max = opts.maxByline || 220;
    var out = [];
    (items || []).forEach(function (it) {
      if (!it || !it.objectid || !it.title) return;
      if (String(it.status || '').trim() !== 'Active') return;

      var pi = leadName(it.lead);
      if (!looksLikeName(pi)) return;

      var sentence = firstSentence(it.description);
      if (!sentence || PROVENANCE.test(sentence)) return;

      out.push({
        objectid: it.objectid,
        title: String(it.title).trim(),
        pi: pi,
        byline: byline(it.description, max),
        truncated: sentence.length > max
      });
    });
    return out;
  }

  /* ── mount ──────────────────────────────────────────────────────────────────
     opts: { entryPage, browsePage, interval, shuffle } */
  function mount(root, items, opts) {
    if (!root) return null;
    opts = opts || {};
    var entryPage = opts.entryPage || 'project_entry.html';
    var interval = opts.interval || 7000;

    var slides = spotlightItems(items, opts);
    if (opts.shuffle) slides = shuffle(slides, opts.shuffle);

    root.innerHTML = '';
    root.className = (root.className ? root.className + ' ' : '') + 'psp';

    if (!slides.length) {
      root.innerHTML = '<p class="psp-empty">No active projects to feature yet.</p>';
      return null;
    }

    root.setAttribute('role', 'group');
    root.setAttribute('aria-roledescription', 'carousel');
    root.setAttribute('aria-label', 'Active projects');

    var stage = el('div', 'psp-stage');
    var live = el('div', 'psp-slide');
    live.setAttribute('aria-roledescription', 'slide');
    /* Off while the carousel rotates on its own, polite once it is stopped or the user is
       driving (setPlaying owns it). A live region left on during auto-rotation reads the
       whole slide aloud every 7 seconds, which is the failure the APG carousel pattern
       exists to prevent. */
    live.setAttribute('aria-live', 'off');
    live.setAttribute('aria-atomic', 'true');
    stage.appendChild(live);

    var bar = el('div', 'psp-bar');
    var prev = button('‹', 'Previous project', 'psp-arrow');
    var next = button('›', 'Next project', 'psp-arrow');
    var toggle = button('', 'Pause rotation', 'psp-toggle');
    var dots = el('div', 'psp-dots');
    var counter = el('span', 'psp-count');

    /* Dots are a navigation aid only while they can be counted at a glance. At 61 active
       projects they are a stripe of noise, so past maxDots the counter carries the position
       on its own. */
    var maxDots = opts.maxDots == null ? 12 : opts.maxDots;
    var useDots = slides.length <= maxDots;
    if (useDots) {
      slides.forEach(function (_, i) {
        var d = button('', 'Project ' + (i + 1) + ' of ' + slides.length, 'psp-dot');
        d.addEventListener('click', function () { go(i, true); });
        dots.appendChild(d);
      });
    }

    bar.appendChild(prev); bar.appendChild(next);
    bar.appendChild(dots); bar.appendChild(counter); bar.appendChild(toggle);
    root.appendChild(stage); root.appendChild(bar);

    var idx = 0;
    var timer = null;
    /* A user who has asked the OS for less motion does not get an auto-rotating banner. */
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var playing = !reduced;

    function render() {
      var s = slides[idx];
      live.innerHTML = '';

      var a = el('a', 'psp-title');
      a.href = entryPage + '?id=' + encodeURIComponent(s.objectid);
      a.textContent = s.title;
      live.appendChild(a);

      var pi = el('p', 'psp-pi');
      /* A bare name in gold is not self-describing. "Led by" also stays true for the
         co-lead pairs the selector accepts, which "PI:" would not. */
      pi.textContent = 'Led by ' + s.pi;
      live.appendChild(pi);

      var by = el('p', 'psp-byline');
      by.textContent = s.byline;
      live.appendChild(by);

      var more = el('a', 'psp-more');
      more.href = entryPage + '?id=' + encodeURIComponent(s.objectid);
      more.textContent = 'Read the full project';
      live.appendChild(more);

      counter.textContent = 'Project ' + (idx + 1) + ' of ' + slides.length + ' active';
      Array.prototype.forEach.call(dots.children, function (d, i) {
        d.classList.toggle('on', i === idx);
        d.setAttribute('aria-current', i === idx ? 'true' : 'false');
      });
    }

    function go(i, byUser) {
      idx = (i + slides.length) % slides.length;
      if (byUser) stop();          /* an explicit choice wins over the timer, and turning the
                                      region polite BEFORE the swap is what makes the slide
                                      the user asked for the one that gets announced */
      render();
      if (!byUser) restart();
    }
    /* The live region tracks the timer, not the pause button: announcements belong to a
       reader who is driving, never to a banner advancing itself. */
    function start() {
      if (!playing) return;
      stop();
      timer = window.setInterval(function () { go(idx + 1); }, interval);
      live.setAttribute('aria-live', 'off');
    }
    function stop() {
      if (timer) { window.clearInterval(timer); timer = null; }
      live.setAttribute('aria-live', 'polite');
    }
    function restart() { if (playing) start(); }
    function setPlaying(v) {
      playing = v;
      toggle.classList.toggle('paused', !v);
      toggle.setAttribute('aria-label', v ? 'Pause rotation' : 'Resume rotation');
      if (v) start(); else stop();
    }

    prev.addEventListener('click', function () { go(idx - 1, true); });
    next.addEventListener('click', function () { go(idx + 1, true); });
    toggle.addEventListener('click', function () { setPlaying(!playing); });

    /* Hover and keyboard focus both suspend rotation; text you are reading must hold still. */
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', restart);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', function (e) {
      if (!root.contains(e.relatedTarget)) restart();
    });

    render();
    fitStage();
    setPlaying(playing);

    /* Titles run 8 to 178 characters and bylines to 220, so slides differ by more than the
       CSS reserve: the band grew and shrank as it rotated, moving the page under the reader.
       Measure every slide once, at this width, and hold the tallest. The CSS min-height stays
       as the floor for the case where nothing can be measured (an unattached or hidden host).
       Runs while the live region is still 'off', so the measuring pass says nothing aloud. */
    function fitStage() {
      var keep = idx, tallest = 0, i;
      for (i = 0; i < slides.length; i++) {
        idx = i;
        render();
        tallest = Math.max(tallest, live.scrollHeight);
      }
      idx = keep;
      render();
      if (tallest > 0) stage.style.minHeight = tallest + 'px';
    }

    return {
      count: slides.length,
      slides: slides,
      next: function () { go(idx + 1, true); },
      prev: function () { go(idx - 1, true); },
      stop: stop
    };
  }

  /* Deterministic shuffle so a check can assert on it; seed is any integer. Math.imul keeps
     the LCG inside 32 bits: a plain multiply overflowed the 53-bit mantissa and rounded away
     the low bits that j read, so a few records opened far more often than others and one
     never did (final review, 2026-09-06). j scales the whole state instead of a modulus. */
  function shuffle(list, seed) {
    var a = list.slice();
    var s = typeof seed === 'number' ? seed : 1;
    for (var i = a.length - 1; i > 0; i--) {
      s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
      var j = Math.floor((s / 0x80000000) * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function el(tag, cls) {
    var n = window.document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }
  function button(text, label, cls) {
    var b = el('button', cls);
    b.type = 'button';
    if (text) b.textContent = text;
    b.setAttribute('aria-label', label);
    return b;
  }

  window.ProjectSpotlight = {
    mount: mount,
    spotlightItems: spotlightItems,
    leadName: leadName,
    looksLikeName: looksLikeName,
    firstSentence: firstSentence,
    byline: byline
  };
})(typeof window !== 'undefined' ? window : this);
