/* ==========================================================================
   FILE: /src/admin-api.js  —  v60 (كامل: كل شيء في v58 + الموقع العام)
========================================================================== */
'use strict';
const crypto = require('crypto');
const https = require('https');
const store = require('./store');
const publicSite = require('./public-site');

let CFG_PASS = null;
try { CFG_PASS = require('./config').ADMIN_PASSCODE; } catch (e) { CFG_PASS = null; }
let BOOTSTRAP_TOKEN = '';
let BOOTSTRAP_EXPIRES = 0;
let BOOTSTRAP_ATTEMPTS = 0;
function ensureBootstrap() {
  if (adminPass() || BOOTSTRAP_TOKEN) return;
  BOOTSTRAP_TOKEN = crypto.randomBytes(32).toString('hex').toUpperCase();
  BOOTSTRAP_EXPIRES = Date.now() + 10 * 60 * 1000;
  BOOTSTRAP_ATTEMPTS = 0;
  try {
    const fs = require('fs'); const path = require('path');
    const file = path.join(__dirname, 'data', '.admin-bootstrap-token');
    fs.writeFileSync(file, BOOTSTRAP_TOKEN + '\n', { mode: 0o600, flag: 'w' });
    fs.chmodSync(file, 0o600);
  } catch (e) { BOOTSTRAP_TOKEN = ''; BOOTSTRAP_EXPIRES = 0; }
}
function checkPass(got, expected) {
  const a = Buffer.from(String(got || '')); const b = Buffer.from(String(expected || ''));
  return !!b.length && a.length === b.length && crypto.timingSafeEqual(a, b);
}
function adminPass() {
  const p = store.settings().security.adminPasscode;
  if (p && String(p).length) return String(p);
  if (CFG_PASS && String(CFG_PASS).length) return String(CFG_PASS);
  return String(process.env.ADMIN_PASSCODE || '');
}
function requireAdmin(req, res, next) {
  const got = String(req.headers['x-admin-passcode'] || '');
  if (!checkPass(got, adminPass())) return res.status(401).json({ ok: false, error: 'كلمة سر الأدمن غالطة' });
  next();
}
function safeSettings() {
  const s = JSON.parse(JSON.stringify(store.settings()));
  s.google.clientSecretSet = !!s.google.clientSecret;
  s.db.passwordSet = !!s.db.password;
  s.security.adminPasscodeSet = !!s.security.adminPasscode;
  s.google.clientSecret = ''; s.db.password = ''; s.security.secret = ''; s.security.adminPasscode = '';
  return s;
}
function httpsRequest(url, options) {
  return new Promise((resolve, reject) => {
    const u = new URL(url); const opts = options || {};
    const req = https.request({ hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search, method: opts.method || 'GET', headers: opts.headers || {} }, (res) => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json: async () => { try { return JSON.parse(body); } catch (e) { return {}; } }, text: async () => body }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
    if (opts.body) req.write(opts.body);
    req.end();
  });
}
async function uniFetch(url, options) {
  if (typeof fetch === 'function') { try { return await fetch(url, options); } catch (e) {} }
  return httpsRequest(url, options);
}
function resolveSsvPem(a, keyId) {
  const raw = String(a.ssvPublicKeyPem || '').trim();
  if (!raw) return '';
  if (raw.indexOf('KEY:') === -1) return raw;
  const blocks = {}; let cur = null;
  raw.split('\n').forEach(l => {
    const m = l.match(/^KEY:\s*(\S+)\s*$/);
    if (m) { cur = m[1]; blocks[cur] = ''; return; }
    if (cur) blocks[cur] += l + '\n';
  });
  return (blocks[keyId] || '').trim() || raw;
}

function attach(app, ctx) {
  ensureBootstrap();
  const rooms = ctx.rooms, clients = ctx.clients;
  const broadcastLobby = ctx.markLobbyDirty;

  /* ===== الموقع العام: / ، الصفحات، /play ، /ads.txt ، sitemap ، robots ، manifest ، contact ، rewarded ===== */
  publicSite.attach(app, ctx);

  /* ===== إنقاذ كلمة السر ===== */
  app.post('/api/admin/bootstrap', (req, res) => {
    ensureBootstrap();
    const b = req.body || {};
    if (!BOOTSTRAP_TOKEN || Date.now() > BOOTSTRAP_EXPIRES || BOOTSTRAP_ATTEMPTS >= 5) { BOOTSTRAP_TOKEN = ''; BOOTSTRAP_EXPIRES = 0; return res.status(403).json({ ok: false, error: 'انتهت صلاحية الرمز؛ اقرأ الملف المحلي مجدداً للمحاولة الجديدة.' }); }
    const supplied = String(b.token || '').trim().toUpperCase();
    if (!checkPass(supplied, BOOTSTRAP_TOKEN)) { BOOTSTRAP_ATTEMPTS++; return res.status(403).json({ ok: false, error: 'توكن الإنقاذ غالط' }); }
    const np = String(b.newPasscode || '').trim();
    if (np.length < 12) return res.status(400).json({ ok: false, error: 'كلمة السر لازم 12 رمزاً على الأقل' });
    store.setSettings({ security: { adminPasscode: np } }, 'bootstrap');
    try { require('fs').unlinkSync(require('path').join(__dirname, 'data', '.admin-bootstrap-token')); } catch (e) {}
    BOOTSTRAP_TOKEN = ''; BOOTSTRAP_EXPIRES = 0; BOOTSTRAP_ATTEMPTS = 0;
    res.json({ ok: true });
  });
  app.get('/api/admin/passinfo', (req, res) => {
    res.json({ ok: true, source: store.settings().security.adminPasscode ? 'custom' : (CFG_PASS ? 'environment' : 'unconfigured') });
  });
  app.get('/api/admin/messages', requireAdmin, (req, res) => {
    let rows = [];
    try { rows = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'data', 'messages.json'), 'utf8')); } catch (e) { rows = []; }
    res.json({ ok: true, rows: rows.slice().reverse().slice(0, 200) });
  });

  /* ===== عام ===== */
  app.get('/api/rooms-public', (req, res) => {
    const list = [];
    for (const r of rooms.values()) {
      if (r.isPrivate) continue;
      const t = r.tier ? r.tier() : null;
      list.push({ id: r.id, name: r.name, status: r.status, players: r.playerCount(), tierId: r.tierId || '', tierName: t ? t.name : '', tierEmoji: t ? t.emoji : '', entry: t ? t.entry : 0 });
    }
    res.json({ ok: true, rooms: list });
  });

  /* ===== إعدادات ===== */
  app.get('/api/admin/settings', requireAdmin, (req, res) => res.json({ ok: true, settings: safeSettings(), defaults: store.DEFAULTS }));
  app.post('/api/admin/settings', requireAdmin, (req, res) => {
    const patch = Object.assign({}, req.body || {});
    if (patch.google && !patch.google.clientSecret) delete patch.google.clientSecret;
    if (patch.db && !patch.db.password) delete patch.db.password;
    if (patch.security && !patch.security.adminPasscode) delete patch.security.adminPasscode;
    if (patch.security && patch.security.adminPasscode && String(patch.security.adminPasscode).trim().length < 12) return res.status(400).json({ ok: false, error: 'كلمة مرور الإدارة يجب أن تكون 12 رمزاً على الأقل' });
    const r = store.setSettings(patch, 'admin');
    if (patch.db) store.mysqlConnect(store.settings().db).catch(() => {});
    res.json({ ok: true, result: r, settings: safeSettings() });
  });
  app.post('/api/admin/settings/reset', requireAdmin, (req, res) => {
    const group = String((req.body || {}).group || '');
    if (!store.DEFAULTS[group]) return res.status(400).json({ ok: false, error: 'مجموعة غير معروفة' });
    const patch = {}; patch[group] = JSON.parse(JSON.stringify(store.DEFAULTS[group]));
    store.setSettings(patch, 'admin');
    res.json({ ok: true, settings: safeSettings() });
  });
  app.get('/api/admin/stats', requireAdmin, (req, res) => res.json({ ok: true, stats: store.stats() }));
  app.get('/api/admin/export', requireAdmin, (req, res) => res.json({ ok: true, data: store.exportAll() }));
  app.post('/api/admin/import', requireAdmin, (req, res) => res.json(store.importAll((req.body || {}).data)));

  /* ===== MySQL ===== */
  app.get('/api/admin/db/status', requireAdmin, (req, res) => res.json({ ok: true, status: store.mysqlStatus() }));
  app.post('/api/admin/db/test', requireAdmin, async (req, res) => {
    const cfg = Object.assign({}, store.settings().db, req.body || {});
    if (!cfg.password) cfg.password = store.settings().db.password;
    cfg.enabled = true;
    res.json(await store.mysqlConnect(cfg));
  });
  app.post('/api/admin/db/restore', requireAdmin, async (req, res) => res.json(await store.mysqlRestore()));

  /* ===== اللاعبون + الهدايا ===== */
  app.get('/api/admin/users', requireAdmin, (req, res) => res.json({ ok: true, users: store.searchUsers(req.query.q, Number(req.query.limit) || 60).map(store.publicUser) }));
  app.get('/api/admin/users/:id', requireAdmin, (req, res) => {
    const u = store.user(req.params.id);
    if (!u) return res.status(404).json({ ok: false, error: 'غير موجود' });
    res.json({ ok: true, user: store.publicUser(u), ledger: store.ledgerList({ uid: u.id, limit: 40 }) });
  });
  app.post('/api/admin/users/:id/rename', requireAdmin, (req, res) => res.json(store.renameUser(req.params.id, (req.body || {}).name)));
  app.post('/api/admin/users/:id/ban', requireAdmin, (req, res) => res.json(store.setBan(req.params.id, !!(req.body || {}).banned, (req.body || {}).reason)));
  app.post('/api/admin/gift', requireAdmin, (req, res) => {
    const b = req.body || {};
    const u = b.id ? store.user(b.id) : store.findUser(b.name);
    if (!u) return res.status(404).json({ ok: false, error: 'ما لقيناش اللاعب' });
    const amount = Math.floor(Number(b.amount) || 0);
    if (amount <= 0 || amount > 10000000) return res.status(400).json({ ok: false, error: 'مبلغ غير صالح' });
    const r = store.gift(u.id, amount, b.note, 'admin');
    if (r.ok && clients.has(u.id)) {
      const c = clients.get(u.id);
      if (c.ws && c.ws.readyState === 1) c.ws.send(JSON.stringify({ type: 'gift_received', amount, note: String(b.note || ''), balance: r.user.balance }));
    }
    res.json(r);
  });
  app.post('/api/admin/gift-bulk', requireAdmin, (req, res) => {
    const b = req.body || {};
    const ids = Array.isArray(b.ids) ? b.ids : [];
    const amount = Math.floor(Number(b.amount) || 0);
    if (amount <= 0) return res.status(400).json({ ok: false, error: 'مبلغ غير صالح' });
    const done = [];
    ids.forEach(id => { const r = store.gift(id, amount, b.note || 'هدية جماعية', 'admin'); if (r.ok) done.push(id); });
    res.json({ ok: true, count: done.length, ids: done });
  });
  app.get('/api/admin/ledger', requireAdmin, (req, res) => res.json({ ok: true, rows: store.ledgerList({ uid: req.query.uid, reason: req.query.reason, limit: req.query.limit }) }));
  app.get('/api/admin/gifts', requireAdmin, (req, res) => res.json({ ok: true, rows: store.giftsList(req.query.limit) }));

  /* ===== الطاولات ===== */
  app.get('/api/tiers', (req, res) => res.json({ ok: true, tiers: store.tiers(), economyOn: !!store.settings().economy.enabled }));
  app.get('/api/admin/rooms', requireAdmin, (req, res) => {
    const list = [];
    for (const r of rooms.values()) list.push({ id: r.id, name: r.name, status: r.status, players: r.playerCount(), tier: r.tierId || '', private: !!r.isPrivate, target: r.targetScore });
    res.json({ ok: true, rooms: list });
  });
  app.post('/api/admin/rooms/:id/close', requireAdmin, (req, res) => {
    const r = rooms.get(req.params.id);
    if (!r) return res.status(404).json({ ok: false });
    r.clearTimers(); r.abortMatch();
    for (const s of r.seats) if (s && !s.isBot) { const c = clients.get(s.id); if (c) { c.roomId = null; if (c.ws && c.ws.readyState === 1) c.ws.send(JSON.stringify({ type: 'room_closed', msg: 'الطاولة تسكّرت من الأدمن' })); } }
    rooms.delete(r.id);
    if (broadcastLobby) broadcastLobby();
    res.json({ ok: true });
  });

  /* ===== هوية اللاعب ===== */
  app.post('/api/identity', (req, res) => {
    const b = req.body || {};
    let uid = store.verifyToken(b.token);
    let u = uid ? store.user(uid) : null;
    if (!u) {
      if (!store.settings().security.guestAllowed) return res.status(403).json({ ok: false, error: 'دخول الضيوف معطّل' });
      uid = 'U' + crypto.randomBytes(5).toString('hex').toUpperCase();
      u = store.ensureUser(uid, b.name || ('لاعب ' + Math.floor(1000 + Math.random() * 9000)), { provider: 'guest' });
    } else if (b.name) store.renameUser(uid, b.name);
    store.registerDevice(uid, b.deviceId, req.ip);
    res.json({ ok: true, token: store.signToken(uid), user: store.publicUser(u), ads: store.adState(u, b.deviceId), economyOn: !!store.settings().economy.enabled, adsConfig: publicAds(), google: publicGoogle() });
  });
  app.get('/api/me', (req, res) => {
    const uid = store.verifyToken(req.query.token);
    const u = uid ? store.user(uid) : null;
    if (!u) return res.status(401).json({ ok: false });
    res.json({ ok: true, user: store.publicUser(u), ads: store.adState(u, req.query.deviceId), ledger: store.ledgerList({ uid, limit: 20 }) });
  });
  app.post('/api/rename', (req, res) => {
    const uid = store.verifyToken((req.body || {}).token);
    if (!uid) return res.status(401).json({ ok: false });
    res.json(store.renameUser(uid, (req.body || {}).name));
  });

  /* ===== الإشهارات ===== */
  function publicAds() {
    const a = store.settings().ads;
    return { enabled: !!a.enabled, provider: a.provider, publisherId: a.publisherId, adUnitId: a.adUnitId, rewardPoints: a.rewardPoints, testMode: !!a.testMode, dailyCap: a.dailyCap, cooldownSec: a.cooldownSec };
  }
  function publicGoogle() {
    const g = store.settings().google;
    return { enabled: !!g.enabled, clientId: g.clientId, buttonText: g.buttonText || 'واصل بـ Google' };
  }
  app.get('/api/ads/config', (req, res) => res.json({ ok: true, ads: publicAds() }));
  app.post('/api/ads/claim', (req, res) => {
    const b = req.body || {};
    const uid = store.verifyToken(b.token);
    if (!uid) return res.status(401).json({ ok: false, error: 'جلسة غير صالحة' });
    const a = store.settings().ads;
    if (a.ssvEnabled) return res.status(403).json({ ok: false, error: 'التحقق عبر سيرفر جوجل فقط (SSV)' });
    if (a.h5Only) return res.status(403).json({ ok: false, error: 'استعمل مسار المكافأة المتحقّق: /api/rewarded/start ثم /api/rewarded/claim' });
    res.json(store.grantAdReward(uid, b.ref || 'client', b.deviceId));
  });
  app.get('/api/ads/ssv', (req, res) => {
    const a = store.settings().ads;
    if (!a.enabled || !a.ssvEnabled) return res.status(404).send('disabled');
    const q = req.query || {};
    const uid = store.verifyToken(q.custom_data || q.user_id || '');
    const txId = String(q.transaction_id || '');
    if (!uid) return res.status(400).send('bad user');
    if (!txId) return res.status(400).send('bad transaction');
    if (store.hasAdRef('ssv:' + txId)) return res.status(200).send('DUPLICATE');
    const sigB64 = String(q.signature || '');
    let verified = false;
    if (!sigB64) {
      verified = !!a.testMode;
    } else {
      const rawQuery = String(req.originalUrl.split('?')[1] || '');
      const message = rawQuery.split('&').filter(p => p && p.indexOf('signature=') !== 0).join('&');
      const pem = resolveSsvPem(a, String(q.key_id || ''));
      try {
        if (pem) {
          const v = crypto.createVerify('SHA256');
          v.update(message);
          verified = v.verify(pem, Buffer.from(sigB64, 'base64'));
        }
      } catch (e) { verified = false; }
    }
    if (!verified) return res.status(403).send('invalid signature');
    const r = store.grantAdReward(uid, 'ssv:' + txId, String(q.deviceId || ''));
    res.status(200).send(r.ok ? 'OK' : 'IGNORED');
  });

  /* ===== Google Connect ===== */
  app.get('/api/auth/google/config', (req, res) => res.json({ ok: true, ...publicGoogle() }));
  app.get('/api/auth/google/start', (req, res) => {
    const g = store.settings().google;
    if (!g.enabled || !g.clientId) return res.status(400).send('Google Connect معطّل — فعّلو من لوحة الأدمن');
    const state = crypto.randomBytes(12).toString('hex');
    const link = String(req.query.link || '');
    const redirect = g.redirectUri || (req.protocol + '://' + req.get('host') + '/api/auth/google/callback');
    res.redirect('https://accounts.google.com/o/oauth2/v2/auth?response_type=code&scope=openid%20email%20profile&client_id=' + encodeURIComponent(g.clientId) + '&redirect_uri=' + encodeURIComponent(redirect) + '&state=' + encodeURIComponent(state + '|' + link) + '&prompt=select_account');
  });
  app.get('/api/auth/google/callback', async (req, res) => {
    const g = store.settings().google;
    const code = String(req.query.code || '');
    const stateRaw = String(req.query.state || '');
    const linkToken = stateRaw.includes('|') ? stateRaw.split('|')[1] : '';
    if (!g.enabled || !code) return res.status(400).send('طلب غير صالح');
    try {
      const redirect = g.redirectUri || (req.protocol + '://' + req.get('host') + '/api/auth/google/callback');
      const formBody = new URLSearchParams({ code, client_id: g.clientId, client_secret: g.clientSecret, redirect_uri: redirect, grant_type: 'authorization_code' }).toString();
      const tr = await uniFetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody });
      const tj = await tr.json();
      if (!tj.access_token) throw new Error(tj.error_description || tj.error || 'token failed');
      const ur = await uniFetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + tj.access_token } });
      const uj = await ur.json();
      if (!uj.sub) throw new Error('profile failed');
      let uid = store.verifyToken(linkToken);
      const existing = Object.values(store.exportAll().users).find(u => u.googleId === uj.sub);
      if (existing) uid = existing.id;
      if (!uid) {
        if (!g.allowSignup) return res.status(403).send('التسجيل الجديد مقفول');
        uid = 'G' + crypto.randomBytes(5).toString('hex').toUpperCase();
      }
      store.ensureUser(uid, uj.name || uj.email || 'لاعب', { provider: 'google', email: uj.email || '', googleId: uj.sub });
      const tok = store.signToken(uid);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send('<!doctype html><meta charset="utf-8"><body style="background:#04170d;color:#ffe9a8;font-family:Tahoma;text-align:center;padding:40px"><h2>✅ تم الربط بـ Google</h2><p>قاعدين نرجّعوك للعبة...</p><script>try{localStorage.setItem("beloteToken",' + JSON.stringify(tok) + ');}catch(e){}setTimeout(function(){location.href="/play"},1200)<\/script></body>');
    } catch (e) {
      res.status(500).send('<meta charset="utf-8"><body style="background:#04170d;color:#ff9a9a;font-family:Tahoma;text-align:center;padding:40px"><h2>❌ فشل الربط</h2><p>' + String(e.message || e) + '</p><a href="/play" style="color:#ffe9a8">ارجع للعبة</a></body>');
    }
  });

  /* ===== إعدادات الواجهة ===== */
  app.get('/api/app-config', (req, res) => {
    const s = store.settings();
    res.json({ ok: true, game: s.game, economy: { enabled: s.economy.enabled, privateTableFee: s.economy.privateTableFee, startingBalance: s.economy.startingBalance, dailyBonus: 0, dailyBonusEnabled: false }, tiers: store.tiers(), ads: publicAds(), google: publicGoogle() });
  });
}

module.exports = { attach, requireAdmin, adminPass, checkPass };