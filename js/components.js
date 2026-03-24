/* ============================================
   Corporate Finance v3 — Shared Components
   Nav, footer, hamburger, skip-link injection
   ============================================ */

(function () {
  'use strict';

  // ---- Path prefix based on depth ----
  // data-depth="0" on <body> → root pages (index.html, about.html)
  // data-depth="1" on <body> → subfolder pages (lectures/topic-42.html)
  var depth = parseInt(document.body.getAttribute('data-depth') || '0', 10);
  var prefix = depth === 0 ? '' : '../';

  // ---- Active page detection ----
  var pathname = window.location.pathname;
  var segments = pathname.split('/').filter(Boolean);
  var pageName = segments[segments.length - 1] || 'index.html';
  var section = segments.length >= 2 ? segments[segments.length - 2] : '';

  function isActive(href) {
    // Root index
    if (href === 'index.html') {
      if (pageName === 'index.html' || pathname.endsWith('/')) {
        return section === '' || section === 'site-v3';
      }
      return false;
    }
    // Section directories (e.g. "lectures/")
    if (href.endsWith('/')) {
      return section === href.replace('/', '');
    }
    // Exact file match
    return pageName === href;
  }

  // ---- Navigation items ----
  var navItems = [
    { href: 'index.html',    label: 'Главная' },
    { href: 'about.html',    label: 'О курсе' },
    { href: 'syllabus.html', label: 'Программа' },
    { href: 'lectures/',     label: 'Лекции' },
    { href: 'tools/',        label: 'Инструменты' },
    { href: 'cases/',        label: 'Кейсы' },
    { href: 'assessment/',   label: 'Тесты' },
    { href: 'glossary.html', label: 'Глоссарий' },
    { href: 'resources.html',label: 'Ресурсы' }
  ];

  // ---- Build navigation HTML ----
  var navTarget = document.getElementById('site-nav');

  if (navTarget) {
    var linksHTML = navItems.map(function (item) {
      var cls = isActive(item.href) ? ' class="active"' : '';
      return '<li><a href="' + prefix + item.href + '"' + cls + '>' + item.label + '</a></li>';
    }).join('\n            ');

    navTarget.innerHTML =
      '<a href="#main-content" class="skip-link">Перейти к содержимому</a>' +
      '<div class="top-bar" role="presentation"></div>' +
      '<nav class="navbar" role="navigation" aria-label="Основная навигация">' +
        '<div class="container">' +
          '<a href="' + prefix + 'index.html" class="nav-logo" aria-label="На главную">' +
            '<span class="logo-dot" aria-hidden="true"></span>' +
            '<span>CorpFinance</span>' +
          '</a>' +
          '<ul class="nav-links" id="nav-links" role="menubar">' +
            linksHTML +
          '</ul>' +
          '<div class="nav-actions">' +
            '<a href="' + prefix + 'tools/" class="nav-cta">Калькуляторы</a>' +
            '<button class="hamburger" type="button" ' +
              'aria-label="Открыть меню" aria-expanded="false" aria-controls="nav-links">' +
              '<span></span><span></span><span></span>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</nav>';

    // ---- Hamburger toggle ----
    var hamburger = navTarget.querySelector('.hamburger');
    var navLinks = navTarget.querySelector('.nav-links');

    if (hamburger && navLinks) {
      hamburger.addEventListener('click', function () {
        var isOpen = hamburger.classList.toggle('open');
        navLinks.classList.toggle('open', isOpen);
        hamburger.setAttribute('aria-expanded', String(isOpen));
        hamburger.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
      });

      // Close on nav link click (mobile)
      navLinks.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          hamburger.classList.remove('open');
          navLinks.classList.remove('open');
          hamburger.setAttribute('aria-expanded', 'false');
          hamburger.setAttribute('aria-label', 'Открыть меню');
        });
      });

      // Close on Escape key
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && navLinks.classList.contains('open')) {
          hamburger.classList.remove('open');
          navLinks.classList.remove('open');
          hamburger.setAttribute('aria-expanded', 'false');
          hamburger.setAttribute('aria-label', 'Открыть меню');
          hamburger.focus();
        }
      });
    }
  }

  // ---- Build footer HTML ----
  var footerTarget = document.getElementById('site-footer');

  if (footerTarget) {
    footerTarget.innerHTML =
      '<footer class="footer" role="contentinfo">' +
        '<div class="container">' +
          '<div class="footer-brand">' +
            '<span class="logo-dot" aria-hidden="true"></span>' +
            '<span>CorpFinance</span>' +
          '</div>' +
          '<div class="footer-info">' +
            '<p>&copy; 2026 Шохин А.А. &middot; ' +
            'Университет &laquo;Синергия&raquo; &middot; ' +
            'Педагогическая практика</p>' +
          '</div>' +
        '</div>' +
      '</footer>';
  }
})();
