/* =========================================================
   ПОРТФОЛИО — поведение страницы
   ========================================================= */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- 1. Шапка ---------- */
  var nav = $('#nav');
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle('is-stuck', window.scrollY > 16);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- 2. Мобильное меню ---------- */
  var burger = $('.burger');
  var mnav   = $('.mnav');
  if (burger && mnav) {
    var closeNav = function () {
      burger.classList.remove('is-open');
      mnav.classList.remove('is-open');
      document.body.style.overflow = '';
      burger.setAttribute('aria-expanded', 'false');
    };
    burger.addEventListener('click', function () {
      var open = !mnav.classList.contains('is-open');
      burger.classList.toggle('is-open', open);
      mnav.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      burger.setAttribute('aria-expanded', String(open));
    });
    $$('a', mnav).forEach(function (a) { a.addEventListener('click', closeNav); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 920) closeNav(); });
  }

  /* ---------- 3. Появление блоков ---------- */
  var rev = $$('.reveal');
  if ('IntersectionObserver' in window && rev.length) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    rev.forEach(function (el) { ro.observe(el); });
  } else {
    rev.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- 4. Счётчики ---------- */
  var counters = $$('[data-count]');
  var runCount = function (el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;
    var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    var suffix = el.getAttribute('data-suffix') || '';
    var prefix = el.getAttribute('data-prefix') || '';
    var t0 = null;
    var dur = 1400;
    var step = function (ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var v = target * eased;
      el.textContent = prefix + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('ru-RU')) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window && counters.length) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { runCount(e.target); co.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { co.observe(el); });
  } else {
    counters.forEach(runCount);
  }

  /* ---------- 5. Аккордеон ---------- */
  $$('.acc').forEach(function (acc) {
    $$('.acc__btn', acc).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.acc__item');
        var panel = item.querySelector('.acc__panel');
        var open = item.classList.contains('is-open');
        $$('.acc__item', acc).forEach(function (other) {
          if (other !== item) {
            other.classList.remove('is-open');
            other.querySelector('.acc__panel').style.height = '0px';
          }
        });
        item.classList.toggle('is-open', !open);
        panel.style.height = open ? '0px' : panel.scrollHeight + 'px';
      });
    });
  });
  window.addEventListener('resize', function () {
    $$('.acc__item.is-open .acc__panel').forEach(function (p) { p.style.height = p.scrollHeight + 'px'; });
  });

  /* ---------- 6. Живые превью лендингов ---------- */
  var views = $$('.browser__view');

  var layout = function (view) {
    var stage = view.closest('[data-switch-stage]');
    var mode = stage && stage.dataset.mode ? stage.dataset.mode : 'desktop';
    view.dataset.mode = mode;

    var vw = view.clientWidth;
    var vh = view.clientHeight;
    if (!vw || !vh) return;

    var fw, fh, s, tx, ty;
    if (mode === 'mobile') {
      fw = 390; fh = 844;
      s = Math.min(vw / fw, vh / fh) * 0.94;
      tx = (vw - fw * s) / 2;
      ty = (vh - fh * s) / 2;
    } else {
      fw = parseInt(view.getAttribute('data-frame-w'), 10) || 1440;
      fh = parseInt(view.getAttribute('data-frame-h'), 10) || 900;
      s = vw / fw;
      tx = 0; ty = 0;
    }
    view.style.setProperty('--fw', fw);
    view.style.setProperty('--fh', fh);
    view.style.setProperty('--s', s);
    view.style.setProperty('--tx', tx + 'px');
    view.style.setProperty('--ty', ty + 'px');
  };

  var mount = function (view) {
    if (view.dataset.mounted) return;
    var src = view.getAttribute('data-frame');
    if (!src) return;
    view.dataset.mounted = '1';

    var f = document.createElement('iframe');
    f.setAttribute('title', 'Превью лендинга');
    f.setAttribute('loading', 'lazy');
    f.setAttribute('scrolling', 'no');
    f.style.pointerEvents = 'none';   /* чтобы случайный клик не уводил с портфолио */
    f.src = src;
    f.addEventListener('load', function () {
      view.classList.add('is-ready');
    });
    view.appendChild(f);
    layout(view);
  };

  if ('IntersectionObserver' in window && views.length) {
    var vo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { mount(e.target); vo.unobserve(e.target); }
      });
    }, { rootMargin: '260px 0px' });
    views.forEach(function (v) { vo.observe(v); });
  } else {
    views.forEach(mount);
  }

  views.forEach(function (v) { layout(v); });

  if ('ResizeObserver' in window) {
    var rsz = new ResizeObserver(function (entries) {
      entries.forEach(function (e) { layout(e.target); });
    });
    views.forEach(function (v) { rsz.observe(v); });
  } else {
    window.addEventListener('resize', function () { views.forEach(layout); });
  }

  /* ---------- 7. Переключатель ПК / телефон ---------- */
  $$('[data-switch]').forEach(function (box) {
    var stage = box.parentElement.querySelector('[data-switch-stage]');
    if (!stage) return;
    $$('[data-switch-btn]', box).forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('[data-switch-btn]', box).forEach(function (x) { x.classList.remove('is-on'); });
        btn.classList.add('is-on');
        stage.dataset.mode = btn.getAttribute('data-switch-btn');
        layout(stage.querySelector('.browser__view'));
      });
    });
  });

  /* ---------- 8. Плавная прокрутка ---------- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      var t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      window.scrollTo({
        top: t.getBoundingClientRect().top + window.scrollY - 78,
        behavior: 'smooth'
      });
    });
  });

  /* ---------- 9. Год ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();