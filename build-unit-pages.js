#!/usr/bin/env node
/* Builds one searchable page per vacant unit, plus sitemap.xml and robots.txt.

   Why: the pop-up details on the home page can't be found on Google. These static pages can.
   Run it after a lease is signed or a unit is listed (a nightly cron job is enough).
   Needs Node 18+. No packages to install.

   Usage:
     SITE_URL=https://yourdomain.co.ke API_URL=https://api.yourdomain.co.ke/api node build-unit-pages.js

   Optional: OUT_DIR (default ./units), WHATSAPP (e.g. 254712345678), SITE_NAME (default Residia)
   Units that are no longer vacant have their page deleted, so rented listings disappear from search. */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SITE_URL = (process.env.SITE_URL || '').replace(/\/+$/, '');
const API_URL = (process.env.API_URL || '').replace(/\/+$/, '');
const OUT_DIR = path.resolve(process.env.OUT_DIR || './units');
const SITE_ROOT = path.dirname(OUT_DIR);               // sitemap.xml and robots.txt go next to the units folder
const WHATSAPP = (process.env.WHATSAPP || '').replace(/\D/g, '');
const SITE_NAME = process.env.SITE_NAME || 'Residia';
if (!SITE_URL || !API_URL) { console.error('Set SITE_URL and API_URL, e.g. SITE_URL=https://example.co.ke API_URL=https://api.example.co.ke/api'); process.exit(1); }

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => 'KES ' + Number(n || 0).toLocaleString('en-KE');
const safeUrl = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u.trim())) ? u.trim() : '';
const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
// Must match the home page: id = _id || id || "propertyName|label"
const uid = (u) => String(u._id || u.id || ((u.property || {}).name || '') + '|' + (u.label || ''));
const slug = (u) => [slugify((u.property || {}).name), slugify(u.label), crypto.createHash('md5').update(uid(u)).digest('hex').slice(0, 6)].filter(Boolean).join('-');

function page(u) {
  const p = u.property || {};
  const title = (p.name || 'Property') + ' · Unit ' + (u.label || '');
  const kind = u.type || 'Home';
  const beds = u.bedrooms ? u.bedrooms + (u.bedrooms === 1 ? ' bedroom' : ' bedrooms') : '';
  const baths = u.bathrooms ? u.bathrooms + (u.bathrooms === 1 ? ' bathroom' : ' bathrooms') : '';
  const facts = [beds, baths].filter(Boolean).join(' · ');
  const area = u.neighbourhood || p.neighbourhood || '';
  const images = (Array.isArray(u.images) && u.images.length ? u.images : (u.image ? [u.image] : [])).map(safeUrl).filter(Boolean).slice(0, 6);
  const url = SITE_URL + '/units/' + slug(u) + '.html';
  const desc = (kind + ' to rent in ' + (p.location || 'Kenya') + ' — ' + [facts, money(u.rent) + ' a month'].filter(Boolean).join(', ') + '. ' + (u.description || '')).slice(0, 300).trim();
  const ld = { '@context': 'https://schema.org', '@type': 'Apartment', name: title, description: u.description || undefined, numberOfRooms: u.bedrooms || undefined,
    image: images.length ? images : undefined, address: { '@type': 'PostalAddress', addressLocality: p.location, addressCountry: 'KE' },
    offers: { '@type': 'Offer', price: u.rent, priceCurrency: 'KES', availability: 'https://schema.org/InStock', url: url } };
  const home = SITE_URL + '/#unit=' + encodeURIComponent(uid(u));
  const wa = WHATSAPP ? '<a class="btn wa" href="https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('Hello, I am interested in ' + title + ' (' + money(u.rent) + '/month).') + '" rel="noopener">WhatsApp us</a>' : '';
  return '<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<script>(function(){try{document.documentElement.setAttribute("data-theme",localStorage.getItem("residia_theme")==="light"?"light":"dark")}catch(e){document.documentElement.setAttribute("data-theme","dark")}})();</script>\n' +
    '<link rel="icon" type="image/svg+xml" href="' + esc(SITE_URL) + '/logo-mark.svg">\n' +
    '<title>' + esc(title + ' — ' + kind + ' to rent in ' + (p.location || 'Kenya') + ' | ' + SITE_NAME) + '</title>\n' +
    '<meta name="description" content="' + esc(desc) + '"><link rel="canonical" href="' + esc(url) + '">\n' +
    '<meta property="og:type" content="website"><meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="' + esc(desc) + '"><meta property="og:url" content="' + esc(url) + '">' +
    (images[0] ? '<meta property="og:image" content="' + esc(images[0]) + '">' : '') + '\n' +
    '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script>\n' +
    '<style>:root{--bg:#0a0a0a;--panel:#141414;--line:#262626;--tx:#f5f5f5;--mut:#a3a3a3;--red:#e11d2e;--red2:#ff3b4a;color-scheme:dark}' +
    ':root[data-theme=light]{--bg:#fafaf7;--panel:#fff;--line:#e4e4df;--tx:#161616;--mut:#5f5f5f;--red2:#c4121f;color-scheme:light}' +
    '*{box-sizing:border-box;margin:0}body{background:var(--bg);color:var(--tx);font:15px/1.7 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    'header{display:flex;justify-content:space-between;align-items:center;padding:16px 6vw;border-bottom:1px solid var(--line)}header a{color:inherit;text-decoration:none}.logo{font:600 24px Georgia,serif}.lt:after{content:".";color:var(--red)}.logo{display:inline-flex;align-items:center;gap:10px}.lm{width:30px;height:30px;border-radius:8px}' +
    'main{max-width:820px;margin:0 auto;padding:36px 6vw 70px}h1{font:600 clamp(28px,5vw,40px)/1.15 Georgia,serif;margin-bottom:6px}.mut{color:var(--mut)}.price{color:var(--red2);font-weight:700;font-size:24px;margin:10px 0}' +
    '.gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;margin:22px 0}.gal img{width:100%;height:190px;object-fit:cover;border-radius:12px;display:block}' +
    '.btn{display:inline-block;background:var(--red);color:#fff;border-radius:10px;padding:12px 22px;font-weight:600;text-decoration:none;margin:6px 8px 0 0}.btn.ghost{background:none;border:1px solid var(--line);color:var(--tx)}.btn.wa{background:#128c4a}' +
    'h2{font:600 20px Georgia,serif;margin:26px 0 6px}a:focus-visible{outline:2px solid var(--red2);outline-offset:3px}</style></head><body>\n' +
    '<header><a class="logo" href="' + esc(SITE_URL) + '/"><img class="lm" src="' + esc(SITE_URL) + '/logo-mark.svg" alt="" width="30" height="30"><span class="lt">' + esc(SITE_NAME) + '</span></a><a class="mut" href="' + esc(SITE_URL) + '/#vacancies">All vacancies</a></header>\n' +
    '<main><p class="mut">' + esc(kind) + ' · ' + esc(p.location || '') + '</p><h1>' + esc(title) + '</h1>' +
    '<div class="price">' + esc(money(u.rent)) + ' <span class="mut" style="font-size:15px;font-weight:400">/ month</span></div>' +
    (facts ? '<p class="mut">' + esc(facts) + '</p>' : '') +
    (images.length ? '<div class="gal">' + images.map((src, i) => '<img src="' + esc(src) + '" alt="' + esc(title + ' — photo ' + (i + 1)) + '" loading="lazy" width="400" height="190">').join('') + '</div>' : '') +
    (u.description ? '<p>' + esc(u.description) + '</p>' : '') +
    (area ? '<h2>About the area</h2><p>' + esc(area) + '</p>' : '') +
    '<p style="margin-top:24px"><a class="btn" href="' + esc(home) + '">Book a viewing</a>' + wa + '<a class="btn ghost" href="' + esc(SITE_URL) + '/#vacancies">See other units</a></p>' +
    '</main></body></html>\n';
}

(async () => {
  const res = await fetch(API_URL + '/units/vacant', { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error('API responded ' + res.status);
  const data = await res.json();
  const units = Array.isArray(data) ? data : (data.units || []);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const written = new Set(), urls = [];
  for (const u of units) {
    const file = slug(u) + '.html';
    fs.writeFileSync(path.join(OUT_DIR, file), page(u));
    written.add(file); urls.push(SITE_URL + '/units/' + file);
  }
  // Remove pages for units that are no longer vacant
  let removed = 0;
  for (const f of fs.readdirSync(OUT_DIR)) if (f.endsWith('.html') && !written.has(f)) { fs.unlinkSync(path.join(OUT_DIR, f)); removed++; }

  const today = new Date().toISOString().slice(0, 10);
  const all = [SITE_URL + '/', SITE_URL + '/guides.html', SITE_URL + '/privacy.html'].concat(urls);
  fs.writeFileSync(path.join(SITE_ROOT, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    all.map((u) => '  <url><loc>' + esc(u) + '</loc><lastmod>' + today + '</lastmod></url>').join('\n') + '\n</urlset>\n');
  fs.writeFileSync(path.join(SITE_ROOT, 'robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: ' + SITE_URL + '/sitemap.xml\n');
  console.log('Wrote ' + written.size + ' unit page(s), removed ' + removed + ', sitemap with ' + all.length + ' URLs.');
})().catch((e) => { console.error('Build failed: ' + e.message); process.exit(1); });
