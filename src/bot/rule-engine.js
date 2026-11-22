"use strict";
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', 'data', 'bot-rules.json');
const HISTORY_FILE = path.join(__dirname, '..', 'data', 'bot-rules-history.json');
const ALLOWED_OPERATORS = new Set(['eq', 'neq', 'gte', 'lte', 'gt', 'lt', 'includes', 'not_includes']);
const BID_VALUES = [90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 500];

function ensureFiles() {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ version: 1, rules: [] }, null, 2));
    if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2));
}

function readStore() {
    ensureFiles();
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeStore(store) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function history(entry) {
    const h = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    h.push({ ...entry, at: new Date().toISOString() });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(h.slice(-1000), null, 2));
}

function canonicalRule(rule) {
    const conditions = (rule.conditions || [])
        .map(c => ({ field: String(c.field), operator: String(c.operator), value: normalize(c.value) }))
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return { phase: rule.phase || 'bidding', conditions, action: normalizeAction(rule.action || {}) };
}

function normalize(v) {
    if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    if (Array.isArray(v)) return [...v].map(normalize).sort();
    return v;
}

function normalizeAction(a) {
    return Object.keys(a).sort().reduce((o, k) => (o[k] = normalize(a[k]), o), {});
}

function fingerprint(rule) {
    return crypto.createHash('sha256').update(JSON.stringify(canonicalRule(rule))).digest('hex');
}

function validate(rule) {
    const errors = [];
    if (!rule.name || String(rule.name).trim().length < 3) errors.push('Rule name is required.');
    if (!Array.isArray(rule.conditions) || !rule.conditions.length) errors.push('At least one condition is required.');
    for (const c of rule.conditions || []) {
        if (!c.field) errors.push('Every condition needs a field.');
        if (!ALLOWED_OPERATORS.has(c.operator)) errors.push(`Unsupported operator: ${c.operator}`);
    }
    if (!rule.action || !['pass', 'bid', 'contre', 'surcontre', 'fallback'].includes(rule.action.type)) {
        errors.push('Unsupported action.');
    }
    return errors;
}

function getValue(obj, dotted) {
    return dotted.split('.').reduce((v, k) => (v == null ? undefined : v[k]), obj);
}

function compare(actual, op, expected) {
    expected = normalize(expected);
    if (op === 'eq') return actual === expected;
    if (op === 'neq') return actual !== expected;
    if (op === 'gte') return Number(actual) >= Number(expected);
    if (op === 'lte') return Number(actual) <= Number(expected);
    if (op === 'gt') return Number(actual) > Number(expected);
    if (op === 'lt') return Number(actual) < Number(expected);
    if (op === 'includes') return Array.isArray(actual) ? actual.includes(expected) : String(actual || '').includes(String(expected));
    if (op === 'not_includes') return Array.isArray(actual) ? !actual.includes(expected) : !String(actual || '').includes(String(expected));
    return false;
}

function matches(rule, context) {
    return (rule.conditions || []).every(c => compare(getValue(context, c.field), c.operator, c.value));
}

function resolveSuit(source, ctx) {
    if (['spades', 'hearts', 'clubs', 'diamonds'].includes(source)) return source;
    if (source === 'partnerOriginalSuit') return ctx.partnerOriginalSuit;
    if (source === 'currentContractSuit') return ctx.currentContractSuit;
    if (source === 'bestSuit') return ctx.bestSuit;
    return null;
}

function nextLegal(minimum) {
    return BID_VALUES.find(v => v >= minimum) || null;
}

function resolveAction(rule, ctx) {
    const a = rule.action || {};
    if (a.type === 'pass' || a.type === 'contre' || a.type === 'surcontre' || a.type === 'fallback') {
        return {
            action: a.type === 'fallback' ? 'pass' : a.type,
            ruleId: rule.id,
            explanation: rule.explanation || rule.name,
            thinking: !!a.thinking
        };
    }
    if (a.type === 'bid') {
        let target = Number(a.fixedValue || 0);
        if (a.calculation === 'current_plus') target = Number(ctx.currentContractValue || 0) + Number(a.increment || 10);
        if (a.calculation === 'partner_original_plus') target = Number(ctx.partnerOriginalBid || 0) + Number(a.increment || 10);
        if (a.mustBeatCurrent) target = Math.max(target, Number(ctx.currentContractValue || 0) + 10);
        if (a.competitiveExtraStep && ctx.opponentIntervened && Number(a.increment) === 20) {
            target = Math.max(target, Number(ctx.currentContractValue || 0) + 20);
        }
        target = nextLegal(target);
        const suit = resolveSuit(a.suitSource, ctx);
        if (!target || !suit) return null;
        return {
            action: 'bid',
            suit,
            value: target,
            ruleId: rule.id,
            explanation: rule.explanation || rule.name,
            thinking: !!a.thinking
        };
    }
    return null;
}

function listRules() {
    return readStore().rules;
}

function saveRule(input, actor = 'admin') {
    const errors = validate(input);
    if (errors.length) return { ok: false, errors };
    const store = readStore();
    const fp = fingerprint(input);
    const duplicate = store.rules.find(r => r.fingerprint === fp && r.id !== input.id);
    if (duplicate) return { ok: false, duplicate: { id: duplicate.id, name: duplicate.name } };
    const now = new Date().toISOString();
    const id = input.id || `RULE-${Date.now().toString(36).toUpperCase()}`;
    const rule = {
        ...input,
        id,
        name: String(input.name).trim(),
        priority: Number(input.priority || 100),
        enabled: input.enabled !== false,
        status: input.status || 'draft',
        fingerprint: fp,
        updatedAt: now
    };
    const idx = store.rules.findIndex(r => r.id === id);
    const before = idx >= 0 ? store.rules[idx] : null;
    if (idx >= 0) store.rules[idx] = rule;
    else store.rules.push({ ...rule, createdAt: now });
    store.version = (store.version || 1) + 1;
    writeStore(store);
    history({ actor, action: before ? 'update' : 'create', ruleId: id, before, after: rule });
    return { ok: true, rule };
}

function deleteRule(id, actor = 'admin') {
    const store = readStore();
    const idx = store.rules.findIndex(r => r.id === id);
    if (idx < 0) return false;
    const [before] = store.rules.splice(idx, 1);
    store.version++;
    writeStore(store);
    history({ actor, action: 'delete', ruleId: id, before });
    return true;
}

function evaluate(context) {
    const candidates = listRules().filter(r => r.enabled && r.status === 'published' && r.phase === 'bidding' && matches(r, context));
    candidates.sort((a, b) => (b.priority - a.priority) || ((b.conditions?.length || 0) - (a.conditions?.length || 0)));
    for (const rule of candidates) {
        const decision = resolveAction(rule, context);
        if (decision) {
            return {
                decision,
                matched: candidates.map(r => ({ id: r.id, name: r.name, priority: r.priority }))
            };
        }
    }
    return { decision: null, matched: [] };
}

function historyList() {
    ensureFiles();
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
}

module.exports = { listRules, saveRule, deleteRule, evaluate, historyList, fingerprint, validate, matches };