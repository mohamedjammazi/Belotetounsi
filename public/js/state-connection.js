/* ==========================================
1. CLIENT STATE & DUAL TRANSPORT v54 (WS + HTTP + LOCAL)
✅ القيم الرسمية الموحّدة (تونس = فرنسا في البلوت: نفس الترتيب ونفس النقاط)
✅ showToast(msg, bad) بألوان الخطأ
✅ escapeHtml احتياطية (ما نعيشوش على actions.js)
✅ الآص = 1 مثل الورق الحقيقي + دخول أوتوماتيكي من ?room= أو ?join=
========================================== */
'use strict';

/* ===== الثوابت الرسمية للبلوت التونسي/الفرنسي (مطابقة لـ src/game/rules في السيرفر) ===== */
const SUIT_SYMBOLS = { spades: '♠', hearts: '♥', clubs: '♣', diamonds: '♦' };
const SUIT_NAMES_AR = { spades: 'سباطة ♠', hearts: 'كوب ♥', clubs: 'فلوس ♣', diamonds: 'ديناري ♦' };
const DISPLAY_RANKS = { '7': '7', '8': '8', '9': '9', '10': '10', 'J': 'V', 'Q': 'D', 'K': 'R', 'A': '1' };
/* نقاط الحساب (POINTS): الجـ V=20 والـ 9=14 في الأتو */
const POINTS_TRUMP = { 'J': 20, '9': 14, 'A': 11, '10': 10, 'K': 4, 'Q': 3, '8': 0, '7': 0 };
const POINTS_NORMAL = { 'A': 11, '10': 10, 'K': 4, 'Q': 3, 'J': 2, '9': 0, '8': 0, '7': 0 };
/* قوة الترتيب (POWER): من يفوز بالطشّة — في الأتو: J > 9 > A > 10 > K > Q > 8 > 7 */
const POWER_TRUMP = { '7': 1, '8': 2, 'Q': 3, 'K': 4, '10': 5, 'A': 6, '9': 7, 'J': 8 };
/* في العادي: A > 10 > K > Q > J > 9 > 8 > 7 */
const POWER_NORMAL = { '7': 1, '8': 2, '9': 3, 'J': 4, 'Q': 5, 'K': 6, '10': 7, 'A': 8 };
const VALID_BID_VALUES = [90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 500];

/* ===== حالة الاتصال ===== */
let ws = null;
let reconnectTimer = null;
let isOfflineDemo = false;
let selectedBidValue = 90;
let lastSeenContractKey = '';
let lastPlayedSoundTs = 0;
let soundMuted = false;
let audioCtx = null;
let clockTickInterval = null;
let myPlayerId = 'P-' + Math.random().toString(36).substring(2, 9);
let myPlayerName = 'لاعب_' + Math.floor(100 + Math.random() * 899);
let pendingJoinRoom = null;
try {
  const urlParams = new URLSearchParams(window.location.search);
  pendingJoinRoom = ((urlParams.get('room') || urlParams.get('join') || '')).trim().toUpperCase() || null;
} catch (e) {}
try {
  if (localStorage.getItem('belote_player_id')) myPlayerId = localStorage.getItem('belote_player_id');
  else localStorage.setItem('belote_player_id', myPlayerId);
  const savedName = localStorage.getItem('belote_player_name') || localStorage.getItem('belotePlayerName');
  if (savedName) myPlayerName = savedName;
} catch (e) {}
const nameInputEl = document.getElementById('playerNameInput');
if (nameInputEl) nameInputEl.value = myPlayerName;
let isAdmin = false;
let lobbyRooms = [];
let currentRoomState = null;
let selectedSwapSeat = null;

/* ===== ✅ showToast بألوان (msg, bad) ===== */
function showToast(msg, bad) {
  const box = document.getElementById('toastBox');
  if (!box) return;
  const item = document.createElement('div');
  item.className = 'toast-item';
  item.style.cssText = 'background:rgba(6,26,16,.97);border:1.5px solid ' + (bad ? '#ff5a5a' : '#e6b455') +
    ';color:#fff;padding:10px 18px;border-radius:999px;font-size:.84rem;font-weight:900;' +
    'box-shadow:0 8px 24px rgba(0,0,0,.6);max-width:92vw';
  item.textContent = msg;
  box.appendChild(item);
  setTimeout(() => item.remove(), 3400);
}

/* ===== ✅ escapeHtml احتياطية (إذا actions.js ما تحملش) ===== */
if (typeof window.escapeHtml !== 'function') {
  window.escapeHtml = function (str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  };
}
function escapeHtmlLocal(str) { return window.escapeHtml(str); }

/* ===== الاتصال ===== */
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const badge = document.getElementById('connStatusBadge');
  if (!host) { enableOfflineDemoMode(); return; }
  try { ws = new WebSocket(`${protocol}//${host}`); } catch (err) { enableOfflineDemoMode(); return; }
  ws.onopen = () => {
    isOfflineDemo = false;
    if (badge) { badge.textContent = 'متصل بالسيرفر 🟢'; badge.classList.remove('offline'); }
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws.send(JSON.stringify({ type: 'auth', playerId: myPlayerId, name: myPlayerName, token: localStorage.getItem('beloteToken') || undefined }));
  };
  ws.onmessage = (event) => {
    try { const data = JSON.parse(event.data); handleServerPacket(data); } catch (e) {}
  };
  ws.onclose = () => {
    if (badge) { badge.textContent = 'جاري إعادة الاتصال بالسيرفر... 🟡'; badge.classList.add('offline'); }
    reconnectTimer = setTimeout(connectWebSocket, 3000);
  };
  ws.onerror = () => {};
}

/* ===== إرسال الرسائل: WS ثم HTTP ثم وضع محلي ===== */
async function sendPacket(payload) {
  payload.playerId = myPlayerId;
  try {
    const tk = localStorage.getItem('beloteToken');
    if (tk && !payload.token) payload.token = tk;
  } catch (e) {}
  if (ws && ws.readyState === WebSocket.OPEN) { isOfflineDemo = false; ws.send(JSON.stringify(payload)); return; }
  try {
    const resp = await fetch('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (resp.ok) {
      isOfflineDemo = false;
      const json = await resp.json();
      if (json && Array.isArray(json.packets)) json.packets.forEach(pkt => handleServerPacket(pkt));
      return;
    }
  } catch (err) {}
  isOfflineDemo = true;
  if (typeof handleLocalDemoPacket === 'function') handleLocalDemoPacket(payload);
}