/* =========================================================
   Общий скрипт для лендингов: шапка, меню, аккордеон,
   счётчики, появление блоков, формы, бегущая строка.
   ========================================================= */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- 1. Шапка: залипание ---------- */
  var hdr = $('.hdr');
  if (hdr) {
    var onScroll = function () {
      hdr.classList.toggle('is-stuck', window.scrollY > 12);
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
      document.body.classList.remove('is-locked');
      burger.setAttribute('aria-expanded', 'false');
    };
    burger.addEventListener('click', function () {
      var open = !mnav.classList.contains('is-open');
      burger.classList.toggle('is-open', open);
      mnav.classList.toggle('is-open', open);
      document.body.classList.toggle('is-locked', open);
      burger.setAttribute('aria-expanded', String(open));
    });
    $$('a', mnav).forEach(function (a) { a.addEventListener('click', closeNav); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 860) closeNav(); });
  }

  /* ---------- 3. Появление блоков ---------- */
  var revealables = $$('.reveal');
  if ('IntersectionObserver' in window && revealables.length) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealables.forEach(function (el) { ro.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- 4. Счётчики ---------- */
  var counters = $$('[data-count]');
  var runCount = function (el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;
    var dec = (el.getAttribute('data-dec') | 0);
    var suffix = el.getAttribute('data-suffix') || '';
    var prefix = el.getAttribute('data-prefix') || '';
    var dur = 1500;
    var t0 = null;
    var step = function (ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = target * eased;
      el.textContent = prefix + (dec ? val.toFixed(dec) : Math.round(val).toLocaleString('ru-RU')) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window && counters.length) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { runCount(e.target); co.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
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

        // закрываем остальные (режим «одного открытого»)
        $$('.acc__item', acc).forEach(function (other) {
          if (other !== item) {
            other.classList.remove('is-open');
            other.querySelector('.acc__panel').style.height = '0px';
          }
        });

        item.classList.toggle('is-open', !open);
        if (!open) {
          panel.style.height = panel.scrollHeight + 'px';
        } else {
          panel.style.height = '0px';
        }
      });
    });
  });
  window.addEventListener('resize', function () {
    $$('.acc__item.is-open .acc__panel').forEach(function (p) { p.style.height = p.scrollHeight + 'px'; });
  });

  /* ---------- 6. Формы (демо-отправка) ---------- */
  $$('form[data-demo-form]').forEach(function (form) {
    form.setAttribute('novalidate', 'novalidate');
    var ok = document.getElementById(form.getAttribute('data-ok')) || null;

    var validators = {
      phone: function (v) { return v.replace(/\D/g, '').length >= 10; },
      name:  function (v) { return v.trim().length >= 2; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[a-zа-я]{2,}$/i.test(v.trim()); },
      agree: function (v, input) { return input.checked; }
    };

    var validate = function (input) {
      var rule = validators[input.getAttribute('data-rule')];
      var wrap = input.closest('.field');
      var err = wrap ? wrap.querySelector('.field__err') : null;
      var okv = !rule || rule(input.value || '', input);
      input.classList.toggle('is-error', !okv);
      if (err) err.textContent = okv ? '' : (input.getAttribute('data-err') || 'Проверьте это поле');
      return okv;
    };

    $$('input, textarea, select', form).forEach(function (input) {
      input.addEventListener('blur', function () {
        if (input.value || input.type === 'checkbox') validate(input);
      });
      input.addEventListener('input', function () {
        if (input.classList.contains('is-error')) validate(input);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;
      $$('input, textarea, select', form).forEach(function (input) {
        if (input.type === 'hidden' || input.type === 'submit') return;
        if (!validate(input)) valid = false;
      });
      if (!valid) {
        var firstErr = form.querySelector('.is-error');
        if (firstErr) firstErr.focus();
        return;
      }

      var btn = form.querySelector('[type="submit"]');
      var html = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.innerHTML = 'Отправляем…'; }

      setTimeout(function () {
        if (btn) { btn.disabled = false; btn.innerHTML = html; }
        if (ok) {
          ok.classList.add('is-on');
          ok.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        form.reset();
        $$('.is-error', form).forEach(function (f) { f.classList.remove('is-error'); });
      }, 750);
    });
  });

  /* ---------- 7. Маска телефона ---------- */
  $$('input[data-mask="phone"]').forEach(function (input) {
    input.addEventListener('input', function () {
      var d = input.value.replace(/\D/g, '');
      if (d[0] === '8') d = '7' + d.slice(1);
      if (d[0] !== '7') d = '7' + d;
      d = d.slice(0, 11);
      var out = '+7';
      if (d.length > 1) out += ' (' + d.slice(1, 4);
      if (d.length >= 5) out += ') ' + d.slice(4, 7);
      if (d.length >= 8) out += '-' + d.slice(7, 9);
      if (d.length >= 10) out += '-' + d.slice(9, 11);
      input.value = out;
    });
    input.addEventListener('focus', function () { if (!input.value) input.value = '+7 ('; });
  });

  /* ---------- 8. Мобильная CTA ---------- */
  var mcta = $('.mcta');
  if (mcta && $('.ftr')) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { mcta.classList.toggle('is-on', !e.isIntersecting); });
    }, { threshold: 0 }).observe($('.ftr'));
  }

  /* ---------- 9. Бегущая строка: дублируем для бесшовности ---------- */
  $$('.marquee__track').forEach(function (track) {
    track.innerHTML += track.innerHTML;
  });

  /* ---------- 10. Год в подвале ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- 11. Плавная прокрутка ---------- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });

  /* ---------- 12. Переключатель превью (десктоп/мобайл) ---------- */
  $$('[data-switch]').forEach(function (box) {
    $$('[data-switch-btn]', box).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-switch-btn]', box).forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
        var stage = $('[data-switch-stage]', box);
        if (stage) stage.setAttribute('data-mode', b.getAttribute('data-switch-btn'));
      });
    });
  });

  /* ---------- 13. Слайдер отзывов (простая карусель) ---------- */
  $$('[data-slider]').forEach(function (slider) {
    var track = $('[data-slider-track]', slider);
    if (!track) return;
    var prev = $('[data-slider-prev]', slider);
    var next = $('[data-slider-next]', slider);
    var step = function () {
      var card = track.firstElementChild;
      if (!card) return 1;
      return card.getBoundingClientRect().width + 22;
    };
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
  });
})();