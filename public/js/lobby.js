/* ==========================================
4. LOBBY & TABLE ACTIONS
✅ لعب فوري + لينكات مشاركة ذكية + طاولات مفتوحة/مغلقة
========================================== */
function savePlayerName(silent = false) {
  const val = document.getElementById('playerNameInput').value.trim();
  if (!val) { showToast('⚠️ اكتب اسمك قبل باش تحفظو'); return; }
  myPlayerName = val;
  try { localStorage.setItem('belote_player_name', myPlayerName); } catch (e) {}
  if (!silent) showToast('✅ تثبّت اسمك: ' + myPlayerName);
  sendPacket({ type: 'set_name', name: myPlayerName, silent: true });
}
function toggleAdminPanel() {
  const panel = document.getElementById('adminLoginPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}
function submitAdminLogin() {
  const passcode = document.getElementById('adminPassInput').value.trim();
  // The server alone decides whether this session is an administrator.
  sendPacket({ type: 'admin_login', passcode });
}
function createRoom() {
  if (isMobileOrTabletDevice()) enterImmersiveLandscape(true);
  const nameVal = document.getElementById('playerNameInput').value.trim();
  if (nameVal) { myPlayerName = nameVal; try { localStorage.setItem('belote_player_name', myPlayerName); } catch (e) {} }
  const roomName = document.getElementById('newRoomName').value.trim() || `طاولة ${myPlayerName}`;
  const targetScore = Number(document.getElementById('newRoomScore').value) || 2000;
  const isPrivate = !!(document.getElementById('newRoomPrivate') && document.getElementById('newRoomPrivate').checked);
  sendPacket({ type: 'create_room', playerName: myPlayerName, roomName, targetScore, isPrivate });
}
function joinRoom(roomId) {
  if (isMobileOrTabletDevice()) enterImmersiveLandscape(true);
  const nameVal = document.getElementById('playerNameInput').value.trim();
  if (nameVal) { myPlayerName = nameVal; try { localStorage.setItem('belote_player_name', myPlayerName); } catch (e) {} }
  sendPacket({ type: 'join_room', roomId, playerName: myPlayerName });
}
function quickJoinTable() {
  if (isOfflineDemo) { showToast('⚠️ اللعب الفوري يحتاج اتصال بالسيرفر.'); return; }
  if (isMobileOrTabletDevice()) enterImmersiveLandscape(true);
  sendPacket({ type: 'quick_join', playerName: myPlayerName });
}
function getRoomShareLink(code) {
  return `${window.location.origin}/?room=${encodeURIComponent(code)}`;
}
async function shareRoomLink(code) {
  const link = getRoomShareLink(code);
  const roomName = currentRoomState ? currentRoomState.name : 'طاولة بلوت';
  const text = `🃏 انضم ليا في طاولة البلوت التونسي "${roomName}"!\n${link}`;
  if (navigator.share) {
    try { await navigator.share({ title: 'بلوت تونسي', text, url: link }); return; } catch (e) {}
  }
  try { await navigator.clipboard.writeText(text); showToast('📋 تم نسخ لينك الدعوة!'); }
  catch (e) { showToast(link); }
}
function copyRoomCode(code) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => showToast('📋 تم نسخ الكود: ' + code)).catch(() => showToast('الكود: ' + code));
  } else showToast('الكود: ' + code);
}
function hostTogglePrivacy() {
  if (isOfflineDemo) { showToast('⚠️ موش متاح في وضع offline'); return; }
  sendPacket({ type: 'host_toggle_privacy' });
}
function updateWaitingShareRow(room) {
  const row = document.getElementById('hostShareRow');
  if (!row) return;
  if (!room || room.status !== 'waiting') { row.innerHTML = ''; return; }
  const isHost = (room.hostId === myPlayerId);
  row.innerHTML = `
    <button type="button" class="btn btn-blue" style="flex:1;min-width:110px;font-size:0.78rem;" onclick="shareRoomLink('${room.id}')">📤 شارك اللينك</button>
    <button type="button" class="btn btn-dark" style="flex:1;min-width:90px;font-size:0.78rem;" onclick="copyRoomCode('${room.id}')">📋 ${room.id}</button>
    ${isHost ? `<button type="button" class="btn ${room.isPrivate ? 'btn-red' : 'btn-green'}" style="flex:1;min-width:120px;font-size:0.78rem;" onclick="hostTogglePrivacy()">${room.isPrivate ? '🔒 مغلقة (لينك فقط)' : '🔓 مفتوحة (للجميع)'}</button>` : ''}`;
}
function deleteRoom(roomId) { sendPacket({ type: 'delete_room', roomId }); }
function leaveCurrentRoom() { sendPacket({ type: 'leave_room' }); showLobbyUI(); }
function showGameTableUI() {
  document.getElementById('lobbyView').style.display = 'none';
  document.getElementById('gameView').style.display = 'block';
  if (isMobileOrTabletDevice() && window.innerHeight > window.innerWidth) {
    try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) {}
  }
}
function showLobbyUI() {
  document.getElementById('gameView').style.display = 'none';
  document.getElementById('lobbyView').style.display = 'flex';
  renderLobbyRooms();
}
function togglePointsTableModal() {
  const modal = document.getElementById('pointsRefModal');
  modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
}
function toggleScorePaperModal() {
  const modal = document.getElementById('scorePaperModal');
  modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
}
function sendThinkingSignal() { sendPacket({ type: 'player_thinking' }); }
function toggleBeloteAnnouncement() { sendPacket({ type: 'arm_belote' }); }
/* ✅ حقن ذكي للعناصر الجديدة بدون تعديل index.html */
function injectLobbyExtras() {
  const headerRow = document.querySelector('.lobby-header .row');
  if (headerRow && !document.getElementById('quickJoinBtn')) {
    const b = document.createElement('button');
    b.type = 'button'; b.id = 'quickJoinBtn'; b.className = 'btn btn-green';
    b.innerHTML = '⚡ العب مباشرة'; b.onclick = quickJoinTable;
    headerRow.insertBefore(b, headerRow.firstChild);
  }
  const createPanel = document.querySelector('.lobby-controls .panel-card');
  if (createPanel && !document.getElementById('newRoomPrivateWrap')) {
    const wrap = document.createElement('label');
    wrap.id = 'newRoomPrivateWrap';
    wrap.style.cssText = 'display:flex;gap:8px;align-items:center;margin-top:8px;font-size:0.85rem;color:#fde047;font-weight:700;cursor:pointer;';
    wrap.innerHTML = '<input type="checkbox" id="newRoomPrivate" style="width:18px;height:18px;cursor:pointer;"> 🔒 طاولة مغلقة (الدخول كان باللينك/الكود)';
    createPanel.appendChild(wrap);
  }
  const waitBox = document.getElementById('waitingOverlay');
  if (waitBox && !document.getElementById('hostShareRow')) {
    const row = document.createElement('div');
    row.id = 'hostShareRow'; row.className = 'row';
    row.style.cssText = 'justify-content:center;margin-top:8px;';
    const acts = document.getElementById('hostActionButtons');
    if (acts) waitBox.insertBefore(row, acts); else waitBox.appendChild(row);
  }
}
function renderLobbyRooms() {
  const container = document.getElementById('roomsListContainer');
  const countSpan = document.getElementById('roomsCountSpan');
  const query = (document.getElementById('searchRoomInput')?.value || '').trim().toLowerCase();
  const filtered = (lobbyRooms || []).filter(r => {
    if (!query) return true;
    return ((r.name && r.name.toLowerCase().includes(query)) || (r.id && r.id.toLowerCase().includes(query)) || (r.hostName && r.hostName.toLowerCase().includes(query)));
  });
  countSpan.textContent = filtered.length;
  if (filtered.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 24px; color:#cbd5e1;">ما فمّاش طاولات محلولة توّة. اضغط <b>⚡ العب مباشرة</b> وإلا <b>(اعمل الطاولة)</b> وابدا اللعب في الحين!</div>`;
    return;
  }
  container.innerHTML = filtered.map(r => {
    const canJoin = r.status === 'waiting' && r.playerCount < 4;
    const statusBadge = r.isPrivate
      ? `<span style="color:#f87171; font-size:0.78rem;">🔒 مغلقة (لينك/كود)</span>`
      : (r.status === 'waiting'
        ? `<span style="color:#4ade80; font-size:0.78rem;">🟢 مفتوحة - تستنى (${r.playerCount}/4)</span>`
        : `<span style="color:#facc15; font-size:0.78rem;">🔥 قاعدين يلعبو (${r.playerCount}/4)</span>`);
    const seatsHtml = [0, 1, 2, 3].map(idx => {
      const p = r.players && r.players[idx];
      const teamClass = (idx % 2 === 0) ? 'team1' : 'team2';
      return `<div class="seat-chip ${teamClass}">${p ? `👤 ${escapeHtml(p.name)}` : 'بلاصة فارغة'}</div>`;
    }).join('');
    return `
<div class="room-item">
<div class="room-item-top">
<span class="room-title">${escapeHtml(r.name)}</span>
<span class="room-id-tag">${escapeHtml(r.id)}</span>
</div>
<div style="display:flex; justify-content:space-between; align-items:center;">
${statusBadge}
<span style="font-size:0.76rem; color:#cbd5e1;">الماتش على: ${r.targetScore}</span>
</div>
<div class="room-seats-preview">${seatsHtml}</div>
<div style="display:flex; gap:8px; margin-top:4px;">
${canJoin ? `<button type="button" class="btn btn-green" style="flex:1;" onclick="joinRoom('${r.id}')">ادخل للطاولة</button>` : `<button type="button" class="btn btn-dark" style="flex:1; opacity:0.6;" disabled>كاملة / بدات</button>`}
${isAdmin ? `<button type="button" class="btn btn-red" onclick="deleteRoom('${r.id}')" title="فسّخ الطاولة (أدمن)">🗑️</button>` : ''}
</div>
</div>`;
  }).join('');
}
injectLobbyExtras();