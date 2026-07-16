#!/usr/bin/env node
/* MCR Planet — генератор статических страниц товаров из catalog-data.js.
   Зачем: equipment.html рендерится JS-ом на клиенте, поисковики видят пустой
   каркас. Статические страницы (EN/ES/PL) дают краулерам полный контент,
   hreflang и Product-схему.

   Запуск:  node tools/build-products.js [корень сайта]
   Пишет:   products/{id}.html, products/{es,pl}/{id}.html,
            products/[{es,pl}/]index.html, sitemap.xml

   Перегенерировать после любого изменения catalog-data.js. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.argv[2] || path.join(__dirname, '..');
const SITE = 'https://mcrplanet.com';
const LANGS = ['en', 'es', 'pl'];
const TODAY = new Date().toISOString().slice(0, 10);

/* --- словарь UI-строк --- */
const T = {
  en: {
    home: 'Home', catalogue: 'Catalogue', features: 'Key Features',
    cta: 'Request Information →', ctaTitle: 'Interested in this equipment?',
    ctaDesc: 'Send us a request — we reply within one business day.',
    related: 'Related equipment', backCat: '← Full catalogue',
    idxTitle: 'Equipment Catalogue', idxDesc: 'Industrial equipment for mining, construction and recycling — vibrating screens, crushers, feeders, conveyors, spare parts.',
    div: { mine: 'Mine Division', recycling: 'Recycling Division' }
  },
  es: {
    home: 'Inicio', catalogue: 'Catálogo', features: 'Características principales',
    cta: 'Solicitar información →', ctaTitle: '¿Le interesa este equipo?',
    ctaDesc: 'Envíenos una solicitud — respondemos en un día laborable.',
    related: 'Equipos relacionados', backCat: '← Catálogo completo',
    idxTitle: 'Catálogo de equipos', idxDesc: 'Equipos industriales para minería, construcción y reciclaje — cribas vibratorias, trituradoras, alimentadores, transportadores, repuestos.',
    div: { mine: 'División Minería', recycling: 'División Reciclaje' }
  },
  pl: {
    home: 'Strona główna', catalogue: 'Katalog', features: 'Kluczowe cechy',
    cta: 'Zapytaj o produkt →', ctaTitle: 'Zainteresowany tym urządzeniem?',
    ctaDesc: 'Wyślij zapytanie — odpowiadamy w ciągu jednego dnia roboczego.',
    related: 'Powiązane urządzenia', backCat: '← Pełny katalog',
    idxTitle: 'Katalog urządzeń', idxDesc: 'Urządzenia przemysłowe dla górnictwa, budownictwa i recyklingu — przesiewacze wibracyjne, kruszarki, podajniki, przenośniki, części zamienne.',
    div: { mine: 'Dział Górnictwo', recycling: 'Dział Recykling' }
  }
};

/* --- загрузка каталога --- */
const dataSrc = fs.readFileSync(path.join(ROOT, 'assets/js/catalog-data.js'), 'utf8');
const ctx = {};
vm.runInNewContext(dataSrc, ctx);
const CATALOGUE = ctx.CATALOGUE;
if (!CATALOGUE) throw new Error('CATALOGUE not found in catalog-data.js');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pageUrl(lang, id) {
  const dir = lang === 'en' ? '/products/' : `/products/${lang}/`;
  return dir + (id ? id + '.html' : '');
}

function truncDesc(item, lang) {
  const s = item['short_' + lang] || item.short_en || '';
  const d = item['desc_' + lang] || item.desc_en || '';
  let out = (s + ' ' + d).trim();
  if (out.length > 155) out = out.slice(0, 152).replace(/\s+\S*$/, '') + '…';
  return out;
}

function imgSet(item) {
  const jpg = '/' + (item.images && item.images[0] || item.image || '');
  return {
    jpg,
    webp: jpg.replace(/\.(jpe?g|png)$/i, '.webp'),
    avif: jpg.replace(/\.(jpe?g|png)$/i, '.avif'),
    abs: SITE + jpg
  };
}

function hreflangLinks(id) {
  let out = LANGS.map(l =>
    `<link rel="alternate" hreflang="${l}" href="${SITE}${pageUrl(l, id)}">`
  ).join('\n');
  out += `\n<link rel="alternate" hreflang="x-default" href="${SITE}${pageUrl('en', id)}">`;
  return out;
}

/* --- общий каркас страницы --- */
function shell({ lang, title, desc, canonical, hreflang, ogImage, ogType, body, jsonld }) {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#c9a84c">
<title>${esc(title)} — MCR Planet</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
${hreflang}
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="MCR Planet">
<meta property="og:title" content="${esc(title)} — MCR Planet">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${ogImage}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${lang === 'en' ? 'en_US' : lang === 'es' ? 'es_ES' : 'pl_PL'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)} — MCR Planet">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${ogImage}">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<script>
  try {
    var t = localStorage.getItem('mcr_theme');
    if (t === '1' || t === 'light' ||
        (!t && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches)) {
      document.documentElement.className = 'light';
    }
  } catch (e) {}
</script>
<link href="/assets/fonts/fonts.css" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/scrollbar.css">
<link rel="stylesheet" href="/assets/css/equipment.css?v=20260605">
<script type="application/ld+json">
${JSON.stringify(jsonld, null, 1)}
</script>
</head>
<body>
${body}
</body>
</html>
`;
}

function nav(lang, id) {
  const links = LANGS.map(l => {
    const cls = l === lang ? 'lang-btn active' : 'lang-btn';
    const label = { en: 'ENG', es: 'ESP', pl: 'POL' }[l];
    return `<a class="${cls}" style="text-decoration:none;" href="${pageUrl(l, id)}">${label}</a>`;
  }).join('<span class="lang-sep">/</span>');
  return `<nav class="eq-nav">
  <a href="/" class="eq-nav-logo">MCR Planet</a>
  <div class="eq-nav-right">
    <div class="nav-lang">${links}</div>
  </div>
</nav>`;
}

function crumbs(lang, title) {
  const t = T[lang];
  return `<div class="eq-crumbs"><a href="/">${t.home}</a> / <a href="${pageUrl(lang, 'index')}">${t.catalogue}</a> / ${esc(title)}</div>`;
}

/* --- страница товара --- */
function productPage(item, division, lang, siblings) {
  const t = T[lang];
  const title = item['title_' + lang] || item.title_en;
  const short = item['short_' + lang] || item.short_en || '';
  const desc = item['desc_' + lang] || item.desc_en || '';
  const points = item['points_' + lang] || item.points_en || [];
  const options = item['options_' + lang] || item.options_en || [];
  const optTitle = item['options_title_' + lang] || item.options_title_en || '';
  const partner = item.partner && (item.partner[lang] || item.partner.en) || '';
  const img = imgSet(item);
  const canonical = SITE + pageUrl(lang, item.id);
  const ctaHref = '/?contact=1&interest=' + encodeURIComponent(title) + '#contact';

  const related = siblings.filter(s => s.id !== item.id).slice(0, 3);
  const relatedHtml = related.length ? `
  <section id="eq-related">
    <h2 class="eq-section-title">${t.related}</h2>
    <div class="eq-related-grid">
${related.map(r => {
    const rt = r['title_' + lang] || r.title_en;
    const rs = r['short_' + lang] || r.short_en || '';
    const ri = imgSet(r);
    return `      <a class="eq-rel-card" href="${pageUrl(lang, r.id)}">
        <div class="rel-img"><img src="${ri.webp}" alt="${esc(rt)}" loading="lazy" decoding="async"></div>
        <div class="rel-body">
          <span class="rel-tag">${t.div[division]}</span>
          <h3 class="rel-title">${esc(rt)}</h3>
          <p class="rel-desc">${esc(rs)}</p>
        </div>
      </a>`;
  }).join('\n')}
    </div>
  </section>` : '';

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': canonical + '#product',
        name: title,
        description: (short + ' ' + desc).trim(),
        image: [img.abs],
        url: canonical,
        inLanguage: lang,
        category: t.div[division],
        brand: { '@type': 'Brand', name: 'MCR Planet' },
        manufacturer: { '@id': SITE + '/#organization' }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t.home, item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: t.catalogue, item: SITE + pageUrl(lang, 'index') },
          { '@type': 'ListItem', position: 3, name: title, item: canonical }
        ]
      }
    ]
  };

  const body = `${nav(lang, item.id)}
${crumbs(lang, title)}
<div id="eq-root">
  <section class="eq-hero">
    <div class="eq-gallery">
      <div class="eq-main-img" style="cursor:default;">
        <picture style="width:100%;height:100%;display:block;">
          <source type="image/avif" srcset="${img.avif}">
          <source type="image/webp" srcset="${img.webp}">
          <img src="${img.jpg}" alt="${esc(title)}" decoding="async" fetchpriority="high">
        </picture>
      </div>
    </div>
    <div class="eq-info">
      <div class="eq-tag">${t.div[division]}</div>
      <h1 class="eq-title">${esc(title)}</h1>
      <p class="eq-lead">${esc(short)}</p>
      <div class="eq-cta-group">
        <a class="eq-cta" href="${ctaHref}">${t.cta}</a>
      </div>
    </div>
  </section>

  <section class="eq-content">
    <p class="eq-lead">${esc(desc)}</p>

    ${points.length ? `<h2 class="eq-section-title">${t.features}</h2>
    <ul class="eq-features">
${points.map(p => `      <li>${esc(p)}</li>`).join('\n')}
    </ul>` : ''}

    ${options.length ? `<h2 class="eq-section-title">${esc(optTitle)}</h2>
    <ul class="eq-features">
${options.map(o => `      <li>${esc(o)}</li>`).join('\n')}
    </ul>` : ''}

    ${partner ? `<div class="eq-partner">${partner}</div>` : ''}

    <div class="eq-bottom-cta">
      <h3>${t.ctaTitle}</h3>
      <p>${t.ctaDesc}</p>
      <a class="eq-cta" href="${ctaHref}">${t.cta}</a>
    </div>
${relatedHtml}
    <p style="margin-top:2rem;"><a href="${pageUrl(lang, 'index')}">${t.backCat}</a></p>
  </section>
</div>`;

  return shell({
    lang, title,
    desc: truncDesc(item, lang),
    canonical,
    hreflang: hreflangLinks(item.id),
    ogImage: img.abs,
    ogType: 'product',
    body, jsonld
  });
}

/* --- индекс каталога --- */
function indexPage(lang) {
  const t = T[lang];
  const canonical = SITE + pageUrl(lang, 'index');

  const sections = Object.keys(CATALOGUE).map(div => {
    const items = CATALOGUE[div] || [];
    return `  <section>
    <h2 class="eq-section-title">${t.div[div]}</h2>
    <div class="eq-related-grid">
${items.map(item => {
      const it = item['title_' + lang] || item.title_en;
      const is = item['short_' + lang] || item.short_en || '';
      const ii = imgSet(item);
      return `      <a class="eq-rel-card" href="${pageUrl(lang, item.id)}">
        <div class="rel-img"><img src="${ii.webp}" alt="${esc(it)}" loading="lazy" decoding="async"></div>
        <div class="rel-body">
          <span class="rel-tag">${t.div[div]}</span>
          <h3 class="rel-title">${esc(it)}</h3>
          <p class="rel-desc">${esc(is)}</p>
        </div>
      </a>`;
    }).join('\n')}
    </div>
  </section>`;
  }).join('\n');

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t.idxTitle + ' — MCR Planet',
    description: t.idxDesc,
    url: canonical,
    inLanguage: lang,
    isPartOf: { '@id': SITE + '/#organization' }
  };

  const body = `${nav(lang, 'index')}
${crumbs(lang, t.catalogue)}
<div id="eq-root">
  <section class="eq-content">
    <h1 class="eq-title">${t.idxTitle}</h1>
    <p class="eq-lead">${t.idxDesc}</p>
${sections}
  </section>
</div>`;

  return shell({
    lang,
    title: t.idxTitle,
    desc: t.idxDesc,
    canonical,
    hreflang: hreflangLinks('index'),
    ogImage: SITE + '/media/og-image.jpg',
    ogType: 'website',
    body, jsonld
  });
}

/* --- sitemap --- */
function sitemap(productIds) {
  const urls = [];
  const add = (loc, lastmod, alternates) => urls.push({ loc, lastmod, alternates });

  add(SITE + '/', TODAY);
  add(SITE + '/pages/privacy.html', '2026-04-24');
  add(SITE + '/pages/terms.html', '2026-04-24');
  for (const id of ['index', ...productIds]) {
    for (const lang of LANGS) {
      add(SITE + pageUrl(lang, id), TODAY, id);
    }
  }

  const body = urls.map(u => {
    let alt = '';
    if (u.alternates !== undefined) {
      alt = LANGS.map(l =>
        `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${pageUrl(l, u.alternates)}"/>`
      ).join('\n') +
      `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${pageUrl('en', u.alternates)}"/>`;
    }
    return `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>${alt ? '\n' + alt : ''}
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>
`;
}

/* --- сборка --- */
const outEn = path.join(ROOT, 'products');
for (const lang of LANGS) {
  const dir = lang === 'en' ? outEn : path.join(outEn, lang);
  fs.mkdirSync(dir, { recursive: true });
}

const ids = [];
let count = 0;
for (const div of Object.keys(CATALOGUE)) {
  const items = CATALOGUE[div] || [];
  for (const item of items) {
    ids.push(item.id);
    for (const lang of LANGS) {
      const dir = lang === 'en' ? outEn : path.join(outEn, lang);
      fs.writeFileSync(path.join(dir, item.id + '.html'), productPage(item, div, lang, items));
      count++;
    }
  }
}
for (const lang of LANGS) {
  const dir = lang === 'en' ? outEn : path.join(outEn, lang);
  fs.writeFileSync(path.join(dir, 'index.html'), indexPage(lang));
  count++;
}
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap(ids));
console.log(`${count} pages + sitemap.xml (${ids.length} products x ${LANGS.length} langs)`);
