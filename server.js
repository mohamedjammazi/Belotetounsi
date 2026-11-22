/* ==========================================================================
   FILE: /server.js  —  v53
   • يركّب الموقع العام مباشرة (يخدم /rules وغيرها) قبل admin-api
   • فحص ملفات الموقع عند الإقلاع + /api/health/site
========================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const WebSocket = require('ws');
const app = express();
// The hosting Nginx enforces HTTP-to-HTTPS; this app canonicalizes hostnames.
app.set('trust proxy', 1);
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const { PORT, ADMIN_PASSCODE } = require('./src/config');
const botRuleEngine = require('./src/bot/rule-engine');
const store = require('./src/store');
const adminApi = require('./src/admin-api');

const REQUIRED_SITE_FILES = [
  'src/content.js', 'src/public-site.js', 'public/index.tpl.html',
  'public/site.css', 'public/js/site.js', 'public/js/rewarded-ads.js'
];
function siteFilesReport() {
  return REQUIRED_SITE_FILES.map(f => ({ file: f, exists: fs.existsSync(path.join(__dirname, f)) }));
}
let publicSite = null;
let publicSiteError = '';
try { publicSite = require('./src/public-site'); } catch (e) { publicSiteError = String(e.message || e); }

let brain = null;
try { brain = require('./src/bot/brain'); } catch (e) { console.warn('[Brain] missing'); }
if (brain && botRuleEngine) { try { brain.injectRuleEngine(botRuleEngine); } catch (e) {} }
app.use((req, res, next) => {
  const host = String(req.get('host') || '').toLowerCase();
  if (/^(localhost|127\.0\.0\.1|\[?::1\]?)(:\d+)?$/.test(host)) return next();
  if (!publicSite) return next();
  const canonical = publicSite.getSite().domain;
  const canonicalHost = new URL(canonical).host.toLowerCase();
  if (host !== canonicalHost) return res.redirect(308, canonical + req.originalUrl);
  next();
});
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
const G = () => store.settings().game;

function requireAdminApi(req, res, next) { const expected = adminApi.adminPass(); if (!expected || !adminApi.checkPass(String(req.headers['x-admin-passcode'] || ''), expected)) return res.status(401).json({ ok: false, error: 'Invalid admin passcode' }); next(); }
app.get('/api/admin/bot-rules', requireAdminApi, (req, res) => res.json({ ok: true, rules: botRuleEngine.listRules() }));
app.post('/api/admin/bot-rules', requireAdminApi, (req, res) => { const r = botRuleEngine.saveRule(req.body || {}); res.status(r.ok ? 200 : 409).json(r.ok ? r : { ok: false, error: r.errors ? r.errors.join(' ') : 'duplicate', ...r }); });
app.put('/api/admin/bot-rules/:id', requireAdminApi, (req, res) => { const r = botRuleEngine.saveRule({ ...(req.body || {}), id: req.params.id }); res.status(r.ok ? 200 : 409).json(r.ok ? r : { ok: false, error: r.errors ? r.errors.join(' ') : 'duplicate', ...r }); });
app.delete('/api/admin/bot-rules/:id', requireAdminApi, (req, res) => res.json({ ok: botRuleEngine.deleteRule(req.params.id) }));
app.post('/api/admin/bot-rules/simulate', requireAdminApi, (req, res) => res.json({ ok: true, ...botRuleEngine.evaluate(req.body || {}) }));
app.get('/api/admin/bot-rules/history', requireAdminApi, (req, res) => res.json({ ok: true, history: botRuleEngine.historyList() }));
app.get('/api/admin/brain-stats', requireAdminApi, (req, res) => { try { res.json({ ok: true, stats: brain ? brain.getStats() : { enabled: false } }); } catch (e) { res.status(500).json({ ok: false, message: e.message }); } });
app.get('/api/admin/learning-stats', requireAdminApi, (req, res) => { try { res.json({ ok: true, stats: brain ? brain.getStats() : { enabled: false } }); } catch (e) { res.status(500).json({ ok: false, message: e.message }); } });
app.post('/api/admin/force-evolve', requireAdminApi, (req, res) => { try { res.json(brain ? { ok: true, ...brain.evolve() } : { ok: false, reason: 'brain not loaded' }); } catch (e) { res.status(500).json({ ok: false, message: e.message }); } });
app.post('/api/admin/run-learning', requireAdminApi, (req, res) => { try { res.json(brain ? { ok: true, ...brain.evolve() } : { ok: false, reason: 'brain not loaded' }); } catch (e) { res.status(500).json({ ok: false, message: e.message }); } });
app.post('/api/admin/brain-toggle', requireAdminApi, (req, res) => { if (!brain) return res.json({ ok: false, enabled: false }); res.json({ ok: true, enabled: brain.setEnabled(!!(req.body && req.body.enabled)) }); });
app.get('/api/admin/evolved-rules', requireAdminApi, (req, res) => { try { res.json({ ok: true, rules: botRuleEngine.listRules().filter(r => String(r.id).indexOf('LEARNED-') === 0) }); } catch (e) { res.status(500).json({ ok: false, message: e.message }); } });
app.delete('/api/admin/evolved-rules/:id', requireAdminApi, (req, res) => { try { res.json({ ok: botRuleEngine.deleteRule(req.params.id) }); } catch (e) { res.status(500).json({ ok: false, message: e.message }); } });
app.post('/api/admin/clear-brain-memory', requireAdminApi, (req, res) => { try { if (brain) { brain.memory = []; brain.q = {}; brain.n = {}; brain._scheduleSave(); } res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false, message: e.message }); } });
app.get('/api/admin/brain-qtable', requireAdminApi, (req, res) => { try { res.json({ ok: true, data: brain ? brain.q : {} }); } catch (e) { res.status(500).json({ ok: false, message: e.message }); } });
app.get('/api/admin/brain-counts', requireAdminApi, (req, res) => { try { res.json({ ok: true, data: brain ? brain.n : {} }); } catch (e) { res.status(500).json({ ok: false, message: e.message }); } });
app.get('/api/admin/brain-memory', requireAdminApi, (req, res) => { try { res.json({ ok: true, data: brain ? brain.memory : [] }); } catch (e) { res.status(500).json({ ok: false, message: e.message }); } });
app.get('/api/admin/brain-export', requireAdminApi, (req, res) => { try { res.json({ ok: true, data: { timestamp: new Date().toISOString(), stats: brain ? brain.getStats() : null, qtable: brain ? brain.q : {}, counts: brain ? brain.n : {}, memory: brain ? brain.memory : [], config: brain ? brain.config : {} } }); } catch (e) { res.status(500).json({ ok: false, message: e.message }); } });

app.get('/api/room-info', (req, res) => {
  const id = String(req.query.id || '').toUpperCase();
  const r = rooms.get(id);
  if (!r) return res.json({ ok: false });
  const t = r.tier();
  res.json({ ok: true, id: r.id, status: r.status, players: r.playerCount(), isPrivate: r.isPrivate, hostId: r.hostId, origin: r.origin, speed: r.speed, tierName: t ? t.name : '', tierEmoji: t ? t.emoji : '', entry: t ? t.entry : 0, autoFillOn: r.autoFillOn(), autoFillIn: r.autoFillTimer ? Math.max(0, r.autoFillAt - Date.now()) : 0 });
});
app.get('/api/health/site', (req, res) => {
  res.json({
    ok: !!publicSite,
    loaderError: publicSiteError || null,
    files: siteFilesReport(),
    pages: publicSite && publicSite.P ? Object.keys(publicSite.P).map(k => '/' + publicSite.P[k].slug) : [],
    game: '/play'
  });
});

const { SUITS, RANKS, POINTS_TRUMP, POINTS_NORMAL, POWER_TRUMP, POWER_NORMAL, VALID_BID_VALUES, createDeck, sortHand } = require('./src/game/rules');
const TURN_TIMEOUT_MS = 60000, REACTION_WINDOW_MS = 4000;
const BOT_DELAY_MS = 620, BOT_THINK_DELAY_MS = 2600, BOT_SINGLE_DELAY_MS = 260, TRICK_RESOLVE_MS = 880;
const ENDGAME_BUDGET_MS = 18, ENDGAME_DETERMINIZATIONS = 4;
const BOT_NAMES = ['بوت سليم', 'بوت حمزة', 'بوت نادر', 'بوت ماهر'];
const rooms = new Map(), clients = new Map();
function generateRoomId() { let id; do { id = 'RM-' + crypto.randomBytes(5).toString('hex').toUpperCase(); } while (rooms.has(id)); return id; }
function sameSuitModeLabel(mode, mult) {
  if (mode === 'khatafa_finish') return ' 🏆 [خطفة 2000]';
  if (mode === 'khatafa_double') return ' ⚡ [خطفة 640]';
  if (mode === 'match_2000') return ' 🏆 [طره كامل 2000]';
  if (mult === 4) return ' ⚡ [سوركونتري 640]';
  if (mult === 2) return ' 🔥 [كونتري 320]';
  return '';
}
function applyKassRule(raw) { const o = raw % 10; const k = (o >= 5 && o <= 7); return { isKass: k, effective: k ? raw + (10 - o) : raw, ones: o }; }
function recordTens(raw) { return Math.min(160, Math.round(raw / 10) * 10); }
function brainBidFp(ctx) { return [ctx.partnerOriginalBid || 0, ctx.partnerOwnsOriginalContract ? 1 : 0, ctx.hasJackInPartnerSuit ? 1 : 0, ctx.hasNineInPartnerSuit ? 1 : 0, Math.min(8, ctx.partnerSuitCount || 0), Math.min(4, ctx.mySideAceCount || 0), Math.min(8, ctx.trumpCount || 0), ctx.currentContractValue || 0, ctx.opponentIntervened ? 1 : 0, Math.min(3, ctx.myVoidSuitCount || 0), ctx.bestIsFullTrump ? 1 : 0, ctx.partnerOpeningWasThinking ? 1 : 0].join('|'); }

class BotMemory {
  constructor() { this.reset(); }
  reset() { this.suitCountPlayed = { spades: 0, hearts: 0, clubs: 0, diamonds: 0 }; this.playedBitmask = 0; this.playerVoid = [{}, {}, {}, {}]; this.acePromise = [new Set(), new Set(), new Set(), new Set()]; this.profiles = [null, null, null, null]; }
  cardBit(s, r) { return SUITS.indexOf(s) * 8 + RANKS.indexOf(r); }
  hasPlayed(s, r) { return (this.playedBitmask & (1 << this.cardBit(s, r))) !== 0; }
  onCardPlayed(seat, card, ledSuit) { this.suitCountPlayed[card.suit]++; this.playedBitmask |= (1 << this.cardBit(card.suit, card.rank)); if (ledSuit && card.suit !== ledSuit) this.playerVoid[seat][ledSuit] = true; }
  trumpsOutside(hand, t) { let m = 0; for (const c of hand) if (c.suit === t) m++; return Math.max(0, 8 - this.suitCountPlayed[t] - m); }
  recordBidProfile(seat, value, thinking, suit) {
    if (this.profiles[seat]) return;
    const p = { value, thinking, suit, outsideAces: 0, voids: 0, trump: 'unknown' };
    if (value === 90 && !thinking) { p.outsideAces = 2; p.trump = 'medium'; }
    else if (value === 90 && thinking) { p.outsideAces = 2; p.trump = 'weak'; }
    else if (value === 100) { p.outsideAces = 1; p.trump = 'strong'; }
    else if (value === 110) { p.voids = 0; p.trump = 'strong'; }
    else if (value === 120) { p.voids = 1; p.trump = 'strong'; }
    else if (value === 130) { p.voids = 2; p.trump = 'strong'; }
    else if (value >= 140) p.trump = 'solid';
    this.profiles[seat] = p;
  }
  detectAceSignal(seat, card, validIds, hand, t, trick) {
    if (!trick.length) return;
    const led = trick[0].card.suit;
    for (const c of hand) if (c.suit === led) return;
    const free = new Set(); for (const c of hand) if (validIds.includes(c.id)) free.add(c.suit);
    if (free.size < 2 || card.suit === t || card.rank === 'A') return;
    this.acePromise[seat].add(card.suit);
  }
  consumeAceSignal(seat, card, trick, t) { if (card.rank === 'A') this.acePromise[seat].delete(card.suit); if (trick.length && card.suit === t) this.acePromise[seat].delete(trick[0].card.suit); }
  partnerPromises(seat) { return this.acePromise[(seat + 2) % 4]; }
  enemyPromises(seat) { const s = new Set(); this.acePromise[(seat + 1) % 4].forEach(x => s.add(x)); this.acePromise[(seat + 3) % 4].forEach(x => s.add(x)); return s; }
}

class BeloteRoom {
  constructor(id, name, hostId, hostName, targetScore = 2000, isPrivate = false, tierId = '') {
    this.id = id; this.name = name || `طاولة ${hostName}`; this.hostId = hostId;
    this.targetScore = Number(targetScore) || 2000; this.createdAt = Date.now(); this.isPrivate = !!isPrivate;
    this.tierId = tierId || ''; this.entryPaid = false; this.settled = false; this.payoutInfo = null;
    this.matchRef = id + '-' + Date.now().toString(36);
    this.origin = 'host'; this.speed = 1;
    this.autoFillEnabled = null; this.autoFillTimer = null; this.autoFillAt = 0;
    this.seats = [null, null, null, null]; this.status = 'waiting'; this.deck = [];
    this.hands = { 0: [], 1: [], 2: [], 3: [] }; this.firstPlayerSeat = null;
    this.dealerSeat = 0; this.turnSeat = 0; this.passCount = 0; this.currentContract = null;
    this.bidHistory = []; this.lastActionBySeat = { 0: '', 1: '', 2: '', 3: '' };
    this.openingBidBySeat = { 0: null, 1: null, 2: null, 3: null };
    this.lastBidBySeat = { 0: null, 1: null, 2: null, 3: null };
    this.thinkingSeat = null; this.thinkingUntil = 0; this.trumpSuit = null;
    this.takerSeat = null; this.takerTeam = null; this.currentTrick = [];
    this.trickLeader = 0; this.lastTrickCards = []; this.lastTrickWinnerTeam = null; this.lastTrickWinnerSeat = null;
    this.playedCardsHistory = [];
    this.voidSuits = { 0: new Set(), 1: new Set(), 2: new Set(), 3: new Set() };
    this.roundCardPoints = { team1: 0, team2: 0 }; this.farchaPoints = { team1: 0, team2: 0 };
    this.roundPoints = { team1: 0, team2: 0 }; this.beloteBonus = { team1: 0, team2: 0 };
    this.beloteHolders = {}; this.tricksWon = { team1: 0, team2: 0 };
    this.lastSoundEvent = { type: 'deal', ts: Date.now() };
    this.totalScores = { team1: 0, team2: 0 }; this.scoreHistory = [];
    this.lastRoundSummary = null; this.chat = []; this.botTimer = null; this.reactionUntil = 0;
    this.biddingLocked = false;
    this.rules = { mandatoryUndertrump: true, scoringMode: 'kass' };
    this.memory = new BotMemory();
    this.turnStartedAt = Date.now(); this.turnDeadline = Date.now() + TURN_TIMEOUT_MS; this.turnTimeoutTimer = null;
  }
  pace(ms) { return Math.max(120, Math.round(ms / (this.speed || 1))); }
  tier() { return this.tierId ? store.tierById(this.tierId) : null; }
  autoFillOn() {
    if (this.autoFillEnabled !== null) return !!this.autoFillEnabled;
    return this.origin === 'match' ? !!G().autoFillBots : false;
  }
  cancelAutoFill() { if (this.autoFillTimer) { clearTimeout(this.autoFillTimer); this.autoFillTimer = null; } this.autoFillAt = 0; }
  scheduleAutoFill() {
    this.cancelAutoFill();
    if (this.isPrivate || this.status !== 'waiting' || !this.autoFillOn()) return;
    const humans = this.seats.filter(s => s && !s.isBot).length;
    if (humans < 1 || this.playerCount() >= 4) return;
    const delay = Math.max(5, Number(G().autoFillDelaySec) || 25) * 1000;
    this.autoFillAt = Date.now() + delay;
    this.autoFillTimer = setTimeout(() => this.doAutoFill(), delay);
  }
  doAutoFill() {
    this.autoFillTimer = null;
    if (this.status !== 'waiting' || this.playerCount() >= 4) return;
    let added = 0;
    for (let i = 0; i < 4; i++) {
      if (!this.seats[i]) { this.seats[i] = { id: 'BOT-' + Math.random().toString(36).substring(2, 7), name: BOT_NAMES[i], isBot: true }; added++; }
    }
    if (!added) return;
    this.addSystemChat(`🤖 دخلو ${added} بوت باش يكملو الطاولة — البوتات يلعبو بالمجان.`);
    markLobbyDirty();
    if (G().autoStartOnFill && this.playerCount() === 4) {
      const beg = this.beginMatch();
      if (beg.ok) {
        this.totalScores = { team1: 0, team2: 0 }; this.scoreHistory = []; this.payoutInfo = null;
        this.startNewRound(true);
        this.addSystemChat('🃏 الماتش بدا تلقائياً!');
      } else this.addSystemChat('⚠️ ما بداش الماتش: ' + (beg.reason || 'رصيد غير كافٍ'));
    }
    broadcastRoomState(this);
  }
  clearTimers() { if (this.botTimer) { clearTimeout(this.botTimer); this.botTimer = null; } if (this.turnTimeoutTimer) { clearTimeout(this.turnTimeoutTimer); this.turnTimeoutTimer = null; } this.cancelAutoFill(); }
  resetTurnTimer() {
    if (this.turnTimeoutTimer) { clearTimeout(this.turnTimeoutTimer); this.turnTimeoutTimer = null; }
    const toMs = (Number(G().turnTimeoutSec) || 60) * 1000;
    this.turnStartedAt = Date.now(); this.turnDeadline = this.turnStartedAt + toMs;
    if (this.status !== 'bidding' && this.status !== 'playing') return;
    if (this.turnSeat < 0 || this.turnSeat > 3) return;
    const p = this.seats[this.turnSeat]; if (!p || p.isBot) return;
    const s = this.turnSeat, pid = p.id;
    this.turnTimeoutTimer = setTimeout(() => this.handleTurnTimeout(s, pid), toMs);
  }
  handleTurnTimeout(seat, playerId) {
    if (this.status !== 'bidding' && this.status !== 'playing') return;
    if (this.turnSeat !== seat) return;
    const cur = this.seats[seat]; if (!cur || cur.isBot || cur.id !== playerId) return;
    const kc = clients.get(playerId);
    if (kc) { kc.roomId = null; if (kc.ws && kc.ws.readyState === WebSocket.OPEN) kc.ws.send(JSON.stringify({ type: 'room_closed', msg: '⏰ تم إخراجك لتجاوز المهلة!' })); }
    this.seats[seat] = { id: 'BOT-' + Math.random().toString(36).substring(2, 7), name: BOT_NAMES[seat] || 'بوت تعويض', isBot: true };
    const rh = this.seats.find(s => s && !s.isBot);
    if (!rh) { this.clearTimers(); this.abortMatch(); rooms.delete(this.id); markLobbyDirty(); flushLobby(); return; }
    if (this.hostId === playerId) this.hostId = rh.id;
    this.addSystemChat(`⏰ تم طرد ${cur.name} ودخل (${this.seats[seat].name}) مكانه!`);
    broadcastRoomState(this); this.scheduleBotActionIfNeeded();
  }
  nextSeat(s) { return (Number(s) + 1) % 4; }
  teamOf(s) { return Number(s) % 2 === 0 ? 1 : 2; }
  seatOf(pid) { return this.seats.findIndex(p => p && p.id === pid); }
  playerCount() { return this.seats.filter(Boolean).length; }
  addPlayer(p) {
    if (!p || !p.id) return -1;
    const ex = this.seatOf(p.id);
    if (ex !== -1) { this.seats[ex] = { ...this.seats[ex], ...p }; return ex; }
    if (this.status !== 'waiting') return -1;
    const e = this.seats.indexOf(null); if (e === -1) return -1;
    this.seats[e] = { id: String(p.id), name: String(p.name || 'لاعب').substring(0, 18), isBot: !!p.isBot };
    return e;
  }
  removePlayer(pid) {
    const s = this.seatOf(pid); if (s === -1) return false;
    // Refund a live paid match while the full human roster is still present.
    if (this.status !== 'waiting') { this.abortMatch(); this.status = 'waiting'; this.clearTimers(); }
    this.seats[s] = null;
    if (this.hostId === pid) { const nh = this.seats.find(p => p && !p.isBot); if (nh) this.hostId = nh.id; }
    this.scheduleAutoFill();
    return true;
  }
  swapSeats(a, b) { if (this.status !== 'waiting') return false; if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || a > 3 || b < 0 || b > 3 || a === b) return false; [this.seats[a], this.seats[b]] = [this.seats[b], this.seats[a]]; return true; }
  randomizeTeams() { if (this.status !== 'waiting') return false; for (let i = 3; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [this.seats[i], this.seats[j]] = [this.seats[j], this.seats[i]]; } return true; }
  beginMatch() {
    const t = this.tier();
    this.entryPaid = false; this.settled = false; this.payoutInfo = null;
    if (!store.settings().economy.enabled || !t) return { ok: true };
    const r = store.collectEntry(this.seats, t, this.matchRef);
    if (!r.ok) return r;
    this.entryPaid = true;
    this.addSystemChat(`🪙 تحطّ ${t.entry} نقطة من كل لاعب بشري — الرابحين ${t.entry * 2} لكل واحد. البوتات معفاة.`);
    return { ok: true };
  }
  abortMatch() { if (this.entryPaid && !this.settled) { store.refundMatch(this.seats, this.tier(), this.matchRef); this.entryPaid = false; this.settled = true; } }
  startNewRound(first = false) {
    if (this.playerCount() < 4) return false;
    this.cancelAutoFill();
    if (this.botTimer) { clearTimeout(this.botTimer); this.botTimer = null; }
    this.deck = createDeck(); this.hands = { 0: [], 1: [], 2: [], 3: [] };
    this.status = 'bidding'; this.passCount = 0; this.currentContract = null; this.biddingLocked = false;
    this.bidHistory = []; this.lastActionBySeat = { 0: '', 1: '', 2: '', 3: '' };
    this.openingBidBySeat = { 0: null, 1: null, 2: null, 3: null };
    this.lastBidBySeat = { 0: null, 1: null, 2: null, 3: null };
    this.thinkingSeat = null; this.thinkingUntil = 0; this.trumpSuit = null;
    this.takerSeat = null; this.takerTeam = null; this.currentTrick = [];
    this.lastTrickCards = []; this.lastTrickWinnerSeat = null; this.playedCardsHistory = [];
    this.voidSuits = { 0: new Set(), 1: new Set(), 2: new Set(), 3: new Set() };
    this.roundCardPoints = { team1: 0, team2: 0 }; this.farchaPoints = { team1: 0, team2: 0 };
    this.roundPoints = { team1: 0, team2: 0 }; this.beloteBonus = { team1: 0, team2: 0 };
    this.beloteHolders = {}; this.tricksWon = { team1: 0, team2: 0 };
    this.lastTrickWinnerTeam = null; this.lastRoundSummary = null; this.reactionUntil = 0;
    this.memory = new BotMemory();
    this.lastSoundEvent = { type: 'deal', ts: Date.now() };
    try { if (brain) brain.beginRound(this.id); } catch (e) {}
    this.firstPlayerSeat = (first || this.firstPlayerSeat === null) ? Math.floor(Math.random() * 4) : this.nextSeat(this.firstPlayerSeat);
    this.dealerSeat = (this.firstPlayerSeat + 3) % 4; this.turnSeat = this.firstPlayerSeat; this.trickLeader = this.firstPlayerSeat;
    for (let s = 0; s < 4; s++) { this.hands[s] = this.deck.splice(0, 8); sortHand(this.hands[s], null); }
    const st = this.seats[this.firstPlayerSeat];
    this.addSystemChat(`🔄 توزّعو 8 كوارط. أول اللعب 🥇: ${st ? st.name : this.firstPlayerSeat + 1}`);
    markLobbyDirty(); this.resetTurnTimer(); this.scheduleBotActionIfNeeded();
    return true;
  }
  triggerThinkingClock(seat) {
    if (seat < 0 || seat > 3 || !this.seats[seat]) return false;
    this.thinkingSeat = seat; this.thinkingUntil = Date.now() + this.pace(BOT_THINK_DELAY_MS);
    this.lastActionBySeat[seat] = '⏱️ يخمّم...';
    this.lastSoundEvent = { type: 'clock_tick', seat, ts: Date.now() };
    this.bidHistory.push({ seat, name: this.seats[seat].name, text: '⏱️ يخمّم...', action: 'thinking', team: this.teamOf(seat) });
    if (this.bidHistory.length > 60) this.bidHistory.shift();
    return true;
  }
  handleBid(seat, action, chosenSuit = null, bidValue = null) {
    if (this.status !== 'bidding') return { ok: false, msg: 'موش طور المزايدة' };
    if (this.biddingLocked && action !== 'surcontre') return { ok: false, msg: '🔒 المزايدة مقفولة!' };
    if (seat !== this.turnSeat) {
      const open = this.reactionUntil > Date.now(); const c = this.currentContract;
      const mt = this.teamOf(seat); const v = Number(bidValue);
      const kh = !!(c && action === 'bid' && chosenSuit === c.suit && c.multiplier === 1 && !c.sameSuitMode && c.value !== 500 && (v === c.value + 10 || v === c.value + 20) && mt !== c.team);
      const co = !!(c && action === 'contre' && c.multiplier === 1 && !c.sameSuitMode && c.value !== 500 && mt !== c.team);
      if (open && (kh || co)) this.turnSeat = seat; else return { ok: false, msg: 'موش دورك باش تفتح' };
    }
    this.reactionUntil = 0;
    const pn = this.seats[seat] ? this.seats[seat].name : `البلاصة ${seat + 1}`;
    const myTeam = this.teamOf(seat);
    const ss = { spades: '♠', hearts: '♥', clubs: '♣', diamonds: '♦' };
    const sn = { spades: 'سباطة ♠', hearts: 'كوب ♥', clubs: 'فلوس ♣', diamonds: 'ديناري ♦' };
    this.thinkingSeat = null; this.thinkingUntil = 0;
    if (action === 'pass') {
      this.passCount++; this.lastActionBySeat[seat] = 'باس';
      this.bidHistory.push({ seat, name: pn, text: 'باس', action: 'pass', team: myTeam });
      this.lastSoundEvent = { type: 'pass', seat, ts: Date.now() };
      if (!this.currentContract && this.passCount >= 4) { this.startNewRound(false); return { ok: true }; }
      if (this.currentContract && this.passCount >= 3) { this.finalizeBiddingAndStartPlay(); return { ok: true }; }
      this.turnSeat = this.nextSeat(this.turnSeat); this.resetTurnTimer(); this.scheduleBotActionIfNeeded();
      return { ok: true };
    }
    if (action === 'bid' || action === 'take') {
      if (this.currentContract && this.currentContract.multiplier >= 2) return { ok: false, msg: '⚠️ العقد مقفول بالكونتري!' };
      if (this.currentContract && this.currentContract.sameSuitMode) return { ok: false, msg: '⚠️ العقد خطفة!' };
      if (this.currentContract && this.currentContract.value === 500) return { ok: false, msg: '🔥 الكبوت مقفول — اللعب بدا!' };
      const val = Number(bidValue) || (this.currentContract ? (this.currentContract.value >= 180 ? 500 : this.currentContract.value + 10) : 90);
      if (!VALID_BID_VALUES.includes(val)) return { ok: false, msg: 'الفتحة من 90 حتى 180 أو كابوت 500' };
      if (this.currentContract && val <= this.currentContract.value) return { ok: false, msg: `لازم أكثر من ${this.currentContract.value}` };
      if (!SUITS.includes(chosenSuit)) return { ok: false, msg: 'اختار لون الأتو' };
      let mult = 1, mode = null, note = '';
      if (this.currentContract && this.currentContract.team !== myTeam && this.currentContract.suit === chosenSuit && val < 500) {
        const d = val - this.currentContract.value;
        if (d === 10) { mode = 'khatafa_double'; note = ' ⚡ [خطفة 640]'; }
        else if (d >= 20) { mode = 'khatafa_finish'; note = ' 🏆 [خطفة 2000]'; }
      }
      const hadThink = this.bidHistory.slice(-6).some(a => a.seat === seat && a.action === 'thinking');
      this.currentContract = { value: val, suit: chosenSuit, seat, team: myTeam, multiplier: mult, sameSuitMode: mode, contraBy: null, surcontraBy: null, thinkingOpen: hadThink };
      this.passCount = 0;
      this.memory.recordBidProfile(seat, val, hadThink, chosenSuit);
      const lv = val === 500 ? 'كابوت (500)' : val;
      const short = `${lv} ${ss[chosenSuit]}${sameSuitModeLabel(mode, mult)}`;
      this.lastActionBySeat[seat] = short;
      const bo = { value: val, suit: chosenSuit, text: short };
      if (!this.openingBidBySeat[seat]) this.openingBidBySeat[seat] = bo;
      this.lastBidBySeat[seat] = bo;
      this.bidHistory.push({ seat, name: pn, text: `${lv} ${sn[chosenSuit]}${note}`, action: 'bid', value: val, suit: chosenSuit, team: myTeam, hadThinkingBefore: hadThink });
      if (this.bidHistory.length > 60) this.bidHistory.shift();
      this.lastSoundEvent = { type: mode ? 'surcontre' : 'bid', seat, ts: Date.now() };
      this.addSystemChat(`📢 ${pn} فتح ${lv} على ${sn[chosenSuit]}${note}`);
      try { if (brain) { const ev = SUITS.map(s => this.evaluateBotSuit(this.hands[seat], s)).sort((a, b) => b.score - a.score); brain.recordDecision(this.id, seat, 'bid', brainBidFp(this.buildBotBidContext(seat, ev)), { type: 'bid', suit: chosenSuit, value: val }, this.seats[seat] && this.seats[seat].isBot ? 'bot' : 'human'); } } catch (e) {}
      if (val === 500) {
        this.biddingLocked = true;
        this.addSystemChat('🔥 كبوت! المزايدة انتهت — اللعب يبدا توّة.');
        this.finalizeBiddingAndStartPlay(); return { ok: true };
      }
      if (mode === 'khatafa_finish' || mode === 'khatafa_double') {
        this.biddingLocked = true;
        this.addSystemChat(mode === 'khatafa_finish' ? '🏆 خطفة +20! الطرح كامل 2000.' : '⚡ خطفة +10! كونتري في الزوز 640.');
        this.finalizeBiddingAndStartPlay(); return { ok: true };
      }
      this.reactionUntil = Date.now() + REACTION_WINDOW_MS;
      this.turnSeat = this.nextSeat(this.turnSeat); this.resetTurnTimer(); this.scheduleBotActionIfNeeded();
      return { ok: true };
    }
    if (action === 'contre') {
      if (!this.currentContract) return { ok: false, msg: 'ما فمّاش فتحة' };
      if (this.currentContract.value === 500) return { ok: false, msg: '🔥 الكبوت مقفول!' };
      if (this.currentContract.team === myTeam) return { ok: false, msg: 'ما كونترش فريقك' };
      if (this.currentContract.multiplier !== 1) return { ok: false, msg: 'الكونتري تعملت' };
      if (this.currentContract.sameSuitMode) return { ok: false, msg: 'العقد خطفة!' };
      this.currentContract.multiplier = 2; this.currentContract.contraBy = pn; this.passCount = 0;
      this.lastActionBySeat[seat] = '🔥 كونتري 320';
      this.lastBidBySeat[seat] = { value: 320, suit: this.currentContract.suit, text: `🔥 كونتري ${ss[this.currentContract.suit]}` };
      this.bidHistory.push({ seat, name: pn, text: '🔥 كونتري 320', action: 'contre', suit: this.currentContract.suit, team: myTeam });
      this.lastSoundEvent = { type: 'contre', seat, ts: Date.now() };
      this.addSystemChat(`🔥 ${pn} قال كونتري 320!`);
      try { if (brain) { const ev = SUITS.map(s => this.evaluateBotSuit(this.hands[seat], s)).sort((a, b) => b.score - a.score); brain.recordDecision(this.id, seat, 'contre', brainBidFp(this.buildBotBidContext(seat, ev)), { type: 'contre' }, this.seats[seat] && this.seats[seat].isBot ? 'bot' : 'human'); } } catch (e) {}
      this.reactionUntil = Date.now() + REACTION_WINDOW_MS;
      this.turnSeat = this.nextSeat(this.turnSeat); this.resetTurnTimer(); this.scheduleBotActionIfNeeded();
      return { ok: true };
    }
    if (action === 'surcontre') {
      if (!this.currentContract || this.currentContract.multiplier !== 2) return { ok: false, msg: 'سوركونتري بعد كونتري فقط' };
      if (this.currentContract.value === 500) return { ok: false, msg: '🔥 الكبوت مقفول!' };
      if (this.currentContract.team !== myTeam) return { ok: false, msg: 'كان فريق الفتح يجاوب' };
      this.currentContract.multiplier = 4; this.currentContract.surcontraBy = pn; this.passCount = 0;
      this.biddingLocked = true;
      this.lastActionBySeat[seat] = '⚡ سوركونتري 640';
      this.lastBidBySeat[seat] = { value: 640, suit: this.currentContract.suit, text: `⚡ سوركونتري ${ss[this.currentContract.suit]}` };
      this.bidHistory.push({ seat, name: pn, text: '⚡ سوركونتري 640', action: 'surcontre', suit: this.currentContract.suit, team: myTeam });
      this.lastSoundEvent = { type: 'surcontre', seat, ts: Date.now() };
      this.addSystemChat(`⚡ ${pn} جاوب بسوركونتري 640!`);
      this.finalizeBiddingAndStartPlay();
      return { ok: true };
    }
    return { ok: false, msg: 'مزايدة غير صحيحة' };
  }
  finalizeBiddingAndStartPlay() {
    this.reactionUntil = 0; this.biddingLocked = true;
    this.trumpSuit = this.currentContract.suit; this.takerSeat = this.currentContract.seat; this.takerTeam = this.currentContract.team; this.thinkingSeat = null;
    for (let s = 0; s < 4; s++) {
      sortHand(this.hands[s], this.trumpSuit);
      const hk = this.hands[s].some(c => c.suit === this.trumpSuit && c.rank === 'K');
      const hq = this.hands[s].some(c => c.suit === this.trumpSuit && c.rank === 'Q');
      if (hk && hq) this.beloteHolders[s] = { armed: !!(this.seats[s] && this.seats[s].isBot), declaredFirst: false, cardsPlayed: 0, team: this.teamOf(s) };
    }
    const sn = { spades: 'سباطة ♠', hearts: 'كوب ♥', clubs: 'فلوس ♣', diamonds: 'ديناري ♦' };
    const mt = sameSuitModeLabel(this.currentContract.sameSuitMode, this.currentContract.multiplier);
    const lv = this.currentContract.value === 500 ? 'كابوت (500)' : this.currentContract.value;
    const tn = this.seats[this.takerSeat] ? this.seats[this.takerSeat].name : '';
    this.addSystemChat(`✅ العقد: ${lv} على ${sn[this.trumpSuit]}${mt} عند ${tn}. اللعب يبدا!`);
    this.status = 'playing'; this.trickLeader = this.firstPlayerSeat; this.turnSeat = this.trickLeader;
    markLobbyDirty(); this.resetTurnTimer(); this.scheduleBotActionIfNeeded();
  }
  toggleBeloteArm(seat) { const h = this.beloteHolders[seat]; if (!h || h.cardsPlayed > 0) return { ok: false, msg: 'ما تبدلش بعد أول ورقة' }; h.armed = !h.armed; return { ok: true, armed: h.armed }; }
  getValidCardIds(seat) {
    const hand = this.hands[seat] || [];
    if (!this.currentTrick.length) return hand.map(c => c.id);
    const led = this.currentTrick[0].card.suit;
    const same = hand.filter(c => c.suit === led);
    const winner = this.getCurrentTrickWinner();
    const highT = this.getHighestTrumpInTrick();
    if (same.length) {
      if (led === this.trumpSuit && highT) { const hi = same.filter(c => POWER_TRUMP[c.rank] > POWER_TRUMP[highT.card.rank]); if (hi.length) return hi.map(c => c.id); }
      return same.map(c => c.id);
    }
    const myT = hand.filter(c => c.suit === this.trumpSuit);
    if (winner.seat === (seat + 2) % 4) return hand.map(c => c.id);
    if (myT.length) {
      if (highT) { const hi = myT.filter(c => POWER_TRUMP[c.rank] > POWER_TRUMP[highT.card.rank]); if (hi.length) return hi.map(c => c.id); }
      return myT.map(c => c.id);
    }
    return hand.map(c => c.id);
  }
  explainInvalidCardMove(seat, card) {
    const hand = this.hands[seat] || [];
    if (!this.currentTrick.length) return 'ما تنجمش تلعبها';
    const sn = { spades: 'سباطة ♠', hearts: 'كوب ♥', clubs: 'فلوس ♣', diamonds: 'ديناري ♦' };
    const dr = { '7': '7', '8': '8', '9': '9', '10': '10', 'J': 'V', 'Q': 'D', 'K': 'R', 'A': '1' };
    const led = this.currentTrick[0].card.suit; const same = hand.filter(c => c.suit === led);
    const highT = this.getHighestTrumpInTrick(); const myT = hand.filter(c => c.suit === this.trumpSuit);
    if (same.length) { if (card.suit !== led) return `⛔ عندك (${sn[led]})!`; if (led === this.trumpSuit && highT) return `⛔ لازم تعلّي فوق (${dr[highT.card.rank]})!`; }
    if (highT && myT.length) { const hi = myT.filter(c => POWER_TRUMP[c.rank] > POWER_TRUMP[highT.card.rank]); if (hi.length) return `⛔ لازم تركب فوق (${dr[highT.card.rank]})!`; if (card.suit !== this.trumpSuit) return `⛔ لازم تلوّح أتو!`; }
    if (myT.length && card.suit !== this.trumpSuit) return `⛔ لازم تقصّ بالأتو!`;
    return '⛔ ما تنجمش تلعبها!';
  }
  getHighestTrumpInTrick() { const t = this.currentTrick.filter(p => p.card.suit === this.trumpSuit); if (!t.length) return null; return t.reduce((b, c) => POWER_TRUMP[c.card.rank] > POWER_TRUMP[b.card.rank] ? c : b); }
  getCurrentTrickWinner() {
    const led = this.currentTrick[0].card.suit; let best = this.currentTrick[0];
    for (let i = 1; i < this.currentTrick.length; i++) { const c = this.currentTrick[i]; const bt = best.card.suit === this.trumpSuit, ct = c.card.suit === this.trumpSuit; if (ct && !bt) best = c; else if (ct && bt) { if (POWER_TRUMP[c.card.rank] > POWER_TRUMP[best.card.rank]) best = c; } else if (!ct && !bt && c.card.suit === led) { if (POWER_NORMAL[c.card.rank] > POWER_NORMAL[best.card.rank]) best = c; } }
    return best;
  }
  wouldWin(seat, card) { const saved = this.currentTrick; this.currentTrick = [...saved, { seat, card }]; const w = this.getCurrentTrickWinner(); this.currentTrick = saved; return w.seat === seat; }
  _played(s, r) { return this.memory.hasPlayed(s, r); }
  _remaining(s, hand) { let n = 0; for (const c of hand) if (c.suit === s) n++; return 8 - this.memory.suitCountPlayed[s] - n; }
  _master(card, hand) {
    const isT = card.suit === this.trumpSuit; const pm = isT ? POWER_TRUMP : POWER_NORMAL; const mp = pm[card.rank];
    for (const r of RANKS) { if (pm[r] <= mp) continue; if (this._played(card.suit, r)) continue; let inH = false; for (const c of hand) if (c.suit === card.suit && c.rank === r) { inH = true; break; } if (!inH) return false; }
    return true;
  }
  _cat(card, wins, leading) { if (!leading && wins) return 'WIN_CHEAP'; if (!leading && card.suit === this.trumpSuit) return 'TRUMP_CUT'; const p = card.suit === this.trumpSuit ? POINTS_TRUMP[card.rank] : POINTS_NORMAL[card.rank]; return p >= 10 ? 'DUMP_PTS' : 'PLAY_LOW'; }
  _dumpCost(card, hand) {
    const isT = card.suit === this.trumpSuit;
    const pts = isT ? POINTS_TRUMP[card.rank] : POINTS_NORMAL[card.rank];
    const pow = isT ? 100 + POWER_TRUMP[card.rank] : POWER_NORMAL[card.rank];
    const suitCards = hand.filter(c => c.suit === card.suit);
    const hasTen = suitCards.some(c => c.rank === '10');
    const isGuard = hasTen && card.rank !== '10' && suitCards.length === 2;
    const tenIsMaster = hasTen && this._played(card.suit, 'A');
    const isMaster = this._master(card, hand);
    let cost = pts * 10;
    if (isGuard) cost += tenIsMaster ? 130 : 95;
    if (isMaster) cost += 150;
    if (isT) cost += 60;
    if (isT && card.rank === '9' && !this._played(this.trumpSuit, 'J')) cost += 200;
    return cost + pow * 0.1;
  }
  getRequiredPointsToWinContract(contract, ourBelote, theirBelote, mode) { const pool = 162; const takerNeeds = contract.value - (ourBelote ? 20 : 0); return { takerNeeds, defenseNeeds: pool - takerNeeds + 1, pool, mode: mode || this.rules.scoringMode }; }
  currentTeamPoints(team) { const k = team === 1 ? 'team1' : 'team2'; return this.roundPoints[k] + this.beloteBonus[k]; }
  kassEffective(p) { return applyKassRule(p).effective; }
  expectedHandPoints(hand, suit) { let pts = 0; for (const c of hand) pts += c.suit === suit ? POINTS_TRUMP[c.rank] : POINTS_NORMAL[c.rank]; if (hand.some(c => c.suit === suit && c.rank === 'K') && hand.some(c => c.suit === suit && c.rank === 'Q')) pts += 20; return pts; }
  _expertDecision(seat, learnedOnly) {
    if (!botRuleEngine) return null;
    let res; try { const ev = SUITS.map(s => this.evaluateBotSuit(this.hands[seat], s)).sort((a, b) => b.score - a.score); res = botRuleEngine.evaluate(this.buildBotBidContext(seat, ev)); } catch (e) { return null; }
    if (!res || !res.decision) return null;
    if (learnedOnly && String(res.decision.ruleId || '').indexOf('LEARNED-') !== 0) return null;
    const d = res.decision; const c = this.currentContract;
    if (d.action === 'bid') { if (!SUITS.includes(d.suit)) return null; const v = Number(d.value); if (!VALID_BID_VALUES.includes(v)) return null; if (c && v <= c.value) return null; if (c && (c.multiplier >= 2 || c.sameSuitMode || c.value === 500)) return null; return { action: 'bid', suit: d.suit, value: v, thinking: !!d.thinking }; }
    if (d.action === 'pass' || d.action === 'contre' || d.action === 'surcontre') return { action: d.action };
    return null;
  }
  chooseSmartBotBid(seat) {
    const hand = this.hands[seat] || [];
    const evs = SUITS.map(s => this.evaluateBotSuit(hand, s)).sort((a, b) => b.score - a.score);
    const best = evs[0]; const myTeam = this.teamOf(seat); const partnerSeat = (seat + 2) % 4;
    const aces = hand.filter(c => c.rank === 'A').length;
    const tens = hand.filter(c => c.rank === '10').length;
    const sc = { spades: 0, hearts: 0, clubs: 0, diamonds: 0 }; hand.forEach(c => sc[c.suit]++);
    const voids = Object.values(sc).filter(n => n === 0).length;
    const c = this.currentContract;
    if (this.biddingLocked) return { action: 'pass' };
    if (c && c.value === 500) return { action: 'pass' };
    if (c && c.multiplier >= 2) {
      if (c.multiplier === 2 && c.team === myTeam) { const o = this.evaluateBotSuit(hand, c.suit); if (o.hasJack && o.hasNine && o.trumpCount >= 4) return { action: 'surcontre' }; }
      return { action: 'pass' };
    }
    const expert = this._expertDecision(seat, false);
    if (expert) return expert;
    const conv = this._conventionBid(seat, hand, evs, best, aces, tens, voids, c, myTeam, partnerSeat);
    if (conv && conv.action !== 'pass') return conv;
    const learned = this._expertDecision(seat, true);
    if (learned) return learned;
    return conv || { action: 'pass' };
  }
  _conventionBid(seat, hand, evs, best, aces, tens, voids, c, myTeam, partnerSeat) {
    if (!c) {
      const exp = this.expectedHandPoints(hand, best.suit);
      const sideMasters = evs.filter(e => e.suit !== best.suit && e.hasAce && e.hasTen).length;
      if (best.trumpCount >= 5 && best.hasJack && best.hasNine && best.hasAce && best.hasTen && sideMasters >= 2) return { action: 'bid', suit: best.suit, value: 500 };
      if (best.hasJack && best.hasNine && best.hasAce && best.trumpCount >= 4 && voids === 2) return { action: 'bid', suit: best.suit, value: 130 };
      if (best.hasJack && best.hasNine && best.hasAce && best.trumpCount >= 4 && voids === 1) return { action: 'bid', suit: best.suit, value: 120 };
      if (best.hasJack && best.hasNine && best.hasAce && voids === 0) return { action: 'bid', suit: best.suit, value: 110 };
      if (best.hasJack && best.hasNine && (best.hasKing || best.hasTen || best.hasQueen || best.hasAce) && best.trumpCount >= 4 && best.sideAces >= 1 && exp >= 90) return { action: 'bid', suit: best.suit, value: 100 };
      if (best.hasJack && best.hasNine && best.sideAces >= 2) return { action: 'bid', suit: best.suit, value: 90 };
      if (best.hasJack && best.hasQueen && !best.hasNine && best.sideAces >= 2 && best.trumpCount >= 3) return { action: 'bid', suit: best.suit, value: 90 };
      if (best.hasJack && !best.hasNine && (best.trumpCount === 4 || best.trumpCount === 5) && best.sideAces >= 2) return { action: 'bid', suit: best.suit, value: 90 };
      if (!best.hasJack && best.hasNine && (best.trumpCount === 4 || best.trumpCount === 5) && best.sideAces >= 2) return { action: 'bid', suit: best.suit, value: 90 };
      if (best.sideAces >= 2 && best.trumpCount >= 4 && !(best.hasJack && best.hasNine)) return { action: 'bid', suit: best.suit, value: 90, thinking: true };
      return { action: 'pass' };
    }
    const lastVal = c.value;
    const pMean = this.memory.profiles[partnerSeat];
    if (c.team === myTeam) {
      const pBid = c.value, pThink = !!c.thinkingOpen, pSuit = c.suit;
      const sup = this.evaluateBotSuit(hand, pSuit);
      const small = sup.trumpCount - (sup.hasJack ? 1 : 0) - (sup.hasNine ? 1 : 0);
      if (pBid === 90 && pThink) {
        const f1 = evs.find(e => e.suit !== pSuit && e.hasJack && e.trumpCount >= 3);
        if (f1) return { action: 'bid', suit: f1.suit, value: Math.max(100, lastVal + 10) };
        const f2 = evs.find(e => e.suit !== pSuit && e.hasNine && e.trumpCount >= 4);
        if (f2) return { action: 'bid', suit: f2.suit, value: Math.max(100, lastVal + 10) };
        return { action: 'pass' };
      }
      let inc = 0;
      if (pBid === 90) { if (sup.hasJack && sup.hasNine) inc = 20; else if (sup.hasJack || sup.hasNine) inc = 10; else if (small === 2) return { action: 'pass', thinking: true }; else if (small >= 3) inc = 10; }
      else if (pBid === 100) { if (aces >= 3) inc = 30; else if (aces === 2 && sup.trumpCount >= 2) inc = 20; else if (aces === 1 && sup.trumpCount >= 2) inc = 10; else if (aces >= 1 && sup.trumpCount <= 1) return { action: 'pass' }; }
      else if (pBid === 110) inc = aces * 10;
      else if (pBid === 120) { if (aces === 1) return { action: 'pass' }; else if (aces === 2) inc = 10; else if (aces >= 3) inc = 20; }
      else if (pBid === 130) { if (aces >= 3) inc = 10; else return { action: 'pass' }; }
      else if (pBid >= 140) { if (tens >= 3) inc = 10; else return { action: 'pass' }; }
      if (inc > 0) { const val = Math.min(180, lastVal + inc); if (val > lastVal) return { action: 'bid', suit: pSuit, value: val, thinking: (pBid === 90 && small >= 3 && !sup.hasJack && !sup.hasNine) }; }
      return { action: 'pass' };
    }
    if (pMean && c.multiplier === 1) {
      const sup = this.evaluateBotSuit(hand, pMean.suit);
      let inc = 0;
      if (sup.hasJack && sup.hasNine) inc = 20; else if (sup.hasJack || sup.hasNine) inc = 10; else if (sup.trumpCount >= 3) inc = 10;
      const cap = pMean.value + inc;
      if (inc > 0 && cap > c.value && cap <= 180) return { action: 'bid', suit: pMean.suit, value: cap };
    }
    if (c.value === 90 && c.multiplier === 1 && !c.sameSuitMode) {
      const q = (best.hasJack && best.hasNine && best.sideAces >= 2) || (best.sideAces >= 2 && best.trumpCount >= 4);
      if (q) return { action: 'bid', suit: best.suit, value: 100, thinking: !(best.hasJack && best.hasNine) };
    }
    if (c.multiplier === 1 && !c.sameSuitMode && c.value > 110) {
      const o = this.evaluateBotSuit(hand, c.suit);
      if ((o.hasJack && o.hasNine) || (o.hasNine && o.trumpCount >= 3 && o.sideAces >= 2)) return { action: 'contre' };
    }
    if (c.multiplier === 1 && !c.sameSuitMode) {
      const o = this.evaluateBotSuit(hand, c.suit);
      if (o.hasJack && o.hasNine && o.hasAce && o.hasTen && o.trumpCount >= 5 && c.value + 20 <= 180) return { action: 'bid', suit: c.suit, value: c.value + 20 };
      if (o.hasJack && o.hasNine && o.trumpCount >= 4 && c.value + 10 <= 180) return { action: 'bid', suit: c.suit, value: c.value + 10 };
    }
    if (c.value >= 100 && c.value < 160 && best.hasJack && best.hasNine && best.trumpCount >= 5) return { action: 'bid', suit: best.suit, value: Math.min(180, c.value + 10) };
    return { action: 'pass' };
  }
  chooseCardUtility(seat, stKey) {
    const validIds = this.getValidCardIds(seat);
    const hand = this.hands[seat] || [];
    const cards = hand.filter(c => validIds.includes(c.id));
    if (!cards.length) return null;
    if (cards.length === 1) return cards[0].id;
    const myTeam = this.teamOf(seat); const partnerSeat = (seat + 2) % 4;
    const trick = this.currentTrick; const leading = !trick.length; const pos = trick.length;
    const power = c => c.suit === this.trumpSuit ? 100 + POWER_TRUMP[c.rank] : POWER_NORMAL[c.rank];
    const points = c => c.suit === this.trumpSuit ? POINTS_TRUMP[c.rank] : POINTS_NORMAL[c.rank];
    let winSeat = -1, winPow = -1, winIsT = false, trickPts = 0, led = null, ledCard = null, leaderSeat = -1, winCard = null;
    if (!leading) {
      led = trick[0].card.suit; ledCard = trick[0].card; leaderSeat = trick[0].seat;
      for (const p of trick) {
        const c = p.card; const isT = c.suit === this.trumpSuit;
        const pw = isT ? 100 + POWER_TRUMP[c.rank] : POWER_NORMAL[c.rank];
        trickPts += points(c);
        const beats = (isT && !winIsT) || (isT === winIsT && ((isT && POWER_TRUMP[c.rank] > (winPow - 100)) || (!isT && c.suit === led && POWER_NORMAL[c.rank] > winPow)));
        if (winSeat === -1 || beats) { winSeat = p.seat; winPow = pw; winIsT = isT; winCard = c; }
      }
    }
    const partnerWin = !leading && winSeat === partnerSeat;
    const oppWin = !leading && !partnerWin;
    const myT = hand.filter(c => c.suit === this.trumpSuit);
    const trumpsOut = this.memory.trumpsOutside(hand, this.trumpSuit);
    const weTaker = this.takerTeam === myTeam;
    const pProm = this.memory.partnerPromises(seat);
    const oProm = this.memory.enemyPromises(seat);
    const req = this.getRequiredPointsToWinContract(this.currentContract, weTaker, !weTaker, this.rules.scoringMode);
    const myPts = this.currentTeamPoints(myTeam);
    const oppPts = this.currentTeamPoints(myTeam === 1 ? 2 : 1);
    const urgencyTake = weTaker && (this.kassEffective(myPts) >= req.takerNeeds - 12);
    const urgencyDef = !weTaker && (this.kassEffective(oppPts) >= req.takerNeeds - 20);
    const jOut = this._played(this.trumpSuit, 'J');
    const partnerCardMaster = partnerWin && winCard ? this._master(winCard, this.hands[partnerSeat] || []) : false;
    const partnerSure = partnerWin && (pos === 3 || partnerCardMaster);
    const tPowers = cards.filter(c => c.suit === this.trumpSuit).map(power);
    const minTPow = tPowers.length ? Math.min(...tPowers) : 0;
    const maxTPow = tPowers.length ? Math.max(...tPowers) : 0;
    const evals = cards.map(card => {
      const isT = card.suit === this.trumpSuit;
      const pw = power(card);
      const wins = !leading && ((isT && !winIsT) || (isT === winIsT && ((isT && pw > winPow) || (!isT && card.suit === led && pw > winPow))));
      const isMaster = this._master(card, hand);
      const pts = points(card);
      const losing = !leading && !wins && !partnerWin;
      let u = isMaster ? 30 : 0;
      if (leading || wins) u += pts * 2;
      else if (losing) u -= pts * 12;
      else if (partnerWin && isT) u -= pts * 12;
      else if (partnerWin && !isT) u += pts * 3;
      if (!leading && !wins) {
        const suitCards = hand.filter(c => c.suit === card.suit);
        const hasTen = suitCards.some(c => c.rank === '10');
        if (hasTen && card.rank !== '10' && suitCards.length === 2) u -= this._played(card.suit, 'A') ? 260 : 190;
      }
      if (isT && !wins && (losing || partnerWin)) {
        if (card.rank === '9' && !jOut) u -= 600;
        if (card.rank === '9' && jOut && isMaster) u -= 450;
        if (card.rank === '10') u -= 320;
        if (card.rank === 'A') u -= 280;
        if (card.rank === '7' || card.rank === '8') u += 110;
        u += (pw === minTPow) ? 120 : -45;
      }
      if (leading) {
        if (card.rank === 'A' && hand.some(c => c.suit === card.suit && c.rank === '10')) u += 85;
        if (card.rank === '10' && hand.filter(c => c.suit === card.suit).length === 1 && !isMaster) u -= 200;
        if (card.rank === '10' && this._remaining(card.suit, hand) < 3 && trumpsOut > 0) u -= 120;
        if (card.rank === '7' && hand.some(c => c.suit === card.suit && c.rank === '10') && hand.filter(c => c.suit === card.suit).length === 2 && !this._played(card.suit, 'A')) u += 70;
        if (weTaker && isT && trumpsOut > 0) { u += 150; if (card.rank === 'J') u += 60; }
        if (weTaker && card.rank === '9' && !myT.some(c => c.rank === 'J') && trumpsOut > 0) u -= 90;
        if (!weTaker && isT && trumpsOut > 0) u -= 80;
        if (pProm.has(card.suit) && card.rank !== 'A') u += 70;
        if (oProm.has(card.suit) && (card.rank === 'K' || card.rank === '10')) u -= 110;
        if (urgencyTake && isMaster && card.rank === 'A') u += 500;
        if (card.rank === 'A' && hand.filter(c => c.suit === card.suit).length === 1) u += 60;
        if (!weTaker && (card.rank === '7' || card.rank === '8')) u += 25;
        if (!weTaker && (card.rank === 'K' || card.rank === 'Q') && hand.filter(c => c.suit === card.suit).length <= 2) u -= 60;
      } else {
        const leaderPartner = leaderSeat === partnerSeat;
        if (pos === 1 && !leaderPartner && card.suit === led && card.rank === 'A') { const hasQ = hand.some(c => c.suit === led && c.rank === 'Q'); const tenGone = this._played(led, '10') || hand.some(c => c.suit === led && c.rank === '10'); u += (trumpsOut === 0 && hasQ && tenGone) ? 20 : 140; }
        if (pos === 1 && !leaderPartner && card.suit === led && card.rank === 'Q' && trumpsOut === 0 && hand.some(c => c.suit === led && c.rank === 'A')) u += 90;
        if (pos === 1 && card.rank === '9' && hand.some(c => c.suit === card.suit && c.rank === '10') && (ledCard.rank === '7' || ledCard.rank === '8')) u += 70;
        if (pos === 2 && partnerWin && ledCard.rank === '10' && card.suit === led) { const sc2 = hand.filter(c => c.suit === led); const asBare = card.rank === 'A' && sc2.length === 1; const needLead = weTaker && trumpsOut === 1 && (this.hands[partnerSeat] || []).filter(c => c.suit === this.trumpSuit).length === 0; if (card.rank === 'A') u += (asBare || needLead) ? 150 : -120; if (card.rank === '7' || card.rank === '8') u += (asBare || needLead) ? 0 : 80; }
        if (pos === 2 && leaderPartner && (ledCard.rank === 'K' || ledCard.rank === 'Q') && card.rank === 'A' && card.suit === led) u += 130;
        if (pos === 2 && leaderPartner && ledCard.rank === 'K' && isT && !this._played(led, 'A') && !hand.some(c => c.suit === led && c.rank === 'A')) u += 120;
        if (pos === 3 && partnerWin && !isT) u += pts * 5;
        if (pos === 3 && oppWin && wins) u += 100;
        if (pos === 3 && oppWin && wins && card.rank === '10' && ledCard.rank === 'K' && hand.some(c => c.suit === led && c.rank === 'A')) u += 60;
        if (partnerSure && !isT) {
          if (card.rank === '10' && oProm.has(card.suit)) u += 80;
          else if (card.rank === 'K') u += 60;
          else if (card.rank === 'Q') u += 40;
          else if (card.rank === '10') u += 30;
          if (card.rank === 'A' && isMaster) u -= 120;
          if (card.rank === '9' && isMaster) u -= 70;
        }
        if (partnerWin && isT && !(pos === 2 && leaderPartner && ledCard.rank === 'K' && !this._played(led, 'A'))) u -= 150;
        if (oppWin && isT) {
          const oppCut = trick.some(p => p.card.suit === this.trumpSuit && this.teamOf(p.seat) !== myTeam);
          if (wins) u += oppCut ? 110 : 100;
          if (!oppCut && trickPts >= 21 && pos <= 2 && wins) u += (pw === maxTPow) ? 60 : 0;
        }
        if (losing && !isT) { u -= this._dumpCost(card, hand) * 0.8; if (card.rank === 'A' && isMaster) u -= 150; }
        if (urgencyDef && wins && trickPts >= 10) u += 200;
        if (!leaderPartner && ledCard.rank === 'A' && card.suit === led) u -= this._dumpCost(card, hand) * 0.5;
      }
      return { card, u, wins, cat: this._cat(card, wins, leading) };
    });
    evals.sort((a, b) => b.u - a.u);
    let chosen = evals[0];
    if (brain && stKey && brain.hasExperience && brain.hasExperience(stKey, 6)) {
      const close = evals.filter(e => chosen.u - e.u <= 15);
      if (close.length > 1) {
        const seen = new Set(); const actions = [];
        for (const e of close) if (!seen.has(e.cat)) { seen.add(e.cat); actions.push({ key: e.cat }); }
        let k = null; try { k = brain.qChoose(stKey, actions); } catch (e) {}
        if (k) { const m = close.find(e => e.cat === k); if (m) chosen = m; }
      }
    }
    return chosen.card.id;
  }
  solveEndgame(seat) {
    const hand = this.hands[seat] || [];
    if (hand.length > 3 || hand.length === 0) return null;
    const myTeam = this.teamOf(seat);
    const playedIds = new Set(this.playedCardsHistory.map(p => p.card.id));
    const pool = [];
    for (const s of SUITS) for (const r of RANKS) { const id = `${r}_${s}`; if (!playedIds.has(id) && !hand.some(c => c.id === id)) pool.push({ suit: s, rank: r, id }); }
    const others = [(seat + 1) % 4, (seat + 2) % 4, (seat + 3) % 4];
    const sizes = others.map(o => (this.hands[o] || []).length);
    if (sizes.some(n => n !== hand.length)) return null;
    const deadline = Date.now() + ENDGAME_BUDGET_MS;
    const moveScores = new Map();
    for (let d = 0; d < ENDGAME_DETERMINIZATIONS; d++) {
      if (Date.now() > deadline) break;
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const hands = { [seat]: [...hand] };
      let idx = 0, ok = true;
      for (let i = 0; i < 3; i++) { const o = others[i]; const h = []; while (h.length < sizes[i] && idx < shuffled.length) { const c = shuffled[idx++]; if (this.memory.playerVoid[o][c.suit]) continue; h.push(c); } if (h.length < sizes[i]) { ok = false; break; } hands[o] = h; }
      if (!ok) continue;
      const legal = this.getValidCardIds(seat).map(id => hand.find(c => c.id === id));
      for (const card of legal) {
        if (Date.now() > deadline) break;
        const val = this._minimax(hands, this.currentTrick.map(p => ({ seat: p.seat, card: p.card })), this.trickLeader, seat, card, myTeam, 0, -Infinity, Infinity, deadline);
        moveScores.set(card.id, (moveScores.get(card.id) || 0) + val);
      }
    }
    let bestId = null, bestV = -Infinity;
    moveScores.forEach((v, id) => { if (v > bestV) { bestV = v; bestId = id; } });
    return bestId;
  }
  _minimax(hands, trick, leader, mySeat, firstCard, myTeam, depth, alpha, beta, deadline) {
    const h2 = {}; for (const k of Object.keys(hands)) h2[k] = [...hands[k]];
    let tr = [...trick]; let lead = leader; let cur;
    if (!trick.length) { h2[mySeat] = h2[mySeat].filter(c => c.id !== firstCard.id); tr.push({ seat: mySeat, card: firstCard }); cur = this.nextSeat(mySeat); }
    else cur = this.nextSeat(trick[trick.length - 1].seat);
    const pts = { 1: 0, 2: 0 };
    while (true) {
      if (Date.now() > deadline) break;
      if (tr.length === 4) { const w = this._winnerOf(tr); const p = tr.reduce((s, x) => s + (x.card.suit === this.trumpSuit ? POINTS_TRUMP[x.card.rank] : POINTS_NORMAL[x.card.rank]), 0); const isLast = h2[mySeat].length === 0; pts[this.teamOf(w.seat)] += p + (isLast ? 10 : 0); lead = w.seat; tr = []; if (h2[mySeat].length === 0) break; cur = lead; continue; }
      const hand = h2[cur]; const legal = this._legalFor(hand, tr, cur); if (!legal.length) break;
      const maxing = this.teamOf(cur) === myTeam;
      let bestVal = maxing ? -Infinity : Infinity; let bestCard = legal[0];
      for (const c of legal) { h2[cur] = h2[cur].filter(x => x.id !== c.id); tr.push({ seat: cur, card: c }); const v = this._minimaxRec(h2, tr, lead, mySeat, myTeam, depth + 1, alpha, beta, pts, deadline); tr.pop(); h2[cur].push(c); if (maxing) { if (v > bestVal) { bestVal = v; bestCard = c; } alpha = Math.max(alpha, v); } else { if (v < bestVal) { bestVal = v; bestCard = c; } beta = Math.min(beta, v); } if (beta <= alpha) break; }
      h2[cur] = h2[cur].filter(x => x.id !== bestCard.id); tr.push({ seat: cur, card: bestCard }); cur = this.nextSeat(cur);
    }
    return pts[myTeam] - pts[myTeam === 1 ? 2 : 1];
  }
  _minimaxRec(hands, trick, leader, mySeat, myTeam, depth, alpha, beta, pts, deadline) {
    const base = pts[myTeam] - pts[myTeam === 1 ? 2 : 1];
    if (depth > 40 || Date.now() > deadline) return base;
    let tr = [...trick]; let lead = leader; let cur = this.nextSeat(trick[trick.length - 1].seat);
    const h2 = {}; for (const k of Object.keys(hands)) h2[k] = [...hands[k]];
    const lp = { 1: pts[1], 2: pts[2] };
    while (true) {
      if (Date.now() > deadline) break;
      if (tr.length === 4) { const w = this._winnerOf(tr); const p = tr.reduce((s, x) => s + (x.card.suit === this.trumpSuit ? POINTS_TRUMP[x.card.rank] : POINTS_NORMAL[x.card.rank]), 0); const isLast = h2[mySeat].length === 0; lp[this.teamOf(w.seat)] += p + (isLast ? 10 : 0); lead = w.seat; tr = []; if (h2[mySeat].length === 0) break; cur = lead; continue; }
      const hand = h2[cur]; const legal = this._legalFor(hand, tr, cur); if (!legal.length) break;
      const maxing = this.teamOf(cur) === myTeam;
      let bestVal = maxing ? -Infinity : Infinity; let bestCard = legal[0];
      for (const c of legal) { h2[cur] = h2[cur].filter(x => x.id !== c.id); tr.push({ seat: cur, card: c }); const v = this._minimaxRec(h2, tr, lead, mySeat, myTeam, depth + 1, alpha, beta, lp, deadline); tr.pop(); h2[cur].push(c); if (maxing) { if (v > bestVal) { bestVal = v; bestCard = c; } alpha = Math.max(alpha, v); } else { if (v < bestVal) { bestVal = v; bestCard = c; } beta = Math.min(beta, v); } if (beta <= alpha) break; }
      h2[cur] = h2[cur].filter(x => x.id !== bestCard.id); tr.push({ seat: cur, card: bestCard }); cur = this.nextSeat(cur);
    }
    return lp[myTeam] - lp[myTeam === 1 ? 2 : 1];
  }
  _winnerOf(tr) { const led = tr[0].card.suit; let best = tr[0]; for (let i = 1; i < tr.length; i++) { const c = tr[i]; const bt = best.card.suit === this.trumpSuit, ct = c.card.suit === this.trumpSuit; if (ct && !bt) best = c; else if (ct && bt) { if (POWER_TRUMP[c.card.rank] > POWER_TRUMP[best.card.rank]) best = c; } else if (!ct && !bt && c.card.suit === led) { if (POWER_NORMAL[c.card.rank] > POWER_NORMAL[best.card.rank]) best = c; } } return best; }
  _legalFor(hand, tr, seat) {
    if (!tr.length) return hand;
    const led = tr[0].card.suit; const same = hand.filter(c => c.suit === led);
    const w = this._winnerOf(tr); const highT = tr.filter(p => p.card.suit === this.trumpSuit).reduce((b, c) => !b || POWER_TRUMP[c.card.rank] > POWER_TRUMP[b.card.rank] ? c : b, null);
    if (same.length) { if (led === this.trumpSuit && highT) { const hi = same.filter(c => POWER_TRUMP[c.rank] > POWER_TRUMP[highT.card.rank]); if (hi.length) return hi; } return same; }
    const myT = hand.filter(c => c.suit === this.trumpSuit);
    if (w.seat === (seat + 2) % 4) return hand;
    if (myT.length) { if (highT) { const hi = myT.filter(c => POWER_TRUMP[c.rank] > POWER_TRUMP[highT.card.rank]); if (hi.length) return hi; } return myT; }
    return hand;
  }
  chooseSmartBotCardBrain(seat) {
    const hand = this.hands[seat] || [];
    const valid = this.getValidCardIds(seat);
    if (!valid.length) return null;
    if (valid.length === 1) return valid[0];
    const cards = hand.filter(c => valid.includes(c.id));
    const stKey = this._legacyState(seat, cards);
    let id = null;
    if (hand.length <= 3) id = this.solveEndgame(seat);
    if (!id) id = this.chooseCardUtility(seat, stKey);
    const guarded = this._hardGuard(seat, cards, id);
    if (guarded) id = guarded;
    this._recordBotPlay(seat, stKey, cards, id);
    return id;
  }
  _hardGuard(seat, cards, chosenId) {
    if (!this.currentTrick.length) return null;
    if (cards.length <= 1) return null;
    const hand = this.hands[seat] || [];
    const chosen = cards.find(c => c.id === chosenId);
    if (!chosen) return null;
    const ps = (seat + 2) % 4; const pos = this.currentTrick.length;
    const w = this.getCurrentTrickWinner();
    const partnerWin = w.seat === ps;
    const pts = c => c.suit === this.trumpSuit ? POINTS_TRUMP[c.rank] : POINTS_NORMAL[c.rank];
    const pow = c => c.suit === this.trumpSuit ? 100 + POWER_TRUMP[c.rank] : POWER_NORMAL[c.rank];
    const wins = c => this.wouldWin(seat, c);
    if (wins(chosen)) return null;
    const partnerSure = partnerWin && (pos === 3 || this._master(w.card, this.hands[ps] || []));
    if (!partnerWin) {
      const cands = cards.filter(c => !wins(c));
      if (!cands.length) return null;
      cands.sort((a, b) => this._dumpCost(a, hand) - this._dumpCost(b, hand));
      const best = cands[0];
      if (best.id !== chosen.id && this._dumpCost(chosen, hand) - this._dumpCost(best, hand) > 5) return best.id;
      return null;
    }
    const isT = chosen.suit === this.trumpSuit;
    if (isT) {
      const nonT = cards.filter(c => c.suit !== this.trumpSuit);
      if (nonT.length) {
        if (partnerSure) { const feed = nonT.filter(c => pts(c) > 0 && !this._master(c, hand)).sort((a, b) => pts(b) - pts(a)); if (feed.length) return feed[0].id; }
        nonT.sort((a, b) => this._dumpCost(a, hand) - this._dumpCost(b, hand));
        return nonT[0].id;
      }
      const smallT = cards.slice().sort((a, b) => pow(a) - pow(b));
      return smallT[0].id !== chosen.id ? smallT[0].id : null;
    }
    if (this._master(chosen, hand)) {
      const nonMaster = cards.filter(c => !this._master(c, hand));
      if (nonMaster.length) {
        if (partnerSure) { const feed = nonMaster.filter(c => pts(c) > 0).sort((a, b) => pts(b) - pts(a)); if (feed.length) return feed[0].id; }
        nonMaster.sort((a, b) => this._dumpCost(a, hand) - this._dumpCost(b, hand));
        return nonMaster[0].id;
      }
    }
    const sc2 = hand.filter(c => c.suit === chosen.suit);
    if (sc2.length === 2 && sc2.some(c => c.rank === '10') && chosen.rank !== '10') {
      const alt = cards.filter(c => c.id !== chosen.id && !wins(c));
      if (alt.length) { alt.sort((a, b) => this._dumpCost(a, hand) - this._dumpCost(b, hand)); if (this._dumpCost(alt[0], hand) < this._dumpCost(chosen, hand) - 5) return alt[0].id; }
    }
    return null;
  }
  _recordBotPlay(seat, stKey, cards, id) { try { if (brain) { const card = cards.find(c => c.id === id) || cards[0]; const wins = this.currentTrick.length ? this.wouldWin(seat, card) : false; brain.recordDecision(this.id, seat, 'play', stKey, this._cat(card, wins, !this.currentTrick.length), 'bot'); } } catch (e) {} }
  playCard(seat, cardId) {
    if (this.status !== 'playing' || seat !== this.turnSeat) return { ok: false, msg: 'موش دورك' };
    this.thinkingSeat = null;
    const hand = this.hands[seat]; const ci = hand.findIndex(c => c.id === cardId);
    if (ci === -1) return { ok: false, msg: 'الكارطة موش في يدك' };
    const valid = this.getValidCardIds(seat);
    if (!valid.includes(cardId)) return { ok: false, msg: this.explainInvalidCardMove(seat, hand[ci]) };
    const isBot = !!(this.seats[seat] && this.seats[seat].isBot);
    let hState = null, hKey = null;
    if (!isBot) { try { const pc = hand.filter(c => valid.includes(c.id)); hState = this._legacyState(seat, pc); hKey = this._cat(hand[ci], this.wouldWin(seat, hand[ci]), false); } catch (e) {} }
    try { this.memory.detectAceSignal(seat, hand[ci], valid, hand, this.trumpSuit, this.currentTrick); } catch (e) {}
    const prevHigh = this.getHighestTrumpInTrick();
    const [played] = hand.splice(ci, 1);
    let isCut = false, isOver = false, isUnder = false;
    if (this.currentTrick.length) {
      const led = this.currentTrick[0].card.suit;
      if (played.suit !== led) {
        this.voidSuits[seat].add(led);
        const cw = this.getCurrentTrickWinner(); const ps = (seat + 2) % 4;
        if (cw.seat !== ps && played.suit !== this.trumpSuit && this.trumpSuit) this.voidSuits[seat].add(this.trumpSuit);
        if (played.suit === this.trumpSuit) { if (!prevHigh) { isCut = true; this.lastActionBySeat[seat] = '✂️ قصّ!'; } else if (POWER_TRUMP[played.rank] > POWER_TRUMP[prevHigh.card.rank]) { isCut = true; isOver = true; this.lastActionBySeat[seat] = '🔥 علّى!'; } else { isCut = true; isUnder = true; this.lastActionBySeat[seat] = '⤵️ لوّح أتو'; } }
      }
    }
    try { this.memory.consumeAceSignal(seat, played, this.currentTrick, this.trumpSuit); } catch (e) {}
    try { this.memory.onCardPlayed(seat, played, this.currentTrick.length ? this.currentTrick[0].card.suit : null); } catch (e) {}
    this.currentTrick.push({ seat, playerName: this.seats[seat] ? this.seats[seat].name : '', card: played, isCut, isOvercut: isOver, isUndertrump: isUnder });
    this.playedCardsHistory.push({ seat, card: played });
    this.lastSoundEvent = { type: isCut ? 'cut' : 'card_play', seat, ts: Date.now() };
    if (hState) { try { if (brain) brain.recordDecision(this.id, seat, 'play', hState, hKey, 'human'); } catch (e) {} }
    if (this.beloteHolders[seat] && played.suit === this.trumpSuit && (played.rank === 'K' || played.rank === 'Q')) {
      const h = this.beloteHolders[seat]; const tk = this.teamOf(seat) === 1 ? 'team1' : 'team2';
      h.cardsPlayed++;
      if (h.cardsPlayed === 1 && h.armed) { h.declaredFirst = true; this.beloteBonus[tk] = 20; const w = played.rank === 'Q' ? 'Belote! (بلوت)' : 'Rebelote! (ريبلوت)'; this.lastActionBySeat[seat] = `📢 ${w}`; this.lastSoundEvent = { type: 'belote', word: played.rank === 'Q' ? 'Belote' : 'Rebelote', seat, ts: Date.now() }; this.addSystemChat(`📢 ${this.seats[seat].name} قال: ${w}!`); }
      else if (h.cardsPlayed === 2 && h.declaredFirst) { const w = played.rank === 'Q' ? 'Belote! (بلوت)' : 'Rebelote! (ريبلوت)'; this.lastActionBySeat[seat] = `📢 ${w} (+20)`; this.lastSoundEvent = { type: 'belote', word: played.rank === 'Q' ? 'Belote' : 'Rebelote', seat, ts: Date.now() }; this.addSystemChat(`📢 ${this.seats[seat].name} كمّل: ${w}!`); }
    }
    if (this.currentTrick.length < 4) { this.turnSeat = this.nextSeat(this.turnSeat); this.resetTurnTimer(); this.scheduleBotActionIfNeeded(); }
    else { this.turnSeat = -1; if (this.turnTimeoutTimer) { clearTimeout(this.turnTimeoutTimer); this.turnTimeoutTimer = null; } setTimeout(() => { this.resolveTrick(); broadcastRoomState(this); }, this.pace(TRICK_RESOLVE_MS)); }
    return { ok: true };
  }
  _legacyState(seat, cards) {
    const trick = this.currentTrick; const myTeam = this.teamOf(seat); const ps = (seat + 2) % 4; const hand = this.hands[seat] || [];
    const w = trick.length ? this.getCurrentTrickWinner() : null;
    const ledT = trick.length ? (trick[0].card.suit === this.trumpSuit ? 1 : 0) : 0;
    const mt = Math.min(8, hand.filter(c => c.suit === this.trumpSuit).length);
    const tp = trick.reduce((s, p) => s + (p.card.suit === this.trumpSuit ? POINTS_TRUMP[p.card.rank] : POINTS_NORMAL[p.card.rank]), 0);
    const bucket = tp >= 20 ? 2 : tp >= 10 ? 1 : 0;
    const mf = trick.length ? (hand.some(c => c.suit === trick[0].card.suit) ? 1 : 0) : 0;
    const cw = cards.filter(c => this.wouldWin(seat, c)).length > 0 ? 1 : 0;
    const pw = w ? (w.seat === ps ? 1 : 0) : 0;
    const lp = trick.length ? (trick[0].seat === ps ? 1 : 0) : 0;
    const wr = w ? (this.teamOf(w.seat) === myTeam ? 1 : 0) : 2;
    let ht = 0;
    if (this.trumpSuit) { const mb = hand.filter(c => c.suit === this.trumpSuit).sort((a, b) => POWER_TRUMP[b.rank] - POWER_TRUMP[a.rank])[0]; const tb = this.getHighestTrumpInTrick(); if (mb) ht = (tb && POWER_TRUMP[mb.rank] > POWER_TRUMP[tb.card.rank]) ? 2 : (tb ? 1 : 2); }
    return [trick.length, lp, wr, ledT, mt, bucket, mf, cw, pw, ht].join('|');
  }
  resolveTrick() {
    if (this.currentTrick.length < 4) return;
    const wp = this.getCurrentTrickWinner(); const ws = wp.seat; const wt = this.teamOf(ws); const tk = wt === 1 ? 'team1' : 'team2';
    let cp = 0; for (const p of this.currentTrick) cp += p.card.suit === this.trumpSuit ? POINTS_TRUMP[p.card.rank] : POINTS_NORMAL[p.card.rank];
    try { if (brain) { const res = this.currentTrick.map(p => { const pt = this.teamOf(p.seat); const g = pt === wt ? cp : 0; const l = pt === wt ? 0 : cp; return { seat: p.seat, reward: Math.round(((g - l) / 10) * 100) / 100 }; }); brain.rewardTrick(this.id, res); } } catch (e) {}
    this.roundCardPoints[tk] += cp;
    const last = this.hands[0].length === 0;
    if (last) { this.farchaPoints[tk] = 10; this.lastTrickWinnerTeam = wt; }
    this.roundPoints[tk] += cp + (last ? 10 : 0); this.tricksWon[tk]++;
    this.lastTrickCards = this.currentTrick.map(p => ({ seat: p.seat, playerName: p.playerName, card: p.card, isCut: p.isCut }));
    this.lastTrickWinnerSeat = ws;
    this.currentTrick = [];
    for (let s = 0; s < 4; s++) if (this.lastActionBySeat[s] && /قصّ|علّى|لوّح/.test(this.lastActionBySeat[s])) this.lastActionBySeat[s] = '';
    if (last) this.finishRound();
    else { this.trickLeader = ws; this.turnSeat = ws; this.resetTurnTimer(); this.scheduleBotActionIfNeeded(); }
  }
  finishRound() {
    this.clearTimers();
    const cv = this.currentContract ? this.currentContract.value : 90;
    const mult = this.currentContract ? this.currentContract.multiplier : 1;
    const mode = this.currentContract ? this.currentContract.sameSuitMode : null;
    const tk = this.takerTeam === 1 ? 'team1' : 'team2';
    const tb = this.beloteBonus.team1 + this.beloteBonus.team2;
    const tt = this.tricksWon[tk];
    const raw = this.roundPoints[tk] + this.beloteBonus[tk];
    const kass = applyKassRule(raw);
    const ok = cv === 500 ? tt === 8 : kass.effective >= cv;
    if (kass.isKass && cv !== 500) this.addSystemChat(`🧮 الكاص: ${raw} → ${kass.effective} ${ok ? '⇒ نجح!' : '⇒ ما وصلش.'}`);
    const r1 = recordTens(this.roundPoints.team1), r2 = recordTens(this.roundPoints.team2);
    const k1 = applyKassRule(this.roundPoints.team1).isKass, k2 = applyKassRule(this.roundPoints.team2).isKass;
    const c1 = this.tricksWon.team1 === 8, c2 = this.tricksWon.team2 === 8;
    let f1 = 0, f2 = 0;
    if (mode === 'khatafa_finish' || mode === 'khatafa_double') { const stake = mode === 'khatafa_finish' ? 2000 : 640; if (ok) { if (this.takerTeam === 1) f1 = stake + tb; else f2 = stake + tb; } else { if (this.takerTeam === 1) f2 = stake + tb; else f1 = stake + tb; } }
    else if (mode === 'match_2000') { if (ok) { if (this.takerTeam === 1) f1 = 2000 + this.beloteBonus.team1; else f2 = 2000 + this.beloteBonus.team2; } else { if (this.takerTeam === 1) f2 = 2000 + this.beloteBonus.team2; else f1 = 2000 + this.beloteBonus.team1; } }
    else if ((c1 || c2) && mult === 1 && ok) { const base = cv === 500 ? 500 : 250; if (c1) { f1 = base + this.beloteBonus.team1; f2 = this.beloteBonus.team2; } else { f2 = base + this.beloteBonus.team2; f1 = this.beloteBonus.team1; } }
    else if (ok) { if (mult === 2) { const b = cv === 500 ? 1000 : 320; if (this.takerTeam === 1) f1 = b + tb; else f2 = b + tb; } else if (mult === 4) { const b = cv === 500 ? 2000 : 640; if (this.takerTeam === 1) f1 = b + tb; else f2 = b + tb; } else { f1 = r1 + this.beloteBonus.team1; f2 = r2 + this.beloteBonus.team2; } }
    else { let bd = 160; if (cv === 500) bd = 500 * mult; else if (mult === 2) bd = 320; else if (mult === 4) bd = 640; else if ((this.takerTeam === 1 && c2) || (this.takerTeam === 2 && c1)) bd = 250; if (this.takerTeam === 1) { if (cv === 500 && mult === 1) { f1 = this.beloteBonus.team1; f2 = 500 + this.beloteBonus.team2; } else f2 = bd + tb; } else { if (cv === 500 && mult === 1) { f2 = this.beloteBonus.team2; f1 = 500 + this.beloteBonus.team1; } else f1 = bd + tb; } this.addSystemChat(`⚠️ الفتحة طاحت (${cv === 500 ? 'كابوت 500' : cv})!`); }
    this.totalScores.team1 += f1; this.totalScores.team2 += f2;
    this.lastSoundEvent = { type: 'round_end', ts: Date.now() };
    const ss = { spades: '♠', hearts: '♥', clubs: '♣', diamonds: '♦' };
    this.scoreHistory.push({ roundNum: this.scoreHistory.length + 1, contractText: `${cv === 500 ? 'كابوت' : cv}${ss[this.trumpSuit] || ''}${sameSuitModeLabel(mode, mult)}`, nousRound: f1, vousRound: f2, nousTotal: this.totalScores.team1, vousTotal: this.totalScores.team2 });
    if (this.scoreHistory.length > 80) this.scoreHistory.shift();
    this.lastRoundSummary = { contractValue: cv, multiplier: mult, sameSuitMode: mode, contractSucceeded: ok, isCapot: (c1 || c2), takerTeam: this.takerTeam, rawCardsTeam1: this.roundCardPoints.team1, rawCardsTeam2: this.roundCardPoints.team2, farchaTeam1: this.farchaPoints.team1, farchaTeam2: this.farchaPoints.team2, rawTotalTeam1: this.roundPoints.team1, rawTotalTeam2: this.roundPoints.team2, beloteTeam1: this.beloteBonus.team1, beloteTeam2: this.beloteBonus.team2, rawTakerPts: raw, effectiveTakerPts: kass.effective, isKass: kass.isKass, recordedTeam1: r1, recordedTeam2: r2, isKassTeam1: k1, isKassTeam2: k2, team1Round: f1, team2Round: f2, totalTeam1: this.totalScores.team1, totalTeam2: this.totalScores.team2 };
    try { if (brain) { const rw = ok ? this.takerTeam : (this.takerTeam === 1 ? 2 : 1); const me = (this.totalScores.team1 >= this.targetScore || this.totalScores.team2 >= this.targetScore) && this.totalScores.team1 !== this.totalScores.team2; brain.endRound(this.id, rw, me); } } catch (e) {}
    if ((this.totalScores.team1 >= this.targetScore || this.totalScores.team2 >= this.targetScore) && this.totalScores.team1 !== this.totalScores.team2) {
      this.status = 'game_over';
      const winTeam = this.totalScores.team1 > this.totalScores.team2 ? 1 : 2;
      this.addSystemChat(`🏆 الماتش وفا! ${winTeam === 1 ? 'الفريق اللول' : 'الفريق الثاني'} ربح.`);
      if (this.entryPaid && !this.settled) {
        const r = store.settleMatch(this.seats, winTeam, this.tier(), this.matchRef);
        this.settled = true; this.entryPaid = false;
        if (r.ok && r.prize) { this.addSystemChat(`🪙 كل رابح خذا ${r.prize} نقطة!`); this.payoutInfo = { team: winTeam, prize: r.prize }; }
        if (r.blocked) this.addSystemChat('🚫 تم إلغاء جوائز المباراة: اشتباه تواطؤ.');
      }
    } else this.status = 'round_end';
    markLobbyDirty(); flushLobby();
  }
  evaluateBotSuit(hand, suit) {
    let score = 0, tc = 0, hJ = false, h9 = false, hA = false, hK = false, hQ = false, h10 = false, sa = 0;
    const sc = { spades: 0, hearts: 0, clubs: 0, diamonds: 0 };
    for (const c of hand) sc[c.suit]++;
    for (const c of hand) { if (c.suit === suit) { tc++; score += POINTS_TRUMP[c.rank] + POWER_TRUMP[c.rank] * 1.8; if (c.rank === 'J') { hJ = true; score += 22; } if (c.rank === '9') { h9 = true; score += 15; } if (c.rank === 'A') { hA = true; score += 8; } if (c.rank === '10') h10 = true; if (c.rank === 'K') hK = true; if (c.rank === 'Q') hQ = true; } else { if (c.rank === 'A') { sa++; score += 12; } else if (c.rank === '10' && sc[c.suit] >= 2) score += 6; } }
    if (hJ && h9) score += 18; else if (h9 && !hJ && tc <= 2) score -= 10;
    if (tc >= 5) score += 22; else if (tc === 4) score += 12; else if (tc === 3) score += 5;
    if (hK && hQ) score += 20;
    if (tc >= 3) for (const s of SUITS) { if (s !== suit && sc[s] === 0) score += 9; else if (s !== suit && sc[s] === 1) score += 4; }
    return { suit, score, trumpCount: tc, hasJack: hJ, hasNine: h9, hasAce: hA, hasTen: h10, hasKing: hK, hasQueen: hQ, hasBelote: hK && hQ, sideAces: sa };
  }
  buildBotBidContext(seat, evs) {
    const hand = this.hands[seat] || []; const myTeam = this.teamOf(seat); const ps = (seat + 2) % 4;
    const bids = this.bidHistory.filter(i => i.value);
    const first = bids.length ? bids[0] : null;
    const pb = bids.filter(i => i.seat === ps);
    const po = pb.length ? pb[0] : null;
    const pfi = this.bidHistory.findIndex(i => i.seat === ps && i.value);
    const actedAfter = pfi !== -1 && this.bidHistory.slice(pfi + 1).some(i => i.seat === seat);
    const owns = !!(first && first.seat === ps && !actedAfter);
    let pThink = false, pDirect = false, pVal = null;
    if (po) { pVal = po.value; const m = this.memory.profiles[ps]; if (m) pThink = !!m.thinking; else pDirect = true; if (!pThink && !pDirect) pDirect = true; }
    const pSuit = po ? po.suit : (this.currentContract && this.currentContract.team === myTeam ? this.currentContract.suit : null);
    const pc = pSuit ? hand.filter(c => c.suit === pSuit) : [];
    const sa = hand.filter(c => c.rank === 'A' && c.suit !== pSuit);
    const sc = { spades: 0, hearts: 0, clubs: 0, diamonds: 0 }; hand.forEach(c => sc[c.suit]++);
    const best = evs[0];
    return { partnerOriginalBid: po ? Number(po.value) : null, partnerOriginalSuit: pSuit, partnerOwnsOriginalContract: owns, opponentIntervened: !!(this.currentContract && this.currentContract.team !== myTeam), currentContractValue: this.currentContract ? Number(this.currentContract.value) : 0, currentContractSuit: this.currentContract ? this.currentContract.suit : null, hasJackInPartnerSuit: pc.some(c => c.rank === 'J'), hasNineInPartnerSuit: pc.some(c => c.rank === '9'), partnerSuitCount: pc.length, sideAceCount: sa.length, trumpCount: best ? best.trumpCount : 0, bestSuit: best ? best.suit : null, myTeamScore: myTeam === 1 ? this.totalScores.team1 : this.totalScores.team2, opponentScore: myTeam === 1 ? this.totalScores.team2 : this.totalScores.team1, partnerOpeningWasThinking: pThink, partnerOpeningWasDirect: pDirect, partnerOpeningValue: pVal, mySideAceCount: hand.filter(c => c.rank === 'A').length, myVoidSuitCount: Object.values(sc).filter(n => n === 0).length, bestScore: best ? best.score : 0, bestIsFullTrump: !!(best && ((best.hasJack && best.hasNine) || best.trumpCount >= 5)) };
  }
  isMasterCardInSuit(card, hand) { return this._master(card, hand); }
  scheduleBotActionIfNeeded() {
    if (this.botTimer) clearTimeout(this.botTimer);
    if (this.turnSeat < 0 || this.turnSeat > 3) return;
    const p = this.seats[this.turnSeat]; if (!p || !p.isBot) return;
    let delay = this.pace(BOT_DELAY_MS);
    if (this.status === 'playing' && this.getValidCardIds(this.turnSeat).length === 1) delay = this.pace(BOT_SINGLE_DELAY_MS);
    const expectedSeat = this.turnSeat; const expectedStatus = this.status;
    this.botTimer = setTimeout(() => {
      if (this.turnSeat !== expectedSeat || this.status !== expectedStatus) return;
      if (this.status === 'bidding') {
        const s = this.turnSeat; const d = this.chooseSmartBotBid(s);
        if (d.thinking) { this.triggerThinkingClock(s); broadcastRoomState(this); this.botTimer = setTimeout(() => { if (this.status === 'bidding' && this.turnSeat === s) { this.handleBid(s, d.action, d.suit || null, d.value || null); broadcastRoomState(this); } }, this.pace(BOT_THINK_DELAY_MS)); return; }
        this.handleBid(s, d.action, d.suit || null, d.value || null); broadcastRoomState(this);
      } else if (this.status === 'playing') { const id = this.chooseSmartBotCardBrain(this.turnSeat); if (id) { this.playCard(this.turnSeat, id); broadcastRoomState(this); } }
    }, delay);
  }
  addSystemChat(t) { this.chat.push({ sender: 'السيستام', text: t, isSystem: true }); if (this.chat.length > 40) this.chat.shift(); }
  addUserChat(s, t) { if (!G().chatEnabled) return; const c = String(t || '').trim().substring(0, 140); if (!c) return; this.chat.push({ sender: s, text: c, isSystem: false }); if (this.chat.length > 40) this.chat.shift(); }
  getStateForPlayer(pid) {
    const ms = this.seatOf(pid);
    const cc = { 0: (this.hands[0] || []).length, 1: (this.hands[1] || []).length, 2: (this.hands[2] || []).length, 3: (this.hands[3] || []).length };
    const bi = (ms !== -1 && this.beloteHolders[ms]) ? { canArm: this.beloteHolders[ms].cardsPlayed === 0, armed: this.beloteHolders[ms].armed, seat: ms } : null;
    const toMs = (Number(G().turnTimeoutSec) || 60) * 1000;
    const trm = (this.status === 'bidding' || this.status === 'playing') ? Math.max(0, this.turnDeadline - Date.now()) : toMs;
    const u = store.user(pid);
    const t = this.tier();
    return { id: this.id, name: this.name, hostId: this.hostId, targetScore: this.targetScore, status: this.status, seats: this.seats, mySeat: ms, isPrivate: this.isPrivate, biddingLocked: this.biddingLocked, speed: this.speed, tierId: this.tierId, tierName: t ? t.name : '', tierEntry: t ? t.entry : 0, myBalance: u ? u.balance : null, payoutInfo: this.payoutInfo, origin: this.origin, autoFillOn: this.autoFillOn() && !this.isPrivate, autoFillIn: this.autoFillTimer ? Math.max(0, this.autoFillAt - Date.now()) : 0, firstPlayerSeat: this.firstPlayerSeat, dealerSeat: this.dealerSeat, turnSeat: this.turnSeat, turnRemainingMs: trm, turnTimeoutSec: Math.floor(toMs / 1000), currentContract: this.currentContract, bidHistory: this.bidHistory, lastActionBySeat: this.lastActionBySeat, openingBidBySeat: this.openingBidBySeat, lastBidBySeat: this.lastBidBySeat, thinkingSeat: this.thinkingUntil > Date.now() ? this.thinkingSeat : null, lastSoundEvent: this.lastSoundEvent, beloteInfo: bi, reactionUntil: this.reactionUntil, scoreHistory: this.scoreHistory, trumpSuit: this.trumpSuit, takerSeat: this.takerSeat, takerTeam: this.takerTeam, currentTrick: this.currentTrick, lastTrickCards: this.lastTrickCards, lastTrickWinnerSeat: this.lastTrickWinnerSeat, myHand: ms !== -1 ? this.hands[ms] : [], validCardIds: (this.status === 'playing' && ms !== -1 && this.turnSeat === ms) ? this.getValidCardIds(ms) : [], cardCounts: cc, roundCardPoints: this.roundCardPoints, farchaPoints: this.farchaPoints, roundPoints: this.roundPoints, beloteBonus: this.beloteBonus, totalScores: this.totalScores, lastRoundSummary: this.lastRoundSummary, chat: this.chat };
  }
}

const lobbyDirty = new Set();
function getLobbyRoomsList(includePrivate = false) {
  const list = [];
  for (const r of rooms.values()) {
    if (r.isPrivate && !includePrivate) continue;
    const hs = r.seats.find(s => s && s.id === r.hostId);
    const t = r.tier();
    list.push({ id: r.id, name: r.name, hostName: hs ? hs.name : 'مولى الطاولة', playerCount: r.playerCount(), status: r.status, targetScore: r.targetScore, isPrivate: r.isPrivate, tierId: r.tierId, tierName: t ? t.name : '', tierEntry: t ? t.entry : 0, tierEmoji: t ? t.emoji : '', origin: r.origin, players: r.seats.map((s, i) => s ? { name: s.name, team: i % 2 === 0 ? 1 : 2, isBot: s.isBot } : null) });
  }
  return list;
}
function markLobbyDirty() { for (const c of clients.values()) lobbyDirty.add(c); }
function flushLobby() { if (!lobbyDirty.size) return; for (const c of lobbyDirty) { if (c.ws && c.ws.readyState === WebSocket.OPEN) c.ws.send(JSON.stringify({ type: 'lobby_update', rooms: getLobbyRoomsList(!!c.isAdmin) })); } lobbyDirty.clear(); }
setInterval(flushLobby, 1200);
function broadcastRoomState(room) { for (const s of room.seats) if (s && !s.isBot) { const c = clients.get(s.id); if (c && c.ws && c.ws.readyState === WebSocket.OPEN) c.ws.send(JSON.stringify({ type: 'room_state', room: room.getStateForPlayer(s.id) })); } }
function relayRoomVoicePacket(room, ss, sn, pkt) {
  if (!G().voiceEnabled) return;
  const out = JSON.stringify({ type: pkt.type, seat: ss, senderName: sn, speaking: !!pkt.speaking, codec: pkt.codec || 'adpcm4', sampleRate: Number(pkt.sampleRate) || 6000, data: pkt.data || null });
  for (let s = 0; s < 4; s++) { const sp = room.seats[s]; if (!sp || sp.isBot) continue; if (pkt.type === 'voice_ptt' && s === ss) continue; const c = clients.get(sp.id); if (c && c.ws && c.ws.readyState === WebSocket.OPEN) c.ws.send(out); }
}
function resolveIdentity(data) {
  const tokUid = store.verifyToken(data.token);
  if (tokUid && store.user(tokUid)) { const u = store.user(tokUid); if (data.name) store.renameUser(tokUid, data.name); return u; }
  return null;
}
function defaultTierFor(isPrivate) {
  if (!store.settings().economy.enabled || isPrivate) return null;
  const list = store.tiers();
  return list.length ? list[0] : null;
}
function processActionPacket(pid, data, ws = null) {
  const { type } = data; const responses = [];
  const reply = o => { responses.push(o); if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(o)); };
  const tokUid = store.verifyToken(data.token);
  if (!tokUid || !store.user(tokUid)) { reply({ type: 'auth_required', msg: 'يلزم تسجيل دخول آمن قبل اللعب.' }); return responses; }
  pid = tokUid;
  if (!clients.has(pid)) clients.set(pid, { ws, playerId: pid, name: String(data.name || data.playerName || 'لاعب').trim().substring(0, 18) || 'لاعب', roomId: null, isAdmin: false, lastVoiceTs: 0, tokenSynced: false });
  const client = clients.get(pid); if (ws) client.ws = ws;
  const su = store.user(pid); if (su) su.lastSeen = Date.now();
  if (tokUid && !client.tokenSynced) {
    client.tokenSynced = true;
    const u2 = store.user(tokUid);
    reply({ type: 'auth_ok', playerId: tokUid, name: client.name, isAdmin: client.isAdmin, rooms: getLobbyRoomsList(!!client.isAdmin), token: store.signToken(tokUid), wallet: u2 ? store.publicUser(u2) : null, tiers: store.tiers(), economyOn: !!store.settings().economy.enabled });
  }
  if (type === 'auth') {
    const ident = resolveIdentity(data);
    if (ident) pid = ident.id;
    const cn = String(data.name || client.name || 'لاعب').trim().substring(0, 18) || 'لاعب'; client.name = cn;
    const u = store.user(pid);
    reply({ type: 'auth_ok', playerId: pid, name: cn, isAdmin: client.isAdmin, rooms: getLobbyRoomsList(!!client.isAdmin), token: store.signToken(pid), wallet: u ? store.publicUser(u) : null, tiers: store.tiers(), economyOn: !!store.settings().economy.enabled });
    if (u && u.banned) reply({ type: 'error_msg', msg: '🚫 حسابك محظور من الإدارة' });
    if (client.roomId && rooms.has(client.roomId)) { const r = rooms.get(client.roomId); r.addPlayer({ id: pid, name: cn }); broadcastRoomState(r); responses.push({ type: 'room_state', room: r.getStateForPlayer(pid) }); }
    return responses;
  }
  if (type === 'set_name') { client.name = String(data.name || 'لاعب').trim().substring(0, 18) || 'لاعب'; store.renameUser(pid, client.name); if (!data.silent) reply({ type: 'name_updated', name: client.name }); return responses; }
  if (type === 'admin_login') { if (adminApi.checkPass(String(data.passcode || ''), adminApi.adminPass())) { client.isAdmin = true; reply({ type: 'admin_status', isAdmin: true, msg: 'دخلت كأدمن' }); reply({ type: 'lobby_update', rooms: getLobbyRoomsList(true) }); } else reply({ type: 'error_msg', msg: 'باس الأدمن غالط' }); return responses; }
  if (type === 'wallet_refresh') { const u = store.user(pid); reply({ type: 'wallet_update', wallet: u ? store.publicUser(u) : null, ads: store.adState(u, data.deviceId) }); return responses; }
  if (type === 'claim_daily') { const r = store.claimDaily(pid); reply({ type: 'error_msg', msg: r.reason || 'معطّلة' }); return responses; }
  if (type === 'delete_room') {
    const r = rooms.get(data.roomId); if (!r) return responses;
    if (!client.isAdmin && r.hostId !== pid) { reply({ type: 'error_msg', msg: 'ما عندكش صلاحية' }); return responses; }
    r.clearTimers(); r.abortMatch();
    for (const s of r.seats) if (s && !s.isBot) { const m = clients.get(s.id); if (m) { m.roomId = null; if (m.ws && m.ws.readyState === WebSocket.OPEN) m.ws.send(JSON.stringify({ type: 'room_closed', msg: 'الطاولة تسكّرت' })); } }
    rooms.delete(data.roomId); markLobbyDirty(); flushLobby(); reply({ type: 'lobby_update', rooms: getLobbyRoomsList(!!client.isAdmin) }); return responses;
  }
  if (type === 'create_room') {
    if (client.roomId && rooms.has(client.roomId)) { reply({ type: 'error_msg', msg: 'اخرج من طاولتك الحالية قبل إنشاء طاولة أخرى.' }); return responses; }
    if (data.playerName) client.name = String(data.playerName).trim().substring(0, 18) || client.name;
    if (su && su.banned) { reply({ type: 'error_msg', msg: '🚫 حسابك محظور' }); return responses; }
    const isPriv = !!data.isPrivate;
    if (isPriv && !G().allowPrivate) { reply({ type: 'error_msg', msg: 'الطاولات الخاصة معطّلة' }); return responses; }
    let tier = data.tierId ? store.tierById(String(data.tierId)) : null;
    if (!tier) tier = defaultTierFor(isPriv);
    if (tier && store.settings().economy.enabled) { const chk = store.canSit(su, tier); if (!chk.ok) { reply({ type: 'error_msg', msg: '🪙 ' + chk.reason }); return responses; } }
    const rid = generateRoomId();
    if (isPriv) { const fee = store.chargePrivateFee(pid, rid); if (!fee.ok) { reply({ type: 'error_msg', msg: '🪙 ' + (fee.reason || 'ما عندكش نقاط للطاولة الخاصة') }); return responses; } }
    const rn = String(data.roomName || `طاولة ${client.name}`).trim().substring(0, 28);
    const allowed = [500, 1000, 1500, 2000];
    const ts = allowed.includes(Number(data.targetScore)) ? Number(data.targetScore) : (Number(G().targetScore) || 2000);
    const r = new BeloteRoom(rid, rn, pid, client.name, ts, isPriv, tier ? tier.id : '');
    r.origin = 'host';
    if (data.autoFill === true) r.autoFillEnabled = true;
    if (data.autoFill === false) r.autoFillEnabled = false;
    r.addPlayer({ id: pid, name: client.name }); rooms.set(rid, r); client.roomId = rid;
    r.addSystemChat('🏠 طاولة أصحاب: نستناو في اللاعبين... المولى ينجم زيد بوتات أو يبدّل البلايص أو يبدا كي يكملو 4.');
    r.scheduleAutoFill();
    markLobbyDirty(); flushLobby(); broadcastRoomState(r);
    responses.push({ type: 'room_state', room: r.getStateForPlayer(pid) });
    return responses;
  }
  if (type === 'join_room' || type === 'quick_join') {
    if (client.roomId && rooms.has(client.roomId)) { reply({ type: 'error_msg', msg: 'اخرج من طاولتك الحالية قبل الانضمام لطاولة أخرى.' }); return responses; }
    if (data.playerName) client.name = String(data.playerName).trim().substring(0, 18) || client.name;
    if (su && su.banned) { reply({ type: 'error_msg', msg: '🚫 حسابك محظور' }); return responses; }
    let r = null;
    if (type === 'join_room') {
      r = rooms.get(String(data.roomId || '').toUpperCase());
      if (!r) { reply({ type: 'error_msg', msg: '⚠️ الطاولة موش موجودة.' }); return responses; }
    } else {
      const wantTier = String(data.tierId || '');
      const cand = [];
      for (const x of rooms.values()) { if (x.isPrivate || x.status !== 'waiting' || x.playerCount() >= 4) continue; if (x.origin !== 'match' && x.autoFillEnabled === false) continue; if (wantTier && x.tierId !== wantTier) continue; cand.push(x); }
      cand.sort((a, b) => b.playerCount() - a.playerCount());
      r = cand[0] || null;
      if (!r) {
        let tier = wantTier ? store.tierById(wantTier) : null;
        if (!tier) tier = defaultTierFor(false);
        if (tier && store.settings().economy.enabled) { const chk = store.canSit(su, tier); if (!chk.ok) { reply({ type: 'error_msg', msg: '🪙 ' + chk.reason }); return responses; } }
        const rid = generateRoomId();
        r = new BeloteRoom(rid, `طاولة ${client.name}`, pid, client.name, Number(G().targetScore) || 2000, false, tier ? tier.id : '');
        r.origin = 'match';
        rooms.set(rid, r);
      }
    }
    if (r.status !== 'waiting') { reply({ type: 'error_msg', msg: '⚠️ الطاولة بدا فيها اللعب.' }); return responses; }
    const t = r.tier();
    if (t) { const chk = store.canSit(su, t); if (!chk.ok) { reply({ type: 'error_msg', msg: '🪙 ' + chk.reason }); return responses; } }
    const si = r.addPlayer({ id: pid, name: client.name });
    if (si === -1) { reply({ type: 'error_msg', msg: 'الطاولة كاملة.' }); return responses; }
    client.roomId = r.id; r.addSystemChat(`${client.name} دخل للطاولة`);
    r.scheduleAutoFill();
    markLobbyDirty(); flushLobby(); broadcastRoomState(r);
    responses.push({ type: 'room_state', room: r.getStateForPlayer(pid) });
    return responses;
  }
  if (type === 'leave_room') {
    if (!client.roomId || !rooms.has(client.roomId)) { reply({ type: 'left_room' }); return responses; }
    const r = rooms.get(client.roomId); r.removePlayer(pid); client.roomId = null;
    const hh = r.seats.some(s => s && !s.isBot);
    if (!hh) { r.clearTimers(); r.abortMatch(); rooms.delete(r.id); } else { r.addSystemChat(`${client.name} خرج`); r.scheduleAutoFill(); broadcastRoomState(r); }
    markLobbyDirty(); flushLobby(); reply({ type: 'left_room' });
    reply({ type: 'wallet_update', wallet: store.publicUser(store.user(pid)) });
    return responses;
  }
  if (!client.roomId || !rooms.has(client.roomId)) return responses;
  const room = rooms.get(client.roomId); const ms = room.seatOf(pid); if (ms === -1) return responses;
  if (type === 'voice_state') { relayRoomVoicePacket(room, ms, client.name, { type: 'voice_state', speaking: !!data.speaking }); return responses; }
  if (type === 'voice_ptt') { const nowTs = Date.now(); if (nowTs - (client.lastVoiceTs || 0) < 120) return responses; if (typeof data.data === 'string' && data.data.length > 0 && data.data.length <= 24000) { client.lastVoiceTs = nowTs; relayRoomVoicePacket(room, ms, client.name, data); } return responses; }
  if (type === 'host_set_speed') {
    if (room.hostId === pid) {
      const s = Number(data.speed);
      room.speed = (s === 0.7 || s === 1 || s === 1.5) ? s : 1;
      room.addSystemChat(room.speed > 1 ? '⚡⚡ المولى سرّع اللعب.' : (room.speed < 1 ? '🐢 المولى بطّأ اللعب.' : '⚡ المولى رجّع السرعة عادية.'));
      broadcastRoomState(room);
    } else reply({ type: 'error_msg', msg: 'كان مولى الطاولة يبدّل السرعة' });
  }
  else if (type === 'host_swap_seats') { if (room.hostId === pid && room.swapSeats(Number(data.seatA), Number(data.seatB))) { room.addSystemChat('مولى الطاولة بدّل الفرق'); broadcastRoomState(room); } }
  else if (type === 'host_randomize_teams') { if (room.hostId === pid && room.randomizeTeams()) { room.addSystemChat('🎲 قرعة'); broadcastRoomState(room); } }
  else if (type === 'host_toggle_privacy') { if (room.hostId === pid && room.status === 'waiting') { room.isPrivate = !room.isPrivate; room.cancelAutoFill(); if (!room.isPrivate) room.scheduleAutoFill(); room.addSystemChat(room.isPrivate ? '🔒 مغلقة.' : '🔓 مفتوحة.'); markLobbyDirty(); broadcastRoomState(room); } }
  else if (type === 'host_toggle_autofill') {
    if (room.hostId === pid && room.status === 'waiting') {
      room.autoFillEnabled = !!data.enabled;
      room.addSystemChat(data.enabled ? '🤖 فعّل المولى التعبئة التلقائية.' : '⏸️ عطّل التعبئة التلقائية — نستناو في أصحابنا.');
      room.scheduleAutoFill(); broadcastRoomState(room);
    }
  }
  else if (type === 'host_add_bot') { if (room.hostId === pid && room.status === 'waiting') { const e = room.seats.indexOf(null); if (e !== -1) { room.seats[e] = { id: 'BOT-' + Math.random().toString(36).substring(2, 7), name: BOT_NAMES[e], isBot: true }; room.addSystemChat(`🤖 دخل ${BOT_NAMES[e]} (بالمجان)`); room.scheduleAutoFill(); markLobbyDirty(); broadcastRoomState(room); } } }
  else if (type === 'host_kick_seat') { if (room.hostId === pid && room.status === 'waiting') { const t = Number(data.seat); if (t >= 0 && t <= 3 && room.seats[t]) { const tp = room.seats[t]; if (tp.id !== pid) { room.seats[t] = null; if (!tp.isBot && clients.has(tp.id)) { const kc = clients.get(tp.id); kc.roomId = null; if (kc.ws && kc.ws.readyState === WebSocket.OPEN) kc.ws.send(JSON.stringify({ type: 'room_closed', msg: 'مولى الطاولة خرجك' })); } room.scheduleAutoFill(); markLobbyDirty(); broadcastRoomState(room); } } } }
  else if (type === 'host_start_game') {
    if (room.hostId !== pid) reply({ type: 'error_msg', msg: 'كان المولى يبدا' });
    else if (room.playerCount() < 4) reply({ type: 'error_msg', msg: 'لازم 4 لاعبين' });
    else {
      room.cancelAutoFill();
      const beg = room.beginMatch();
      if (!beg.ok) { reply({ type: 'error_msg', msg: '🪙 ' + (beg.reason || 'فشل خصم الدخول') }); return responses; }
      room.totalScores = { team1: 0, team2: 0 }; room.scoreHistory = []; room.payoutInfo = null;
      room.startNewRound(true); room.addSystemChat('🃏 الماتش بدا!'); broadcastRoomState(room);
    }
  }
  else if (type === 'next_round') { if (room.status === 'round_end' || room.status === 'game_over') { if (room.status === 'game_over') { const beg = room.beginMatch(); if (!beg.ok) { reply({ type: 'error_msg', msg: '🪙 ' + (beg.reason || 'رصيد غير كافٍ') }); return responses; } room.totalScores = { team1: 0, team2: 0 }; room.scoreHistory = []; room.payoutInfo = null; room.startNewRound(true); } else room.startNewRound(false); broadcastRoomState(room); } }
  else if (type === 'player_thinking') { if (room.triggerThinkingClock(ms)) broadcastRoomState(room); }
  else if (type === 'arm_belote') { const r = room.toggleBeloteArm(ms); if (!r.ok) reply({ type: 'error_msg', msg: r.msg }); else broadcastRoomState(room); }
  else if (type === 'contre') { const r = room.handleBid(ms, 'contre'); if (!r.ok) reply({ type: 'error_msg', msg: r.msg }); else broadcastRoomState(room); }
  else if (type === 'surcontre') { const r = room.handleBid(ms, 'surcontre'); if (!r.ok) reply({ type: 'error_msg', msg: r.msg }); else broadcastRoomState(room); }
  else if (type === 'bid') { const r = room.handleBid(ms, data.action, data.suit, data.value); if (!r.ok) reply({ type: 'error_msg', msg: r.msg }); else broadcastRoomState(room); }
  else if (type === 'play_card') { const r = room.playCard(ms, data.cardId); if (!r.ok) reply({ type: 'error_msg', msg: r.msg }); else broadcastRoomState(room); }
  else if (type === 'chat_msg') { room.addUserChat(client.name, data.text); broadcastRoomState(room); }
  if (client.roomId && rooms.has(client.roomId)) responses.push({ type: 'room_state', room: rooms.get(client.roomId).getStateForPlayer(pid) });
  return responses;
}

app.post('/api/action', (req, res) => { const b = req.body || {}; const uid = store.verifyToken(b.token); if (!uid || !store.user(uid)) return res.status(401).json({ ok: false, error: 'Authentication required' }); res.json({ ok: true, packets: processActionPacket(uid, b, null) }); });

/* ===== الموقع العام قبل admin-api (باش / و /rules و /play يخدمو ديما) ===== */
if (publicSite && typeof publicSite.attach === 'function') {
  publicSite.attach(app, { rooms, clients, broadcastRoomState, markLobbyDirty });
}
adminApi.attach(app, { rooms, clients, broadcastRoomState, markLobbyDirty });

wss.on('connection', ws => {
  ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; }); let pid = null;
  ws.on('message', raw => {
    let d; try { d = JSON.parse(raw); } catch (e) { return; }
    const tokUid = store.verifyToken(d.token);
    if (!tokUid || !store.user(tokUid)) { ws.send(JSON.stringify({ type: 'auth_required', msg: 'يلزم تسجيل دخول آمن قبل اللعب.' })); ws.close(1008, 'authentication required'); return; }
    pid = tokUid;
    processActionPacket(pid, d, ws);
  });
  ws.on('close', () => {
    if (!pid || !clients.has(pid)) return;
    const c = clients.get(pid);
    // Ignore a delayed close from an older socket after this identity reconnected.
    if (c.ws !== ws) return;
    c.ws = null; lobbyDirty.delete(c);
    if (c.roomId && rooms.has(c.roomId)) { const r = rooms.get(c.roomId); if (r.status === 'waiting') { r.removePlayer(pid); c.roomId = null; markLobbyDirty(); broadcastRoomState(r); } }
  });
});
setInterval(() => { wss.clients.forEach(ws => { if (ws.isAlive === false) return ws.terminate(); ws.isAlive = false; ws.ping(); }); }, 15000);
setInterval(() => { for (const r of rooms.values()) if (r.status === 'waiting' && !r.autoFillTimer && !r.isPrivate && r.autoFillOn() && r.playerCount() < 4 && r.seats.some(s => s && !s.isBot)) r.scheduleAutoFill(); }, 10000);
process.on('SIGINT', () => { try { store.flush(); } catch (e) {} process.exit(0); });
process.on('SIGTERM', () => { try { store.flush(); } catch (e) {} process.exit(0); });

server.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log('🃏 Belote Server v53');
  console.log(`🔐 Admin access: configured=${!!adminApi.adminPass()} | 🛠️ /admin/panel.html`);
  console.log(`🪙 Economy: ${store.settings().economy.enabled ? 'ON' : 'OFF'}`);
  console.log('---------------- الموقع العام ----------------');
  siteFilesReport().forEach(f => console.log((f.exists ? '  ✅ ' : '  ❌ ناقص: ') + f.file));
  if (publicSiteError) console.log('  ❌ تحميل public-site فشل: ' + publicSiteError);
  if (publicSite && publicSite.P) console.log('  📄 الصفحات: ' + Object.keys(publicSite.P).map(k => '/' + publicSite.P[k].slug).join(' , ') + ' , /play');
  else console.log('  ⚠️ /rules وبقية الصفحات غير مسجّلة — أنشئ src/content.js و src/public-site.js');
  console.log('  🩺 فحص: /api/health/site');
  console.log('====================================================');
  try { if (brain && brain.startPeriodic) brain.startPeriodic(); } catch (e) {}
});
