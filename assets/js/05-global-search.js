/* === GLOBAL SEARCH — Fuse.js fuzzy search across CONTENT + CATALOGUE ===
   Работает с существующим overlay #search-overlay */

(function(){
  'use strict';

  var fuse = null;
  var allItems = [];

  function buildIndex() {
    allItems = [];
    var i, j;
    var lg = (typeof lang !== 'undefined') ? lang : 'en';

    /* === Каталог: CATALOGUE — объект с ключами mine/construction/recycling === */
    if (typeof CATALOGUE !== 'undefined' && CATALOGUE) {
      var divs = ['mine', 'construction', 'recycling'];
      for (var di = 0; di < divs.length; di++) {
        var divKey = divs[di];
        var arr = CATALOGUE[divKey];
        if (!arr || !arr.length) continue;
        var divLabel = divKey === 'mine'
          ? {en:'Mine Division', es:'División Minería', pl:'Dział Górnictwo'}[lg]
          : divKey === 'recycling'
          ? {en:'Recycling Division', es:'División Reciclaje', pl:'Dział Recykling'}[lg]
          : {en:'Construction Division', es:'División Construcción', pl:'Dział Budownictwo'}[lg];
        var divIcon = divKey === 'mine' ? '⚒️' : divKey === 'recycling' ? '♻️' : '🏗️';
        for (i = 0; i < arr.length; i++) {
          var item = arr[i];
          allItems.push({
            type: 'equipment',
            title: item['title_' + lg] || item.title_en || '',
            subtitle: divLabel,
            desc: (item['short_' + lg] || item.short_en || '') + ' ' +
                  (item['desc_' + lg] || item.desc_en || '').substring(0, 300),
            url: 'pages/equipment.html?id=' + item.id,
            tag: divKey,
            icon: divIcon
          });
        }
      }
    }

    /* === Разделы сайта (из CONTENT.divisions + services) === */
    if (typeof CONTENT !== 'undefined' && CONTENT.divisions) {
      for (i = 0; i < CONTENT.divisions.length; i++) {
        var d = CONTENT.divisions[i];
        allItems.push({
          type: 'section',
          title: d['name_' + lg] || d.name_en || '',
          subtitle: {en:'Division', es:'División', pl:'Dział'}[lg],
          desc: (d.services || []).map(function(s){ return s['title_' + lg] || s.title_en; }).join(' · '),
          url: '#divsec-' + d.id,
          tag: d.cls,
          icon: '📂'
        });
        if (d.services) {
          for (j = 0; j < d.services.length; j++) {
            var s = d.services[j];
            allItems.push({
              type: 'service',
              title: s['title_' + lg] || s.title_en || '',
              subtitle: d['name_' + lg] || d.name_en,
              desc: s['desc_' + lg] || s.desc_en || '',
              url: '#svc-' + s.id,
              tag: d.cls,
              icon: '🔧'
            });
          }
        }
      }
    }

    /* === Статические страницы === */
    var uiStrings = (typeof UI !== 'undefined' && UI[lg]) ? UI[lg] : {};
    allItems.push({
      type: 'page',
      title: uiStrings['ui.about'] || 'About Us',
      subtitle: 'MCR Planet',
      desc: 'Engineering, geology, innovation',
      url: '#about',
      icon: '📖'
    });
    allItems.push({
      type: 'page',
      title: uiStrings['ui.contact'] || 'Contacts',
      subtitle: 'MCR Planet',
      desc: 'Get in touch, email, company info',
      url: '#contact',
      icon: '📧'
    });
    allItems.push({
      type: 'page',
      title: {en:'Privacy Policy', es:'Política de Privacidad', pl:'Polityka Prywatności'}[lg],
      subtitle: 'Legal',
      desc: 'GDPR, cookies, data processing',
      url: 'pages/privacy.html',
      icon: '📜'
    });
    allItems.push({
      type: 'page',
      title: {en:'Terms of Service', es:'Términos del Servicio', pl:'Warunki Korzystania'}[lg],
      subtitle: 'Legal',
      desc: 'Terms, conditions',
      url: 'pages/terms.html',
      icon: '📜'
    });

    /* Инициализация Fuse */
    if (typeof Fuse !== 'undefined') {
      fuse = new Fuse(allItems, {
        keys: [
          { name: 'title', weight: 3 },
          { name: 'subtitle', weight: 1.2 },
          { name: 'desc', weight: 1 }
        ],
        threshold: 0.4,
        distance: 200,
        ignoreLocation: true,
        includeScore: true,
        minMatchCharLength: 2
      });
    }
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function escapeAttr(s) { return escapeHtml(s); }

  /* Рендер результатов */
  function renderResults(query) {
    var box = document.getElementById('search-results');
    if (!box) return;
    if (!query || query.length < 2) {
      box.innerHTML = '';
      return;
    }
    if (!fuse) {
      buildIndex();
      if (!fuse) {
        box.innerHTML = '<div class="search-empty">Fuse.js not loaded</div>';
        return;
      }
    }
    var results = fuse.search(query).slice(0, 10);
    if (!results.length) {
      var empty = {en:'Nothing found', es:'Nada encontrado', pl:'Nic nie znaleziono'}[lang || 'en'] || 'Nothing found';
      box.innerHTML = '<div class="search-empty">' + empty + '</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < results.length; i++) {
      var item = results[i].item;
      html += '<div class="search-item" data-url="' + escapeAttr(item.url) + '" data-type="' + item.type + '">' +
        '<span class="search-item-icon">' + item.icon + '</span>' +
        '<span class="search-item-tag">' + escapeHtml(item.subtitle) + '</span>' +
        '<span class="search-item-name">' + escapeHtml(item.title) + '</span>' +
        '</div>';
    }
    box.innerHTML = html;
    /* Клик по результату */
    var items = box.querySelectorAll('.search-item');
    for (var j = 0; j < items.length; j++) {
      items[j].addEventListener('click', function(){
        var url = this.getAttribute('data-url');
        closeSearch();
        /* Закрываем каталог-оверлей если он сейчас открыт */
        if (typeof hideCatalog === 'function') {
          var catOverlay = document.getElementById('catalog-overlay');
          if (catOverlay && catOverlay.className === 'open') hideCatalog();
        }
        if (url.indexOf('#') === 0) {
          /* Якорь — пытаемся найти элемент */
          try {
            var target = document.querySelector(url);
            if (target) {
              setTimeout(function(){
                target.scrollIntoView({behavior: 'smooth', block: 'start'});
              }, 100);
              return;
            }
          } catch(e){}
          /* Fallback: ставим якорь в URL */
          window.location.hash = url;
        } else {
          window.location.href = url;
        }
      });
    }
  }

  function openSearch() {
    var ov = document.getElementById('search-overlay');
    if (ov) ov.className = 'open';
    var inp = document.getElementById('search-input');
    if (inp) setTimeout(function(){ inp.focus(); }, 50);
    if (!fuse && typeof Fuse !== 'undefined') buildIndex();
  }
  function closeSearch() {
    var ov = document.getElementById('search-overlay');
    if (ov) ov.className = '';
    var inp = document.getElementById('search-input');
    if (inp) inp.value = '';
    var box = document.getElementById('search-results');
    if (box) box.innerHTML = '';
  }

  /* Перестраиваем индекс при смене языка */
  var _origSetLang = window.setLang;
  if (typeof _origSetLang === 'function') {
    window.setLang = function(l){
      var r = _origSetLang.apply(this, arguments);
      buildIndex();
      return r;
    };
  }

  /* Инициализация */
  function init() {
    document.addEventListener('keydown', function(e){
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }
      if (e.key === 'Escape') closeSearch();
    });
    var ov = document.getElementById('search-overlay');
    if (ov) {
      ov.addEventListener('click', function(e){
        if (e.target === ov) closeSearch();
      });
    }
    var inp = document.getElementById('search-input');
    if (inp) {
      inp.addEventListener('input', function(){
        renderResults(inp.value.trim());
      });
    }
    function updatePlaceholder() {
      var inp2 = document.getElementById('search-input');
      if (!inp2) return;
      var lg = (typeof lang !== 'undefined') ? lang : 'en';
      var ph = {
        en: 'Search everything... (Ctrl+K)',
        es: 'Buscar todo... (Ctrl+K)',
        pl: 'Szukaj wszędzie... (Ctrl+K)'
      };
      inp2.placeholder = ph[lg] || ph.en;
    }
    updatePlaceholder();
    setInterval(updatePlaceholder, 2000);
  }

  window.openGlobalSearch = openSearch;
  window.closeGlobalSearch = closeSearch;
  window.rebuildSearchIndex = buildIndex;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  setTimeout(function(){
    if (typeof Fuse !== 'undefined' && typeof CONTENT !== 'undefined') buildIndex();
  }, 800);
})();
