(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Theme: the head script already set data-theme. This keeps the toggle,
     the browser bar colour, and the saved choice in sync. */
  var toggle = document.querySelector('.theme-toggle');
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#060908' : '#f3f6f5');
    if (toggle) toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  function savedTheme() {
    try { return localStorage.getItem('theme'); } catch (e) { return null; }
  }

  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      /* Fade colours across instead of snapping. */
      if (!reduce) {
        root.classList.add('theme-fade');
        setTimeout(function () { root.classList.remove('theme-fade'); }, 600);
      }
      applyTheme(next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }
  /* Follow system changes until the visitor picks a theme themselves. */
  if (systemDark.addEventListener) {
    systemDark.addEventListener('change', function (e) {
      if (!savedTheme()) applyTheme(e.matches ? 'dark' : 'light');
    });
  }

  /* Stories carousel: arrows scroll one card; disabled at either end. */
  var track = document.getElementById('story-track');
  var arrows = document.querySelectorAll('.arrow');
  if (track) {
    var step = function () {
      var card = track.querySelector('.card');
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card ? card.getBoundingClientRect().width + gap : track.clientWidth;
    };
    var updateArrows = function () {
      var max = track.scrollWidth - track.clientWidth - 1;
      arrows.forEach(function (a) {
        a.disabled = a.dataset.dir === '-1' ? track.scrollLeft <= 0 : track.scrollLeft >= max;
      });
    };
    arrows.forEach(function (a) {
      a.addEventListener('click', function () {
        track.scrollBy({ left: Number(a.dataset.dir) * step(), behavior: reduce ? 'auto' : 'smooth' });
      });
    });
    /* Page dots (phones): one per card, the nearest one lit. */
    var dotsBox = document.getElementById('story-dots');
    var cards = track.querySelectorAll('.card');
    var dots = [];
    if (dotsBox) {
      cards.forEach(function () { dots.push(dotsBox.appendChild(document.createElement('i'))); });
    }
    var updateDots = function () {
      if (!dots.length) return;
      var max = track.scrollWidth - track.clientWidth;
      var on = max > 0 && track.scrollLeft >= max - 2 ? dots.length - 1 : Math.round(track.scrollLeft / step());
      dots.forEach(function (d, i) { d.classList.toggle('is-on', i === on); });
    };
    var onTrack = function () { updateArrows(); updateDots(); };
    track.addEventListener('scroll', onTrack, { passive: true });
    window.addEventListener('resize', onTrack);
    onTrack();
  }

  /* Hero mouths lean away from the pointer a little (mouse only). */
  var floaters = document.querySelector('.floaters');
  if (floaters && !reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('pointermove', function (e) {
      floaters.style.setProperty('--mx', (e.clientX / window.innerWidth - 0.5).toFixed(3));
      floaters.style.setProperty('--my', (e.clientY / window.innerHeight - 0.5).toFixed(3));
    }, { passive: true });
  }

  /* Phones: the download bar shows while neither big download button is on screen. */
  var dock = document.getElementById('dock');
  var ctas = document.querySelectorAll('#hero-cta, #closing-cta');
  if (dock && ctas.length && 'IntersectionObserver' in window) {
    var seen = new Set();
    var dockLink = dock.querySelector('a');
    var dio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target);
      });
      var up = seen.size === 0;
      dock.classList.toggle('is-up', up);
      if (dockLink) dockLink.tabIndex = up ? 0 : -1;
    });
    ctas.forEach(function (c) { dio.observe(c); });
  }

  /* Scroll reveal: elements with .reveal fade up once. Children of [data-stagger] follow one by one. */
  var revealTargets = document.querySelectorAll('.reveal, [data-stagger]');
  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (child, i) {
      child.style.setProperty('--i', i);
    });
  });
  function revealIn(el) {
    el.classList.add('is-in');
    if (el.classList.contains('reveal')) {
      /* Once the move finishes, drop the reveal styles so hover effects aren't delayed. */
      el.addEventListener('transitionend', function done(ev) {
        if (ev.target !== el || ev.propertyName !== 'transform') return;
        el.removeEventListener('transitionend', done);
        el.classList.remove('reveal', 'reveal--scale', 'is-in');
      });
    }
  }
  if (reduce || !('IntersectionObserver' in window)) {
    revealTargets.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          revealIn(e.target);
          rio.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach(function (el) { rio.observe(el); });
  }

  /* Nav gets a frosted look once the page scrolls. */
  var nav = document.querySelector('.nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* Reveal animations (level gauge): start once scrolled into view. */
  var gauges = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    gauges.forEach(function (g) { g.classList.add('is-visible'); });
  } else {
    var gio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          gio.unobserve(e.target);
        }
      });
    }, { threshold: 0.25 });
    gauges.forEach(function (g) { gio.observe(g); });
  }

  /* Photos: if a file isn't there yet, show its shot brief instead of a broken image. */
  document.querySelectorAll('.photo img').forEach(function (img) {
    function missing() { img.parentElement.classList.add('is-missing'); }
    if (img.complete && img.naturalWidth === 0) missing();
    else img.addEventListener('error', missing);
  });

  /* Videos: play only while on screen (saves battery and data).
     With reduced motion, they stay paused and get controls. */
  var videos = document.querySelectorAll('.phone video');
  /* The phone shows a drawn call until a real recording has loaded over it. */
  videos.forEach(function (v) {
    var phone = v.closest('.phone');
    function ready() { if (phone) phone.classList.add('has-video'); }
    if (v.readyState >= 2) ready(); else v.addEventListener('loadeddata', ready);
  });
  if (reduce) {
    videos.forEach(function (v) { v.pause(); v.controls = true; });
  } else if (!('IntersectionObserver' in window)) {
    videos.forEach(function (v) { v.play().catch(function () {}); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) e.target.play().catch(function () {});
        else e.target.pause();
      });
    }, { threshold: 0.25 });
    videos.forEach(function (v) { io.observe(v); });
  }
})();
