/* ============================================
   Corporate Finance v3 — Global Search
   Ctrl+K / Cmd+K fuzzy search via Fuse.js,
   modal overlay with keyboard navigation
   ============================================ */
;(function () {
  'use strict';

  var FUSE_CDN = 'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js';
  var INDEX_FILE = 'data/search-index.json';

  var fuse = null;
  var searchIndex = null;
  var overlay = null;
  var input = null;
  var resultsList = null;
  var activeIdx = -1;
  var isOpen = false;

  // ---- Type labels for display ----
  var TYPE_LABELS = {
    page:    '\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430',
    lecture: '\u041B\u0435\u043A\u0446\u0438\u044F',
    tool:    '\u0418\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442',
    'case':  '\u041A\u0435\u0439\u0441',
    quiz:    '\u0422\u0435\u0441\u0442'
  };

  /* ------------------------------------------------
     Depth-aware path resolution
     ------------------------------------------------ */

  function getPrefix() {
    var depth = parseInt(document.body.getAttribute('data-depth') || '0', 10);
    return depth === 0 ? '' : '../';
  }

  /* ------------------------------------------------
     Lazy-load Fuse.js
     ------------------------------------------------ */

  function loadFuse(callback) {
    if (typeof Fuse !== 'undefined') return callback();

    var script = document.createElement('script');
    script.src = FUSE_CDN;
    script.onload = callback;
    script.onerror = function () {
      console.warn('[CFSearch] Failed to load Fuse.js');
    };
    document.head.appendChild(script);
  }

  /* ------------------------------------------------
     Load search index JSON
     ------------------------------------------------ */

  function loadIndex(callback) {
    if (searchIndex) return callback(searchIndex);

    var url = getPrefix() + INDEX_FILE;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200 || xhr.status === 0) {
        try {
          searchIndex = JSON.parse(xhr.responseText);
          callback(searchIndex);
        } catch (e) {
          console.warn('[CFSearch] Invalid search index JSON');
        }
      } else {
        console.warn('[CFSearch] Failed to load search index:', xhr.status);
      }
    };
    xhr.send();
  }

  /* ------------------------------------------------
     Initialize Fuse instance
     ------------------------------------------------ */

  function initFuse(callback) {
    loadFuse(function () {
      loadIndex(function (index) {
        fuse = new Fuse(index, {
          keys: [
            { name: 'title',    weight: 0.5 },
            { name: 'keywords', weight: 0.3 },
            { name: 'section',  weight: 0.2 }
          ],
          threshold: 0.4,
          includeScore: true,
          minMatchCharLength: 2
        });
        if (callback) callback();
      });
    });
  }

  /* ------------------------------------------------
     Build and inject the modal HTML
     ------------------------------------------------ */

  function createModal() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.className = 'search-modal';
    overlay.id = 'search-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u0441\u0430\u0439\u0442\u0443');

    overlay.innerHTML =
      '<div class="search-dialog">' +
        '<div class="search-input-wrapper">' +
          '<svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
          '</svg>' +
          '<input type="search" class="search-input" placeholder="\u041F\u043E\u0438\u0441\u043A \u043B\u0435\u043A\u0446\u0438\u0439, \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u043E\u0432, \u043A\u0435\u0439\u0441\u043E\u0432..." autocomplete="off" spellcheck="false">' +
          '<kbd class="search-close">Esc</kbd>' +
        '</div>' +
        '<div class="search-results" role="listbox" id="search-results"></div>' +
        '<div class="search-footer">' +
          '<span><kbd class="kbd">\u2191\u2193</kbd> \u043D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044F</span>' +
          '<span><kbd class="kbd">\u21B5</kbd> \u043E\u0442\u043A\u0440\u044B\u0442\u044C</span>' +
          '<span><kbd class="kbd">Esc</kbd> \u0437\u0430\u043A\u0440\u044B\u0442\u044C</span>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    input = overlay.querySelector('.search-input');
    resultsList = overlay.querySelector('.search-results');

    // ---- Event listeners ----

    // Close on overlay background click
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    // Close on Esc kbd click
    overlay.querySelector('.search-close').addEventListener('click', close);

    // Input handler with debounce
    var debounceTimer = null;
    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(doSearch, 150);
    });

    // Keyboard navigation inside the modal
    input.addEventListener('keydown', function (e) {
      var results = resultsList.querySelectorAll('.search-result');
      var count = results.length;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdx = (activeIdx + 1) % count;
        highlightResult(results);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdx = (activeIdx - 1 + count) % count;
        highlightResult(results);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIdx >= 0 && activeIdx < count) {
          results[activeIdx].click();
        }
      }
    });
  }

  /* ------------------------------------------------
     Search execution
     ------------------------------------------------ */

  function doSearch() {
    if (!input || !resultsList) return;
    var query = input.value.trim();
    activeIdx = -1;

    if (!query || query.length < 2) {
      resultsList.innerHTML = '';
      return;
    }

    if (!fuse) {
      resultsList.innerHTML =
        '<div class="search-empty">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0438\u043D\u0434\u0435\u043A\u0441\u0430...</div>';
      initFuse(function () { doSearch(); });
      return;
    }

    var results = fuse.search(query, { limit: 10 });

    if (results.length === 0) {
      resultsList.innerHTML =
        '<div class="search-empty">\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u043F\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0443 \u00AB' +
        escapeHtml(query) + '\u00BB</div>';
      return;
    }

    var prefix = getPrefix();
    var html = results.map(function (r, i) {
      var item = r.item;
      var typeLabel = TYPE_LABELS[item.type] || item.type;
      var sectionText = item.section ? ' \u2014 ' + escapeHtml(item.section) : '';

      return '<a class="search-result' + (i === 0 ? ' active' : '') + '" ' +
        'href="' + prefix + item.url + '" role="option">' +
        '<div class="result-text">' +
          '<div class="result-title">' + escapeHtml(item.title) + '</div>' +
          '<div class="result-type">' + typeLabel + sectionText + '</div>' +
        '</div>' +
        '<span class="result-action">\u21B5</span>' +
      '</a>';
    }).join('');

    resultsList.innerHTML = html;
    activeIdx = 0;
  }

  /* ------------------------------------------------
     Highlight active result
     ------------------------------------------------ */

  function highlightResult(results) {
    for (var i = 0; i < results.length; i++) {
      results[i].classList.toggle('active', i === activeIdx);
    }
    // Scroll active into view
    if (activeIdx >= 0 && results[activeIdx]) {
      results[activeIdx].scrollIntoView({ block: 'nearest' });
    }
  }

  /* ------------------------------------------------
     Open / Close
     ------------------------------------------------ */

  function open() {
    if (isOpen) return;
    createModal();
    isOpen = true;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    input.value = '';
    resultsList.innerHTML = '';
    activeIdx = -1;

    // Focus input after transition
    setTimeout(function () { input.focus(); }, 50);

    // Pre-load Fuse + index
    if (!fuse) initFuse();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    activeIdx = -1;
  }

  /* ------------------------------------------------
     Utility
     ------------------------------------------------ */

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ------------------------------------------------
     Global keyboard shortcut: Ctrl+K / Cmd+K
     ------------------------------------------------ */

  document.addEventListener('keydown', function (e) {
    // Ctrl+K or Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (isOpen) {
        close();
      } else {
        open();
      }
      return;
    }

    // Escape to close
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      close();
    }
  });

  /* ------------------------------------------------
     Export
     ------------------------------------------------ */

  window.CFSearch = {
    open:  open,
    close: close
  };

})();
