'use strict';
/**
* 🧠 TUNISIAN BRAIN v3 - HUMAN-ONLY LEARNING
* ✅ يتعلم فقط من قرارات البشر الرابحين (R105)
* ✅ القواعد المتعلمة تحت القواعد الصلبة دائماً (R106-R108)
* ✅ بصمة 12 حقل دقيقة + نسيان القواعد الضعيفة (R109)
*/
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const DATA_DIR = path.join(__dirname, '..', 'data');
const MEMORY_FILE = path.join(DATA_DIR, 'brain-memory.json');
const Q_FILE = path.join(DATA_DIR, 'brain-qtable.json');
const N_FILE = path.join(DATA_DIR, 'brain-counts.json');
const CFG_FILE = path.join(DATA_DIR, 'brain-config.json');
const MAX_MEMORY = 20000;
function loadJSON(f, fb) { try { if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) {} return fb; }
function saveJSON(f, o) { try { fs.writeFileSync(f, JSON.stringify(o)); } catch (e) {} }

class TunisianBrain {
  constructor() {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
    this.memory = loadJSON(MEMORY_FILE, []);
    this.q = loadJSON(Q_FILE, {});
    this.n = loadJSON(N_FILE, {});
    this.config = Object.assign({
      enabled: true, evolveEveryRounds: 10, minSamplesForRule: 8, minWinRateForRule: 0.60,
      maxLearnedRules: 60, epsilon: 0.10, epsilonDecay: 0.90, minEpsilon: 0.03,
      learningRate: 0.35, periodicMinutes: 30
    }, loadJSON(CFG_FILE, {}));
    if (this.config.epsilon > 0.12) this.config.epsilon = 0.10;
    if (this.config.minSamplesForRule >= 12) this.config.minSamplesForRule = 8;
    this.pending = {};
    this.roundsSinceEvolve = 0;
    this.ruleEngine = null;
    this._saveTimer = null;
  }
  injectRuleEngine(engine) { this.ruleEngine = engine; }
  startPeriodic() { setInterval(() => { try { if (this.config.enabled) this.evolve(); } catch (e) {} }, (this.config.periodicMinutes || 30) * 60 * 1000); }
  setEnabled(v) { this.config.enabled = !!v; saveJSON(CFG_FILE, this.config); return this.config.enabled; }
  hasExperience(state, minVisits = 6) {
    const counts = this.n[state];
    if (!counts) return false;
    let total = 0;
    for (const k of Object.keys(counts)) total += counts[k];
    return total >= minVisits;
  }
  beginRound(matchId) { this.pending[matchId] = []; }
  recordDecision(matchId, seat, phase, fp, decision, actor) {
    if (!this.config.enabled) return;
    if (!this.pending[matchId]) this.pending[matchId] = [];
    this.pending[matchId].push({ seat, phase, fp, d: decision, actor, t: Date.now(), imm: undefined });
  }
  rewardTrick(matchId, results) {
    const list = this.pending[matchId]; if (!list) return;
    results.forEach(tr => {
      for (let i = list.length - 1; i >= 0; i--) {
        const dec = list[i];
        if (dec.seat === tr.seat && dec.phase === 'play' && dec.imm === undefined) {
          dec.imm = tr.reward;
          if (dec.actor === 'human') this._qUpdate(dec.fp, dec.d, tr.reward); // R105 بشر فقط
          break;
        }
      }
    });
  }
  endRound(matchId, winningTeam, matchEnded) {
    const list = this.pending[matchId] || [];
    list.forEach(dec => {
      const decTeam = (dec.seat % 2 === 0) ? 1 : 2;
      const win = (decTeam === winningTeam) ? 1 : 0;
      if (dec.phase === 'play') {
        if (dec.actor === 'human') this._qUpdate(dec.fp, dec.d, win ? 1.2 : -0.6);
      } else if (dec.actor === 'human') {
        this.memory.push({ t: dec.t, phase: dec.phase, fp: dec.fp, d: dec.d, actor: 'human', win });
      }
    });
    if (this.memory.length > MAX_MEMORY) this.memory = this.memory.slice(-MAX_MEMORY);
    delete this.pending[matchId];
    this.roundsSinceEvolve++;
    this._scheduleSave();
    if (this.roundsSinceEvolve >= (this.config.evolveEveryRounds || 10)) {
      this.roundsSinceEvolve = 0;
      setImmediate(() => { try { this.evolve(); } catch (e) {} });
    }
  }
  _qUpdate(state, action, reward) {
    if (!this.config.enabled) return;
    if (!this.q[state]) this.q[state] = {};
    if (!this.n[state]) this.n[state] = {};
    const old = this.q[state][action] || 0;
    this.q[state][action] = Math.round((old + this.config.learningRate * (reward - old)) * 1000) / 1000;
    this.n[state][action] = (this.n[state][action] || 0) + 1;
    this._scheduleSave();
  }
  qChoose(state, actions) {
    if (!actions || !actions.length) return null;
    if (Math.random() < this.config.epsilon) return actions[Math.floor(Math.random() * actions.length)].key;
    const tbl = this.q[state] || {};
    let bestKey = actions[0].key, bestV = -Infinity, seen = false;
    actions.forEach(a => {
      const v = tbl[a.key];
      if (v === undefined) { if (!seen) { bestKey = a.key; bestV = 0; seen = true; } return; }
      if (v > bestV) { bestV = v; bestKey = a.key; seen = true; }
    });
    return bestKey;
  }
  _scheduleSave() {
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => { this._saveTimer = null; saveJSON(MEMORY_FILE, this.memory); saveJSON(Q_FILE, this.q); saveJSON(N_FILE, this.n); }, 5000);
  }
  evolve() {
    if (!this.config.enabled || !this.ruleEngine) return { evolved: false, reason: 'disabled' };
    const groups = new Map();
    this.memory.forEach(rec => {
      if (rec.actor !== 'human') return; // R105
      const key = rec.phase + '::' + rec.fp + '::' + JSON.stringify(rec.d);
      let g = groups.get(key);
      if (!g) { g = { phase: rec.phase, fp: rec.fp, d: rec.d, wins: 0, n: 0 }; groups.set(key, g); }
      g.n++; if (rec.win) g.wins++;
    });
    const candidates = [];
    groups.forEach(g => {
      const wr = g.n ? g.wins / g.n : 0;
      if ((g.phase === 'bid' || g.phase === 'contre') && g.n >= this.config.minSamplesForRule && wr >= this.config.minWinRateForRule) candidates.push({ g, score: wr, samples: g.n });
    });
    candidates.sort((a, b) => b.score - a.score);
    let added = 0;
    for (const cand of candidates.slice(0, 5)) {
      const rule = this._patternToRule(cand.g, cand.score, cand.samples);
      if (!rule) continue;
      try { const res = this.ruleEngine.saveRule(rule, 'brain-auto'); if (res && res.ok) added++; } catch (e) {}
    }
    let removed = 0;
    try {
      const rules = this.ruleEngine.listRules();
      const learned = rules.filter(r => String(r.id).indexOf('LEARNED-') === 0);
      if (learned.length > this.config.maxLearnedRules) {
        learned.sort((a, b) => (a.winRate || 0) - (b.winRate || 0));
        for (const r of learned.slice(0, learned.length - this.config.maxLearnedRules)) { this.ruleEngine.deleteRule(r.id, 'brain-auto'); removed++; }
      }
      // R109: نسيان القواعد الضعيفة
      for (const r of learned) { if ((r.sampleSize || 0) >= 20 && (r.winRate || 1) < 0.60) { this.ruleEngine.deleteRule(r.id, 'brain-auto'); removed++; } }
    } catch (e) {}
    this.config.epsilon = Math.max(this.config.minEpsilon, Math.round(this.config.epsilon * this.config.epsilonDecay * 1000) / 1000);
    saveJSON(CFG_FILE, this.config);
    this._scheduleSave();
    return { evolved: true, added, removed, epsilon: this.config.epsilon, candidates: candidates.length };
  }
  _patternToRule(g, score, samples) {
    const p = g.fp.split('|').map(Number);
    const conditions = [];
    if (p[0]) conditions.push({ field: 'partnerOriginalBid', operator: 'eq', value: p[0] });
    conditions.push({ field: 'partnerOwnsOriginalContract', operator: 'eq', value: !!p[1] });
    conditions.push({ field: 'hasJackInPartnerSuit', operator: 'eq', value: !!p[2] });
    conditions.push({ field: 'hasNineInPartnerSuit', operator: 'eq', value: !!p[3] });
    if (p[4]) conditions.push({ field: 'partnerSuitCount', operator: 'eq', value: p[4] });
    if (p[5]) conditions.push({ field: 'mySideAceCount', operator: 'gte', value: p[5] });
    if (p[6]) conditions.push({ field: 'trumpCount', operator: 'gte', value: p[6] });
    if (p[7]) conditions.push({ field: 'currentContractValue', operator: 'eq', value: p[7] });
    conditions.push({ field: 'opponentIntervened', operator: 'eq', value: !!p[8] });
    if (p[9]) conditions.push({ field: 'myVoidSuitCount', operator: 'gte', value: p[9] });
    conditions.push({ field: 'bestIsFullTrump', operator: 'eq', value: !!p[10] });
    conditions.push({ field: 'partnerOpeningWasThinking', operator: 'eq', value: !!p[11] });
    const d = g.d; let action = null;
    if (g.phase === 'contre' || d.type === 'contre') action = { type: 'contre' };
    else if (d.type === 'surcontre') action = { type: 'surcontre' };
    else if (d.type === 'pass') action = { type: 'pass' };
    else if (d.type === 'bid') action = { type: 'bid', suitSource: d.suit || 'bestSuit', calculation: 'fixed', fixedValue: d.value || 90, mustBeatCurrent: true };
    if (!action) return null;
    const id = 'LEARNED-' + crypto.createHash('md5').update(g.fp + JSON.stringify(d)).digest('hex').slice(0, 10).toUpperCase();
    return {
      id,
      name: `🧠 من البشر (نجاح ${Math.round(score * 100)}% / ${samples} مرة)`,
      phase: 'bidding',
      priority: 400 + Math.round(score * 50), // R108: تحت القواعد الصلبة
      enabled: true, status: 'published', conditions, action,
      explanation: `تعلمها العقل من لعب البشر الرابحين (${samples} عينة، نجاح ${Math.round(score * 100)}%).`,
      winRate: Math.round(score * 1000) / 1000, sampleSize: samples, learnedAt: new Date().toISOString()
    };
  }
  getStats() {
    const humanRecs = this.memory.filter(r => r.actor === 'human');
    const wins = humanRecs.filter(r => r.win).length;
    const learnedCount = this.ruleEngine ? this.ruleEngine.listRules().filter(r => String(r.id).indexOf('LEARNED-') === 0).length : 0;
    const wr = humanRecs.length ? wins / humanRecs.length : 0;
    let totalVisits = 0;
    for (const st of Object.keys(this.n)) for (const k of Object.keys(this.n[st])) totalVisits += this.n[st][k];
    return {
      enabled: this.config.enabled, memorySize: this.memory.length, qStates: Object.keys(this.q).length,
      qEntries: Object.values(this.q).reduce((s, v) => s + Object.keys(v).length, 0), totalVisits,
      epsilon: Math.round(this.config.epsilon * 1000) / 1000, decisions: humanRecs.length,
      winRate: Math.round(wr * 100), humanSamples: humanRecs.length,
      roundsSinceEvolve: this.roundsSinceEvolve, evolveEvery: this.config.evolveEveryRounds,
      learnedRules: learnedCount, totalDecisions: this.memory.length, recentWinRate: wr, evolvedRules: learnedCount
    };
  }
}
module.exports = new TunisianBrain();