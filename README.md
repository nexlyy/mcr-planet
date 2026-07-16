# MCR Planet

Corporate website for MCR Planet (MINE & CONSTRUCTION & RECYCLING sp. z o.o.), a supplier of industrial equipment for mining, recycling and construction across the EU. Live at [mcrplanet.com](https://mcrplanet.com).

It is a static site, no build step and no framework. Plain HTML, CSS and vanilla JavaScript, served straight from a folder. The whole thing runs in three languages (English, Spanish, Polish) and is tuned fairly hard for load speed and SEO.

## What's in it

- Full trilingual UI (EN / ES / PL) with the choice saved in `localStorage`
- Equipment catalogue split into three divisions (mine, recycling, construction), with an overlay browser and per-item pages
- Fuzzy search over both the marketing content and the catalogue (Fuse.js, opens on Ctrl+K)
- A contact form that goes out over EmailJS, with an hCaptcha check and a honeypot field against bots
- Static, pre-rendered product pages under `/products/` in all three languages, generated from the catalogue data so crawlers get real content and `hreflang` instead of a JS-only shell
- Schema.org structured data (Organization, LocalBusiness, Product, Breadcrumbs) for rich snippets
- Client-side PDF brochure generator for any equipment page (jsPDF)
- Light and dark themes
- PWA manifest and a small service worker for offline caching
- Cookieless analytics through Umami, so there is no consent banner to nag anyone

On the performance side: critical CSS is inlined for the first paint, the hero image ships as AVIF/WebP with a responsive `srcset`, fonts are self-hosted with metric-matched fallbacks to avoid layout shift, and the heavier scripts (Fuse.js, hCaptcha, analytics) only load when they are actually needed.

## Layout

```
index.html              home page
qr.html                 QR helper for print / booth material
404.html
pages/
  equipment.html        single-item template, filled by JS from the catalogue
  privacy.html          privacy policy, EN/ES/PL
  terms.html            terms of service, EN/ES/PL
products/               pre-rendered SEO pages (root = EN, /es/, /pl/) + sitemaps
assets/
  css/                  base, layout, components, catalog, equipment, scrollbar
  js/
    01-translations.js  site copy (CONTENT) and UI strings
    02-render.js        rendering, accordions, form handling
    03-search.js        relevance scorer for the main search
    04-catalog.js       catalogue rendering and its own search
    05-global-search.js Fuse.js search across everything
    catalog-data.js     the catalogue itself
    equipment-page.js   logic for pages/equipment.html
    eq-pdf.js           PDF brochure generator
    bot-integrations.js optional backend hooks (form, JS errors, search stats)
  fonts/                self-hosted woff2
media/                  hero and catalogue imagery (avif/webp/jpg)
tools/
  build-products.js     regenerates products/ from catalog-data.js
```

The JS files load in order with `<script defer>` (`01` through `05`). They pass `node --check` on their own, but the execution order matters, so keep it.

## Running it locally

Opening `index.html` by double-clicking will not work. The browser blocks JS and CSS over `file://`, so you need a local server:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. The Live Server extension in VS Code does the same job.

## Configuration

Three third-party services are wired in but left blank. Until you fill them in, the site runs fine and just skips whatever is not configured. The values live in a small `<script>` block in the `<head>` of `index.html`:

```js
window.EMAILJS_PUBLIC_KEY  = "YOUR_PUBLIC_KEY_HERE";
window.EMAILJS_SERVICE_ID  = "YOUR_SERVICE_ID_HERE";
window.EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID_HERE";
window.HCAPTCHA_SITE_KEY   = "10000000-ffff-ffff-ffff-000000000001"; // hCaptcha test key
window.UMAMI_WEBSITE_ID    = "YOUR_UMAMI_WEBSITE_ID_HERE";
```

- **EmailJS** sends the contact form to an inbox. Create a service and a template at [emailjs.com](https://www.emailjs.com), then lock the public key to your domains under Account → Security → Allowed Domains so nobody else can spam through it.
- **hCaptcha** ships with the public test key, which always passes. Swap in a real site key from [hcaptcha.com](https://www.hcaptcha.com) before going live. The widget follows the site's light/dark theme on its own.
- **Umami** is optional analytics. Add a website at [cloud.umami.is](https://cloud.umami.is) and paste the ID. No cookies, no banner.

The privacy and terms pages are already filled in with the company's real details (legal name, address, tax numbers, contact email) across all three language blocks. They follow the usual GDPR structure, but treat them as a starting point rather than legal advice: have a lawyer read them before relying on them.

## Regenerating the product pages

Everything under `products/` is generated. After you edit `assets/js/catalog-data.js`, rebuild it:

```bash
node tools/build-products.js .
```

That rewrites the EN/ES/PL product pages, the index pages and `sitemap.xml` with the right `hreflang` links.

## License

Not open source. The code, copy and imagery belong to MCR Planet (MINE & CONSTRUCTION & RECYCLING sp. z o.o.) and are published here for reference with the owner's permission. Please don't reuse the content or branding without asking.
