/* Portfolio interactions — no dependencies. Everything here is progressive enhancement:
   the site is fully readable and navigable without it. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var safe = function (fn) { try { return fn(); } catch (e) { return null; } };

  /* ---- Opening the build output straight from disk (file://): directory links need index.html ---- */
  if (location.protocol === 'file:') {
    doc.querySelectorAll('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (/^(https?:|mailto:|tel:|#)/.test(h)) return;
      var parts = h.split('#');
      if (/\/$/.test(parts[0]) || parts[0] === '') parts[0] += (parts[0] === '' ? '' : 'index.html');
      a.setAttribute('href', parts.join('#'));
    });
  }

  /* ---- Theme toggle (initial theme is set by an inline script in <head> to avoid a flash) ---- */
  var toggle = doc.querySelector('.theme-toggle');
  function syncThemeUi() {
    var t = root.getAttribute('data-theme');
    if (toggle) toggle.setAttribute('aria-label', t === 'dark' ? toggle.dataset.toLight : toggle.dataset.toDark);
    var m = doc.getElementById('meta-theme');
    if (m) m.content = t === 'light' ? '#F7F8F2' : '#081529';
  }
  syncThemeUi();
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      safe(function () { localStorage.setItem('theme', next); });
      syncThemeUi();
    });
  }
  // Follow the system when no manual choice has been stored.
  var mq = window.matchMedia('(prefers-color-scheme: light)');
  var onScheme = function () {
    if (safe(function () { return localStorage.getItem('theme'); })) return;
    root.setAttribute('data-theme', mq.matches ? 'light' : 'dark');
    syncThemeUi();
  };
  mq.addEventListener ? mq.addEventListener('change', onScheme) : mq.addListener(onScheme);

  /* ---- Language: remember the explicit choice ---- */
  doc.querySelectorAll('.lang-opt').forEach(function (a) {
    a.addEventListener('click', function () {
      safe(function () { localStorage.setItem('lang', a.dataset.lang); sessionStorage.setItem('lang-redirected', '1'); });
    });
  });

  /* ---- Header: border appears once content scrolls under it ---- */
  var header = doc.querySelector('.site-header');
  var onScroll = function () { header.setAttribute('data-scrolled', window.scrollY > 8 ? 'true' : 'false'); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- Active tab indicator: slides from the previous page's tab to the current one ---- */
  var nav = doc.querySelector('.nav');
  var active = nav && nav.querySelector('.nav-link.is-active');
  var tabsMq = window.matchMedia('(min-width: 1240px)');
  function place(animate) {
    if (!nav) return;
    if (!active || !tabsMq.matches) { nav.style.setProperty('--io', '0'); return; }
    var x = active.offsetLeft, w = active.offsetWidth;
    var inset = 12; // underline is slightly shorter than the label box
    nav.style.setProperty('--ix', (x + inset) + 'px');
    nav.style.setProperty('--iw', Math.max(0, w - inset * 2) + 'px');
    nav.style.setProperty('--io', '1');
    return { x: x + inset, w: w - inset * 2 };
  }
  function initIndicator() {
    if (!nav) return;
    var prev = safe(function () { return JSON.parse(sessionStorage.getItem('nav-ind')); });
    var indicator = nav.querySelector('.nav-indicator');
    if (prev && tabsMq.matches && active && !reduceMotion.matches && indicator) {
      indicator.style.transition = 'none';
      nav.style.setProperty('--ix', prev.x + 'px');
      nav.style.setProperty('--iw', prev.w + 'px');
      nav.style.setProperty('--io', '1');
      void indicator.offsetWidth;
      indicator.style.transition = '';
    }
    place();
  }
  initIndicator();
  window.addEventListener('resize', function () { place(); });
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { place(); });
  window.addEventListener('pagehide', function () {
    var cur = place();
    if (cur) safe(function () { sessionStorage.setItem('nav-ind', JSON.stringify(cur)); });
  });
  // Remember where the tab bar *is going* so the next page can start from the current tab.
  if (nav) nav.querySelectorAll('.nav-link').forEach(function (a) {
    a.addEventListener('click', function () {
      if (!tabsMq.matches) return;
      var cur = { x: active ? active.offsetLeft + 12 : 0, w: active ? active.offsetWidth - 24 : 0 };
      if (active) safe(function () { sessionStorage.setItem('nav-ind', JSON.stringify(cur)); });
    });
  });

  /* ---- Mobile / tablet menu ---- */
  var btn = doc.querySelector('.menu-btn');
  var scrim = doc.querySelector('.nav-scrim');
  var menuMq = window.matchMedia('(max-width: 1239px)');
  function isOpen() { return header.classList.contains('nav-open'); }
  function setOpen(open, viaKeyboard) {
    header.classList.toggle('nav-open', open);
    doc.body.classList.toggle('nav-lock', open && menuMq.matches);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? btn.dataset.close : btn.dataset.open);
    if (open) nav.removeAttribute('inert');
    if (open && viaKeyboard) {
      var first = nav.querySelector('.nav-link');
      if (first) first.focus();
    }
  }
  function syncInert() {
    if (!nav) return;
    if (menuMq.matches && !isOpen()) nav.setAttribute('inert', ''); else nav.removeAttribute('inert');
  }
  if (btn && nav) {
    syncInert();
    btn.addEventListener('click', function (e) { setOpen(!isOpen(), e.detail === 0); syncInert(); });
    if (scrim) scrim.addEventListener('click', function () { setOpen(false); syncInert(); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) { setOpen(false); } });
    doc.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { setOpen(false); syncInert(); btn.focus(); return; }
      if (e.key === 'Tab') {
        var f = Array.prototype.filter.call(header.querySelectorAll('a[href], button'), function (el) { return el.offsetParent !== null || el === btn; });
        var firstEl = f[0], last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === firstEl) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); firstEl.focus(); }
      }
    });
    var onMenuMq = function () { if (!menuMq.matches) setOpen(false); syncInert(); place(); };
    menuMq.addEventListener ? menuMq.addEventListener('change', onMenuMq) : menuMq.addListener(onMenuMq);
    // inert is applied after the closing animation so it can play out
    btn.addEventListener('click', function () { if (!isOpen()) setTimeout(syncInert, 520); });
  }

  /* ---- Copy to clipboard with a discreet confirmation ---- */
  var toast = doc.querySelector('.toast');
  var toastTimer;
  function say(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
  }
  function legacyCopy(text) {
    var ta = doc.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    doc.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
    doc.body.removeChild(ta);
    return ok;
  }
  doc.querySelectorAll('[data-copy]').forEach(function (el) {
    el.addEventListener('click', function () {
      var text = el.dataset.copy;
      var done = function (ok) {
        if (ok) {
          say(el.dataset.done);
          el.classList.add('is-done');
          setTimeout(function () { el.classList.remove('is-done'); }, 1800);
        } else say(el.dataset.fail);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(legacyCopy(text)); });
      } else done(legacyCopy(text));
    });
  });

  /* ---- Scroll reveal ---- */
  var items = doc.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduceMotion.matches) {
    items.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    items.forEach(function (el) { io.observe(el); });
    // Safety net: never leave content hidden.
    setTimeout(function () { items.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < window.innerHeight) el.classList.add('in'); }); }, 1200);
  }
  reduceMotion.addEventListener && reduceMotion.addEventListener('change', function () {
    if (reduceMotion.matches) items.forEach(function (el) { el.classList.add('in'); });
  });
})();
