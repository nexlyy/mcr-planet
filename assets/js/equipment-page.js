/* === EQUIPMENT PAGE LOGIC ===
   Reads ?id=xxx from URL, finds item in CATALOGUE, populates page.
   Handles language switching, theme, lightbox.
*/

(function(){
  'use strict';

  /* Текущий язык + тема (читаем из localStorage) */
  var lang = 'en';
  try {
    var saved = localStorage.getItem('mcr_lang');
    if (saved && ['en','es','pl'].indexOf(saved) >= 0) lang = saved;
  } catch(e){}

  try {
    var th = localStorage.getItem('mcr_theme');
    if (th === '1' || th === 'light') document.documentElement.className = 'light';
  } catch(e){}

  /* Тексты UI страницы (на 3 языках) */
  var T = {
    en: {
      catalogue: 'Catalogue',
      mine: 'Mine Division',
      recycling: 'Recycling Division',
      construction: 'Construction Division',
      features: 'Key Features',
      specs: 'Technical Specifications',
      partner: 'Technology Partner',
      cta_title: 'Interested in this equipment?',
      cta_desc: 'Contact our team for a personalized quote, technical consultation, or to request a site visit.',
      cta_btn: 'Request Information →',
      not_found: 'Equipment not found',
      not_found_link: '← Back to catalogue',
      back: 'Back to catalogue',
      back_short: '← Back',
      zoom_hint: 'Click to enlarge',
      dark_mode: 'Dark Mode',
      back_to_mcr: '← Back to MCR Planet'
    },
    es: {
      catalogue: 'Catálogo',
      mine: 'División Minería',
      recycling: 'División Reciclaje',
      construction: 'División Construcción',
      features: 'Características Clave',
      specs: 'Especificaciones Técnicas',
      partner: 'Socio Tecnológico',
      cta_title: '¿Interesado en este equipo?',
      cta_desc: 'Contacte a nuestro equipo para obtener una cotización personalizada, consulta técnica o solicitar una visita.',
      cta_btn: 'Solicitar Información →',
      not_found: 'Equipo no encontrado',
      not_found_link: '← Volver al catálogo',
      back: 'Volver al catálogo',
      back_short: '← Volver',
      zoom_hint: 'Click para ampliar',
      dark_mode: 'Modo Oscuro',
      back_to_mcr: '← Volver a MCR Planet'
    },
    pl: {
      catalogue: 'Katalog',
      mine: 'Dział Górnictwo',
      recycling: 'Dział Recykling',
      construction: 'Dział Budownictwo',
      features: 'Kluczowe Cechy',
      specs: 'Specyfikacje Techniczne',
      partner: 'Partner Technologiczny',
      cta_title: 'Zainteresowany tym sprzętem?',
      cta_desc: 'Skontaktuj się z naszym zespołem, aby otrzymać spersonalizowaną wycenę, konsultację techniczną lub umówić wizytę.',
      cta_btn: 'Zapytaj o Ofertę →',
      not_found: 'Sprzęt nie znaleziony',
      not_found_link: '← Powrót do katalogu',
      back: 'Powrót do katalogu',
      back_short: '← Powrót',
      zoom_hint: 'Kliknij aby powiększyć',
      dark_mode: 'Tryb Ciemny',
      back_to_mcr: '← Powrót do MCR Planet'
    }
  };

  /* Получить ID из URL */
  function getParam(name){
    var m = new RegExp('[?&]'+name+'=([^&]+)').exec(window.location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  /* HTML escape для безопасного рендера текста */
  function escapeHtml(s){
    return String(s || '').replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function escapeAttr(s){ return escapeHtml(s); }

  /* Найти позицию в CATALOGUE */
  function findItem(id){
    if (!window.CATALOGUE || !id) return null;
    var divisions = Object.keys(window.CATALOGUE);
    for (var i=0; i<divisions.length; i++) {
      var div = divisions[i];
      var arr = window.CATALOGUE[div] || [];
      for (var j=0; j<arr.length; j++) {
        if (arr[j].id === id) return { item: arr[j], division: div };
      }
    }
    return null;
  }

  /* Рендер страницы */
  function render(){
    var t = T[lang] || T.en;
    var _eqThemeL=document.getElementById('eq-mob-theme-label');if(_eqThemeL)_eqThemeL.textContent=t.dark_mode;
    var _eqBackL=document.getElementById('eq-mob-back-label');if(_eqBackL)_eqBackL.textContent=t.back_to_mcr;
    var id = getParam('id');
    var found = findItem(id);

    /* Обновляем lang атрибут html для accessibility */
    document.documentElement.lang = lang;

    /* === Если не найдено === */
    if (!found) {
      document.getElementById('eq-root').innerHTML =
        '<div class="eq-not-found">' +
        '<h2>'+ t.not_found +'</h2>' +
        '<a href="../index.html#catalog">'+ t.not_found_link +'</a>' +
        '</div>';
      document.title = t.not_found + ' — MCR Planet';
      /* noindex, чтобы Google не показывал "Equipment not found" в выдаче */
      var robotsMeta = document.querySelector('meta[name="robots"]');
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.name = 'robots';
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.content = 'noindex, follow';
      return;
    }

    var item = found.item;
    var divName = found.division; /* mine | recycling | construction */
    var divLabel = t[divName] || divName;

    /* === Поля item на текущем языке === */
    var title  = item['title_'+lang] || item.title_en || item.title || '';
    var desc   = item['desc_'+lang]  || item.desc_en  || item.desc  || '';
    var points = item['points_'+lang] || item.points_en || item.points || [];
    var images = item.images || (item.image ? [item.image] : []);

    /* === Нормализация путей картинок (страница в /pages/, картинки в /media/) === */
    var normImages = images.map(function(src){
      if (/^https?:/.test(src)) return src;
      if (src.indexOf('../') === 0) return src;
      return '../' + src; /* media/... → ../media/... */
    });

    document.title = title + ' — MCR Planet';

    /* === Sticky CTA bar: обновляем текст + локализация === */
    try {
      var scLabels = {
        en: { label: 'Interested?', btn: 'Request Quote →' },
        es: { label: '¿Interesado?', btn: 'Solicitar Cotización →' },
        pl: { label: 'Zainteresowany?', btn: 'Zapytaj o Wycenę →' }
      };
      var scL = scLabels[lang] || scLabels.en;
      var scLabel = document.getElementById('sc-label');
      var scTitle = document.getElementById('sc-title');
      var scBtn = document.getElementById('sc-btn');
      if (scLabel) scLabel.textContent = scL.label;
      if (scTitle) scTitle.textContent = title;
      if (scBtn) scBtn.textContent = scL.btn;
    } catch(e){}

    /* === Recently Viewed: сохраняем текущий товар в localStorage === */
    try {
      var recentKey = 'mcr_recent_viewed';
      var recent = [];
      try { recent = JSON.parse(localStorage.getItem(recentKey) || '[]'); } catch(e){}
      /* Убираем текущий товар если он уже в списке */
      recent = recent.filter(function(x){ return x !== id; });
      /* Добавляем в начало */
      recent.unshift(id);
      /* Ограничиваем до 6 последних */
      recent = recent.slice(0, 6);
      localStorage.setItem(recentKey, JSON.stringify(recent));
    } catch(e){}

    /* === Related: 3 других товара из той же division === */
    try {
      var relatedLabels = {
        en: 'You might also like',
        es: 'También podría interesarte',
        pl: 'Może Cię również zainteresować'
      };
      var divArr = window.CATALOGUE[divName] || [];
      /* Исключаем текущий товар, берём до 3 */
      var related = divArr.filter(function(x){ return x.id !== id; }).slice(0, 3);
      if (related.length > 0) {
        var relEl = document.getElementById('eq-related');
        var relGrid = document.getElementById('eq-related-grid');
        var relTitle = document.getElementById('eq-related-title');
        if (relTitle) relTitle.textContent = relatedLabels[lang] || relatedLabels.en;
        if (relGrid) {
          relGrid.innerHTML = related.map(function(r){
            var rTitle = r['title_' + lang] || r.title_en || '';
            var rShort = r['short_' + lang] || r.short_en || '';
            var rImg = (r.images && r.images[0]) || r.image || '';
            if (rImg && !/^https?:/.test(rImg) && rImg.indexOf('../') !== 0) rImg = '../' + rImg;
            return '<a href="?id=' + encodeURIComponent(r.id) + '" class="eq-rel-card">' +
              '<div class="rel-img">' +
                (rImg ? '<img src="' + rImg + '" alt="' + escapeAttr(rTitle) + '" loading="lazy" decoding="async">' : '') +
              '</div>' +
              '<div class="rel-body">' +
                '<span class="rel-tag">' + divLabel + '</span>' +
                '<h3 class="rel-title">' + escapeHtml(rTitle) + '</h3>' +
                '<p class="rel-desc">' + escapeHtml(rShort) + '</p>' +
              '</div>' +
            '</a>';
          }).join('');
          relEl.style.display = 'block';
        }
      }
    } catch(e){}

    /* === Recently viewed: показываем последние 3 (без текущего) === */
    try {
      var recentLabels = {
        en: 'Recently viewed',
        es: 'Visto recientemente',
        pl: 'Ostatnio oglądane'
      };
      var recentIds = [];
      try { recentIds = JSON.parse(localStorage.getItem('mcr_recent_viewed') || '[]'); } catch(e){}
      /* Исключаем текущий */
      recentIds = recentIds.filter(function(x){ return x !== id; }).slice(0, 3);
      if (recentIds.length > 0) {
        var recEl = document.getElementById('eq-recent');
        var recGrid = document.getElementById('eq-recent-grid');
        var recTitle = document.getElementById('eq-recent-title');
        if (recTitle) recTitle.textContent = recentLabels[lang] || recentLabels.en;
        var recentItems = recentIds.map(function(rId){
          var rFound = findItem(rId);
          return rFound ? {item: rFound.item, division: rFound.division} : null;
        }).filter(Boolean);
        if (recGrid && recentItems.length > 0) {
          recGrid.innerHTML = recentItems.map(function(r){
            var rTitle = r.item['title_' + lang] || r.item.title_en || '';
            var rShort = r.item['short_' + lang] || r.item.short_en || '';
            var rImg = (r.item.images && r.item.images[0]) || r.item.image || '';
            if (rImg && !/^https?:/.test(rImg) && rImg.indexOf('../') !== 0) rImg = '../' + rImg;
            var rDivLabel = r.division === 'mine'
              ? (t.mine || 'Mine')
              : r.division === 'recycling' ? (t.recycling || 'Recycling')
              : (t.construction || 'Construction');
            return '<a href="?id=' + encodeURIComponent(r.item.id) + '" class="eq-rel-card">' +
              '<div class="rel-img">' +
                (rImg ? '<img src="' + rImg + '" alt="' + escapeAttr(rTitle) + '" loading="lazy" decoding="async">' : '') +
              '</div>' +
              '<div class="rel-body">' +
                '<span class="rel-tag">' + rDivLabel + '</span>' +
                '<h3 class="rel-title">' + escapeHtml(rTitle) + '</h3>' +
                '<p class="rel-desc">' + escapeHtml(rShort) + '</p>' +
              '</div>' +
            '</a>';
          }).join('');
          recEl.style.display = 'block';
        }
      }
    } catch(e){}

    /* === OG / Twitter meta: подставляем актуальные данные товара === */
    try {
      var ogShort = (item['short_' + lang] || item.short_en || '').substring(0, 200);
      var ogImg = (normImages[0] || '../media/og-image.jpg');
      /* Приводим к абсолютному URL для OG */
      if (ogImg.indexOf('http') !== 0) {
        ogImg = 'https://mcrplanet.com/' + ogImg.replace(/^\.\.\//, '');
      }
      /* canonical/og:url ведут на статическую версию товара — она полностью
         отрендерена для краулеров, туда консолидируем сигналы */
      var ogUrl = 'https://mcrplanet.com/products/' +
        (lang === 'en' ? '' : lang + '/') + encodeURIComponent(id) + '.html';
      var setMeta = function(id, attr, val){
        var el = document.getElementById(id);
        if (el) el.setAttribute(attr, val);
      };
      setMeta('og-title', 'content', title + ' — MCR Planet');
      setMeta('og-desc', 'content', ogShort);
      setMeta('og-image', 'content', ogImg);
      setMeta('og-url', 'content', ogUrl);
      setMeta('tw-title', 'content', title + ' — MCR Planet');
      setMeta('tw-desc', 'content', ogShort);
      setMeta('tw-image', 'content', ogImg);
      setMeta('canonical-link', 'href', ogUrl);

      /* meta description = первое предложение desc + "by MCR Planet":
         так лучше, чем случайный текст, который Google автогенерит. */
      var descMeta = document.querySelector('meta[name="description"]');
      if (!descMeta) {
        descMeta = document.createElement('meta');
        descMeta.name = 'description';
        document.head.appendChild(descMeta);
      }
      var shortDesc = ogShort.length > 155 ? ogShort.substring(0, 152) + '...' : ogShort;
      descMeta.content = shortDesc + ' — MCR Planet, ' + divLabel.toLowerCase() + ' equipment.';

      /* Schema.org Product для rich snippets в Google-выдаче */
      try {
        var fullDesc = (item['desc_' + lang] || item.desc_en || '').substring(0, 600);
        var productLd = {
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": title,
          "description": fullDesc,
          "image": ogImg,
          "category": divName,
          "brand": {
            "@type": "Brand",
            "name": "MCR Planet"
          },
          "manufacturer": {
            "@type": "Organization",
            "name": "MCR Planet",
            "url": "https://mcrplanet.com/"
          },
          "offers": {
            "@type": "Offer",
            "availability": "https://schema.org/InStock",
            "priceCurrency": "EUR",
            "price": "0",
            "priceValidUntil": new Date(Date.now()+365*86400000).toISOString().slice(0,10),
            "seller": {
              "@type": "Organization",
              "name": "MCR Planet"
            },
            "url": ogUrl
          }
        };
        /* Breadcrumb schema */
        var breadcrumbLd = {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            {"@type":"ListItem","position":1,"name":"MCR Planet","item":"https://mcrplanet.com/"},
            {"@type":"ListItem","position":2,"name":"Catalogue","item":"https://mcrplanet.com/#catalog"},
            {"@type":"ListItem","position":3,"name":title,"item":ogUrl}
          ]
        };
        /* Удаляем старые JSON-LD блоки и вставляем новые */
        document.querySelectorAll('script[type="application/ld+json"].eq-schema').forEach(function(n){n.remove();});
        var s1 = document.createElement('script');
        s1.type = 'application/ld+json';
        s1.className = 'eq-schema';
        s1.textContent = JSON.stringify(productLd);
        document.head.appendChild(s1);
        var s2 = document.createElement('script');
        s2.type = 'application/ld+json';
        s2.className = 'eq-schema';
        s2.textContent = JSON.stringify(breadcrumbLd);
        document.head.appendChild(s2);
      } catch(e){ console.warn('Schema.org injection failed:', e); }
    } catch(e){}

    /* === Хлебные крошки — клики ведут в каталог с нужным фильтром === */
    var catalogHref = '../index.html#catalog';
    var divHref     = '../index.html#catalog-' + divName; /* mine | recycling */
    document.getElementById('eq-crumbs').innerHTML =
      '<a href="../index.html">MCR Planet</a>' +
      '<span class="sep">/</span>' +
      '<a href="'+ catalogHref +'" id="eq-crumbs-catalog">'+ t.catalogue +'</a>' +
      '<span class="sep">/</span>' +
      '<a href="'+ divHref +'" id="eq-crumbs-div">'+ divLabel +'</a>' +
      '<span class="sep">/</span>' +
      '<span class="current">'+ title +'</span>';

    /* === Side back button: локализованный "← Back" / "← Volver" / "← Powrót" === */
    var backBtnEl = document.getElementById('eq-back-btn');
    if (backBtnEl) backBtnEl.textContent = t.back_short || '← Back';
    /* Global handler used by the side back button */
    window.eqGoBack = function(){
      /* The catalog card click set a hash like #catalog-mine on the index page
         before navigating, so history.back() restores that state naturally */
      if (window.history.length > 1) {
        window.history.back();
      } else {
        /* Fallback: direct navigation to catalog with correct division */
        window.location.href = '../index.html#catalog-' + (divName || 'all');
      }
    };

    /* === Hero: галерея + заголовок === */
    var galleryHtml = '<div class="eq-main-img" id="eq-main-img">';
    if (normImages.length) {
      galleryHtml += '<img src="'+ normImages[0] +'" alt="'+ escapeAttr(title) +'" id="eq-main-img-tag" decoding="async">';
      galleryHtml += '<div class="eq-zoom-hint">'+ t.zoom_hint +'</div>';
    } else {
      galleryHtml += '<div style="color:var(--text-3);font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;">MCR Planet · Equipment</div>';
    }
    galleryHtml += '</div>';

    if (normImages.length > 1) {
      galleryHtml += '<div class="eq-thumbs">';
      normImages.forEach(function(src, i){
        galleryHtml += '<img src="'+ src +'" alt="" data-idx="'+ i +'" loading="lazy" decoding="async"' + (i===0?' class="active"':'') + '>';
      });
      galleryHtml += '</div>';
    }

    document.getElementById('eq-gallery').innerHTML = galleryHtml;

    /* Заголовок и описание */
    document.getElementById('eq-tag').textContent = divLabel;
    document.getElementById('eq-title').textContent = title;
    document.getElementById('eq-lead').textContent = desc;
    document.getElementById('eq-cta-top').textContent = t.cta_btn;

    /* === Features === */
    document.getElementById('eq-features-title').textContent = t.features;
    var ulHtml = '';
    points.forEach(function(p){
      ulHtml += '<li>'+ escapeText(p) +'</li>';
    });
    document.getElementById('eq-features').innerHTML = ulHtml;

    /* === Specs === */
    var specsBlock = document.getElementById('eq-specs-block');
    if (item.specs && item.specs.headers_en && item.specs.rows) {
      var sp = item.specs;
      var headers = sp['headers_'+lang] || sp.headers_en;
      var sTitle  = sp['title_'+lang]   || sp.title_en || t.specs;

      var html = '<h2 class="eq-section-title">'+ escapeText(sTitle) +'</h2>';
      html += '<div class="eq-specs-wrap"><table class="eq-specs-table"><thead><tr>';
      headers.forEach(function(h){ html += '<th>'+ escapeText(h) +'</th>'; });
      html += '</tr></thead><tbody>';
      sp.rows.forEach(function(row){
        html += '<tr>';
        var label = row['label_'+lang] || row.label_en || '';
        html += '<td>'+ escapeText(label) +'</td>';
        html += '<td>'+ escapeText(row.unit || '') +'</td>';
        (row.values || []).forEach(function(v){
          html += '<td>'+ escapeText(v) +'</td>';
        });
        html += '</tr>';
      });
      html += '</tbody></table></div>';
      specsBlock.innerHTML = html;
      specsBlock.style.display = '';
    } else {
      specsBlock.innerHTML = '';
      specsBlock.style.display = 'none';
    }

    /* === Partner === */
    var partnerBlock = document.getElementById('eq-partner-block');
    if (item.partner && (item.partner[lang] || item.partner.en)) {
      partnerBlock.innerHTML =
        '<span class="eq-partner-label">'+ t.partner +'</span>' +
        (item.partner[lang] || item.partner.en);
      partnerBlock.style.display = '';
    } else {
      partnerBlock.innerHTML = '';
      partnerBlock.style.display = 'none';
    }

    /* === Bottom CTA === */
    document.getElementById('eq-cta-title').textContent = t.cta_title;
    document.getElementById('eq-cta-desc').textContent = t.cta_desc;
    document.getElementById('eq-cta-btn').textContent = t.cta_btn;

    /* === Bind gallery thumbs === */
    var mainImg = document.getElementById('eq-main-img-tag');
    document.querySelectorAll('.eq-thumbs img').forEach(function(thumb){
      thumb.addEventListener('click', function(){
        var idx = +this.getAttribute('data-idx');
        if (mainImg) mainImg.src = normImages[idx];
        document.querySelectorAll('.eq-thumbs img').forEach(function(t){ t.classList.remove('active'); });
        this.classList.add('active');
      });
    });

    /* === Lightbox === */
    var mainImgWrap = document.getElementById('eq-main-img');
    if (mainImgWrap) {
      mainImgWrap.addEventListener('click', function(){
        var src = mainImg ? mainImg.src : '';
        if (!src) return;
        var lb = document.getElementById('eq-lightbox');
        document.getElementById('eq-lightbox-img').src = src;
        lb.classList.add('open');
      });
    }

    /* === CTA-кнопки → переход на главную к форме контактов === */
    var ctaTargets = [
      document.getElementById('eq-cta-top'),
      document.getElementById('eq-cta-btn'),
      document.getElementById('sc-btn')   /* sticky CTA — тоже с авто-interest */
    ];
    ctaTargets.forEach(function(btn){
      if (!btn) return;
      btn.setAttribute('href', '../index.html?contact=1&interest=' + encodeURIComponent(title) + '#contact');
    });
  }

  /* Helpers */
  function escapeText(s){
    if (s == null) return '';
    return String(s).replace(/[<>&]/g, function(ch){
      return {'<':'&lt;','>':'&gt;','&':'&amp;'}[ch];
    });
  }
  function escapeAttr(s){
    return escapeText(s).replace(/"/g, '&quot;');
  }

  /* Переключатель языка */
  window.eqSetLang = function(l){
    if (['en','es','pl'].indexOf(l) < 0) return;
    lang = l;
    try { localStorage.setItem('mcr_lang', l); } catch(e){}
    document.querySelectorAll('[data-lang]').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-lang') === l);
    });
    render();
  };

  /* Тема */
  window.eqToggleTheme = function(){
    var isLight = document.documentElement.className === 'light';
    document.documentElement.className = isLight ? '' : 'light';
    try { localStorage.setItem('mcr_theme', isLight ? '0' : '1'); } catch(e){}
  };

  /* Мобильное меню (burger drawer) */
  window.eqToggleMenu = function(){
    var n=document.getElementById('eqMobileNav'),o=document.getElementById('eqMobOverlay'),b=document.getElementById('eq-burger');
    if(!n) return;
    var open=n.classList.toggle('open');
    if(o) o.classList.toggle('open',open);
    if(b){ b.classList.toggle('open',open); b.setAttribute('aria-expanded',open?'true':'false'); }
    n.setAttribute('aria-hidden',open?'false':'true');
    document.body.style.overflow=open?'hidden':'';
  };
  window.eqCloseMenu = function(){
    var n=document.getElementById('eqMobileNav'),o=document.getElementById('eqMobOverlay'),b=document.getElementById('eq-burger');
    if(n){ n.classList.remove('open'); n.setAttribute('aria-hidden','true'); }
    if(o) o.classList.remove('open');
    if(b){ b.classList.remove('open'); b.setAttribute('aria-expanded','false'); }
    document.body.style.overflow='';
  };

  /* Lightbox close */
  window.eqCloseLightbox = function(){
    var lb = document.getElementById('eq-lightbox');
    if (lb) lb.classList.remove('open');
  };

  /* Init when DOM ready and CATALOGUE loaded */
  function init(){
    /* Активная кнопка языка */
    document.querySelectorAll('[data-lang]').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
    });

    /* Sticky CTA bar: показываем после 600px скролла */
    var stickyEl = document.getElementById('sticky-cta');
    if (stickyEl) {
      var ticking = false;
      function updateSticky(){
        var sy = window.pageYOffset || document.documentElement.scrollTop;
        var de = document.documentElement;
        var docH = (de.scrollHeight || document.body.scrollHeight) - window.innerHeight;
        /* Показываем после 600px, но прячем на последних 200px (юзер уже видит CTA внизу) */
        if (sy > 600 && (docH - sy) > 200) {
          stickyEl.classList.add('visible');
        } else {
          stickyEl.classList.remove('visible');
        }
        ticking = false;
      }
      window.addEventListener('scroll', function(){
        if (!ticking) {
          requestAnimationFrame(updateSticky);
          ticking = true;
        }
      }, { passive: true });
    }

    /* Keyboard navigation */
    document.addEventListener('keydown', function(e){
      /* Игнорируем если юзер в input */
      var tag = (e.target && e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      var lb = document.getElementById('eq-lightbox');
      var lbOpen = lb && lb.style.display && lb.style.display !== 'none';

      /* Esc — закрыть lightbox если открыт, иначе назад */
      if (e.key === 'Escape') {
        if (lbOpen) { window.eqCloseLightbox(); return; }
        if (typeof window.eqGoBack === 'function') { window.eqGoBack(); return; }
      }

      /* Если lightbox открыт — остальные клавиши не обрабатываем */
      if (lbOpen) return;

      /* ← — назад */
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (typeof window.eqGoBack === 'function') window.eqGoBack();
      }

      /* → — следующий товар в том же division */
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        var curId = getParam('id');
        var curFound = findItem(curId);
        if (!curFound) return;
        var divArr = window.CATALOGUE[curFound.division] || [];
        var curIdx = -1;
        for (var i = 0; i < divArr.length; i++) {
          if (divArr[i].id === curId) { curIdx = i; break; }
        }
        if (curIdx === -1) return;
        var nextIdx = (curIdx + 1) % divArr.length;
        window.location.href = '?id=' + encodeURIComponent(divArr[nextIdx].id);
      }
    });

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
