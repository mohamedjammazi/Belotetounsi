/* ==========================================================================
   FILE: /public/js/rewarded-ads.js
   إعلانات مكافأة متوافقة: اختيار طوعي + وصف دقيق + Ad Placement API + تحقق سيرفر
========================================================================== */
'use strict';
(function () {
  if (window.__bkRewarded) return;
  var CFG = null, busy = false, wired = false;

  function token() { try { return localStorage.getItem('beloteToken') || ''; } catch (e) { return ''; } }
  function device() { try { var d = localStorage.getItem('beloteDeviceId'); if (!d) { d = 'D' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); localStorage.setItem('beloteDeviceId', d); } return d; } catch (e) { return ''; } }
  function toast(m, bad) { if (typeof window.showToast === 'function') return window.showToast(m, bad); console.log('[rewarded]', m); }
  function api(p, b) { return fetch(p, { method: b ? 'POST' : 'GET', headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok && j.ok !== false, j: j }; }); }); }

  function css() {
    if (document.getElementById('bkRewCss')) return;
    var s = document.createElement('style'); s.id = 'bkRewCss';
    s.textContent = '.bkrew{position:fixed;inset:0;z-index:400;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(1,10,6,.86);backdrop-filter:blur(6px)}.bkrew.show{display:flex}.bkrew-card{width:min(94vw,430px);background:linear-gradient(180deg,#08402a,#04220f);border:2px solid #e8b455;border-radius:20px;padding:20px;text-align:center;color:#eef6f0;box-shadow:0 24px 60px rgba(0,0,0,.7);font-family:inherit}.bkrew-card h3{color:#ffe9a8;font-size:1.12rem;margin-bottom:8px}.bkrew-offer{background:rgba(232,180,85,.14);border:1px solid rgba(232,180,85,.4);border-radius:14px;padding:14px;margin:12px 0;font-weight:900;font-size:1rem;color:#fff6dc}.bkrew-offer b{color:#3ddc84;font-size:1.24rem}.bkrew-note{font-size:.74rem;color:#a9c2b1;line-height:1.7;margin-bottom:14px}.bkrew-row{display:flex;gap:9px;justify-content:center;flex-wrap:wrap}.bkrew-btn{cursor:pointer;border:0;border-radius:13px;padding:12px 20px;font-weight:900;font-size:.9rem;font-family:inherit}.bkrew-go{background:linear-gradient(180deg,#ffe9a8,#e8b455 50%,#a9700f);color:#2a1a02;border:1px solid #fff3cf}.bkrew-no{background:rgba(255,255,255,.08);color:#eef6f0;border:1px solid rgba(255,255,255,.18)}.bkrew-status{margin-top:12px;font-size:.84rem;font-weight:800;min-height:22px;color:#cfe3d6}.bkrew-status.bad{color:#ff5d6c}.bkrew-status.ok{color:#3ddc84}';
    document.head.appendChild(s);
  }
  function modal() {
    var m = document.getElementById('bkRewModal');
    if (m) return m;
    css();
    m = document.createElement('div'); m.id = 'bkRewModal'; m.className = 'bkrew';
    m.innerHTML = '<div class="bkrew-card" role="dialog" aria-modal="true" aria-labelledby="bkRewTitle"><h3 id="bkRewTitle">📺 إعلان مكافأة اختياري</h3><div class="bkrew-offer">شاهد إعلاناً كاملاً للحصول على <b id="bkRewPts">50</b> نقطة لعب</div><p class="bkrew-note">النقاط افتراضية للتسلية داخل اللعبة فقط، بلا أي قيمة نقدية، وغير قابلة للتحويل بين اللاعبين. المشاهدة اختيارية بالكامل وتنجم تلغي في أي لحظة. النقاط تُضاف فقط بعد اكتمال الإعلان.</p><div class="bkrew-row"><button class="bkrew-btn bkrew-go" id="bkRewGo">▶️ شاهد الإعلان</button><button class="bkrew-btn bkrew-no" id="bkRewNo">إلغاء</button></div><p class="bkrew-status" id="bkRewStatus"></p></div>';
    document.body.appendChild(m);
    document.getElementById('bkRewNo').onclick = close;
    document.getElementById('bkRewGo').onclick = run;
    return m;
  }
  function close() { var m = document.getElementById('bkRewModal'); if (m) m.classList.remove('show'); busy = false; }
  function status(t, cls) { var e = document.getElementById('bkRewStatus'); if (e) { e.className = 'bkrew-status' + (cls ? ' ' + cls : ''); e.textContent = t; } }

  function allowedNow() {
    var r = window.currentRoomState;
    if (!r) return true;
    return !(r.status === 'playing' || r.status === 'bidding');
  }

  function open() {
    if (busy) return;
    if (!allowedNow()) { toast('📺 الإعلان متاح بعد نهاية الطرح أو في القاعة — موش أثناء اللعب.'); return; }
    var m = modal();
    document.getElementById('bkRewPts').textContent = String((CFG && CFG.rewardPoints) || 50);
    status('');
    document.getElementById('bkRewGo').disabled = false;
    m.classList.add('show');
  }

  function grant(nonce) {
    return api('/api/rewarded/claim', { token: token(), nonce: nonce, viewed: true })
      .then(function (out) {
        if (out.ok) {
          status('✅ +' + out.j.points + ' نقطة! رصيدك: ' + out.j.balance, 'ok');
          toast('🪙 +' + out.j.points + ' نقطة لعب');
          try { window.dispatchEvent(new CustomEvent('bk:wallet', { detail: out.j })); } catch (e) {}
          if (typeof window.sendPacket === 'function') window.sendPacket({ type: 'wallet_refresh', deviceId: device() });
          setTimeout(close, 1600);
        } else { status('⚠️ ' + (out.j.error || 'ما تسلّمتش المكافأة'), 'bad'); document.getElementById('bkRewGo').disabled = false; }
        busy = false;
      });
  }

  function run() {
    if (busy) return;
    busy = true;
    var goBtn = document.getElementById('bkRewGo');
    goBtn.disabled = true;
    status('⏳ قاعدين نحضّرو الإعلان...');
    api('/api/rewarded/start', { token: token(), deviceId: device() }).then(function (out) {
      if (!out.ok) { status('⚠️ ' + (out.j.error || 'موش متاح توّة'), 'bad'); goBtn.disabled = false; busy = false; return; }
      var nonce = out.j.nonce;
      var minMs = (out.j.minSeconds || 12) * 1000;
      var started = Date.now();
      var settled = false;
      var finish = function (viewed) {
        if (settled) return; settled = true;
        if (!viewed) { status('تم إغلاق الإعلان قبل ما يكمل — ما تُمنحش نقاط.', 'bad'); goBtn.disabled = false; busy = false; return; }
        var wait = Math.max(0, minMs - (Date.now() - started));
        status('⏳ نتحققو من اكتمال الإعلان...');
        setTimeout(function () { grant(nonce); }, wait);
      };
      if (typeof window.adBreak === 'function' && typeof window.adConfig === 'function') {
        try {
          window.adConfig({ preloadAdBreaks: 'on', sound: 'on', onReady: function () {} });
        } catch (e) {}
        try {
          window.adBreak({
            type: 'reward',
            name: 'belote-points',
            data: nonce,
            beforeReward: function (showAd) { status('📺 الإعلان جاهز — كملو باش تاخذ النقاط.'); showAd(); },
            adDismissed: function () { finish(false); },
            adViewed: function () { finish(true); },
            adBreakDone: function (info) {
              var st = info && (info.breakStatus || info.breakFormat);
              if (!settled && st && st !== 'viewed') {
                status('⚠️ ما فماش إعلان متاح توّة (' + st + '). جرّب لاحقاً.', 'bad');
                goBtn.disabled = false; busy = false; settled = true;
              }
            }
          });
          return;
        } catch (e) {}
      }
      status('⚠️ إعلانات المكافأة (H5 Games Ads) موش مفعّلة بعد على هاذا الموقع. ما تُمنحش نقاط مقابل إعلانات عادية. جرّب كي يتفعّل الشريك.', 'bad');
      goBtn.disabled = false; busy = false;
    }).catch(function () { status('⚠️ تعذّر الاتصال بالسيرفر.', 'bad'); goBtn.disabled = false; busy = false; });
  }

  function wire() {
    if (wired) return; wired = true;
    var attachBtn = function (el) {
      if (!el || el.dataset.bkrew) return;
      el.dataset.bkrew = '1';
      el.onclick = function (e) { if (e) e.preventDefault(); open(); };
      el.title = 'شاهد إعلاناً كاملاً للحصول على نقاط لعب (اختياري)';
    };
    var scan = function () {
      attachBtn(document.getElementById('euAdsBtn'));
      attachBtn(document.getElementById('euWatchAd'));
    };
    scan();
    if (window.MutationObserver) new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
    setInterval(scan, 2500);
  }

  api('/api/rewarded/config').then(function (out) { CFG = out.ok ? out.j : null; }).catch(function () {});
  window.BeloteRewarded = { open: open, close: close, get config() { return CFG; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();