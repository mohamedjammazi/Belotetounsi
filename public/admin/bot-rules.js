(() => {
const $ = id => document.getElementById(id);
let pass = sessionStorage.getItem('beloteAdminKey') || '';
let cachedRules = [];
const FIELD_LABELS = {
partnerOwnsOriginalContract: '🤝 هل شريك البوت هو صاحب أول فتحة في الطره؟ (true = نعم / false = لا)',
partnerOriginalBid: '📢 قيمة أول فتحة فتحها الشريك (مثلاً: 90 أو 100 أو 110)',
partnerOriginalSuit: '♠️ لون أول فتحة فتحها الشريك (spades / hearts / clubs / diamonds)',
partnerOpeningWasThinking: '🔔 هل الشريك فتح مع Tik-Tak؟ (= أتو ضعيف)',
partnerOpeningWasDirect: '🔔 هل الشريك فتح مباشرة؟ (= V أو 9 في الأتو)',
partnerOpeningValue: '🔢 قيمة فتحة الشريك الأصلية',
opponentIntervened: '⚔️ هل تدخل الخصم وزايد فوق الشريك؟ (true = نعم / false = لا)',
currentContractValue: '🔢 قيمة العقد الحالي على الطاولة الآن (0 إذا لم يفتح أحد)',
currentContractSuit: '🃏 لون العقد الحالي على الطاولة الآن',
hasJackInPartnerSuit: '🤴 هل يملك البوت الولد (V) في لون شريكه؟ (true = نعم / false = لا)',
hasNineInPartnerSuit: '9️⃣ هل يملك البوت التسعة (9) في لون شريكه؟ (true = نعم / false = لا)',
partnerSuitCount: '🔢 عدد الأوراق التي يملكها البوت في لون شريكه (0 إلى 8)',
sideAceCount: '🅰️ عدد الآسات (A) الجانبية خارج لون الشريك (0 إلى 3)',
mySideAceCount: '🅰️ عدد الآسات الجانبية في يد البوت',
mySideTenCount: '🔟 عدد الـ 10s الجانبية',
mySideAceTenCount: '💎 عدد الآسات + الـ 10s الجانبية',
mySideAceTenCombos: '🎯 عدد Ace+10 combos',
myTenCountOutsideTrump: '🔟 عدد الـ 10s خارج الأتو',
myVoidSuitCount: '🕳️ عدد الألوان المقطوعة',
myActiveSuitCount: '🎨 عدد الألوان الموجودة',
myHandHasV9A: '💎 هل يملك V+9+A في لون واحد؟',
myStrongSuit: '🌟 اللون القوي (V+9+A)',
bestIsFullTrump: '👑 هل أفضل لون هو أتو كامل؟',
bestBidRecommendation: '🎯 الفتحة الموصى بها',
bestScore: '💪 قوة أفضل لون في اليد',
bestHasV9D: '✨ هل أفضل لون فيه V+9+D؟',
bestHasRD10: '⚠️ هل أفضل لون فيه R+D+10؟',
trumpCount: '💪 عدد أوراق أطول لون في يد البوت نفسه (0 إلى 8)',
bestSuit: '🌟 أقوى لون في يد البوت نفسه',
myTeamScore: '🟦 مجموع نقاط فريق البوت في المباراة (من 2000)',
opponentScore: '🟧 مجموع نقاط فريق الخصم في المباراة (من 2000)'
};
const FIELD_TYPES = {
partnerOwnsOriginalContract: 'boolean', partnerOpeningWasThinking: 'boolean', partnerOpeningWasDirect: 'boolean',
opponentIntervened: 'boolean', hasJackInPartnerSuit: 'boolean', hasNineInPartnerSuit: 'boolean',
myHandHasV9A: 'boolean', bestIsFullTrump: 'boolean', bestHasV9D: 'boolean', bestHasRD10: 'boolean',
partnerOriginalSuit: 'suit', currentContractSuit: 'suit', bestSuit: 'suit', myStrongSuit: 'suit',
partnerOriginalBid: 'number', partnerOpeningValue: 'number', currentContractValue: 'number',
partnerSuitCount: 'number', sideAceCount: 'number', mySideAceCount: 'number', mySideTenCount: 'number',
mySideAceTenCount: 'number', mySideAceTenCombos: 'number', myTenCountOutsideTrump: 'number',
myVoidSuitCount: 'number', myActiveSuitCount: 'number', bestBidRecommendation: 'number',
bestScore: 'number', trumpCount: 'number', myTeamScore: 'number', opponentScore: 'number'
};
const OP_LABELS = { eq: 'يساوي (=)', neq: 'لا يساوي (≠)', gte: '≥', lte: '≤', gt: '>', lt: '<', includes: 'يحتوي', not_includes: 'لا يحتوي' };
const SUIT_AR = { spades: 'سباطة ♠', hearts: 'كوب ♥', clubs: 'فلوس ♣', diamonds: 'ديناري ♦', partnerOriginalSuit: 'نفس لون فتحة الشريك', currentContractSuit: 'نفس لون العقد', bestSuit: 'أقوى لون' };
const STATUS_AR = { published: '🟢 مفعّلة', draft: '🟡 مسودة', disabled: '🔴 معطلة' };

function createValueControl(field, currentVal) {
  const type = FIELD_TYPES[field] || 'text';
  if (type === 'boolean') { const strVal = String(currentVal) === 'false' ? 'false' : 'true'; return `<select class="cond-val"><option value="true" ${strVal === 'true' ? 'selected' : ''}>نعم</option><option value="false" ${strVal === 'false' ? 'selected' : ''}>لا</option></select>`; }
  if (type === 'suit') { const sVal = String(currentVal || 'spades'); return `<select class="cond-val"><option value="spades" ${sVal === 'spades' ? 'selected' : ''}>سباطة ♠</option><option value="hearts" ${sVal === 'hearts' ? 'selected' : ''}>كوب ♥</option><option value="clubs" ${sVal === 'clubs' ? 'selected' : ''}>فلوس ♣</option><option value="diamonds" ${sVal === 'diamonds' ? 'selected' : ''}>ديناري ♦</option></select>`; }
  return `<input class="cond-val" type="number" value="${String(currentVal ?? 90).replace(/"/g, '&quot;')}">`;
}
function cond(c = { field: 'partnerOriginalBid', operator: 'eq', value: 90 }) {
  const d = document.createElement('div'); d.className = 'condition';
  const fieldOptions = Object.keys(FIELD_LABELS).map(k => `<option value="${k}" ${k === c.field ? 'selected' : ''}>${FIELD_LABELS[k]}</option>`).join('');
  const opOptions = Object.keys(OP_LABELS).map(k => `<option value="${k}" ${k === c.operator ? 'selected' : ''}>${OP_LABELS[k]}</option>`).join('');
  d.innerHTML = `<select class="cond-field">${fieldOptions}</select><select class="cond-op">${opOptions}</select><div class="cond-val-wrap">${createValueControl(c.field, c.value)}</div><button type="button" class="danger" title="حذف">✖</button>`;
  const fieldSelect = d.querySelector('.cond-field'); const opSelect = d.querySelector('.cond-op'); const valWrap = d.querySelector('.cond-val-wrap');
  fieldSelect.onchange = () => { const newField = fieldSelect.value; const defaultVal = FIELD_TYPES[newField] === 'boolean' ? true : (FIELD_TYPES[newField] === 'suit' ? 'spades' : 90); valWrap.innerHTML = createValueControl(newField, defaultVal); valWrap.querySelector('.cond-val').oninput = updateArabicPreview; valWrap.querySelector('.cond-val').onchange = updateArabicPreview; updateArabicPreview(); };
  opSelect.onchange = updateArabicPreview;
  const valInput = valWrap.querySelector('.cond-val'); if (valInput) { valInput.oninput = updateArabicPreview; valInput.onchange = updateArabicPreview; }
  d.querySelector('button').onclick = () => { d.remove(); updateArabicPreview(); };
  $('conditions').appendChild(d); updateArabicPreview();
}
function parseVal(v) { if (v === 'true') return true; if (v === 'false') return false; if (v !== '' && !isNaN(v)) return Number(v); return v; }
function payload() {
  const conditions = [...$('conditions').children].map(d => { const field = d.querySelector('.cond-field').value; const operator = d.querySelector('.cond-op').value; const rawVal = d.querySelector('.cond-val').value; return { field, operator, value: parseVal(rawVal) }; });
  return { id: $('id').value || undefined, name: $('name').value.trim(), phase: 'bidding', priority: Number($('priority').value || 800), status: $('ruleStatus').value, enabled: $('ruleStatus').value !== 'disabled', explanation: $('explanation').value.trim(), conditions, action: { type: $('actionType').value, suitSource: $('suitSource').value, calculation: $('calculation').value, increment: Number($('increment').value || 10), fixedValue: Number($('fixedValue').value || 90), mustBeatCurrent: $('mustBeat').checked, competitiveExtraStep: $('extraStep').checked, thinking: $('thinking').checked } };
}
function formatConditionArabic(c) { const fieldName = FIELD_LABELS[c.field] ? FIELD_LABELS[c.field].split('(')[0].trim() : c.field; const opName = OP_LABELS[c.operator] || c.operator; let valText = String(c.value); if (c.value === true || c.value === 'true') valText = 'نعم'; else if (c.value === false || c.value === 'false') valText = 'لا'; else if (SUIT_AR[c.value]) valText = SUIT_AR[c.value]; return `• ${fieldName} <b>${opName}</b> [${valText}]`; }
function formatActionArabic(a) {
  if (!a) return ''; const thinkPrefix = a.thinking ? '⏱️ <b>Tik-Tak</b> ثم ' : '';
  if (a.type === 'pass') return `${thinkPrefix}<b>باس ❌</b>`;
  if (a.type === 'contre') return `${thinkPrefix}<b>كونتري 🔥</b>`;
  if (a.type === 'surcontre') return `${thinkPrefix}<b>سوركونتري ⚡</b>`;
  if (a.type === 'bid') { const suitTxt = SUIT_AR[a.suitSource] || a.suitSource; let calcTxt = ''; if (a.calculation === 'partner_original_plus') calcTxt = `فوق فتحة الشريك +${a.increment || 10}`; else if (a.calculation === 'current_plus') calcTxt = `فوق العقد الحالي +${a.increment || 10}`; else calcTxt = `رقم ثابت ${a.fixedValue || 90}`; const extraTxt = a.competitiveExtraStep ? ' (وإذا تدخل الخصم +20)' : ''; return `${thinkPrefix}<b>مزايدة 📢</b> (${suitTxt}) ${calcTxt}${extraTxt}`; }
  return '';
}
function updateFormVisibility() { const actType = $('actionType').value; const isBid = (actType === 'bid'); $('suitSourceWrap').style.display = isBid ? 'grid' : 'none'; $('bidCalcRow').style.display = isBid ? 'flex' : 'none'; const calcMode = $('calculation').value; $('incrementWrap').style.display = (isBid && calcMode !== 'fixed') ? 'grid' : 'none'; $('fixedValueWrap').style.display = (isBid && calcMode === 'fixed') ? 'grid' : 'none'; updateArabicPreview(); }
function updateArabicPreview() { const p = payload(); const condLines = p.conditions.map(formatConditionArabic).join('<br>'); const actLine = formatActionArabic(p.action); $('arabicRulePreview').innerHTML = `<div><b>إذا:</b><br>${condLines || '<i>لا توجد شروط</i>'}</div><div style="margin-top:6px; color:#065f46;"><b>👈 القرار:</b> ${actLine}</div>`; }
async function api(url, opt = {}) { pass = $('pass').value.trim() || sessionStorage.getItem('beloteAdminKey') || ''; if (!pass) throw new Error('يلزم إدخال كلمة مرور الأدمن'); sessionStorage.setItem('beloteAdminKey', pass); opt.headers = { ...(opt.headers || {}), 'content-type': 'application/json', 'x-admin-passcode': pass }; const r = await fetch(url, opt); const j = await r.json(); if (!r.ok) throw new Error(j.error || JSON.stringify(j)); return j; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
async function load() {
  const data = await api('/api/admin/bot-rules'); cachedRules = (data.rules || []).sort((a, b) => b.priority - a.priority); $('rulesCount').textContent = cachedRules.length;
  if (cachedRules.length === 0) { $('rules').innerHTML = `<div class="rule">لا توجد قواعد.</div>`; return; }
  $('rules').innerHTML = cachedRules.map(r => { const condSummary = (r.conditions || []).map(formatConditionArabic).join('<br>'); const actionSummary = formatActionArabic(r.action); return `<div class="rule"><div class="rule-top"><h3>📌 ${esc(r.name)}</h3><span class="badge status-${esc(r.status)}">${STATUS_AR[r.status] || esc(r.status)}</span></div><div class="meta">الأولوية: <b>${r.priority}</b> · الشروط: <b>${(r.conditions || []).length}</b> · <code>${esc(r.id)}</code></div>${r.explanation ? `<p class="rule-exp">💬 ${esc(r.explanation)}</p>` : ''}<div class="rule-arabic-box"><div>${condSummary}</div><div style="margin-top:5px; color:#047857;"><b>👈 القرار:</b> ${actionSummary}</div></div><div class="actions" style="margin-top:10px;"><button type="button" data-edit="${esc(r.id)}">✏️ تعديل</button><button type="button" class="danger" data-del="${esc(r.id)}">🗑️ حذف</button></div></div>`; }).join('');
  document.querySelectorAll('[data-edit]').forEach(b => { b.onclick = () => { const found = cachedRules.find(r => r.id === b.dataset.edit); if (found) edit(found); }; });
  document.querySelectorAll('[data-del]').forEach(b => { b.onclick = async () => { if (b.dataset.confirming !== '1') { b.dataset.confirming = '1'; b.textContent = '⚠️ تأكيد الحذف'; setTimeout(() => { if (b.isConnected) { b.dataset.confirming = '0'; b.textContent = '🗑️ حذف'; } }, 3500); return; } try { await api('/api/admin/bot-rules/' + b.dataset.del, { method: 'DELETE' }); showMsg('🗑️ تم الحذف', false); load(); } catch (err) { showMsg(err.message, true); } }; });
}
function edit(r) { newRule(false); $('formTitle').textContent = '✏️ تعديل: ' + r.name; $('id').value = r.id; $('name').value = r.name; $('priority').value = r.priority; $('ruleStatus').value = r.status; $('explanation').value = r.explanation || ''; $('conditions').innerHTML = ''; (r.conditions || []).forEach(cond); const a = r.action || {}; $('actionType').value = a.type || 'bid'; $('suitSource').value = a.suitSource || 'partnerOriginalSuit'; $('calculation').value = a.calculation || 'partner_original_plus'; $('increment').value = a.increment || 10; $('fixedValue').value = a.fixedValue || 90; $('mustBeat').checked = !!a.mustBeatCurrent; $('extraStep').checked = !!a.competitiveExtraStep; $('thinking').checked = !!a.thinking; updateFormVisibility(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function newRule(addDefaultCond = true) { $('form').reset(); $('formTitle').textContent = '➕ إضافة قاعدة'; $('id').value = ''; $('priority').value = 800; $('ruleStatus').value = 'published'; $('conditions').innerHTML = ''; if (addDefaultCond) cond(); $('message').textContent = ''; updateFormVisibility(); }
function applyPreset(presetKey) {
  newRule(false);
  if (presetKey === 'support_j') { $('name').value = 'دعم الشريك (+10) عند V'; $('priority').value = 820; $('explanation').value = 'إذا فتح شريكي 90 وعندي V في لونه، أرفع +10.'; [{ field: 'partnerOriginalBid', operator: 'eq', value: 90 }, { field: 'partnerOwnsOriginalContract', operator: 'eq', value: true }, { field: 'hasJackInPartnerSuit', operator: 'eq', value: true }, { field: 'hasNineInPartnerSuit', operator: 'eq', value: false }].forEach(cond); $('actionType').value = 'bid'; $('suitSource').value = 'partnerOriginalSuit'; $('calculation').value = 'partner_original_plus'; $('increment').value = 10; $('mustBeat').checked = true; $('thinking').checked = false; }
  else if (presetKey === 'support_j9') { $('name').value = 'دعم الشريك (+20) عند V+9'; $('priority').value = 920; $('explanation').value = 'إذا فتح شريكي 90 وعندي V+9 في لونه، أرفع +20.'; [{ field: 'partnerOriginalBid', operator: 'eq', value: 90 }, { field: 'partnerOwnsOriginalContract', operator: 'eq', value: true }, { field: 'hasJackInPartnerSuit', operator: 'eq', value: true }, { field: 'hasNineInPartnerSuit', operator: 'eq', value: true }].forEach(cond); $('actionType').value = 'bid'; $('suitSource').value = 'partnerOriginalSuit'; $('calculation').value = 'partner_original_plus'; $('increment').value = 20; $('mustBeat').checked = true; $('extraStep').checked = true; }
  else if (presetKey === 'tiktak_2small') { $('name').value = 'Tik-Tak ثم Pass (ورقتان صغيرتان)'; $('priority').value = 700; $('explanation').value = 'إشارة تونسية: 2 كوارط صغيرة في لون الشريك.'; [{ field: 'partnerOriginalBid', operator: 'eq', value: 90 }, { field: 'partnerOwnsOriginalContract', operator: 'eq', value: true }, { field: 'partnerSuitCount', operator: 'eq', value: 2 }, { field: 'hasJackInPartnerSuit', operator: 'eq', value: false }, { field: 'hasNineInPartnerSuit', operator: 'eq', value: false }].forEach(cond); $('actionType').value = 'pass'; $('thinking').checked = true; }
  else if (presetKey === 'contre_opp') { $('name').value = 'كونتري على الخصم'; $('priority').value = 880; $('explanation').value = 'عندما يتدخل الخصم بعقد 110+ وعندي آسين جانبيين.'; [{ field: 'opponentIntervened', operator: 'eq', value: true }, { field: 'currentContractValue', operator: 'gte', value: 110 }, { field: 'sideAceCount', operator: 'gte', value: 2 }].forEach(cond); $('actionType').value = 'contre'; $('thinking').checked = false; }
  updateFormVisibility(); showMsg('✨ تم الملء!', false);
}
function showMsg(txt, isError = false) { $('message').textContent = txt; $('message').className = isError ? 'error' : 'ok'; }
$('addCondition').onclick = () => cond(); $('newRule').onclick = () => newRule(true); $('reload').onclick = () => load().catch(e => showMsg(e.message, true));
$('actionType').onchange = updateFormVisibility; $('calculation').onchange = updateFormVisibility; $('suitSource').onchange = updateArabicPreview;
$('increment').oninput = updateArabicPreview; $('fixedValue').oninput = updateArabicPreview; $('mustBeat').onchange = updateArabicPreview; $('extraStep').onchange = updateArabicPreview; $('thinking').onchange = updateArabicPreview;
document.querySelectorAll('[data-preset]').forEach(btn => { btn.onclick = () => applyPreset(btn.dataset.preset); });
$('login').onclick = () => { pass = $('pass').value.trim(); load().then(() => { $('status').textContent = '✅ متصل'; $('status').className = 'ok'; }).catch(e => showMsg('خطأ: ' + e.message, true)); };
$('form').onsubmit = async e => { e.preventDefault(); try { const p = payload(); const url = p.id ? '/api/admin/bot-rules/' + p.id : '/api/admin/bot-rules'; const j = await api(url, { method: p.id ? 'PUT' : 'POST', body: JSON.stringify(p) }); showMsg('✅ تم الحفظ: ' + j.rule.name, false); edit(j.rule); load(); } catch (x) { showMsg('⚠️ خطأ: ' + x.message, true); } };
newRule(true);
load().then(() => { $('status').textContent = '✅ متصل تلقائياً'; $('status').className = 'ok'; }).catch(() => {});

// ===== Learning System Functions =====
const viewStatsBtn = document.getElementById('viewStats');
if (viewStatsBtn) {
  viewStatsBtn.onclick = async () => {
    try {
      const response = await fetch('/api/admin/learning-stats', { headers: { 'x-admin-passcode': pass } });
      const result = await response.json();
      if (result.ok) {
        const s = result.stats; const c = result.config; const box = document.getElementById('learningStatsBox');
        box.style.display = 'block';
        box.innerHTML = `
          <h3 style="color:#0891b2; margin:0 0 10px;">🧠 إحصائيات نظام التعلم الاحترافي</h3>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px;">
            <div style="background:#fff; padding:10px; border-radius:8px; border:1px solid #cbd5e1;"><div style="color:#64748b; font-size:0.85rem;">المباريات المسجلة</div><div style="font-size:1.5rem; font-weight:900; color:#0891b2;">${s.totalMatches}</div></div>
            <div style="background:#fff; padding:10px; border-radius:8px; border:1px solid #cbd5e1;"><div style="color:#64748b; font-size:0.85rem;">القرارات المحللة</div><div style="font-size:1.5rem; font-weight:900; color:#0891b2;">${s.totalDecisions}</div></div>
            <div style="background:#fff; padding:10px; border-radius:8px; border:1px solid #cbd5e1;"><div style="color:#64748b; font-size:0.85rem;">متوسط جودة القرارات</div><div style="font-size:1.5rem; font-weight:900; color:#16a34a;">${s.avgQuality}/100</div></div>
            <div style="background:#fff; padding:10px; border-radius:8px; border:1px solid #cbd5e1;"><div style="color:#64748b; font-size:0.85rem;">دورات التعلم</div><div style="font-size:1.5rem; font-weight:900; color:#7c3aed;">${c.totalLearningRuns || 0}</div></div>
          </div>
          <div style="margin-top:12px; background:#fff; padding:10px; border-radius:8px; border:1px solid #cbd5e1;">
            <b>توزيع جودة القرارات:</b><br>🏆 ممتاز: <b>${s.qualityDistribution.excellent}</b> | ✅ جيد: <b>${s.qualityDistribution.good}</b> | ⚠️ متوسط: <b>${s.qualityDistribution.mediocre}</b> | ❌ سيء: <b>${s.qualityDistribution.bad}</b>
          </div>
          <div style="margin-top:8px; font-size:0.85rem; color:#64748b;">آخر تشغيل: ${c.lastLearningRun ? new Date(c.lastLearningRun).toLocaleString('ar-TN') : 'لم يُشغّل بعد'}</div>
        `;
      }
    } catch (err) { showMsg('❌ خطأ: ' + err.message, true); }
  };
}
const runLearningBtn = document.getElementById('runLearning');
if (runLearningBtn) {
  runLearningBtn.onclick = async () => {
    try {
      runLearningBtn.disabled = true; runLearningBtn.textContent = '🧠 جاري التعلم...';
      const response = await fetch('/api/admin/run-learning', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-passcode': pass } });
      const result = await response.json();
      if (result.success) { showMsg(`✅ تم التعلم بنجاح!\n• الأنماط المستخرجة: ${result.patternsExtracted}\n• القواعد المولدة: ${result.rulesGenerated}\n• القواعد المضافة: ${result.rulesAdded}\n• القواعد المحذوفة: ${result.rulesRemoved}`, false); load(); }
      else { showMsg(`⚠️ ${result.message || 'فشل التعلم'}`, true); }
      runLearningBtn.disabled = false; runLearningBtn.textContent = '🧠 تشغيل التعلم الآن';
    } catch (err) { showMsg('❌ خطأ: ' + err.message, true); runLearningBtn.disabled = false; runLearningBtn.textContent = '🧠 تشغيل التعلم الآن'; }
  };
}
})();