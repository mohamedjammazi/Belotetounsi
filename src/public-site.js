/* ==========================================================================
   FILE: /src/public-site.js  —  v6 «الدومين من البانل»
   /api/admin/site  GET/POST/RESET  →  canonical + sitemap + robots + manifest
   + تحويل 301 للدومين القديم  + استبدال {{DOMAIN}} {{EMAIL}} ... في كل الصفحات
========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const store = require('./store');
const { SITE_DEFAULTS, NAV, FOOT, P } = require('./content');

const DATA_DIR = path.join(__dirname, 'data');
const MSG_FILE = path.join(DATA_DIR, 'messages.json');
function readMsgs() { try { return JSON.parse(fs.readFileSync(MSG_FILE, 'utf8')); } catch (e) { return []; } }
function writeMsgs(a) { try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(MSG_FILE, JSON.stringify(a.slice(-2000))); } catch (e) {} }

const NONCES = new Map();
const cleaner = setInterval(() => { const t = Date.now(); for (const [k, v] of NONCES) if (t - v.ts > 20 * 60000) NONCES.delete(k); }, 60000);
if (cleaner.unref) cleaner.unref();

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function adminPass() {
  const p = store.settings().security.adminPasscode;
  if (p && String(p).length) return String(p);
  let cfg = null; try { cfg = require('./config').ADMIN_PASSCODE; } catch (e) {}
  if (cfg) return String(cfg);
  return String(process.env.ADMIN_PASSCODE || '');
}
function requireAdmin(req, res, next) {
  const expected = adminPass(); const got = String(req.headers['x-admin-passcode'] || '');
  const a = Buffer.from(got), b = Buffer.from(expected);
  if (!b.length || a.length !== b.length || !require('crypto').timingSafeEqual(a, b)) return res.status(401).json({ ok: false, error: 'كلمة سر الأدمن غالطة' });
  next();
}
function normalizeDomain(v) {
  let raw = String(v || '').trim();
  if (!raw) return SITE_DEFAULTS.domain;
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || u.username || u.password || u.port || (u.pathname && u.pathname !== '/') || u.search || u.hash) return '';
    const host = u.hostname.toLowerCase();
    if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(host)) return '';
    return 'https://' + host;
  } catch (e) { return ''; }
}
function safeExtraHead(value) {
  const allowed = new Set(['google-site-verification','msvalidate.01','yandex-verification','p:domain_verify','facebook-domain-verification']);
  const out = [];
  for (const tag of String(value || '').match(/<meta\b[^>]*>/gi) || []) {
    const attrs = {}; const re = /([a-zA-Z][\w-]*)\s*=\s*([\"'])(.*?)\2/g; let m;
    while ((m = re.exec(tag))) attrs[m[1].toLowerCase()] = m[3];
    const name = String(attrs.name || '').toLowerCase(); const content = String(attrs.content || '').trim();
    if (allowed.has(name) && content && content.length <= 256 && !/[<>\\]/.test(content)) out.push('<meta name=\"' + name + '\" content=\"' + esc(content) + '\">');
  }
  return out.join('\n');
}
function getSite() {
  const saved = (store.settings().site) || {};
  const s = Object.assign({}, SITE_DEFAULTS, saved);
  s.domain = normalizeDomain(s.domain);
  let host = s.domain.replace(/^https?:\/\//i, '');
  if (s.wwwMode === 'www' && !host.startsWith('www.')) host = 'www.' + host;
  if (s.wwwMode === 'apex') host = host.replace(/^www\./i, '');
  s.domain = s.domain.replace(/\/\/[^/]+/, '//' + host);
  s.host = host;
  s.name = String(s.name || SITE_DEFAULTS.name);
  s.short = String(s.short || SITE_DEFAULTS.short);
  s.email = String(s.email || SITE_DEFAULTS.email);
  s.city = String(s.city || SITE_DEFAULTS.city);
  s.logo = String(s.logo || SITE_DEFAULTS.logo);
  s.updated = String(s.updated || SITE_DEFAULTS.updated);
  return s;
}
function fill(text, s) {
  return String(text == null ? '' : text)
    .split('{{DOMAIN}}').join(s.domain)
    .split('{{EMAIL}}').join(s.email)
    .split('{{NAME}}').join(s.name)
    .split('{{SHORT}}').join(s.short)
    .split('{{CITY}}').join(s.city)
    .split('{{UPDATED}}').join(s.updated)
    .split('{{LOGO}}').join(s.logo);
}
function validPublisherId(value) { return /^ca-pub-\d{6,32}$/.test(String(value || '')); }
function headTags(req) {
  const a = store.settings().ads || {};
  const tags = [];
  const adsAllowed = !!a.enabled && !a.testMode && consentGiven(req);
  if (adsAllowed && validPublisherId(a.publisherId) && a.loadHeadScript !== false) tags.push('<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(a.publisherId) + '" crossorigin="anonymous"></script>');
  if (validPublisherId(a.publisherId) && a.verificationMeta) tags.push('<meta name="google-adsense-account" content="' + esc(a.publisherId) + '">');
  if (adsAllowed && a.medianetEnabled && a.medianetCustomerId) tags.push('<script src="https://contextual.media.net/dmedianet.js?cid=' + encodeURIComponent(String(a.medianetCustomerId)) + '" async></script>');
  if (adsAllowed && a.infolinksEnabled) {
    const ilPid = /^[A-Za-z0-9_-]{1,64}$/.test(String(a.infolinksPid || '')) ? String(a.infolinksPid) : '';
    const ilWlid = /^[A-Za-z0-9_-]{1,64}$/.test(String(a.infolinksWlid || '')) ? String(a.infolinksWlid) : '';
    tags.push('<script>var IL_PID="' + ilPid + '";var IL_WLID="' + ilWlid + '";</script>');
    tags.push('<script src="https://resources.infolinks.com/js/infolinks_wsb.js" async></script>');
  }
  return tags.join('\n');
}
function h5GameTags(req) {
  const a = store.settings().ads || {};
  if (!a.enabled || a.testMode || !validPublisherId(a.publisherId) || !consentGiven(req)) return '';
  return '<script async data-ad-frequency-hint="30s" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(a.publisherId) + '" crossorigin="anonymous"></script>\n' +
    '<script>window.adsbygoogle=window.adsbygoogle||[];window.adBreak=window.adConfig=function(o){window.adsbygoogle.push(o);};</script>';
}
function adsTxt() {
  const a = store.settings().ads || {};
  const lines = [];
  if (validPublisherId(a.publisherId)) lines.push('google.com, ' + String(a.publisherId) + ', DIRECT, f08c47fec0942fa0');
  if (a.adsTxtExtra) lines.push(String(a.adsTxtExtra).split(/[\r\n]+/).map(x => x.trim()).filter(Boolean).join('\n'));
  return lines.length ? lines.join('\n') + '\n' : '';
}
function consentGiven(req) { return /(?:^|;\s*)bk_consent=1(?:;|$)/.test(String((req && req.headers && req.headers.cookie) || '')); }
function adSlot(req) {
  const a = store.settings().ads || {};
  if (!a.enabled || a.testMode || !validPublisherId(a.publisherId) || !a.adUnitId || !consentGiven(req)) return '<aside class="ad-slot ad-empty" aria-label="مساحة إعلانية"><span>مساحة إعلانية · تظهر بعد الموافقة على الكوكيز وتفعيل الإعلانات</span></aside>';
  return '<aside class="ad-slot" aria-label="إعلان"><ins class="adsbygoogle" style="display:block" data-ad-client="' + esc(a.publisherId) + '" data-ad-slot="' + esc(a.adUnitId) + '" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></aside>';
}
function jsonld(page, url, s) {
  const org = { '@type': 'Organization', '@id': s.domain + '#org', name: s.short, url: s.domain, email: s.email, logo: s.domain + s.logo };
  const site = { '@type': 'WebSite', '@id': s.domain + '#site', url: s.domain, name: s.name, inLanguage: 'ar', publisher: { '@id': s.domain + '#org' } };
  const game = { '@type': 'Game', name: s.short, url: s.domain + '/play', gamePlatform: 'Web browser', numberOfPlayers: { '@type': 'QuantitativeValue', value: 4 }, inLanguage: 'ar', isAccessibleForFree: true, publisher: { '@id': s.domain + '#org' } };
  const crumbs = { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'الرئيسية', item: s.domain + '/' }] };
  if (page.slug) crumbs.itemListElement.push({ '@type': 'ListItem', position: 2, name: page.h1, item: url });
  const graph = [org, site, game, crumbs];
  if (page.faq) graph.push({ '@type': 'FAQPage', mainEntity: page.items.map(it => ({ '@type': 'Question', name: it[0], acceptedAnswer: { '@type': 'Answer', text: it[1] } })) });
  if (['rules', 'scoring', 'guide', 'glossary'].indexOf(page.slug) !== -1) graph.push({ '@type': 'Article', headline: fill(page.title, s), description: fill(page.desc, s), inLanguage: 'ar', dateModified: s.updated, author: { '@id': s.domain + '#org' }, mainEntityOfPage: url });
  return '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }) + '</script>';
}
function layout(page, req) {
  const s = getSite();
  const url = s.domain + '/' + page.slug;
  const title = fill(page.title, s), desc = fill(page.desc, s), kicker = fill(page.kicker || '', s), h1 = fill(page.h1, s);
  const navHtml = NAV.map(n => '<a href="' + n.href + '" class="' + (('/' + page.slug) === n.href ? 'on' : '') + '">' + n.label + '</a>').join('');
  const footHtml = FOOT.map(n => '<a href="' + n.href + '">' + n.label + '</a>').join('');
  const body = page.faq
    ? '<div class="crumbs"><a href="/">الرئيسية</a> <span>›</span> الأسئلة الشائعة</div><div class="faq">' +
      page.items.map((it, i) => '<details class="faq-item"' + (i < 3 ? ' open' : '') + '><summary class="faq-q"><span>' + esc(it[0]) + '</span><i aria-hidden="true">+</i></summary><div class="faq-a"><p>' + esc(it[1]) + '</p></div></details>').join('') +
      '</div><div class="cta-band small"><div><h3>ما لقيتش جوابك؟</h3><p>ابعثلنا رسالة ونجاوبوك</p></div><a class="btn btn-gold" href="/contact">✉️ اتصل بنا</a></div>'
    : fill(page.body, s);
  const boot = 'window.__SITE=' + JSON.stringify({ domain: s.domain, email: s.email, name: s.name, short: s.short }).replace(/</g, '\\u003c') + ';';
  return '<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>' + esc(title) + '</title>\n<meta name="description" content="' + esc(desc) + '">\n<link rel="canonical" href="' + url + '">\n<meta name="theme-color" content="#062a18">\n<meta name="robots" content="index,follow,max-image-preview:large">\n<meta property="og:type" content="website"><meta property="og:locale" content="ar_TN">\n<meta property="og:site_name" content="' + esc(s.short) + '">\n<meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="' + esc(desc) + '">\n<meta property="og:url" content="' + url + '"><meta property="og:image" content="' + s.domain + s.logo + '">\n<meta name="twitter:card" content="summary_large_image">\n' + (s.twitter ? '<meta name="twitter:site" content="' + esc(s.twitter) + '">\n' : '') + '<link rel="icon" type="image/svg+xml" href="' + esc(s.logo) + '">\n<link rel="apple-touch-icon" href="' + esc(s.logo) + '">\n<link rel="manifest" href="/manifest.json">\n' + headTags(req) + '\n' + safeExtraHead(s.extraHead) + '\n<link rel="stylesheet" href="/site.css?v=3">\n' + jsonld(page, url, s) + '\n<script>' + boot + '</script>\n</head>\n<body class="pub ' + (page.hero ? 'is-home' : '') + '">\n<a class="skip" href="#main">تخطّى للمحتوى</a>\n<div class="bg-mesh" aria-hidden="true"></div><div class="bg-grain" aria-hidden="true"></div>\n<header class="nav" id="nav"><div class="nav-inner"><a class="brand" href="/"><img src="' + esc(s.logo) + '" alt="" width="38" height="38"><span><b>' + esc(s.short) + '</b><small>صالون الكونترا</small></span></a><nav class="nav-links" aria-label="التنقل الرئيسي">' + navHtml + '</nav><div class="nav-right"><a class="btn btn-gold btn-sm" href="/play">🃏 العب</a><button class="burger" id="burger" aria-label="القائمة" aria-expanded="false"><i></i><i></i><i></i></button></div></div><div class="drawer" id="drawer"><nav>' + navHtml + footHtml + '</nav></div></header>\n<main id="main" class="page ' + (page.hero ? 'wide' : '') + '">\n' +
    (page.hero ? '' : '<div class="page-head"><span class="kicker">' + esc(kicker) + '</span><h1 class="h1">' + esc(h1) + '</h1><p class="lede">' + esc(desc) + '</p></div>') +
    '\n' + body + '\n' + adSlot(req) + '\n</main>\n<footer class="footer"><div class="foot-grid"><div class="foot-col brandcol"><img src="' + esc(s.logo) + '" alt="" width="44" height="44"><b>' + esc(s.name) + '</b><p>لعبة ورق تونسية مجانية أونلاين. نقاط افتراضية للتسلية فقط، بلا قيمة نقدية، وغير قابلة للتحويل بين اللاعبين.</p><a class="btn btn-green btn-sm" href="/play">🃏 العب الآن</a></div><div class="foot-col"><h4>اللعبة</h4>' + NAV.map(n => '<a href="' + n.href + '">' + n.label + '</a>').join('') + '</div><div class="foot-col"><h4>الموقع</h4>' + footHtml + '</div><div class="foot-col"><h4>تواصل</h4><a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a><a href="/contact">نموذج الاتصال</a><button class="linkbtn" id="cookieSettings">إعدادات الكوكيز</button><p class="tiny">' + esc(s.city) + ' · HTTPS · 18+</p></div></div><div class="legal"><span>© ' + new Date().getFullYear() + ' ' + esc(s.short) + ' — جميع الحقوق محفوظة.</span><span>اللعبة مجانية · ليست قماراً · النقاط بلا قيمة نقدية</span></div></footer>\n<div class="cookie" id="cookie" hidden><div><b>🍪 الكوكيز</b><p>نستعملو كوكيز ضرورية باش اللعبة تخدم، وكوكيز إعلانية من جوجل وشركائها <b>فقط بموافقتك</b>. اقرا <a href="/privacy">سياسة الخصوصية</a>.</p></div><div class="cookie-btns"><button class="btn btn-ghost btn-sm" id="ckReject">رفض الإعلانية</button><button class="btn btn-gold btn-sm" id="ckAccept">موافق على الكل</button></div></div>\n<script src="/js/site.js?v=3" defer></script>\n' + '\n</body></html>';
}
function serveGame(req, res) {
  const file = path.join(__dirname, '..', 'public', 'index.tpl.html');
  fs.readFile(file, 'utf8', (err, html) => {
    if (err) return res.status(500).send('index.tpl.html missing');
    const a = store.settings().ads || {};
    const s = getSite();
    html = html.split('<!--ADSENSE_BOOT-->').join(h5GameTags(req)).split('<!--AD_BODY_EXTRA-->').join('');
    html = html.split('</head>').join('<script>window.__SITE=' + JSON.stringify({ domain: s.domain, email: s.email, name: s.name, short: s.short }).replace(/</g, '\\u003c') + ';</script></head>');
    res.set('Cache-Control', 'no-cache, no-store');
    res.type('html').send(html);
  });
}
function canonicalRedirect(req, res, next) {
  const s = getSite();
  if (!s.redirectOldDomain) return next();
  const host = String(req.headers.host || '').toLowerCase();
  if (!host || host === s.host.toLowerCase()) return next();
  if (/^(localhost|127\.0\.0\.1|\[?::1\]?)(:\d+)?$/.test(host)) return next();
  if (/^\d+\.\d+\.\d+\.\d+(:\d+)?$/.test(host)) return next();
  return res.redirect(301, s.domain + req.originalUrl);
}
function rewardedCfg() {
  const a = store.settings().ads || {};
  return { enabled: !!a.enabled, rewardPoints: Number(a.rewardPoints) || 50, minSeconds: 12, dailyCap: Number(a.dailyCap) || 8, cooldownSec: Number(a.cooldownSec) || 60, h5: true };
}

function attach(app) {
  app.get('/play', canonicalRedirect, serveGame);
  app.get('/index.html', (req, res) => res.redirect(301, '/'));
  app.get('/ads.txt', (req, res) => res.type('text/plain').send(adsTxt()));
  Object.keys(P).forEach(k => {
    const page = P[k];
    app.get('/' + page.slug, canonicalRedirect, (req, res) => {
      const q = req.query.join || req.query.room;
      if (!page.slug && q) return res.redirect(302, '/play?join=' + encodeURIComponent(String(q)));
      res.set('Cache-Control', 'public, max-age=300');
      res.type('html').send(layout(page, req));
    });
  });
  app.get('/manifest.json', (req, res) => {
    const s = getSite();
    res.type('application/manifest+json').send(JSON.stringify({
      name: s.name, short_name: s.short, lang: 'ar', dir: 'rtl',
      start_url: '/play', scope: '/', display: 'standalone', orientation: 'any',
      background_color: '#04170d', theme_color: '#062a18',
      icons: [{ src: s.logo, sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
    }));
  });
  app.get('/robots.txt', (req, res) => {
    const s = getSite();
    res.type('text/plain').send('User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\n\nSitemap: ' + s.domain + '/sitemap.xml\n');
  });
  app.get('/sitemap.xml', (req, res) => {
    const s = getSite();
    const urls = Object.keys(P).map(k => { const p = P[k]; return '  <url><loc>' + s.domain + (p.slug ? '/' + p.slug : '/') + '</loc><lastmod>' + s.updated + '</lastmod><changefreq>' + (p.slug ? 'monthly' : 'weekly') + '</changefreq><priority>' + (p.slug ? '0.8' : '1.0') + '</priority></url>'; });
    urls.push('  <url><loc>' + s.domain + '/play</loc><lastmod>' + s.updated + '</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>');
    res.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.join('\n') + '\n</urlset>');
  });

  app.get('/api/site-config', (req, res) => { const s = getSite(); res.json({ ok: true, domain: s.domain, name: s.name, short: s.short, email: s.email, logo: s.logo }); });
  app.get('/api/admin/site', requireAdmin, (req, res) => res.json({ ok: true, site: getSite(), defaults: SITE_DEFAULTS, saved: store.settings().site || {} }));
  app.post('/api/admin/site', requireAdmin, (req, res) => {
    const b = req.body || {};
    const patch = {};
    if (b.domain !== undefined) {
      const d = normalizeDomain(b.domain);
      if (!d) return res.status(400).json({ ok: false, error: 'الدومين غير صالح — مثال: https://belotetounsi.com' });
      patch.domain = d;
    }
    if (b.wwwMode !== undefined) patch.wwwMode = b.wwwMode === 'www' ? 'www' : 'apex';
    if (b.redirectOldDomain !== undefined) patch.redirectOldDomain = !!b.redirectOldDomain;
    ['name', 'short', 'email', 'city', 'logo', 'updated', 'twitter', 'extraHead', 'extraBody'].forEach(k => {
      if (b[k] !== undefined) patch[k] = String(b[k]).slice(0, k === 'extraHead' || k === 'extraBody' ? 20000 : 200);
    });
    if (patch.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(patch.email)) return res.status(400).json({ ok: false, error: 'البريد غير صالح' });
    store.setSettings({ site: patch }, 'admin');
    res.json({ ok: true, site: getSite() });
  });
  app.post('/api/admin/site/reset', requireAdmin, (req, res) => {
    store.setSettings({ site: Object.assign({}, SITE_DEFAULTS) }, 'admin');
    res.json({ ok: true, site: getSite() });
  });

  app.post('/api/contact', (req, res) => {
    const b = req.body || {};
    const name = String(b.name || '').trim().slice(0, 60);
    const email = String(b.email || '').trim().slice(0, 120);
    const topic = String(b.topic || '').trim().slice(0, 60);
    const message = String(b.message || '').trim().slice(0, 2000);
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !topic || message.length < 10 || !b.consent) return res.status(400).json({ ok: false, error: 'عمّر كل الخانات المطلوبة بشكل صحيح.' });
    const list = readMsgs();
    if (list.filter(m => m.ip === req.ip && Date.now() - m.ts < 3600000).length >= 5) return res.status(429).json({ ok: false, error: 'برشا رسائل في ساعة. جرّب لاحقاً.' });
    list.push({ ts: Date.now(), ip: req.ip, name, email, topic, room: String(b.room || '').slice(0, 20), message });
    writeMsgs(list);
    res.json({ ok: true });
  });
  app.get('/api/rewarded/config', (req, res) => res.json(Object.assign({ ok: true }, rewardedCfg())));
  app.post('/api/rewarded/start', (req, res) => {
    const b = req.body || {};
    const uid = store.verifyToken(b.token);
    const u = uid ? store.user(uid) : null;
    if (!u) return res.status(401).json({ ok: false, error: 'جلسة غير صالحة' });
    const cfg = rewardedCfg();
    if (!cfg.enabled) return res.status(403).json({ ok: false, error: 'إعلانات المكافأة معطّلة حالياً.' });
    const st = store.adState(u, b.deviceId);
    if (!st.allowed) return res.status(403).json({ ok: false, error: st.reason });
    for (const v of NONCES.values()) if (v.uid === uid && !v.used && Date.now() - v.ts < 3 * 60000) return res.status(409).json({ ok: false, error: 'فما محاولة إعلان جارية.' });
    const n = crypto.randomBytes(16).toString('hex');
    NONCES.set(n, { uid, ts: Date.now(), used: false, device: String(b.deviceId || '').slice(0, 64) });
    res.json({ ok: true, nonce: n, minSeconds: cfg.minSeconds, rewardPoints: cfg.rewardPoints });
  });
  app.post('/api/rewarded/claim', (req, res) => {
    const b = req.body || {};
    const uid = store.verifyToken(b.token);
    if (!uid) return res.status(401).json({ ok: false, error: 'جلسة غير صالحة' });
    const rec = NONCES.get(String(b.nonce || ''));
    if (!rec || rec.uid !== uid) return res.status(400).json({ ok: false, error: 'رمز غير صالح' });
    if (rec.used) return res.status(409).json({ ok: false, error: 'المكافأة تسلّمت من قبل' });
    const cfg = rewardedCfg();
    const elapsed = (Date.now() - rec.ts) / 1000;
    if (elapsed < cfg.minSeconds) return res.status(403).json({ ok: false, error: 'الإعلان ما كملش المدة المطلوبة' });
    if (elapsed > 900) { NONCES.delete(String(b.nonce)); return res.status(410).json({ ok: false, error: 'انتهت صلاحية المحاولة' }); }
    if (b.viewed !== true) return res.status(400).json({ ok: false, error: 'الإعلان ما تكملش' });
    rec.used = true;
    const r = store.grantAdReward(uid, 'rewarded:' + b.nonce, rec.device);
    if (!r.ok) return res.status(403).json({ ok: false, error: r.reason });
    res.json({ ok: true, points: r.points, balance: r.balance, remaining: r.remaining });
  });
}

module.exports = { attach, layout, headTags, h5GameTags, adsTxt, serveGame, getSite, P, SITE_DEFAULTS };
