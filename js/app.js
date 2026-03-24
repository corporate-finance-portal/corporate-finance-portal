/* ============================================
   Corporate Finance v3 — App
   Theme, scroll, reveal, counters, favicon,
   lazy KaTeX / Chart.js
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // ---- 1. Theme Toggle ----
  // Dark by default. Respect prefers-color-scheme ONLY when no saved pref.
  const THEME_KEY = 'cf-theme';

  function currentThemeIsDark() {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr) return attr === 'dark';
    // No explicit attribute — check OS preference, default to dark
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return false;
    return true;
  }

  function applyStoredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) {
      document.documentElement.setAttribute('data-theme', stored);
    }
    // If nothing stored, leave attribute absent — CSS treats :root as dark
  }

  function toggleTheme() {
    const next = currentThemeIsDark() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    updateToggleIcon();
  }

  function createToggleButton() {
    const btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.setAttribute('aria-label', 'Переключить тему оформления');
    btn.type = 'button';
    document.body.appendChild(btn);
    btn.addEventListener('click', toggleTheme);
    return btn;
  }

  let toggleBtn = null;

  function updateToggleIcon() {
    if (!toggleBtn) return;
    const dark = currentThemeIsDark();
    // Sun icon for dark mode (click to go light), moon for light mode
    toggleBtn.innerHTML = dark
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  applyStoredTheme();
  toggleBtn = createToggleButton();
  updateToggleIcon();

  // React to OS preference change when user has no saved preference
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!localStorage.getItem(THEME_KEY)) updateToggleIcon();
  });

  // ---- 2. Scroll Reveal (IntersectionObserver) ----
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length > 0) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    reveals.forEach((el) => revealObserver.observe(el));
  }

  // ---- 3. Smooth Scroll for Anchor Links ----
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.focus({ preventScroll: true });
    }
  });

  // ---- 4. Navbar Scroll Effect ----
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    const handleScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 30);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  // ---- 5. Animated Counters (easeOutQuad + requestAnimationFrame) ----
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length > 0) {
    function easeOutQuad(t) {
      return t * (2 - t);
    }

    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = parseInt(el.dataset.count, 10);
          if (isNaN(target)) return;
          const suffix = el.dataset.suffix || '';
          const duration = 1400;
          const startTime = performance.now();

          function tick(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutQuad(progress);
            el.textContent = Math.round(eased * target) + suffix;
            if (progress < 1) requestAnimationFrame(tick);
          }

          requestAnimationFrame(tick);
          counterObserver.unobserve(el);
        });
      },
      { threshold: 0.3 }
    );
    counters.forEach((el) => counterObserver.observe(el));
  }

  // ---- 6. SVG Favicon (gradient, initials) ----
  if (!document.querySelector('link[rel="icon"]')) {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">' +
      '<defs><linearGradient id="fg" x1="0" y1="0" x2="36" y2="36">' +
      '<stop offset="0%" stop-color="#4F46E5"/>' +
      '<stop offset="50%" stop-color="#7C3AED"/>' +
      '<stop offset="100%" stop-color="#EC4899"/>' +
      '</linearGradient></defs>' +
      '<rect width="36" height="36" rx="8" fill="url(#fg)"/>' +
      '<text x="18" y="25" text-anchor="middle" fill="#fff" ' +
      'font-family="\'Space Grotesk\',system-ui,sans-serif" font-weight="700" font-size="14">' +
      '\u041A\u0424</text></svg>';
    const fav = document.createElement('link');
    fav.rel = 'icon';
    fav.type = 'image/svg+xml';
    fav.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
    document.head.appendChild(fav);
  }

  // ---- 7. Lazy-load KaTeX ----
  // Detect: class .math/.math-block/.katex OR LaTeX delimiters $$...$$ / $x$
  var mainEl = document.getElementById('main-content') || document.body;
  var needsKaTeX = document.querySelector('.math, .math-block, .katex, .box-formula')
    || mainEl.textContent.indexOf('$$') > -1
    || /\$[a-zA-Z\\{]/.test(mainEl.textContent);
  if (needsKaTeX) {
    var katexCSS = document.createElement('link');
    katexCSS.rel = 'stylesheet';
    katexCSS.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
    document.head.appendChild(katexCSS);

    var katexJS = document.createElement('script');
    katexJS.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
    katexJS.onload = function () {
      var autoRender = document.createElement('script');
      autoRender.src =
        'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js';
      autoRender.onload = function () {
        if (typeof renderMathInElement === 'function') {
          renderMathInElement(document.body, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false },
              { left: '\\(', right: '\\)', display: false },
              { left: '\\[', right: '\\]', display: true }
            ],
            throwOnError: false
          });
        }
      };
      document.head.appendChild(autoRender);
    };
    document.head.appendChild(katexJS);
  }

  // ---- 8. Lazy-load Chart.js ----
  if (document.querySelector('canvas.chart')) {
    var chartJS = document.createElement('script');
    chartJS.src = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js';
    chartJS.onload = function () {
      // Dispatch event so page-specific scripts know Chart.js is ready
      document.dispatchEvent(new CustomEvent('chartjs:ready'));
    };
    document.head.appendChild(chartJS);
  }

  // ---- Public API (minimal, no global pollution) ----
  window.CFApp = { toggleTheme: toggleTheme };
});
