/* ==========================================
5. BUILT-IN LOCAL TUNISIAN BELOTE ENGINE (NO CARD REVEAL)
✅ كاص مستقل لكل فريق + خطفة 640/2000
========================================== */
function createLocalDeck32() {
  const deck = [];
  for (const suit of ['spades', 'hearts', 'clubs', 'diamonds']) {
    for (const rank of ['7', '8', '9', '10', 'J', 'Q', 'K', 'A']) deck.push({ suit, rank, id: `${rank}_${suit}` });
  }
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return deck;
}
function enableOfflineDemoMode() {
  isOfflineDemo = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  const badge = document.getElementById('connStatusBadge');
  if (badge) { badge.textContent = 'وضع التشغيل المحلي 🟡'; badge.classList.add('offline'); }
  renderLobbyRooms();
}
function applyKassRule(rawPoints) {
  const ones = rawPoints % 10;
  const isKass = (ones >= 5 && ones <= 7);
  return { isKass, effective: isKass ? rawPoints + (10 - ones) : rawPoints, ones };
}
function recordTens(rawPoints) {
  return Math.min(160, Math.round(rawPoints / 10) * 10);
}
function startLocalRound(room, isFirst) {
  const deck = createLocalDeck32();
  room.hands = { 0: deck.slice(0, 8), 1: deck.slice(8, 16), 2: deck.slice(16, 24), 3: deck.slice(24, 32) };
  const mySeat = room.mySeat >= 0 ? room.mySeat : 0;
  room.myHand = room.hands[mySeat];
  room.cardCounts = { 0: 8, 1: 8, 2: 8, 3: 8 };
  room.firstPlayerSeat = isFirst ? Math.floor(Math.random() * 4) : ((room.firstPlayerSeat + 1) % 4);
  room.dealerSeat = (room.firstPlayerSeat + 3) % 4;
  room.turnSeat = room.firstPlayerSeat;
  room.status = 'bidding'; room.currentContract = null;
  room.lastActionBySeat = { 0: '', 1: '', 2: '', 3: '' };
  room.thinkingSeat = null; room.passCount = 0; room.trumpSuit = null;
  room.takerSeat = null; room.takerTeam = null; room.currentTrick = [];
  room.roundCardPoints = { team1: 0, team2: 0 }; room.farchaPoints = { team1: 0, team2: 0 };
  room.roundPoints = { team1: 0, team2: 0 }; room.beloteBonus = { team1: 0, team2: 0 };
  room.tricksWon = { team1: 0, team2: 0 }; room.beloteHolders = {}; room.beloteInfo = null;
  room.validCardIds = []; room.lastSoundEvent = { type: 'deal', ts: Date.now() };
  scheduleLocalBotIfNeeded(room);
}
function getLocalValidCards(room, seat) {
  const hand = room.hands[seat] || [];
  if (room.currentTrick.length === 0) return hand.map(c => c.id);
  const ledSuit = room.currentTrick[0].card.suit;
  const sameSuit = hand.filter(c => c.suit === ledSuit);
  if (sameSuit.length > 0) return sameSuit.map(c => c.id);
  const myTrumps = hand.filter(c => c.suit === room.trumpSuit);
  if (myTrumps.length > 0) return myTrumps.map(c => c.id);
  return hand.map(c => c.id);
}
function finalizeLocal(r, mySeat) {
  r.status = 'playing';
  r.trumpSuit = r.currentContract.suit;
  r.takerSeat = r.currentContract.seat;
  r.takerTeam = r.currentContract.team;
  r.turnSeat = r.firstPlayerSeat;
  for (let s = 0; s < 4; s++) {
    const hasK = r.hands[s].some(c => c.suit === r.trumpSuit && c.rank === 'K');
    const hasQ = r.hands[s].some(c => c.suit === r.trumpSuit && c.rank === 'Q');
    if (hasK && hasQ) r.beloteHolders[s] = { armed: !!(r.seats[s] && r.seats[s].isBot), declaredFirst: false, cardsPlayed: 0 };
  }
  r.beloteInfo = r.beloteHolders[mySeat] ? { canArm: true, armed: r.beloteHolders[mySeat].armed, seat: mySeat } : null;
  r.validCardIds = (r.turnSeat === mySeat) ? getLocalValidCards(r, mySeat) : [];
}
function scheduleLocalBotIfNeeded(room) {
  if (!room || room.turnSeat < 0 || room.turnSeat > 3) return;
  const seatPlayer = room.seats[room.turnSeat];
  if (!seatPlayer || !seatPlayer.isBot) return;
  setTimeout(() => {
    if (room.status === 'bidding') {
      if (room.currentContract && room.currentContract.multiplier >= 2) { processLocalBid(room, room.turnSeat, 'pass', null, null); return; }
      if (!room.currentContract && Math.random() < 0.45) {
        const suits = ['spades', 'hearts', 'clubs', 'diamonds'];
        processLocalBid(room, room.turnSeat, 'bid', suits[Math.floor(Math.random() * suits.length)], 90);
      } else processLocalBid(room, room.turnSeat, 'pass', null, null);
    } else if (room.status === 'playing') {
      const valid = getLocalValidCards(room, room.turnSeat);
      if (valid.length > 0) processLocalPlayCard(room, room.turnSeat, valid[0]);
    }
  }, 750);
}
function processLocalBid(r, seat, action, suit, value) {
  const mySeat = r.mySeat >= 0 ? r.mySeat : 0;
  const seatTeam = (seat % 2 === 0) ? 1 : 2;
  r.thinkingSeat = null;
  if (action === 'pass') {
    r.passCount = (r.passCount || 0) + 1;
    r.lastActionBySeat[seat] = 'باس (Pass)';
    r.lastSoundEvent = { type: 'pass', ts: Date.now() };
    if (!r.currentContract && r.passCount >= 4) { startLocalRound(r, false); renderGameTable(r); return; }
    else if (r.currentContract && r.passCount >= 3) { finalizeLocal(r, mySeat); }
    else r.turnSeat = (r.turnSeat + 1) % 4;
  } else if (action === 'bid') {
    if (r.currentContract && r.currentContract.multiplier >= 2) { showToast('⚠️ العقد مقفول بالكونتري!'); return; }
    const val = Number(value) || 90;
    if (r.currentContract && val <= r.currentContract.value) { showToast(`⚠️ يجب المزايدة برقم أعلى من ${r.currentContract.value}`); return; }
    let mult = 1, sameSuitMode = null;
    if (r.currentContract && r.currentContract.team !== seatTeam && r.currentContract.suit === suit && val < 500) {
      const diff = val - r.currentContract.value;
      if (diff === 10) { sameSuitMode = 'khatafa_double'; }
      else if (diff >= 20) { sameSuitMode = 'khatafa_finish'; }
    }
    r.currentContract = { value: val, suit, seat, team: seatTeam, multiplier: mult, sameSuitMode };
    r.lastActionBySeat[seat] = `${val === 500 ? 'كبوت' : val} ${SUIT_SYMBOLS[suit]}${sameSuitMode === 'khatafa_finish' ? ' (خطفة 2000🏆)' : sameSuitMode === 'khatafa_double' ? ' (خطفة 640⚡)' : ''}`;
    r.lastSoundEvent = { type: sameSuitMode ? 'surcontre' : 'bid', ts: Date.now() };
    r.passCount = 0;
    if (sameSuitMode === 'khatafa_finish') { finalizeLocal(r, mySeat); renderGameTable(r); return; }
    r.turnSeat = (r.turnSeat + 1) % 4;
  } else if (action === 'contre' && r.currentContract && r.currentContract.multiplier === 1 && !r.currentContract.sameSuitMode && r.currentContract.team !== seatTeam) {
    r.currentContract.multiplier = 2;
    r.lastActionBySeat[seat] = '🔥 Contré (320)';
    r.lastSoundEvent = { type: 'contre', ts: Date.now() };
    r.passCount = 0; r.turnSeat = (r.turnSeat + 1) % 4;
  } else if (action === 'surcontre' && r.currentContract && r.currentContract.multiplier === 2 && r.currentContract.team === seatTeam) {
    r.currentContract.multiplier = 4;
    r.lastActionBySeat[seat] = '⚡ Surcontré (640)';
    r.lastSoundEvent = { type: 'surcontre', ts: Date.now() };
    finalizeLocal(r, mySeat);
  }
  renderGameTable(r);
  scheduleLocalBotIfNeeded(r);
}
function processLocalPlayCard(r, seat, cardId) {
  if (seat !== r.turnSeat) return;
  const mySeat = r.mySeat >= 0 ? r.mySeat : 0;
  const hand = r.hands[seat];
  const idx = hand.findIndex(c => c.id === cardId);
  if (idx === -1) return;
  const [played] = hand.splice(idx, 1);
  r.cardCounts[seat] = hand.length;
  r.myHand = r.hands[mySeat];
  r.currentTrick.push({ seat, card: played });
  r.lastSoundEvent = { type: 'card_play', ts: Date.now() };
  if (r.beloteHolders[seat] && played.suit === r.trumpSuit && (played.rank === 'K' || played.rank === 'Q')) {
    const holder = r.beloteHolders[seat];
    const tKey = (seat % 2 === 0) ? 'team1' : 'team2';
    holder.cardsPlayed++;
    if (holder.cardsPlayed === 1 && holder.armed) { holder.declaredFirst = true; r.beloteBonus[tKey] = 20; const w = played.rank === 'Q' ? 'Belote' : 'Rebelote'; r.lastActionBySeat[seat] = `📢 ${w}!`; r.lastSoundEvent = { type: 'belote', word: w, ts: Date.now() }; }
    else if (holder.cardsPlayed === 2 && holder.declaredFirst) { const w = played.rank === 'Q' ? 'Belote' : 'Rebelote'; r.lastActionBySeat[seat] = `📢 ${w}! (+20)`; r.lastSoundEvent = { type: 'belote', word: w, ts: Date.now() }; }
  }
  if (r.currentTrick.length < 4) {
    r.turnSeat = (r.turnSeat + 1) % 4;
    r.beloteInfo = (r.beloteHolders[mySeat] && r.beloteHolders[mySeat].cardsPlayed === 0) ? { canArm: true, armed: r.beloteHolders[mySeat].armed, seat: mySeat } : null;
    r.validCardIds = (r.turnSeat === mySeat) ? getLocalValidCards(r, mySeat) : [];
    renderGameTable(r);
    scheduleLocalBotIfNeeded(r);
  } else {
    r.turnSeat = -1;
    renderGameTable(r);
    setTimeout(() => {
      let best = r.currentTrick[0];
      const ledSuit = best.card.suit;
      for (let i = 1; i < 4; i++) {
        const cand = r.currentTrick[i];
        if (cand.card.suit === r.trumpSuit && best.card.suit !== r.trumpSuit) best = cand;
        else if (cand.card.suit === r.trumpSuit && best.card.suit === r.trumpSuit && POWER_TRUMP[cand.card.rank] > POWER_TRUMP[best.card.rank]) best = cand;
        else if (cand.card.suit === ledSuit && best.card.suit === ledSuit && POWER_NORMAL[cand.card.rank] > POWER_NORMAL[best.card.rank]) best = cand;
      }
      const winTeam = (best.seat % 2 === 0) ? 1 : 2;
      const tKey = winTeam === 1 ? 'team1' : 'team2';
      let pts = 0;
      r.currentTrick.forEach(p => { pts += (p.card.suit === r.trumpSuit) ? POINTS_TRUMP[p.card.rank] : POINTS_NORMAL[p.card.rank]; });
      r.roundCardPoints[tKey] += pts;
      const isLast = r.hands[0].length === 0;
      if (isLast) r.farchaPoints[tKey] = 10;
      r.roundPoints[tKey] += pts + (isLast ? 10 : 0);
      r.tricksWon[tKey] += 1;
      r.currentTrick = [];
      if (isLast) {
        const cVal = r.currentContract.value;
        const mult = r.currentContract.multiplier;
        const sameSuitMode = r.currentContract.sameSuitMode;
        const takerKey = r.takerTeam === 1 ? 'team1' : 'team2';
        const totalBelote = r.beloteBonus.team1 + r.beloteBonus.team2;
        const rawTakerPts = r.roundPoints[takerKey] + r.beloteBonus[takerKey];
        const kass = applyKassRule(rawTakerPts);
        const ok = cVal === 500 ? (r.tricksWon[takerKey] === 8) : (kass.effective >= cVal);
        const recT1 = recordTens(r.roundPoints.team1);
        const recT2 = recordTens(r.roundPoints.team2);
        const kassT1 = applyKassRule(r.roundPoints.team1).isKass;
        const kassT2 = applyKassRule(r.roundPoints.team2).isKass;
        const isTeam1Capot = (r.tricksWon.team1 === 8);
        const isTeam2Capot = (r.tricksWon.team2 === 8);
        let f1 = 0, f2 = 0;
        if (sameSuitMode === 'khatafa_finish' || sameSuitMode === 'khatafa_double') {
          const stake = sameSuitMode === 'khatafa_finish' ? 2000 : 640;
          if (ok) { if (r.takerTeam === 1) f1 = stake + totalBelote; else f2 = stake + totalBelote; }
          else { if (r.takerTeam === 1) f2 = stake + totalBelote; else f1 = stake + totalBelote; }
        } else if (sameSuitMode === 'match_2000') {
          if (ok) { if (r.takerTeam === 1) f1 = 2000 + r.beloteBonus.team1; else f2 = 2000 + r.beloteBonus.team2; }
          else { if (r.takerTeam === 1) f2 = 2000 + r.beloteBonus.team2; else f1 = 2000 + r.beloteBonus.team1; }
        } else if ((isTeam1Capot || isTeam2Capot) && mult === 1 && ok) {
          const capotBase = (cVal === 500) ? 500 : 250;
          if (isTeam1Capot) { f1 = capotBase + r.beloteBonus.team1; f2 = r.beloteBonus.team2; }
          else { f2 = capotBase + r.beloteBonus.team2; f1 = r.beloteBonus.team1; }
        } else if (ok) {
          if (mult === 2) { const baseWin = (cVal === 500) ? 1000 : 320; if (r.takerTeam === 1) f1 = baseWin + totalBelote; else f2 = baseWin + totalBelote; }
          else if (mult === 4) { const baseWin = (cVal === 500) ? 2000 : 640; if (r.takerTeam === 1) f1 = baseWin + totalBelote; else f2 = baseWin + totalBelote; }
          else { f1 = recT1 + r.beloteBonus.team1; f2 = recT2 + r.beloteBonus.team2; }
        } else {
          let defBase = 160;
          if (cVal === 500) defBase = 500 * mult;
          else if (mult === 2) defBase = 320;
          else if (mult === 4) defBase = 640;
          else if ((r.takerTeam === 1 && isTeam2Capot) || (r.takerTeam === 2 && isTeam1Capot)) defBase = 250;
          if (r.takerTeam === 1) { if (cVal === 500 && mult === 1) { f1 = r.beloteBonus.team1; f2 = 500 + r.beloteBonus.team2; } else { f1 = 0; f2 = defBase + totalBelote; } }
          else { if (cVal === 500 && mult === 1) { f2 = r.beloteBonus.team2; f1 = 500 + r.beloteBonus.team1; } else { f2 = 0; f1 = defBase + totalBelote; } }
        }
        r.totalScores.team1 += f1; r.totalScores.team2 += f2;
        r.scoreHistory.push({ roundNum: r.scoreHistory.length + 1, contractText: `${cVal === 500 ? 'كابوت' : cVal}${SUIT_SYMBOLS[r.trumpSuit]}${sameSuitMode === 'khatafa_finish' ? ' (خطفة 2000)' : sameSuitMode === 'khatafa_double' ? ' (خطفة 640)' : ''}`, nousRound: f1, vousRound: f2, nousTotal: r.totalScores.team1, vousTotal: r.totalScores.team2 });
        r.lastRoundSummary = {
          contractValue: cVal, multiplier: mult, sameSuitMode, contractSucceeded: ok,
          isCapot: (isTeam1Capot || isTeam2Capot), takerTeam: r.takerTeam,
          rawCardsTeam1: r.roundCardPoints.team1, rawCardsTeam2: r.roundCardPoints.team2,
          farchaTeam1: r.farchaPoints.team1, farchaTeam2: r.farchaPoints.team2,
          beloteTeam1: r.beloteBonus.team1, beloteTeam2: r.beloteBonus.team2,
          rawTakerPts, effectiveTakerPts: kass.effective, isKass: kass.isKass,
          recordedTeam1: recT1, recordedTeam2: recT2, isKassTeam1: kassT1, isKassTeam2: kassT2,
          team1Round: f1, team2Round: f2, totalTeam1: r.totalScores.team1, totalTeam2: r.totalScores.team2
        };
        r.status = (r.totalScores.team1 >= r.targetScore || r.totalScores.team2 >= r.targetScore) ? 'game_over' : 'round_end';
        renderGameTable(r);
      } else {
        r.turnSeat = best.seat;
        r.beloteInfo = (r.beloteHolders[mySeat] && r.beloteHolders[mySeat].cardsPlayed === 0) ? { canArm: true, armed: r.beloteHolders[mySeat].armed, seat: mySeat } : null;
        r.validCardIds = (r.turnSeat === mySeat) ? getLocalValidCards(r, mySeat) : [];
        renderGameTable(r);
        scheduleLocalBotIfNeeded(r);
      }
    }, 850);
  }
}
function handleLocalDemoPacket(payload) {
  if (payload.type === 'create_room' || payload.type === 'join_room') {
    currentRoomState = {
      id: 'RM-' + Math.floor(100 + Math.random() * 899),
      name: payload.roomName || `طاولة ${myPlayerName}`,
      hostId: myPlayerId, targetScore: payload.targetScore || 2000, status: 'waiting',
      seats: [{ id: myPlayerId, name: myPlayerName, isBot: false }, null, null, null],
      mySeat: 0, roundPoints: { team1: 0, team2: 0 }, beloteBonus: { team1: 0, team2: 0 },
      totalScores: { team1: 0, team2: 0 }, scoreHistory: [], lastActionBySeat: { 0: '', 1: '', 2: '', 3: '' },
      chat: [{ sender: 'النظام', text: '🃏 مرحباً بك في طاولة البلوت التونسي (2000 نقطة - عكس عقارب الساعة ↺).', isSystem: true }]
    };
    showGameTableUI(); renderGameTable(currentRoomState);
    if (typeof updateWaitingShareRow === 'function') updateWaitingShareRow(currentRoomState);
    return;
  }
  if (!currentRoomState) return;
  const r = currentRoomState;
  const mySeat = r.mySeat >= 0 ? r.mySeat : 0;
  if (payload.type === 'host_add_bot') { const emptyIdx = r.seats.indexOf(null); if (emptyIdx !== -1) { const bNames = ['بوت سليم', 'بوت حمزة', 'بوت نادر', 'بوت ماهر']; r.seats[emptyIdx] = { id: 'BOT-' + emptyIdx, name: bNames[emptyIdx], isBot: true }; renderGameTable(r); } return; }
  if (payload.type === 'host_randomize_teams') { for (let i = r.seats.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r.seats[i], r.seats[j]] = [r.seats[j], r.seats[i]]; } r.mySeat = r.seats.findIndex(s => s && s.id === myPlayerId); renderGameTable(r); return; }
  if (payload.type === 'host_swap_seats') { const a = Number(payload.seatA), b = Number(payload.seatB); const tmp = r.seats[a]; r.seats[a] = r.seats[b]; r.seats[b] = tmp; r.mySeat = r.seats.findIndex(s => s && s.id === myPlayerId); renderGameTable(r); return; }
  if (payload.type === 'host_start_game') { if (r.seats.includes(null)) { showToast('⚠️ يجب اكتمال 4 لاعبين قبل بدء اللعب'); return; } startLocalRound(r, true); renderGameTable(r); return; }
  if (payload.type === 'player_thinking') { r.thinkingSeat = mySeat; r.lastActionBySeat[mySeat] = '⏱️ يفكر...'; r.lastSoundEvent = { type: 'clock_tick', seat: mySeat, ts: Date.now() }; renderGameTable(r); setTimeout(() => { if (r.thinkingSeat === mySeat) { r.thinkingSeat = null; renderGameTable(r); } }, 4000); return; }
  if (payload.type === 'arm_belote') { if (r.beloteHolders[mySeat] && r.beloteHolders[mySeat].cardsPlayed === 0) { r.beloteHolders[mySeat].armed = !r.beloteHolders[mySeat].armed; r.beloteInfo = { canArm: true, armed: r.beloteHolders[mySeat].armed, seat: mySeat }; renderGameTable(r); } return; }
  if (payload.type === 'next_round') { startLocalRound(r, false); renderGameTable(r); return; }
  if (payload.type === 'bid') { if (r.turnSeat === mySeat) processLocalBid(r, mySeat, payload.action, payload.suit, payload.value); return; }
  if (payload.type === 'play_card') { if (r.turnSeat === mySeat) processLocalPlayCard(r, mySeat, payload.cardId); return; }
  if (payload.type === 'chat_msg') { r.chat.push({ sender: myPlayerName, text: payload.text, isSystem: false }); renderGameTable(r); return; }
  if (payload.type === 'leave_room') showLobbyUI();
}