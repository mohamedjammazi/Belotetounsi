'use strict';
/* ==========================================================================
   BELOTE STORE v58 — إعدادات + لاعبين + محافظ + دفتر قيود + هدايا + إشهارات
   ✅ بلا نقاط مجانية (رصيد 0، لا هدية تسجيل، لا مكافأة يومية)
   ✅ hasAdRef + grantAdReward ضد تكرار المعاملات (SSV replay)
   ✅ كشف تواطؤ: حسابين على نفس الجهاز = اقتصاد ملغى في المباراة
   ✅ JSON ذرّي + مرآة MySQL اختيارية من البانل
========================================================================== */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'appdb.json');

const DEFAULT_TIERS = [
  { id: 't1', name: 'طاولة الضعاف', emoji: '🟢', entry: 50, minBalance: 0, maxBalance: 0, enabled: true, color: '#35d07f' },
  { id: 't2', name: 'طاولة المتوسطين', emoji: '🔵', entry: 100, minBalance: 0, maxBalance: 0, enabled: true, color: '#35c8f0' },
  { id: 't3', name: 'طاولة المعلمية', emoji: '🟡', entry: 250, minBalance: 0, maxBalance: 0, enabled: true, color: '#f5b83d' },
  { id: 't4', name: 'قهوة شهاب', emoji: '☕', entry: 500, minBalance: 0, maxBalance: 0, enabled: true, color: '#c08457' },
  { id: 't5', name: 'قهوة باريس', emoji: '☕', entry: 1000, minBalance: 0, maxBalance: 0, enabled: true, color: '#a78bfa' },
  { id: 't6', name: 'قهوة صلاح', emoji: '👑', entry: 2000, minBalance: 0, maxBalance: 0, enabled: true, color: '#e6b455' }
];
const DEFAULTS = {
  ads: {
    enabled: false, provider: 'adsense_h5', publisherId: '', adUnitId: '',
    rewardPoints: 50, dailyCap: 8, cooldownSec: 60, onlyWhenBroke: false,
    ssvEnabled: false, ssvKeyId: '', ssvPublicKeyPem: '', testMode: true,
    loadHeadScript: true, verificationMeta: false,
    medianetEnabled: false, medianetCustomerId: '',
    infolinksEnabled: false, infolinksPid: '', infolinksWlid: '',
    adsTxtExtra: '', bodyHtmlExtra: ''
  },
  google: { enabled: false, clientId: '', clientSecret: '', redirectUri: '', allowSignup: true, requireForTierIds: [], buttonText: 'واصل بـ Google' },
  economy: { enabled: false, startingBalance: 0, privateTableFee: 5, dailyBonusEnabled: false, dailyBonus: 0, refundOnAbort: true, houseAccount: 'HOUSE', allowNegative: false },
  game: { targetScore: 2000, turnTimeoutSec: 60, allowPrivate: true, allowSpectate: true, chatEnabled: true, voiceEnabled: true, autoFillBots: true, autoFillDelaySec: 25, autoStartOnFill: true },
  db: { enabled: false, host: '127.0.0.1', port: 3306, user: '', password: '', database: 'belote' },
  security: { adminPasscode: '', guestAllowed: true, maxAccountsPerIpPerDay: 3, secret: '' },
  tiers: DEFAULT_TIERS
};
let S = null, saveTimer = null, mysqlPool = null, mysqlReady = false, mysqlError = '', ledgerQueue = [];
function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {} }
function deepMerge(base, over) {
  const out = Array.isArray(base) ? (Array.isArray(over) ? over.slice() : base.slice()) : Object.assign({}, base);
  if (over && typeof over === 'object' && !Array.isArray(over)) {
    Object.keys(over).forEach(k => {
      if (base && typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k]) && typeof over[k] === 'object' && over[k] !== null && !Array.isArray(over[k])) out[k] = deepMerge(base[k], over[k]);
      else out[k] = over[k];
    });
  }
  return out;
}
function rid(p) { return p + crypto.randomBytes(6).toString('hex').toUpperCase(); }
function now() { return Date.now(); }
function blank() { return { v: 1, settings: JSON.parse(JSON.stringify(DEFAULTS)), users: {}, ledger: [], gifts: [], adRewards: [], devices: {}, bans: [], counters: { matches: 0, pointsGranted: 0, adsPaid: 0 } }; }
function load() {
  ensureDir();
  let raw = null;
  try { if (fs.existsSync(DB_FILE)) raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { raw = null; }
  S = raw && typeof raw === 'object' ? Object.assign(blank(), raw) : blank();
  S.settings = deepMerge(DEFAULTS, S.settings || {});
  if (!Array.isArray(S.settings.tiers) || !S.settings.tiers.length) S.settings.tiers = JSON.parse(JSON.stringify(DEFAULT_TIERS));
  if (!S.settings.security.secret) S.settings.security.secret = crypto.randomBytes(32).toString('hex');
  if (!S.users.HOUSE) S.users.HOUSE = { id: 'HOUSE', name: '🏠 البيت', balance: 0, house: true, banned: false, createdAt: now(), lastSeen: now(), devices: [], stats: { played: 0, won: 0 }, provider: 'system' };
  scheduleSave();
}
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try { ensureDir(); const tmp = DB_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(S)); fs.renameSync(tmp, DB_FILE); } catch (e) {}
    mirrorToMysql();
  }, 1200);
}
/* ================= MySQL (مرآة اختيارية) ================= */
async function mysqlConnect(cfg, silent) {
  mysqlReady = false; mysqlError = '';
  if (!cfg || !cfg.enabled) { mysqlPool = null; return { ok: false, reason: 'معطّل' }; }
  let mysql2;
  try { mysql2 = require('mysql2/promise'); } catch (e) { mysqlError = 'mysql2 غير مثبّت — npm i mysql2'; return { ok: false, reason: mysqlError }; }
  try {
    const pool = mysql2.createPool({ host: cfg.host, port: Number(cfg.port) || 3306, user: cfg.user, password: cfg.password, database: cfg.database, waitForConnections: true, connectionLimit: 4, charset: 'utf8mb4' });
    await pool.query('SELECT 1');
    await pool.query('CREATE TABLE IF NOT EXISTS belote_state (id INT PRIMARY KEY, data LONGTEXT NOT NULL, updated_at BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    await pool.query('CREATE TABLE IF NOT EXISTS belote_ledger (id BIGINT AUTO_INCREMENT PRIMARY KEY, ts BIGINT, uid VARCHAR(64), delta INT, balance INT, reason VARCHAR(64), ref VARCHAR(128), actor VARCHAR(64), INDEX(uid), INDEX(ts)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    mysqlPool = pool; mysqlReady = true;
    if (!silent) await mirrorToMysql(true);
    return { ok: true };
  } catch (e) { mysqlError = String(e.message || e); mysqlPool = null; return { ok: false, reason: mysqlError }; }
}
async function mirrorToMysql(force) {
  if (!mysqlReady || !mysqlPool) return;
  try {
    await mysqlPool.query('INSERT INTO belote_state (id,data,updated_at) VALUES (1,?,?) ON DUPLICATE KEY UPDATE data=VALUES(data), updated_at=VALUES(updated_at)', [JSON.stringify(S), now()]);
    if (ledgerQueue.length) {
      const rows = ledgerQueue.splice(0, 500).map(l => [l.ts, l.uid, l.delta, l.balance, l.reason, l.ref || '', l.actor || '']);
      await mysqlPool.query('INSERT INTO belote_ledger (ts,uid,delta,balance,reason,ref,actor) VALUES ?', [rows]);
    }
  } catch (e) { mysqlError = String(e.message || e); }
}
async function mysqlRestore() {
  if (!mysqlReady || !mysqlPool) return { ok: false, reason: 'غير متصل' };
  try {
    const [rows] = await mysqlPool.query('SELECT data FROM belote_state WHERE id=1');
    if (!rows.length) return { ok: false, reason: 'لا توجد نسخة في MySQL' };
    S = Object.assign(blank(), JSON.parse(rows[0].data));
    S.settings = deepMerge(DEFAULTS, S.settings || {});
    scheduleSave();
    return { ok: true, users: Object.keys(S.users).length };
  } catch (e) { return { ok: false, reason: String(e.message || e) }; }
}
function mysqlStatus() { return { enabled: !!(S && S.settings.db.enabled), ready: mysqlReady, error: mysqlError, queued: ledgerQueue.length }; }
/* ================= الإعدادات ================= */
function settings() { return S.settings; }
function getSetting(group, key) { const g = S.settings[group]; return g ? (key ? g[key] : g) : undefined; }
function setSettings(patch, actor) {
  Object.keys(patch || {}).forEach(g => {
    if (g === 'tiers') { if (Array.isArray(patch.tiers)) S.settings.tiers = patch.tiers.map(t => ({ id: String(t.id || rid('t')), name: String(t.name || 'طاولة'), emoji: String(t.emoji || '🎴'), entry: Math.max(0, Number(t.entry) || 0), minBalance: Math.max(0, Number(t.minBalance) || 0), maxBalance: Math.max(0, Number(t.maxBalance) || 0), enabled: t.enabled !== false, color: String(t.color || '#e6b455') })); return; }
    if (!S.settings[g]) S.settings[g] = {};
    if (typeof patch[g] === 'object' && patch[g] !== null) Object.assign(S.settings[g], patch[g]);
  });
  scheduleSave();
  return { ok: true, actor: actor || 'admin' };
}
function tiers() { return (S.settings.tiers || []).filter(t => t.enabled !== false); }
function tierById(id) { return (S.settings.tiers || []).find(t => t.id === id) || null; }
/* ================= اللاعبون ================= */
function ensureUser(id, name, extra) {
  let u = S.users[id];
  if (!u) {
    u = S.users[id] = { id, name: String(name || 'لاعب').substring(0, 18), balance: Math.max(0, Number(S.settings.economy.startingBalance) || 0), banned: false, createdAt: now(), lastSeen: now(), devices: [], provider: (extra && extra.provider) || 'guest', email: (extra && extra.email) || '', googleId: (extra && extra.googleId) || '', stats: { played: 0, won: 0, gifted: 0 }, lastDaily: 0, lastAd: 0, adsToday: 0, adsDay: '' };
    if (u.balance > 0) ledger(u.id, u.balance, 'starting_balance', '', 'system');
    scheduleSave();
  } else {
    u.lastSeen = now();
    if (name && !u.house) u.name = String(name).substring(0, 18);
    if (extra) { if (extra.email) u.email = extra.email; if (extra.googleId) u.googleId = extra.googleId; if (extra.provider) u.provider = extra.provider; }
  }
  return u;
}
function user(id) { return S.users[id] || null; }
function findUser(q) {
  const s = String(q || '').trim().toLowerCase();
  if (!s) return null;
  if (S.users[q]) return S.users[q];
  return Object.values(S.users).find(u => !u.house && (u.name.toLowerCase() === s || (u.email || '').toLowerCase() === s)) || null;
}
function searchUsers(q, limit) {
  const s = String(q || '').trim().toLowerCase();
  const all = Object.values(S.users).filter(u => !u.house);
  const hit = s ? all.filter(u => u.name.toLowerCase().includes(s) || u.id.toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s)) : all;
  return hit.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0)).slice(0, limit || 50);
}
function publicUser(u) { if (!u) return null; return { id: u.id, name: u.name, balance: u.balance, banned: !!u.banned, provider: u.provider, email: u.email || '', createdAt: u.createdAt, lastSeen: u.lastSeen, stats: u.stats || {}, house: !!u.house }; }
function setBan(id, banned, reason) { const u = user(id); if (!u || u.house) return { ok: false, reason: 'غير موجود' }; u.banned = !!banned; if (banned) S.bans.push({ id, ts: now(), reason: String(reason || '') }); scheduleSave(); return { ok: true, user: publicUser(u) }; }
function renameUser(id, name) { const u = user(id); if (!u || u.house) return { ok: false }; const nn = String(name || '').trim().substring(0, 18); if (!nn) return { ok: false, reason: 'اسم فارغ' }; u.name = nn; scheduleSave(); return { ok: true, user: publicUser(u) }; }
/* ================= دفتر القيود ================= */
function ledger(uid, delta, reason, ref, actor) {
  const u = S.users[uid];
  const entry = { ts: now(), uid, delta: Number(delta) || 0, balance: u ? u.balance : 0, reason: String(reason || ''), ref: String(ref || ''), actor: String(actor || 'system') };
  S.ledger.push(entry);
  if (S.ledger.length > 20000) S.ledger = S.ledger.slice(-20000);
  ledgerQueue.push(entry);
  return entry;
}
function credit(id, amount, reason, ref, actor) {
  const u = user(id); if (!u) return { ok: false, reason: 'لاعب غير موجود' };
  const n = Math.floor(Number(amount) || 0);
  if (n <= 0) return { ok: false, reason: 'مبلغ غير صالح' };
  u.balance += n;
  if (!u.house) S.counters.pointsGranted += n;
  ledger(id, n, reason, ref, actor);
  scheduleSave();
  return { ok: true, balance: u.balance };
}
function debit(id, amount, reason, ref, actor) {
  const u = user(id); if (!u) return { ok: false, reason: 'لاعب غير موجود' };
  const n = Math.floor(Number(amount) || 0);
  if (n <= 0) return { ok: false, reason: 'مبلغ غير صالح' };
  if (!u.house && !S.settings.economy.allowNegative && u.balance < n) return { ok: false, reason: 'رصيد غير كافٍ', balance: u.balance };
  u.balance -= n;
  ledger(id, -n, reason, ref, actor);
  scheduleSave();
  return { ok: true, balance: u.balance };
}
function gift(id, amount, note, actor) {
  const u = user(id); if (!u || u.house) return { ok: false, reason: 'لاعب غير موجود' };
  const r = credit(id, amount, 'admin_gift', note || '', actor || 'admin');
  if (!r.ok) return r;
  u.stats.gifted = (u.stats.gifted || 0) + Math.floor(Number(amount));
  S.gifts.push({ ts: now(), uid: id, name: u.name, amount: Math.floor(Number(amount)), note: String(note || ''), actor: String(actor || 'admin') });
  if (S.gifts.length > 5000) S.gifts = S.gifts.slice(-5000);
  scheduleSave();
  return { ok: true, user: publicUser(u) };
}
function ledgerList(opts) {
  const o = opts || {};
  let rows = S.ledger.slice();
  if (o.uid) rows = rows.filter(r => r.uid === o.uid);
  if (o.reason) rows = rows.filter(r => r.reason === o.reason);
  rows.sort((a, b) => b.ts - a.ts);
  return rows.slice(0, Math.min(500, Number(o.limit) || 100));
}
function giftsList(limit) { return S.gifts.slice().sort((a, b) => b.ts - a.ts).slice(0, Math.min(500, Number(limit) || 100)); }
/* ================= الاقتصاد: طاولات + تسوية ================= */
function canSit(u, tier) {
  if (!u) return { ok: false, reason: 'لاعب غير معروف' };
  if (u.banned) return { ok: false, reason: 'حساب محظور' };
  if (u.house) return { ok: true };
  if (!S.settings.economy.enabled) return { ok: true };
  if (!tier) return { ok: true };
  if (u.balance < tier.entry) return { ok: false, reason: `تحتاج ${tier.entry} نقطة — اربحها أو تفرّج إشهار` };
  return { ok: true };
}
function seatsShareDevice(seats) {
  const seen = {};
  for (const s of seats) {
    if (!s || s.isBot) continue;
    const u = S.users[s.id];
    if (!u || !u.devices || !u.devices.length) continue;
    for (const d of u.devices) {
      if (seen[d]) return true;
      seen[d] = s.id;
    }
  }
  return false;
}
function collectEntry(seats, tier, matchRef) {
  if (!S.settings.economy.enabled || !tier) return { ok: true, collected: 0 };
  if (seatsShareDevice(seats)) {
    ledger('HOUSE', 0, 'collusion_blocked', matchRef, 'game');
    return { ok: false, reason: '🚫 كشفنا حسابين على نفس الجهاز — الاقتصاد معطّل لهذه المباراة' };
  }
  const taken = [];
  for (const s of seats) {
    if (!s) continue;
    const uid = s.isBot ? 'HOUSE' : s.id;
    ensureUser(uid, s.isBot ? '🏠 البيت' : s.name, s.isBot ? { provider: 'system' } : null);
    const r = debit(uid, tier.entry, 'table_entry', matchRef, 'game');
    if (!r.ok) { taken.forEach(t => credit(t.uid, tier.entry, 'entry_refund', matchRef, 'game')); return { ok: false, reason: r.reason, uid }; }
    taken.push({ uid });
  }
  return { ok: true, collected: tier.entry * taken.length };
}
function settleMatch(seats, winnerTeam, tier, matchRef) {
  if (!S.settings.economy.enabled || !tier) return { ok: true, paid: 0 };
  if (seatsShareDevice(seats)) return { ok: true, paid: 0, blocked: 'collusion' };
  const prize = tier.entry * 2;
  const paid = [];
  seats.forEach((s, idx) => {
    if (!s) return;
    const team = (idx % 2 === 0) ? 1 : 2;
    if (team !== winnerTeam) return;
    const uid = s.isBot ? 'HOUSE' : s.id;
    credit(uid, prize, 'match_win', matchRef, 'game');
    if (!s.isBot) { const u = user(uid); if (u) u.stats.won = (u.stats.won || 0) + 1; }
    paid.push({ uid, prize });
  });
  seats.forEach(s => { if (s && !s.isBot) { const u = user(s.id); if (u) u.stats.played = (u.stats.played || 0) + 1; } });
  S.counters.matches++;
  scheduleSave();
  return { ok: true, paid, prize };
}
function refundMatch(seats, tier, matchRef) {
  if (!S.settings.economy.enabled || !tier || !S.settings.economy.refundOnAbort) return { ok: true };
  seats.forEach(s => { if (s) credit(s.isBot ? 'HOUSE' : s.id, tier.entry, 'match_abort_refund', matchRef, 'game'); });
  return { ok: true };
}
function chargePrivateFee(uid, ref) {
  if (!S.settings.economy.enabled) return { ok: true };
  const fee = Number(S.settings.economy.privateTableFee) || 0;
  if (fee <= 0) return { ok: true };
  return debit(uid, fee, 'private_table_fee', ref, 'game');
}
/* ================= الإشهارات ================= */
function todayKey() { return new Date().toISOString().slice(0, 10); }
function adState(u, deviceId) {
  const a = S.settings.ads;
  if (!u) return { allowed: false, reason: 'غير معروف' };
  if (!a.enabled) return { allowed: false, reason: 'الإشهارات معطّلة' };
  if (u.banned) return { allowed: false, reason: 'حساب محظور' };
  if (u.lastAd && (now() - u.lastAd) < (Number(a.cooldownSec) || 0) * 1000) return { allowed: false, reason: 'استنى شوية بين إشهار وإشهار' };
  if (u.adsDay !== todayKey()) { u.adsDay = todayKey(); u.adsToday = 0; }
  if (u.adsToday >= (Number(a.dailyCap) || 0)) return { allowed: false, reason: 'وصلت للحد اليومي' };
  const dk = String(deviceId || (u.devices && u.devices[0]) || '').substring(0, 64);
  if (dk && S.devices[dk]) {
    const d = S.devices[dk];
    if (d.adsDay !== todayKey()) { d.adsDay = todayKey(); d.adsToday = 0; }
    if ((d.adsToday || 0) >= (Number(a.dailyCap) || 0)) return { allowed: false, reason: 'الجهاز وصل للحد اليومي' };
  }
  return { allowed: true, remaining: (Number(a.dailyCap) || 0) - u.adsToday };
}
function hasAdRef(ref) {
  const r = String(ref || '');
  if (!r) return false;
  return (S.adRewards || []).some(x => x.ref === r);
}
function grantAdReward(uid, ref, deviceId) {
  const u = user(uid); if (!u) return { ok: false, reason: 'غير موجود' };
  const refKey = String(ref || '');
  if (refKey && hasAdRef(refKey)) return { ok: false, reason: 'معاملة مكررة', duplicate: true };
  const st = adState(u, deviceId);
  if (!st.allowed) return { ok: false, reason: st.reason };
  const pts = Number(S.settings.ads.rewardPoints) || 50;
  u.lastAd = now(); u.adsToday = (u.adsToday || 0) + 1;
  const dk = String(deviceId || (u.devices && u.devices[0]) || '').substring(0, 64);
  if (dk && S.devices[dk]) { const d = S.devices[dk]; if (d.adsDay !== todayKey()) { d.adsDay = todayKey(); d.adsToday = 0; } d.adsToday = (d.adsToday || 0) + 1; }
  S.adRewards.push({ ts: now(), uid, points: pts, ref: refKey });
  if (S.adRewards.length > 10000) S.adRewards = S.adRewards.slice(-10000);
  S.counters.adsPaid++;
  credit(uid, pts, 'ad_reward', refKey, 'ads');
  scheduleSave();
  return { ok: true, points: pts, balance: u.balance, remaining: st.remaining - 1 };
}
function claimDaily(uid) {
  return { ok: false, reason: 'المكافآت المجانية معطّلة — النقاط من الربح والإشهار والأدمن فقط' };
}
/* ================= الهوية ================= */
function signToken(uid) { const sig = crypto.createHmac('sha256', S.settings.security.secret).update(String(uid)).digest('hex').slice(0, 32); return String(uid) + '.' + sig; }
function verifyToken(tok) {
  const s = String(tok || '');
  const i = s.lastIndexOf('.');
  if (i < 1) return null;
  const uid = s.slice(0, i), sig = s.slice(i + 1);
  const want = crypto.createHmac('sha256', S.settings.security.secret).update(uid).digest('hex').slice(0, 32);
  return (sig.length === want.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) ? uid : null;
}
function registerDevice(uid, deviceId, ip) {
  const key = String(deviceId || '').substring(0, 64);
  if (!key) return;
  if (!S.devices[key]) S.devices[key] = { users: [], ip: String(ip || ''), ts: now(), adsToday: 0, adsDay: '' };
  const d = S.devices[key];
  if (!d.users.includes(uid)) d.users.push(uid);
  d.ts = now();
  const u = user(uid);
  if (u && !u.devices.includes(key)) u.devices.push(key);
  scheduleSave();
}
/* ================= إحصائيات ================= */
function stats() {
  const us = Object.values(S.users).filter(u => !u.house);
  const totalPoints = us.reduce((s, u) => s + (u.balance || 0), 0);
  const dayAgo = now() - 86400000;
  return { users: us.length, active24h: us.filter(u => (u.lastSeen || 0) > dayAgo).length, banned: us.filter(u => u.banned).length, totalPoints, avgBalance: us.length ? Math.round(totalPoints / us.length) : 0, matches: S.counters.matches, pointsGranted: S.counters.pointsGranted, adsPaid: S.counters.adsPaid, gifts: S.gifts.length, ledgerRows: S.ledger.length, economyOn: !!S.settings.economy.enabled, adsOn: !!S.settings.ads.enabled, googleOn: !!S.settings.google.enabled, mysql: mysqlStatus() };
}
function exportAll() {
  const copy = JSON.parse(JSON.stringify(S));
  if (copy.settings && copy.settings.security) { copy.settings.security.secret = ''; copy.settings.security.adminPasscode = ''; }
  if (copy.settings && copy.settings.google) copy.settings.google.clientSecret = '';
  if (copy.settings && copy.settings.db) copy.settings.db.password = '';
  return copy;
}
function importAll(obj) {
  if (!obj || typeof obj !== 'object' || !obj.users) return { ok: false, reason: 'ملف غير صالح' };
  const keep = S.settings;
  S = Object.assign(blank(), obj);
  S.settings = deepMerge(DEFAULTS, S.settings || {});
  // Never replace this server's auth/database secrets with values from an uploaded backup.
  S.settings.security.secret = keep.security.secret;
  if (keep.security.adminPasscode && !S.settings.security.adminPasscode) S.settings.security.adminPasscode = keep.security.adminPasscode;
  if (keep.google.clientSecret && !S.settings.google.clientSecret) S.settings.google.clientSecret = keep.google.clientSecret;
  if (keep.db.password && !S.settings.db.password) S.settings.db.password = keep.db.password;
  scheduleSave();
  return { ok: true, users: Object.keys(S.users).length };
}
load();
if (S.settings.db && S.settings.db.enabled) mysqlConnect(S.settings.db, true).catch(() => {});
module.exports = {
  DEFAULTS, DEFAULT_TIERS,
  settings, getSetting, setSettings, tiers, tierById,
  ensureUser, user, findUser, searchUsers, publicUser, setBan, renameUser,
  credit, debit, gift, ledgerList, giftsList,
  canSit, seatsShareDevice, collectEntry, settleMatch, refundMatch, chargePrivateFee,
  adState, hasAdRef, grantAdReward, claimDaily,
  signToken, verifyToken, registerDevice,
  stats, exportAll, importAll,
  mysqlConnect, mysqlRestore, mysqlStatus,
  flush: () => { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; try { ensureDir(); fs.writeFileSync(DB_FILE, JSON.stringify(S)); } catch (e) {} } }
};
