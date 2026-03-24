/* ============================================
   CFTools — Shared utilities for interactive
   financial tools across the educational portal.
   Vanilla JS, no dependencies.
   ============================================ */
;(function () {
  'use strict';

  var stylesInjected = false;

  /** Inject scoped CSS for sliders and result cards (once). */
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    var css =
      '.cft-slider{margin-bottom:1rem}' +
      '.cft-slider__head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:.35rem}' +
      '.cft-slider__label{font-size:.9rem;color:var(--text-secondary)}' +
      '.cft-slider__value{font-weight:600;color:var(--acc);font-size:.95rem}' +
      '.cft-slider input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:6px;' +
        'border-radius:3px;background:var(--surface-2);outline:none;transition:background var(--transition)}' +
      '.cft-slider input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;' +
        'width:18px;height:18px;border-radius:50%;background:var(--acc);cursor:pointer;' +
        'border:2px solid var(--surface);box-shadow:0 0 6px var(--acc-glow)}' +
      '.cft-slider input[type=range]::-moz-range-thumb{width:18px;height:18px;border-radius:50%;' +
        'background:var(--acc);cursor:pointer;border:2px solid var(--surface)}' +
      '.cft-result-card{background:var(--surface);border:1px solid var(--border);' +
        'border-radius:var(--radius-sm);padding:1rem 1.25rem;display:grid;' +
        'grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.75rem 1.5rem}' +
      '.cft-result-item{display:flex;flex-direction:column;gap:.15rem}' +
      '.cft-result-item__label{font-size:.8rem;color:var(--text-secondary)}' +
      '.cft-result-item__value{font-size:1.1rem;font-weight:600;color:var(--text-primary)}' +
      '.cft-result-item--highlight .cft-result-item__value{color:var(--acc)}';
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* --------------------------------------------------
     Formatting helpers
     -------------------------------------------------- */

  /**
   * Format a number with Russian locale (space as thousands separator, comma as decimal).
   * @param {number} n
   * @param {number} [decimals=2]
   * @returns {string}
   */
  function formatNumber(n, decimals) {
    if (typeof decimals !== 'number') decimals = 2;
    return Number(n).toLocaleString('ru-RU', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  /**
   * Format as a percentage string.
   * @param {number} n  Value (e.g. 0.12 for 12 %)
   * @param {number} [decimals=2]
   * @returns {string}
   */
  function formatPercent(n, decimals) {
    if (typeof decimals !== 'number') decimals = 2;
    return formatNumber(n * 100, decimals) + '%';
  }

  /**
   * Format as currency with an optional suffix (default '₽').
   * @param {number} n
   * @param {string} [suffix='₽']
   * @returns {string}
   */
  function formatCurrency(n, suffix) {
    return formatNumber(n, 2) + ' ' + (suffix || '\u20BD');
  }

  /* --------------------------------------------------
     Financial calculations
     -------------------------------------------------- */

  /**
   * Net Present Value.
   * @param {number}   rate       Discount rate per period (e.g. 0.10)
   * @param {number[]} cashflows  Array of cash flows (periods 1..N)
   * @param {number}   investment Initial investment (positive number, subtracted)
   * @returns {number}
   */
  function npv(rate, cashflows, investment) {
    var sum = 0;
    for (var t = 0; t < cashflows.length; t++) {
      sum += cashflows[t] / Math.pow(1 + rate, t + 1);
    }
    return sum - (investment || 0);
  }

  /**
   * Weighted Average Cost of Capital.
   * @param {number} we   Weight of equity (0..1)
   * @param {number} ke   Cost of equity (decimal)
   * @param {number} wd   Weight of debt (0..1)
   * @param {number} kd   Cost of debt (decimal)
   * @param {number} tax  Corporate tax rate (decimal)
   * @returns {number}
   */
  function wacc(we, ke, wd, kd, tax) {
    return we * ke + wd * kd * (1 - tax);
  }

  /**
   * Capital Asset Pricing Model — cost of equity.
   * @param {number} rf   Risk-free rate (decimal)
   * @param {number} beta Equity beta
   * @param {number} erp  Equity risk premium (decimal)
   * @returns {number}
   */
  function capm(rf, beta, erp) {
    return rf + beta * erp;
  }

  /* --------------------------------------------------
     UI builders
     -------------------------------------------------- */

  /**
   * Create an interactive range slider inside a container.
   * @param {string} containerId  DOM id of the target element
   * @param {Object} opts
   * @param {string}   opts.label
   * @param {number}   opts.min
   * @param {number}   opts.max
   * @param {number}   [opts.step=1]
   * @param {number}   [opts.value]   Initial value (defaults to min)
   * @param {string}   [opts.unit=''] Suffix shown after the value
   * @param {function} [opts.onChange] Called with the numeric value on every change
   * @returns {{el: HTMLElement, setValue: function, getValue: function}}
   */
  function createSlider(containerId, opts) {
    injectStyles();
    var container = document.getElementById(containerId);
    if (!container) return null;

    var step  = opts.step  != null ? opts.step  : 1;
    var val   = opts.value != null ? opts.value : opts.min;
    var unit  = opts.unit  || '';

    var wrap = document.createElement('div');
    wrap.className = 'cft-slider';

    var head = document.createElement('div');
    head.className = 'cft-slider__head';

    var lbl = document.createElement('span');
    lbl.className = 'cft-slider__label';
    lbl.textContent = opts.label || '';

    var valSpan = document.createElement('span');
    valSpan.className = 'cft-slider__value';
    valSpan.textContent = formatDisplay(val);

    head.appendChild(lbl);
    head.appendChild(valSpan);

    var input = document.createElement('input');
    input.type  = 'range';
    input.min   = opts.min;
    input.max   = opts.max;
    input.step  = step;
    input.value = val;
    input.setAttribute('aria-label', opts.label || '');

    function formatDisplay(v) {
      var decimals = step < 1 ? String(step).split('.')[1].length : 0;
      return formatNumber(v, decimals) + (unit ? ' ' + unit : '');
    }

    input.addEventListener('input', function () {
      var v = parseFloat(input.value);
      valSpan.textContent = formatDisplay(v);
      if (typeof opts.onChange === 'function') opts.onChange(v);
    });

    wrap.appendChild(head);
    wrap.appendChild(input);
    container.appendChild(wrap);

    return {
      el: wrap,
      setValue: function (v) {
        input.value = v;
        valSpan.textContent = formatDisplay(v);
      },
      getValue: function () {
        return parseFloat(input.value);
      }
    };
  }

  /**
   * Render an array of results as a compact card.
   * @param {string} containerId
   * @param {Array<{label:string, value:string, highlight?:boolean}>} results
   */
  function createResultCard(containerId, results) {
    injectStyles();
    var container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    var card = document.createElement('div');
    card.className = 'cft-result-card';

    results.forEach(function (r) {
      var item = document.createElement('div');
      item.className = 'cft-result-item' + (r.highlight ? ' cft-result-item--highlight' : '');
      item.innerHTML =
        '<span class="cft-result-item__label">' + r.label + '</span>' +
        '<span class="cft-result-item__value">' + r.value + '</span>';
      card.appendChild(item);
    });

    container.appendChild(card);
  }

  /* --------------------------------------------------
     Additional financial calculations (Phase 2)
     -------------------------------------------------- */

  /**
   * Bond price (present value of coupon + face).
   * @param {number} face      Face / par value
   * @param {number} coupon    Annual coupon rate (decimal, e.g. 0.08)
   * @param {number} ytm       Yield to maturity (decimal)
   * @param {number} periods   Number of periods (years × freq)
   * @param {number} [freq=1]  Coupons per year
   * @returns {number}
   */
  function bondPrice(face, coupon, ytm, periods, freq) {
    freq = freq || 1;
    var c = face * coupon / freq;
    var r = ytm / freq;
    var pv = 0;
    for (var t = 1; t <= periods; t++) {
      pv += c / Math.pow(1 + r, t);
    }
    pv += face / Math.pow(1 + r, periods);
    return pv;
  }

  /**
   * Macaulay Duration.
   * @param {number} face
   * @param {number} coupon  Annual coupon rate (decimal)
   * @param {number} ytm     Yield to maturity (decimal)
   * @param {number} periods
   * @param {number} [freq=1]
   * @returns {number}
   */
  function duration(face, coupon, ytm, periods, freq) {
    freq = freq || 1;
    var c = face * coupon / freq;
    var r = ytm / freq;
    var price = bondPrice(face, coupon, ytm, periods, freq);
    var wsum = 0;
    for (var t = 1; t <= periods; t++) {
      wsum += t * c / Math.pow(1 + r, t);
    }
    wsum += periods * face / Math.pow(1 + r, periods);
    return (wsum / price) / freq;
  }

  /**
   * Economic Order Quantity (Wilson formula).
   * @param {number} demand    Annual demand (units)
   * @param {number} orderCost Cost per order
   * @param {number} holdCost  Holding cost per unit per year
   * @returns {number}
   */
  function eoq(demand, orderCost, holdCost) {
    return Math.sqrt(2 * demand * orderCost / holdCost);
  }

  /**
   * Cash Conversion Cycle.
   * @param {number} dio Days Inventory Outstanding
   * @param {number} dso Days Sales Outstanding
   * @param {number} dpo Days Payable Outstanding
   * @returns {number}
   */
  function ccc(dio, dso, dpo) {
    return dio + dso - dpo;
  }

  /* --------------------------------------------------
     Public API
     -------------------------------------------------- */
  window.CFTools = {
    createSlider:     createSlider,
    formatNumber:     formatNumber,
    formatPercent:    formatPercent,
    formatCurrency:   formatCurrency,
    npv:              npv,
    wacc:             wacc,
    capm:             capm,
    bondPrice:        bondPrice,
    duration:         duration,
    eoq:              eoq,
    ccc:              ccc,
    createResultCard: createResultCard
  };
})();
