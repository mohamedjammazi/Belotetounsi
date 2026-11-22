/* ==========================================================================
   ECONOMY UI v46 — Carousel + حسابي/Google + إشهار + رسالة انتظار ذكية
========================================================================== */
(function () {
  'use strict';
  if (window.__EU_LOADED__) return;
  window.__EU_LOADED__ = true;
  var TOKEN_KEY = 'beloteToken', DEV_KEY = 'beloteDeviceId';
  var state = { token: '', wallet: null, cfg: null, ads: null, ledger: [], lastBalance: null, createTier: '', quickTier: '', carIdx: 0, counts: {} };

  function ls(k, v) { try { if (arguments.length > 1) localStorage.setItem(k, v); return localStorage.getItem(k); } catch (e) { return null; } }
  function deviceId() { var d = ls(DEV_KEY); if (!d) { d = 'D' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); ls(DEV_KEY, d); } return d; }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(msg, bad) {
    var box = document.getElementById('toastBox'); if (!box) return;
    var d = document.createElement('div');
    d.style.cssText = 'background:rgba(6,26,16,.97);border:1.5px solid ' + (bad ? '#ff5a5a' : '#e6b455') + ';color:#fff;padding:10px 18px;border-radius:999px;font-size:.84rem;font-weight:900;box-shadow:0 8px 24px rgba(0,0,0,.6)';
    d.textContent = msg; box.appendChild(d); setTimeout(function () { d.remove(); }, 3400);
  }
  function api(p, m, b) { return fetch(p, { method: m || 'GET', headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined }).then(function (r) { return r.json(); }); }
  function wrapSendPacket() {
    if (window.__EU_WRAP_DONE__ || typeof window.sendPacket !== 'function') return;
    window.__EU_WRAP_DONE__ = true;
    var orig = window.sendPacket;
    window.sendPacket = function (p) {
      try {
        if (p && typeof p === 'object') {
          if (state.token) p.token = state.token;
          if (p.type === 'create_room' && state.createTier) p.tierId = state.createTier;
          if (p.type === 'quick_join' && state.quickTier) p.tierId = state.quickTier;
        }
      } catch (e) {}
      return orig.apply(this, arguments);
    };
  }
  function injectStyle() {
    if (document.getElementById('euStyle')) return;
    var st = document.createElement('style'); st.id = 'euStyle';
    st.textContent = [
      '.wallet-row{display:flex;gap:7px;flex-wrap:wrap;align-items:center}',
      '.quick-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}',
      '.quick-actions .btn-big{flex:1 1 170px}',
      '.eu-chip{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(178deg,#fff6dc,#e6b455 60%,#b57d1c);color:#2a1a02;border:1.5px solid #fff3cf;border-radius:11px;padding:6px 13px;font-weight:900;font-size:.82rem;min-height:36px;white-space:nowrap;box-shadow:0 4px 12px rgba(230,180,85,.32);cursor:pointer}',
      '.eu-chip b{font-size:.94rem}',
      '.eu-btn{cursor:pointer;border:1px solid rgba(255,255,255,.2);border-radius:11px;padding:8px 13px;font-weight:900;font-size:.78rem;min-height:38px;display:inline-flex;align-items:center;gap:6px;background:linear-gradient(178deg,rgba(255,255,255,.14),rgba(255,255,255,.05));color:#eef5f0}',
      '.eu-btn:active{transform:scale(.94)}',
      '.eu-btn.gold{background:linear-gradient(178deg,#ffe9a8,#e6b455 55%,#a9700f);color:#2a1a02;border-color:#fff3cf}',
      '.eu-btn.green{background:linear-gradient(178deg,#5fe3a1,#1eb463 55%,#0c6b3c);color:#04240f}',
      '.eu-btn.blue{background:linear-gradient(178deg,#7fdcff,#1f9fd6 55%,#0a5b7d);color:#03222f}',
      '.eu-carousel{position:relative;display:flex;align-items:center;gap:6px;margin-top:10px}',
      '.car-viewport{flex:1;overflow:hidden;border-radius:18px;touch-action:pan-y}',
      '.car-track{display:flex;transition:transform .32s cubic-bezier(.22,.8,.2,1);will-change:transform}',
      '.car-slide{flex:0 0 100%;padding:2px}',
      '.eu-table-card{position:relative;border-radius:18px;padding:18px 14px 14px;text-align:center;cursor:pointer;overflow:hidden;border:2px solid rgba(230,180,85,.4);background:radial-gradient(ellipse 80% 70% at 50% 30%,#1d9457,#0a5730 60%,#04331b);box-shadow:0 10px 26px rgba(0,0,0,.55),inset 0 0 0 4px rgba(90,52,24,.9),inset 0 0 0 6px rgba(230,180,85,.35);transition:transform .15s,border-color .15s}',
      '.eu-table-card:active{transform:scale(.98)}',
      '.eu-table-card.locked{filter:grayscale(.55) brightness(.75)}',
      '.eu-tc-emoji{font-size:2.2rem;line-height:1}',
      '.eu-tc-name{font-size:1rem;font-weight:900;color:#fff;margin-top:6px}',
      '.eu-tc-entry{font-size:.82rem;font-weight:900;color:#ffe9a8;margin-top:8px}',
      '.eu-tc-prize{font-size:.72rem;color:#8ff0bb;font-weight:800;margin-top:3px}',
      '.eu-tc-live{position:absolute;top:9px;right:9px;font-size:.62rem;font-weight:900;background:rgba(0,0,0,.55);border:1px solid rgba(53,208,127,.6);color:#8ff0bb;border-radius:999px;padding:2px 9px}',
      '.eu-tc-cta{margin-top:10px;display:inline-block;background:linear-gradient(180deg,#ffe9a8,#e0a53c);color:#2a1a02;font-weight:900;font-size:.78rem;border-radius:999px;padding:7px 18px;border:1px solid #fff3cf}',
      '.car-arrow{flex:none;width:34px;height:52px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#ffe9a8;font-size:1.5rem;font-weight:900;cursor:pointer;line-height:1}',
      '.car-arrow:active{transform:scale(.92)}',
      '.car-dots{display:flex;gap:6px;justify-content:center;margin-top:10px}',
      '.car-dot{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.22);cursor:pointer;transition:.2s}',
      '.car-dot.sel{background:#ffe9a8;transform:scale(1.3)}',
      '.eu-tiers{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}',
      '.eu-tier-pick{cursor:pointer;border:1.5px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#eef5f0;border-radius:10px;padding:7px 10px;font-size:.72rem;font-weight:900}',
      '.eu-tier-pick.sel{background:linear-gradient(180deg,#ffe9a8,#e0a53c);color:#2a1a02;border-color:#fff3cf}',
      '.sw-row{display:flex;gap:8px;align-items:center;margin-top:10px;font-size:.78rem;font-weight:800;color:#cfe0d5;cursor:pointer}',
      '.sw-row input{width:18px;height:18px;accent-color:#35d07f}',
      '.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}',
      '.rooms-list{display:flex;flex-direction:column;gap:8px;margin-top:10px}',
      '.search-row{margin-top:10px}',
      'details.panel-card summary{cursor:pointer;font-weight:900;color:#ffe9a8;font-size:.92rem;list-style:none;display:flex;align-items:center;gap:8px}',
      'details.panel-card summary::before{content:"▸";transition:.2s;color:#e6b455}',
      'details[open].panel-card summary::before{transform:rotate(90deg)}',
      '.eu-modal{position:fixed;inset:0;background:rgba(1,8,5,.82);z-index:300;display:none;align-items:center;justify-content:center;padding:16px}',
      '.eu-modal.show{display:flex}',
      '.eu-modal-card{width:min(94vw,470px);max-height:88vh;overflow-y:auto;background:linear-gradient(180deg,#06301c,#04170d);border:2px solid #e6b455;border-radius:18px;padding:18px;text-align:center;color:#eef5f0}',
      '.eu-modal-card h3{color:#ffe9a8;margin-bottom:10px}',
      '.eu-ad-box{background:#000;border-radius:12px;min-height:220px;display:flex;align-items:center;justify-content:center;color:#9fb3a8;font-weight:900;margin:12px 0;position:relative;overflow:hidden}',
      '.eu-ad-timer{position:absolute;top:8px;right:8px;background:rgba(0,0,0,.7);border:1px solid #e6b455;color:#ffe9a8;border-radius:999px;padding:3px 10px;font-size:.72rem;font-weight:900}',
      '.eu-row{display:flex;justify-content:space-between;gap:8px;padding:7px 4px;border-bottom:1px solid rgba(255,255,255,.09);font-size:.78rem}',
      '.eu-google-box{background:rgba(53,200,240,.08);border:1.5px solid rgba(53,200,240,.4);border-radius:14px;padding:12px;margin:12px 0;font-size:.78rem;line-height:1.7;color:#cfe8f5;text-align:right}',
      '.eu-wait{margin-top:10px;background:rgba(53,208,127,.08);border:1px solid rgba(53,208,127,.35);border-radius:12px;padding:9px 11px;font-size:.76rem;color:#cfe8da;text-align:center}',
      '.eu-tier-badge{display:inline-block;margin-top:6px;background:rgba(230,180,85,.16);border:1px solid rgba(230,180,85,.5);color:#ffe9a8;font-size:.66rem;font-weight:900;padding:2px 8px;border-radius:999px;white-space:nowrap}'
    ].join('');
    document.head.appendChild(st);
  }
  function buildCarousel() {
    var track = document.getElementById('carTrack');
    if (!track) return;
    var tiers = (state.cfg && state.cfg.tiers) || [];
    var on = state.cfg && state.cfg.economy && state.cfg.economy.enabled;
    var bal = state.wallet ? state.wallet.balance : 0;
    if (!tiers.length) { track.innerHTML = '<div class="car-slide"><div class="eu-table-card"><div class="eu-tc-emoji">🎴</div><div class="eu-tc-name">ما فماش طاولات</div></div></div>'; return; }
    track.innerHTML = tiers.map(function (t, i) {
      var c = state.counts[t.id] || { rooms: 0 };
      var locked = on && bal < t.entry;
      return '<div class="car-slide" data-i="' + i + '"><div class="eu-table-card' + (locked ? ' locked' : '') + '" data-tier="' + esc(t.id) + '">' +
        '<span class="eu-tc-live">🟢 ' + c.rooms + ' طاولة</span>' +
        '<div class="eu-tc-emoji">' + esc(t.emoji) + '</div>' +
        '<div class="eu-tc-name">' + esc(t.name) + '</div>' +
        '<div class="eu-tc-entry">' + (on ? '🪙 دخول ' + fmt(t.entry) : '🆓 مجاني') + '</div>' +
        '<div class="eu-tc-prize">' + (on ? 'الجائزة ' + fmt(t.entry * 2) + ' لكل رابح' : 'بلا نقاط') + '</div>' +
        (locked ? '<div style="font-size:.66rem;color:#ffb3b3;font-weight:900;margin-top:6px">🔒 رصيدك ما يكفيش — تفرّج إشهار أو اربح في مستوى أقل</div>' : '<span class="eu-tc-cta">ادخل الآن ⚡</span>') +
        '</div></div>';
    }).join('');
    if (state.carIdx >= tiers.length) state.carIdx = 0;
    goSlide(state.carIdx, false);
    renderDots();
    Array.prototype.forEach.call(track.querySelectorAll('.eu-table-card'), function (el) {
      el.onclick = function () {
        var id = el.getAttribute('data-tier');
        state.quickTier = id; state.createTier = id;
        if (typeof window.quickJoinTable === 'function') window.quickJoinTable();
        else toast('اللعب الفوري غير متوفر', true);
      };
    });
  }
  function goSlide(i, animate) {
    var track = document.getElementById('carTrack');
    var tiers = (state.cfg && state.cfg.tiers) || [];
    if (!track || !tiers.length) return;
    state.carIdx = Math.max(0, Math.min(tiers.length - 1, i));
    track.style.transition = animate === false ? 'none' : '';
    track.style.transform = 'translateX(' + (-state.carIdx * 100) + '%)';
    renderDots();
  }
  function renderDots() {
    var dots = document.getElementById('carDots');
    var tiers = (state.cfg && state.cfg.tiers) || [];
    if (!dots) return;
    dots.innerHTML = tiers.map(function (t, i) { return '<span class="car-dot' + (i === state.carIdx ? ' sel' : '') + '" data-i="' + i + '"></span>'; }).join('');
    Array.prototype.forEach.call(dots.children, function (d) { d.onclick = function () { goSlide(+d.getAttribute('data-i'), true); }; });
  }
  function bindCarousel() {
    var vp = document.getElementById('carViewport');
    if (!vp || vp.dataset.bound) return;
    vp.dataset.bound = '1';
    var startX = 0, dx = 0, dragging = false;
    function down(x) { dragging = true; startX = x; dx = 0; }
    function move(x) { if (dragging) dx = x - startX; }
    function up() { if (!dragging) return; dragging = false; if (dx > 45) goSlide(state.carIdx - 1, true); else if (dx < -45) goSlide(state.carIdx + 1, true); }
    vp.addEventListener('touchstart', function (e) { down(e.touches[0].clientX); }, { passive: true });
    vp.addEventListener('touchmove', function (e) { move(e.touches[0].clientX); }, { passive: true });
    vp.addEventListener('touchend', up);
    vp.addEventListener('mousedown', function (e) { e.preventDefault(); down(e.clientX); });
    window.addEventListener('mousemove', function (e) { move(e.clientX); });
    window.addEventListener('mouseup', up);
    var pv = document.getElementById('carPrev'), nx = document.getElementById('carNext');
    if (pv) pv.onclick = function () { goSlide(state.carIdx - 1, true); };
    if (nx) nx.onclick = function () { goSlide(state.carIdx + 1, true); };
  }
  function ensureLobbyUI() {
    var chip = document.getElementById('euLobbyChip');
    if (chip && !chip.dataset.bound) { chip.dataset.bound = '1'; chip.onclick = openAccount; }
    var ab = document.getElementById('euAccountBtn');
    if (ab && !ab.dataset.bound) { ab.dataset.bound = '1'; ab.onclick = openAccount; }
    var gb = document.getElementById('euGoogleBtn');
    if (gb && !gb.dataset.bound) { gb.dataset.bound = '1'; gb.onclick = goGoogle; }
    var adb = document.getElementById('euAdsBtn');
    if (adb && !adb.dataset.bound) { adb.dataset.bound = '1'; adb.onclick = openAds; }
    bindCarousel();
    var row = document.getElementById('euCreateTierRow');
    if (row && !row.dataset.bound) { row.dataset.bound = '1'; renderCreateTiers(); }
  }
  function renderCreateTiers() {
    var row = document.getElementById('euCreateTierRow'); if (!row) return;
    var tiers = (state.cfg && state.cfg.tiers) || [];
    var on = state.cfg && state.cfg.economy && state.cfg.economy.enabled;
    var html = '<button type="button" class="eu-tier-pick' + (state.createTier === '' ? ' sel' : '') + '" data-t="">🆓 بدون نقاط</button>';
    tiers.forEach(function (t) { html += '<button type="button" class="eu-tier-pick' + (state.createTier === t.id ? ' sel' : '') + '" data-t="' + esc(t.id) + '">' + esc(t.emoji) + ' ' + esc(t.name) + '</button>'; });
    row.innerHTML = on ? html : '<span style="font-size:.72rem;color:#9fb3a8">الاقتصاد معطّل — كل الطاولات مجانية</span>';
    Array.prototype.forEach.call(row.children, function (b) { b.onclick = function () { state.createTier = b.getAttribute('data-t') || ''; renderCreateTiers(); }; });
  }
  function ensureGameUI() {
    var hud = document.querySelector('#gameView .bar .hud');
    if (hud && !document.getElementById('euGameChip')) {
      var chip = document.createElement('span'); chip.id = 'euGameChip'; chip.className = 'eu-chip'; chip.title = 'حسابي';
      chip.onclick = openAccount;
      hud.appendChild(chip);
    }
  }
  function ensureWaitUI() {
    var ov = document.getElementById('waitingOverlay');
    if (!ov || document.getElementById('euWaitBox')) return;
    var d = document.createElement('div'); d.id = 'euWaitBox'; d.className = 'eu-wait';
    d.innerHTML = '<label style="display:inline-flex;gap:8px;align-items:center;justify-content:center;cursor:pointer;font-weight:800"><input type="checkbox" id="euAutoFillChk" style="width:17px;height:17px;accent-color:#35d07f"> 🤖 إدخال البوتات تلقائياً إذا ما كملوش اللاعبين (يلعبو بالمجان)</label><div id="euAutoFillInfo" style="font-size:.72rem;color:#9fb3a8;margin-top:6px"></div>';
    ov.appendChild(d);
    document.getElementById('euAutoFillChk').onchange = function () { if (typeof window.sendPacket === 'function') window.sendPacket({ type: 'host_toggle_autofill', enabled: this.checked }); };
  }
  function paintChips() {
    var bal = state.wallet ? state.wallet.balance : 0;
    ['euLobbyChip', 'euGameChip'].forEach(function (id) {
      var el = document.getElementById(id); if (!el) return;
      el.style.display = 'inline-flex';
      el.innerHTML = '🪙 <b>' + fmt(bal) + '</b>';
    });
    var gg = document.getElementById('euGoogleBtn');
    if (gg) gg.style.display = (state.wallet && state.cfg && state.cfg.google && state.cfg.google.enabled && (!state.wallet.provider || state.wallet.provider === 'guest')) ? 'inline-flex' : 'none';
    var ab = document.getElementById('euAdsBtn');
    if (ab) ab.style.display = (state.wallet && state.ads && state.ads.allowed) ? 'inline-flex' : 'none';
    var note = document.getElementById('euHallNote');
    if (note) note.innerHTML = state.wallet ? '🪙 رصيدك: <b>' + fmt(bal) + '</b> — النقاط من الربح والإشهار وهدايا الإدارة فقط.' : '';
  }
  function goGoogle() { location.href = '/api/auth/google/start?link=' + encodeURIComponent(state.token); }
  var adTimer = null;
  function openAds() {
    if (!document.getElementById('euAdsModal')) buildAdsModal();
    document.getElementById('euAdsModal').classList.add('show');
    startAdCountdown();
  }
  function buildAdsModal() {
    var d = document.createElement('div'); d.id = 'euAdsModal'; d.className = 'eu-modal';
    d.innerHTML = '<div class="eu-modal-card"><h3>📺 إشهار مكافئ</h3><div style="font-size:.78rem;color:#9fb3a8">تفرّج للآخر باش تربح <b id="euAdPts" style="color:#ffe9a8"></b> نقطة</div><div class="eu-ad-box" id="euAdBox"><span id="euAdMsg">جاري التحميل...</span><div class="eu-ad-timer" id="euAdTimer"></div></div><div style="display:flex;gap:8px;justify-content:center"><button type="button" class="eu-btn" id="euAdCancel">إلغاء</button></div></div>';
    document.body.appendChild(d);
    document.getElementById('euAdCancel').onclick = function () { if (adTimer) clearInterval(adTimer); adTimer = null; d.classList.remove('show'); };
  }
  function startAdCountdown() {
    var a = (state.cfg && state.cfg.ads) || {};
    var pts = document.getElementById('euAdPts'); if (pts) pts.textContent = fmt(a.rewardPoints || 50);
    var box = document.getElementById('euAdBox'), tmr = document.getElementById('euAdTimer');
    if (adTimer) { clearInterval(adTimer); adTimer = null; }
    var secs = a.testMode ? 8 : 20;
    if (a.adUnitId && a.publisherId && !a.testMode) {
      box.innerHTML = '<ins class="adsbygoogle" style="display:block;width:100%;height:220px" data-ad-client="' + esc(a.publisherId) + '" data-ad-slot="' + esc(a.adUnitId) + '" data-ad-format="autorelaxed"></ins><div class="eu-ad-timer" id="euAdTimer"></div>';
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
      if (!document.getElementById('euAdsScript')) { var s = document.createElement('script'); s.id = 'euAdsScript'; s.async = true; s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(a.publisherId); document.head.appendChild(s); }
      tmr = document.getElementById('euAdTimer');
    }
    var left = secs;
    if (tmr) tmr.textContent = left + 'ث';
    adTimer = setInterval(function () {
      left--;
      var t2 = document.getElementById('euAdTimer'); if (t2) t2.textContent = left > 0 ? left + 'ث' : '✅';
      if (left <= 0) {
        clearInterval(adTimer); adTimer = null;
        api('/api/ads/claim', 'POST', { token: state.token, deviceId: deviceId(), ref: 'ui-' + Date.now() }).then(function (r) {
          var m = document.getElementById('euAdsModal'); if (m) m.classList.remove('show');
          if (r.ok) { toast('📺 +' + fmt(r.points) + ' نقطة! باقي ' + r.remaining + ' اليوم'); refresh(); }
          else toast(r.reason || 'فشل', true);
        });
      }
    }, 1000);
  }
  function openAccount() {
    var m = document.getElementById('euAccModal');
    if (!m) { m = document.createElement('div'); m.id = 'euAccModal'; m.className = 'eu-modal'; document.body.appendChild(m); }
    var u = state.wallet || {};
    var isGuest = !u.provider || u.provider === 'guest';
    var googleOn = state.cfg && state.cfg.google && state.cfg.google.enabled;
    var rows = (state.ledger || []).slice(0, 8).map(function (l) { return '<div class="eu-row"><span>' + (l.delta >= 0 ? '+' : '') + fmt(l.delta) + ' — ' + esc(l.reason) + '</span><span style="color:#9fb3a8">' + fmt(l.balance) + '</span></div>'; }).join('') || '<div class="eu-row"><span>ما فماش حركات</span><span></span></div>';
    m.innerHTML = '<div class="eu-modal-card"><h3>👤 حسابي</h3>' +
      '<div class="eu-row"><span>الاسم</span><b>' + esc(u.name) + '</b></div>' +
      '<div class="eu-row"><span>النوع</span><b>' + (isGuest ? 'ضيف (جهاز)' : esc(u.provider)) + '</b></div>' +
      (u.email ? '<div class="eu-row"><span>الإيميل</span><b>' + esc(u.email) + '</b></div>' : '') +
      '<div class="eu-row"><span>الرصيد</span><b style="color:#ffe9a8">🪙 ' + fmt(u.balance) + '</b></div>' +
      '<div class="eu-row"><span>لعب / ربح</span><b>' + ((u.stats && u.stats.played) || 0) + ' / ' + ((u.stats && u.stats.won) || 0) + '</b></div>' +
      (googleOn && isGuest ? '<div class="eu-google-box">🔗 <b>اربط حسابك بـ Google</b> باش تحفظ مستواك ونقاطك وترجع بيهم من أي جهاز. إذا كان عندك حساب مربوط من قبل، افتح بيه الآن وتسترجع كل شيء.<div style="margin-top:9px;text-align:center"><button type="button" class="eu-btn blue" id="euLinkGoogle">🔗 اربط / افتح بـ Google</button></div></div>' : '') +
      (googleOn && !isGuest ? '<div class="eu-google-box">✅ حسابك مربوط بـ Google' + (u.email ? ' (' + esc(u.email) + ')' : '') + '</div>' : '') +
      '<div style="height:8px"></div>' +
      '<label style="font-size:.74rem;font-weight:900;color:#cfe0d5;text-align:right;display:block">بدّل اسمك:</label>' +
      '<div style="display:flex;gap:7px;margin-top:6px"><input type="text" id="euRenameInput" maxlength="18" value="' + esc(u.name) + '" style="flex:1;background:rgba(0,0,0,.42);border:1.5px solid rgba(255,255,255,.16);color:#fff;padding:9px 11px;border-radius:11px;font-size:.84rem;outline:0"><button type="button" class="eu-btn green" id="euRenameBtn">💾</button></div>' +
      '<div style="height:10px"></div>' +
      '<div style="font-size:.74rem;font-weight:900;color:#e6b455;text-align:right">آخر الحركات:</div>' + rows +
      '<div style="height:12px"></div><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">' +
      '<button type="button" class="eu-btn gold" id="euWatchAd">📺 اشحن نقاط</button>' +
      '<button type="button" class="eu-btn" id="euCloseAcc">سكّر</button></div>' +
      '<div class="hint" style="margin-top:10px;font-size:.66rem;color:#9fb3a8">🔐 بلا كلمات سر: حسابك مربوط بجهازك أو بـ Google.</div></div>';
    m.classList.add('show');
    document.getElementById('euCloseAcc').onclick = function () { m.classList.remove('show'); };
    document.getElementById('euWatchAd').onclick = function () { m.classList.remove('show'); openAds(); };
    document.getElementById('euRenameBtn').onclick = function () {
      var nn = document.getElementById('euRenameInput').value;
      api('/api/rename', 'POST', { token: state.token, name: nn }).then(function (r) {
        if (r.ok) {
          toast('✅ تبدّل اسمك لـ ' + r.user.name);
          try { ls('belotePlayerName', r.user.name); var pi = document.getElementById('playerNameInput'); if (pi) pi.value = r.user.name; } catch (e) {}
          if (typeof window.sendPacket === 'function') window.sendPacket({ type: 'set_name', name: r.user.name, silent: true });
          refresh();
        } else toast(r.reason || 'فشل', true);
      });
    };
    var lg = document.getElementById('euLinkGoogle'); if (lg) lg.onclick = goGoogle;
  }
  function paintRoomBadges(map) {
    var items = document.querySelectorAll('#roomsListContainer .room-item');
    Array.prototype.forEach.call(items, function (it) {
      if (it.dataset.euTierDone) return;
      var tag = it.querySelector('.room-id-tag'); if (!tag) return;
      var r = map[(tag.textContent || '').trim()]; if (!r) return;
      it.dataset.euTierDone = '1';
      if (r.tierName) {
        var b = document.createElement('span'); b.className = 'eu-tier-badge';
        b.textContent = (r.tierEmoji || '') + ' ' + r.tierName + (r.entry ? ' — ' + fmt(r.entry) + '🪙' : '');
        var top = it.querySelector('.room-item-top'); (top || it).appendChild(b);
      }
    });
  }
  function pollRooms() {
    var lv = document.getElementById('lobbyView');
    if (!lv || lv.style.display === 'none') return;
    api('/api/rooms-public').then(function (r) {
      var map = {}, counts = {};
      (r.rooms || []).forEach(function (x) {
        map[x.id] = x;
        if (x.tierId) { counts[x.tierId] = counts[x.tierId] || { rooms: 0, players: 0 }; counts[x.tierId].rooms++; counts[x.tierId].players += x.players; }
      });
      state.counts = counts;
      buildCarousel();
      paintRoomBadges(map);
      var rc = document.getElementById('roomsCountSpan'); if (rc) rc.textContent = Object.keys(map).length;
    }).catch(function () {});
  }
  function pollRoomInfo() {
    ensureWaitUI();
    var ov = document.getElementById('waitingOverlay');
    var code = document.getElementById('waitingRoomCode');
    var info = document.getElementById('euAutoFillInfo');
    if (!ov || ov.style.display === 'none' || !code || !info) return;
    var id = (code.textContent || '').trim(); if (!id) return;
    api('/api/room-info?id=' + encodeURIComponent(id)).then(function (j) {
      if (!j.ok) return;
      var chk = document.getElementById('euAutoFillChk');
      if (chk) chk.checked = !!j.autoFillOn;
      if (j.status !== 'waiting') { info.textContent = ''; return; }
      if (j.autoFillOn && j.autoFillIn > 0) {
        info.textContent = '🤖 البوتات تكمل الطاولة وتبدا الماتش خلال ' + Math.ceil(j.autoFillIn / 1000) + ' ثانية...';
      } else if (j.origin === 'host') {
        info.textContent = '🏠 طاولة أصحاب: نستناو في اللاعبين (' + j.players + '/4) — المولى ينجم زيد بوتات أو يبدّل البلايص أو يبدا وحدو.';
      } else {
        info.textContent = '🌐 نستناو في لاعبين أونلاين... (' + j.players + '/4)';
      }
    }).catch(function () {});
  }
  function refresh() {
    if (!state.token) return;
    api('/api/me?token=' + encodeURIComponent(state.token)).then(function (r) {
      if (!r.ok) return;
      state.wallet = r.user; state.ads = r.ads; state.ledger = r.ledger || [];
      if (state.lastBalance != null && r.user.balance > state.lastBalance + 1) toast('🪙 رصيدك زاد: ' + fmt(r.user.balance));
      state.lastBalance = r.user.balance;
      paintChips(); pollRooms();
    }).catch(function () {});
  }
  function boot() {
    injectStyle(); wrapSendPacket();
    state.token = ls(TOKEN_KEY) || '';
    api('/api/app-config').then(function (c) {
      state.cfg = c;
      ensureLobbyUI(); ensureGameUI(); ensureWaitUI(); renderCreateTiers(); buildCarousel(); paintChips();
      if (!state.token) {
        var name = ls('belotePlayerName') || '';
        api('/api/identity', 'POST', { deviceId: deviceId(), name: name }).then(function (r) {
          if (r.ok) { state.token = r.token; ls(TOKEN_KEY, r.token); state.wallet = r.user; state.ads = r.ads; paintChips(); toast('👋 مرحبا ' + r.user.name + ' — رصيدك ' + fmt(r.user.balance) + ' نقطة'); }
        });
      } else refresh();
    });
    setInterval(refresh, 12000);
    setInterval(pollRooms, 4000);
    setInterval(pollRoomInfo, 1500);
    setInterval(wrapSendPacket, 3000);
    setInterval(function () { ensureLobbyUI(); ensureGameUI(); ensureWaitUI(); renderCreateTiers(); }, 5000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();