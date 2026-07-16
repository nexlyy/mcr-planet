// MCR Planet — фронтовые интеграции с ботом.
// Подключается в <head> с defer. Три вещи: репорт JS-ошибок,
// трекинг поисковых запросов и отправка формы на бэкенд.

(function () {
  'use strict';
  var ENDPOINT_BASE = '/bot-webhook';  // проксируется на бэкенд на стороне сервера

  // 1. Репорт JS-ошибок
  var errorBuffer = [];
  var errorSent = new Set();

  function reportError(payload) {
    var key = (payload.message || '') + '|' + (payload.source || '');
    if (errorSent.has(key)) return;
    errorSent.add(key);
    try {
      navigator.sendBeacon(
        ENDPOINT_BASE + '/jserror',
        new Blob([JSON.stringify(payload)], { type: 'application/json' })
      );
    } catch (e) {
      try {
        fetch(ENDPOINT_BASE + '/jserror', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      } catch (e2) {}
    }
  }

  window.addEventListener('error', function (ev) {
    if (!ev) return;
    reportError({
      message: ev.message || (ev.error && ev.error.message) || 'unknown',
      source: ev.filename || '',
      lineno: ev.lineno || 0,
      colno: ev.colno || 0,
      stack: (ev.error && ev.error.stack) ? ev.error.stack.substring(0, 2500) : '',
      url: location.href,
    });
  }, { capture: false });

  window.addEventListener('unhandledrejection', function (ev) {
    var reason = ev && ev.reason;
    var msg = (reason && reason.message) || String(reason || 'unhandledrejection');
    var stack = (reason && reason.stack) || '';
    reportError({
      message: msg,
      source: 'promise',
      lineno: 0,
      colno: 0,
      stack: stack.substring(0, 2500),
      url: location.href,
    });
  });

  // 2. Трекинг поиска по сайту
  // Использование: вызвать window.MCR_trackSearch(query, results_count) после Fuse.js поиска.
  window.MCR_trackSearch = function (q, results) {
    if (!q || typeof q !== 'string' || q.length < 2 || q.length > 200) return;
    try {
      navigator.sendBeacon(
        ENDPOINT_BASE + '/search',
        new Blob(
          [JSON.stringify({
            q: q,
            results: results || 0,
            referrer: document.referrer || '',
          })],
          { type: 'application/json' }
        )
      );
    } catch (e) {}
  };

  // 3. Отправка формы
  // Использование: вместо прямого fetch к бек-енду — MCR_submitForm({...payload}).
  // Возвращает Promise<{ok, ref?, error?}>.
  // Захватывает UTM из URL и текущую страницу автоматически.
  window.MCR_submitForm = function (payload) {
    var qs = new URLSearchParams(location.search);
    var enriched = Object.assign({}, payload, {
      page: location.href,
    });
    // Захват UTM (если фронт явно не передал)
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) {
      if (!enriched[k] && qs.get(k)) {
        enriched[k] = qs.get(k);
      }
    });

    return fetch(ENDPOINT_BASE + '/form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enriched),
      credentials: 'omit',
    })
      .then(function (r) {
        return r.json().catch(function () { return { ok: false, error: 'invalid json' }; });
      })
      .catch(function (e) {
        return { ok: false, error: String(e) };
      });
  };
})();
