/* ============================================
   Corporate Finance v3 — Утилиты
   Квиз-движок, финансовые калькуляторы,
   Chart.js обёртки, форматирование, глоссарий
   ============================================ */
;(function () {
  'use strict';

  /* ------------------------------------------------
     1. QUIZ ENGINE
     ------------------------------------------------ */

  /**
   * Рендерит интерактивный квиз в указанный контейнер.
   * @param {string} containerId  — id контейнера для вопросов
   * @param {Array}  questions    — [{text, options:[], correct:int, explanation}]
   * @param {string} scoreBoxId   — id блока с результатом
   */
  function renderQuiz(containerId, questions, scoreBoxId) {
    var container = document.getElementById(containerId);
    var scoreBox  = document.getElementById(scoreBoxId);
    if (!container || !questions.length) return;

    var answered = 0;
    var correct  = 0;
    // Уникальный id квиза для localStorage
    var quizId = containerId;

    // Генерируем HTML вопросов
    container.innerHTML = questions.map(function (q, qi) {
      var opts = q.options.map(function (opt, oi) {
        return '<label class="quiz-option" data-q="' + qi + '" data-o="' + oi + '">' +
          '<input type="radio" name="q' + qi + '" value="' + oi + '" aria-label="' + opt + '">' +
          '<span>' + opt + '</span></label>';
      }).join('');

      var expl = q.explanation
        ? '<div class="quiz-explanation" id="expl-' + qi + '">' + q.explanation + '</div>'
        : '';

      return '<div class="quiz-question" id="qq-' + qi + '">' +
        '<div class="quiz-question-header">' +
          '<span class="quiz-num">' + (qi + 1) + '/' + questions.length + '</span>' +
          '<span class="quiz-text">' + q.text + '</span>' +
        '</div>' +
        '<div class="quiz-options">' + opts + '</div>' + expl +
      '</div>';
    }).join('');

    // Делегирование событий — один обработчик на весь контейнер
    container.addEventListener('change', function (e) {
      var radio = e.target;
      if (radio.type !== 'radio') return;

      var qi = parseInt(radio.closest('.quiz-option').dataset.q, 10);
      var oi = parseInt(radio.value, 10);
      var q  = questions[qi];
      var questionEl = document.getElementById('qq-' + qi);
      var options    = questionEl.querySelectorAll('.quiz-option');
      var explanation = document.getElementById('expl-' + qi);

      // Запрет повторного ответа
      if (questionEl.dataset.answered) return;
      questionEl.dataset.answered = 'true';
      answered++;

      // Помечаем правильный/неправильный
      options.forEach(function (opt, i) {
        opt.classList.add('disabled');
        opt.querySelector('input').disabled = true;
        if (i === q.correct) opt.classList.add('correct');
        if (i === oi && oi !== q.correct) opt.classList.add('incorrect');
      });

      if (oi === q.correct) correct++;

      // Показываем пояснение
      if (explanation) explanation.classList.add('visible');

      // Все вопросы отвечены — показываем результат
      if (answered === questions.length) {
        showScore(scoreBox, correct, questions.length);

        // Сохраняем результат в localStorage
        try {
          localStorage.setItem('cf-quiz-' + quizId, JSON.stringify({
            score: correct, total: questions.length, date: new Date().toISOString()
          }));
        } catch (_) { /* localStorage недоступен */ }

        // 100% — отправляем событие для конфетти
        if (correct === questions.length) {
          document.dispatchEvent(new CustomEvent('quiz:perfect', {
            detail: { quizId: quizId, score: correct, total: questions.length }
          }));
        }
      }
    });
  }

  /** Отображает блок с итоговым баллом */
  function showScore(scoreBox, correct, total) {
    if (!scoreBox) return;
    var pct   = Math.round((correct / total) * 100);
    var numEl = scoreBox.querySelector('.score-num');
    var msgEl = scoreBox.querySelector('.score-msg');

    if (numEl) numEl.textContent = correct + '/' + total;

    if (msgEl) {
      if (pct >= 90)      msgEl.textContent = 'Отлично! Вы прекрасно усвоили материал.';
      else if (pct >= 70) msgEl.textContent = 'Хороший результат! Есть небольшие пробелы.';
      else if (pct >= 50) msgEl.textContent = 'Удовлетворительно. Рекомендуем повторить материал.';
      else                msgEl.textContent = 'Нужно повторить материал. Перечитайте лекции и попробуйте снова.';
    }

    scoreBox.classList.add('visible');
    scoreBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ------------------------------------------------
     2. ФИНАНСОВЫЕ КАЛЬКУЛЯТОРЫ
     ------------------------------------------------ */

  /** NPV — чистая приведённая стоимость */
  function calcNPV(rate, cashflows) {
    return cashflows.reduce(function (npv, cf, t) {
      return npv + cf / Math.pow(1 + rate, t);
    }, 0);
  }

  /** IRR — внутренняя норма доходности (метод Ньютона-Рафсона) */
  function calcIRR(cashflows, guess) {
    var rate = guess || 0.1;
    for (var i = 0; i < 1000; i++) {
      var npv = calcNPV(rate, cashflows);
      var dnpv = cashflows.reduce(function (s, cf, t) {
        return s - t * cf / Math.pow(1 + rate, t + 1);
      }, 0);
      if (Math.abs(dnpv) < 1e-10) break;
      var next = rate - npv / dnpv;
      if (Math.abs(next - rate) < 1e-8) break;
      rate = next;
    }
    return rate;
  }

  /** PI — индекс прибыльности */
  function calcPI(rate, cashflows) {
    var inv = Math.abs(cashflows[0]);
    var pv  = cashflows.slice(1).reduce(function (s, cf, t) {
      return s + cf / Math.pow(1 + rate, t + 1);
    }, 0);
    return inv > 0 ? pv / inv : 0;
  }

  /** DPP — дисконтированный срок окупаемости */
  function calcDPP(rate, cashflows) {
    var cum = 0;
    for (var t = 0; t < cashflows.length; t++) {
      cum += cashflows[t] / Math.pow(1 + rate, t);
      if (cum >= 0 && t > 0) {
        var prev = cum - cashflows[t] / Math.pow(1 + rate, t);
        return t - 1 + (-prev / (cashflows[t] / Math.pow(1 + rate, t)));
      }
    }
    return null;
  }

  /** WACC — средневзвешенная стоимость капитала */
  function calcWACC(p) {
    // wd*kd*(1-tax) + we*ke + wp*kp
    var wp = p.wp || 0;
    var kp = p.kp || 0;
    return p.wd * p.kd * (1 - p.taxRate) + p.we * p.ke + wp * kp;
  }

  /** CAPM — модель оценки капитальных активов: ke = rf + beta * ERP */
  function calcCAPM(p) {
    return p.rf + p.beta * p.erp;
  }

  /** Модель Гордона: ke = D1/P0 + g */
  function calcGordon(p) {
    return p.p0 > 0 ? p.d1 / p.p0 + p.g : 0;
  }

  /** DCF — дисконтированные потоки с терминальной стоимостью */
  function calcDCF(cashflows, terminalValue, rate) {
    var n  = cashflows.length;
    var pv = calcNPV(rate, cashflows);
    var pvTV = terminalValue / Math.pow(1 + rate, n > 0 ? n - 1 : 0);
    return pv + pvTV;
  }

  /** Z-счёт Альтмана (5-факторная модель) */
  function calcAltmanZ(p) {
    return 1.2 * p.wcTA + 1.4 * p.reTa + 3.3 * p.ebitTA
         + 0.6 * p.mveBVD + 1.0 * p.salesTA;
  }

  /** Декомпозиция Дюпона: ROE = margin * turnover * leverage */
  function calcDuPont(p) {
    var margin   = p.revenue   ? p.netIncome / p.revenue : 0;
    var turnover = p.assets    ? p.revenue   / p.assets  : 0;
    var leverage = p.equity    ? p.assets    / p.equity  : 0;
    return { margin: margin, turnover: turnover, leverage: leverage, roe: margin * turnover * leverage };
  }

  /* ------------------------------------------------
     3. CHART.JS ОБЁРТКИ
     ------------------------------------------------ */

  // Токены дизайна сайта
  var COLORS = {
    indigo:  '#818CF8',
    coral:   '#FB7185',
    amber:   '#FBBF24',
    surface: '#1E293B'
  };
  var PALETTE = [COLORS.indigo, COLORS.coral, COLORS.amber, '#34D399', '#A78BFA', '#F472B6'];

  /** Ждёт загрузки Chart.js и вызывает callback */
  function whenChartReady(fn) {
    if (typeof Chart !== 'undefined') return fn();
    document.addEventListener('chartjs:ready', function handler() {
      document.removeEventListener('chartjs:ready', handler);
      fn();
    });
  }

  /** Общая фабрика графиков */
  function buildChart(canvasId, type, cfg) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    var prev = Chart.getChart(canvas);
    if (prev) prev.destroy();
    return new Chart(canvas, { type: type, data: cfg.data, options: cfg.options || {} });
  }

  function createBarChart(canvasId, labels, datasets, options) {
    var chart = null;
    whenChartReady(function () {
      chart = buildChart(canvasId, 'bar', {
        data: { labels: labels, datasets: datasets.map(function (ds, i) {
          return Object.assign({ backgroundColor: PALETTE[i % PALETTE.length] }, ds);
        })},
        options: Object.assign({ responsive: true }, options)
      });
    });
    return chart;
  }

  function createLineChart(canvasId, labels, datasets, options) {
    var chart = null;
    whenChartReady(function () {
      chart = buildChart(canvasId, 'line', {
        data: { labels: labels, datasets: datasets.map(function (ds, i) {
          return Object.assign({ borderColor: PALETTE[i % PALETTE.length], tension: 0.3, fill: false }, ds);
        })},
        options: Object.assign({ responsive: true }, options)
      });
    });
    return chart;
  }

  function createPieChart(canvasId, labels, data, options) {
    var chart = null;
    whenChartReady(function () {
      chart = buildChart(canvasId, 'pie', {
        data: { labels: labels, datasets: [{ data: data, backgroundColor: PALETTE.slice(0, data.length) }] },
        options: Object.assign({ responsive: true }, options)
      });
    });
    return chart;
  }

  /* ------------------------------------------------
     4. ФОРМАТИРОВАНИЕ
     ------------------------------------------------ */

  function formatNumber(n, decimals) {
    if (n == null || isNaN(n)) return '\u2014';
    var d = decimals != null ? decimals : 2;
    return n.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function formatPercent(n, decimals) {
    if (n == null || isNaN(n)) return '\u2014';
    return (n * 100).toFixed(decimals != null ? decimals : 2) + '%';
  }

  function formatCurrency(n, currency) {
    if (n == null || isNaN(n)) return '\u2014';
    var sym = currency || '\u20BD'; // ₽
    return formatNumber(n, 2) + ' ' + sym;
  }

  /* ------------------------------------------------
     5. ПОИСК ПО ГЛОССАРИЮ
     ------------------------------------------------ */

  function initGlossarySearch(inputId, listSelector, itemSelector) {
    var input = document.getElementById(inputId);
    if (!input) return;

    var items   = document.querySelectorAll(itemSelector);
    var countEl = document.querySelector('.glossary-count');
    var total   = items.length;

    input.addEventListener('input', function () {
      var query   = input.value.toLowerCase().trim();
      var visible = 0;

      items.forEach(function (item) {
        var match = !query || item.textContent.toLowerCase().indexOf(query) !== -1;
        item.style.display = match ? '' : 'none';
        if (match) visible++;
      });

      if (countEl) {
        countEl.textContent = query
          ? '\u041D\u0430\u0439\u0434\u0435\u043D\u043E: ' + visible + ' \u0438\u0437 ' + total
          : '\u0412\u0441\u0435\u0433\u043E \u0442\u0435\u0440\u043C\u0438\u043D\u043E\u0432: ' + total;
      }
    });
  }

  /* ------------------------------------------------
     ЭКСПОРТ
     ------------------------------------------------ */
  window.CFUtils = {
    // Квиз
    renderQuiz:        renderQuiz,
    // Калькуляторы
    calcNPV:           calcNPV,
    calcIRR:           calcIRR,
    calcPI:            calcPI,
    calcDPP:           calcDPP,
    calcWACC:          calcWACC,
    calcCAPM:          calcCAPM,
    calcGordon:        calcGordon,
    calcDCF:           calcDCF,
    calcAltmanZ:       calcAltmanZ,
    calcDuPont:        calcDuPont,
    // Графики
    createBarChart:    createBarChart,
    createLineChart:   createLineChart,
    createPieChart:    createPieChart,
    COLORS:            COLORS,
    // Форматирование
    formatNumber:      formatNumber,
    formatPercent:     formatPercent,
    formatCurrency:    formatCurrency,
    // Глоссарий
    initGlossarySearch: initGlossarySearch
  };

})();
