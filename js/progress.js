/* ============================================
   Corporate Finance v3 — Progress Tracker
   Tracks visited pages and quiz scores,
   renders badges and progress bars
   ============================================ */
;(function () {
  'use strict';

  var STORAGE_KEY = 'cf-progress';
  var TOTAL_LECTURES = 12;

  // ---- Lecture page patterns (for counting) ----
  var LECTURE_PATTERN = /lectures\/topic-\d+\.html$/;

  // ---- Internal data ----
  var data = load();

  /* ------------------------------------------------
     Storage helpers
     ------------------------------------------------ */

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        return {
          visited: parsed.visited || {},
          quizScores: parsed.quizScores || {}
        };
      }
    } catch (_) { /* corrupted or unavailable */ }
    return { visited: {}, quizScores: {} };
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (_) { /* quota exceeded or unavailable */ }
  }

  function emitUpdate() {
    try {
      document.dispatchEvent(new CustomEvent('progress:updated', {
        detail: getProgress()
      }));
    } catch (_) { /* IE11 fallback not needed for modern site */ }
  }

  /* ------------------------------------------------
     Page path detection
     ------------------------------------------------ */

  /**
   * Extract a relative page path from the current URL.
   * Examples:
   *   /site-v3/lectures/topic-42.html  → lectures/topic-42.html
   *   /lectures/topic-42.html          → lectures/topic-42.html
   *   /site-v3/index.html              → index.html
   *   /site-v3/                        → index.html
   */
  function getCurrentPage() {
    var path = window.location.pathname;

    // Normalize: remove trailing slash, add index.html if needed
    if (path.endsWith('/')) {
      path = path + 'index.html';
    }

    // Split and find meaningful segments
    var segments = path.split('/').filter(Boolean);

    // Known subdirectories of the site
    var knownDirs = ['lectures', 'tools', 'cases', 'assessment', 'data'];

    // Walk from the end to find the relative path
    for (var i = 0; i < segments.length; i++) {
      if (knownDirs.indexOf(segments[i]) !== -1) {
        return segments.slice(i).join('/');
      }
    }

    // If no known dir found, return just the filename
    var last = segments[segments.length - 1] || 'index.html';
    return last;
  }

  /* ------------------------------------------------
     Public API
     ------------------------------------------------ */

  /** Mark a page as visited */
  function markVisited(page) {
    if (!page) return;
    if (data.visited[page]) return; // already tracked
    data.visited[page] = Date.now();
    save();
    emitUpdate();
  }

  /** Check if a page has been visited */
  function isVisited(page) {
    return !!data.visited[page];
  }

  /** Get overall progress stats */
  function getProgress() {
    var visitedPages = Object.keys(data.visited);
    var completedLectures = 0;

    for (var i = 0; i < visitedPages.length; i++) {
      if (LECTURE_PATTERN.test(visitedPages[i])) {
        completedLectures++;
      }
    }

    var percentage = TOTAL_LECTURES > 0
      ? Math.round((completedLectures / TOTAL_LECTURES) * 100)
      : 0;

    return {
      visited: visitedPages,
      totalLectures: TOTAL_LECTURES,
      completedLectures: completedLectures,
      percentage: percentage,
      quizScores: Object.assign({}, data.quizScores)
    };
  }

  /** Save a quiz score */
  function saveQuizScore(quizId, score, total) {
    if (!quizId) return;
    data.quizScores[quizId] = {
      score: score,
      total: total,
      date: Date.now()
    };
    save();
    emitUpdate();
  }

  /** Get the last quiz score for a given quiz */
  function getQuizScore(quizId) {
    return data.quizScores[quizId] || null;
  }

  /* ------------------------------------------------
     Rendering: Progress Badges on catalog pages
     ------------------------------------------------ */

  /**
   * Find all .lecture-card and .case-card elements on the page.
   * If the href they point to has been visited, add .completed class.
   */
  function renderProgressBadges() {
    var cards = document.querySelectorAll('.lecture-card, .case-card');
    if (!cards.length) return;

    // Determine the current directory prefix for resolving relative hrefs
    var currentPage = getCurrentPage();
    var dirPrefix = '';
    var slashIdx = currentPage.lastIndexOf('/');
    if (slashIdx !== -1) {
      dirPrefix = currentPage.substring(0, slashIdx + 1);
    }

    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var href = card.getAttribute('href');
      if (!href) continue;

      // Resolve relative href to a page key
      var resolved = resolveHref(href, dirPrefix);
      if (resolved && isVisited(resolved)) {
        card.classList.add('completed');
      }
    }
  }

  /**
   * Resolve a relative href against the current directory prefix.
   * e.g. href="topic-11.html", dirPrefix="lectures/" → "lectures/topic-11.html"
   * e.g. href="../cases/lukoil.html", dirPrefix="lectures/" → "cases/lukoil.html"
   */
  function resolveHref(href, dirPrefix) {
    // Skip absolute URLs and anchors
    if (href.indexOf('://') !== -1 || href.charAt(0) === '#') return null;

    // Handle ../ prefixes
    var parts = (dirPrefix + href).split('/');
    var resolved = [];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] === '..') {
        resolved.pop();
      } else if (parts[i] !== '.' && parts[i] !== '') {
        resolved.push(parts[i]);
      }
    }
    return resolved.join('/');
  }

  /* ------------------------------------------------
     Rendering: Progress Bar
     ------------------------------------------------ */

  /**
   * Render a progress bar inside the given container.
   * Uses CSS classes from features.css: .progress-tracker, .progress-bar, .progress-fill, etc.
   */
  function renderProgressBar(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var progress = getProgress();

    container.innerHTML =
      '<div class="progress-tracker">' +
        '<div class="progress-header">' +
          '<span class="progress-title">Прогресс курса</span>' +
          '<span class="progress-percentage">' + progress.percentage + '%</span>' +
        '</div>' +
        '<div class="progress-bar">' +
          '<div class="progress-fill" style="width:' + progress.percentage + '%"></div>' +
        '</div>' +
        '<div class="progress-breakdown">' +
          '<span class="breakdown-item">' +
            '<span class="breakdown-dot lectures"></span>' +
            progress.completedLectures + '/' + progress.totalLectures + ' лекций' +
          '</span>' +
          '<span class="breakdown-item">' +
            '<span class="breakdown-dot quizzes"></span>' +
            Object.keys(progress.quizScores).length + ' тестов сдано' +
          '</span>' +
        '</div>' +
      '</div>';
  }

  /* ------------------------------------------------
     Reset (for debugging / testing)
     ------------------------------------------------ */

  function reset() {
    data = { visited: {}, quizScores: {} };
    save();
    emitUpdate();
  }

  /* ------------------------------------------------
     Auto-init on DOMContentLoaded
     ------------------------------------------------ */

  function init() {
    // 1. Mark current page as visited
    var page = getCurrentPage();
    markVisited(page);

    // 2. On catalog pages, render progress badges
    var dataPage = document.body.getAttribute('data-page') || '';
    if (
      dataPage === 'lectures-index' ||
      dataPage === 'cases-index' ||
      dataPage === 'tools-index' ||
      dataPage === 'assessment-index'
    ) {
      renderProgressBadges();
    }

    // 3. Render progress bar if a container exists
    var progressContainer = document.getElementById('progress-widget');
    if (progressContainer) {
      renderProgressBar('progress-widget');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ------------------------------------------------
     Export
     ------------------------------------------------ */

  window.CFProgress = {
    markVisited:          markVisited,
    isVisited:            isVisited,
    getProgress:          getProgress,
    saveQuizScore:        saveQuizScore,
    getQuizScore:         getQuizScore,
    renderProgressBadges: renderProgressBadges,
    renderProgressBar:    renderProgressBar,
    reset:                reset
  };

})();
