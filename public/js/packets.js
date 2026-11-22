/* ==========================================
3. PACKET HANDLER v53 (GAME STATE + PTT VOICE)
✅ دخول أوتوماتيكي من لينك المشاركة بعد الاتصال
✅ v53: مزامنة myPlayerId مع معرف المحفظة (U-XXX) من التوكن — يصلح عطب "المولى ما ينجمش يعمل شيء"
========================================== */
const activeVoiceTimers = {};
function markSeatSpeaking(seat, speaking) {
  if (!currentRoomState) return;
  const mySeat = currentRoomState.mySeat >= 0 ? currentRoomState.mySeat : 0;
  const pos = getRelativePosition(seat, mySeat);
  const slotEl = document.getElementById('slot' + pos);
  const speechEl = document.getElementById('speech' + pos);
  if (!slotEl) return;
  if (activeVoiceTimers[seat]) { clearTimeout(activeVoiceTimers[seat]); delete activeVoiceTimers[seat]; }
  if (speaking) {
    slotEl.classList.add('speaking-voice');
    if (speechEl) { speechEl.textContent = '🎙️ يتكلّم...'; speechEl.className = 'player-speech-bubble show speaking'; }
    activeVoiceTimers[seat] = setTimeout(() => markSeatSpeaking(seat, false), 4000);
  } else {
    slotEl.classList.remove('speaking-voice');
    renderGameTable(currentRoomState);
  }
}
/* ✅ v53: استخراج معرف المحفظة من التوكن ومزامنة myPlayerId */
function syncMyPlayerIdFromToken(room) {
  try {
    var tk = localStorage.getItem('beloteToken');
    if (!tk) return;
    var uid = String(tk).split('.')[0];
    if (!uid) return;
    if (room && room.seats && typeof room.mySeat === 'number' && room.mySeat >= 0) {
      var seatObj = room.seats[room.mySeat];
      if (seatObj && seatObj.id === uid && myPlayerId !== uid) {
        myPlayerId = uid;
        try { localStorage.setItem('belote_player_id', uid); } catch (e) {}
      }
    } else if (myPlayerId !== uid && window.__economyState && window.__economyState.wallet && window.__economyState.wallet.id === uid) {
      myPlayerId = uid;
      try { localStorage.setItem('belote_player_id', uid); } catch (e) {}
    }
  } catch (e) {}
}
function handleServerPacket(data) {
  if (!data) return;
  switch (data.type) {
    case 'auth_ok':
      myPlayerId = data.playerId;
      try { localStorage.setItem('belote_player_id', myPlayerId); } catch (e) {}
      isAdmin = !!data.isAdmin;
      lobbyRooms = data.rooms || [];
      renderLobbyRooms();
      if (pendingJoinRoom) {
        const code = pendingJoinRoom;
        pendingJoinRoom = null;
        try { window.history.replaceState(null, '', window.location.pathname); } catch (e) {}
        showToast('🔗 جاري الدخول للطاولة من اللينك: ' + code);
        setTimeout(() => sendPacket({ type: 'join_room', roomId: code, playerName: myPlayerName }), 250);
      }
      break;
    case 'name_updated':
      myPlayerName = data.name;
      showToast('✅ تم حفظ اسمك: ' + myPlayerName);
      break;
    case 'admin_status':
      isAdmin = !!data.isAdmin;
      var asl = document.getElementById('adminStatusLabel');
      if (asl) asl.textContent = data.msg || 'الأدمن مفعل';
      showToast('🛡️ ' + data.msg);
      renderLobbyRooms();
      break;
    case 'lobby_update':
      lobbyRooms = data.rooms || [];
      renderLobbyRooms();
      break;
    case 'room_state':
      currentRoomState = data.room;
      selectedSwapSeat = null;
      syncMyPlayerIdFromToken(data.room);   /* ✅ الإصلاح */
      showGameTableUI();
      renderGameTable(currentRoomState);
      if (typeof updateWaitingShareRow === 'function') updateWaitingShareRow(currentRoomState);
      break;
    case 'voice_state':
      markSeatSpeaking(data.seat, !!data.speaking);
      break;
    case 'voice_ptt':
      markSeatSpeaking(data.seat, true);
      playIncomingVoicePacket(data);
      break;
    case 'room_closed':
      currentRoomState = null;
      showToast('ℹ️ ' + (data.msg || 'أغلقت الغرفة'));
      showLobbyUI();
      break;
    case 'left_room':
      currentRoomState = null;
      showLobbyUI();
      break;
    case 'error_msg':
      showToast('⚠️ ' + data.msg);
      break;
  }
}