/* ==========================================================================
   FILE: /public/js/table.js  —  v55
   «DIAMOND TRICK (معين) • NEVER OVERLAPPING • INSTANT COURT PORTRAITS»
========================================================================== */
(function injectTableCss() {
  const old = document.getElementById('belote-smooth-css');
  if (old) old.remove();
  const st = document.createElement('style');
  st.id = 'belote-smooth-css';
  st.textContent = `
#centerTableArea{contain:layout style}
.trick-card-pos{position:absolute;left:0;top:0;margin:0;transform-origin:50% 55%}
.trick-card-pos .playing-card{margin:0;box-shadow:0 12px 24px rgba(0,0,0,.74),0 3px 7px rgba(0,0,0,.55),0 1px 0 #fff inset}
.trick-card-pos.team-nous .playing-card{border:2px solid #35c8f0;box-shadow:0 0 14px rgba(53,200,240,.35),0 12px 24px rgba(0,0,0,.74),0 1px 0 #fff inset}
.trick-card-pos.team-vous .playing-card{border:2px solid #ff9d3d;box-shadow:0 0 14px rgba(255,157,61,.35),0 12px 24px rgba(0,0,0,.74),0 1px 0 #fff inset}
.trick-card-pos .who-tag{position:absolute;left:50%;transform:translateX(-50%);font-size:.56rem;font-weight:900;line-height:1.3;padding:2px 8px;border-radius:999px;white-space:nowrap;background:rgba(2,14,8,.95);border:1px solid rgba(230,180,85,.6);color:#ffe9a8;pointer-events:none;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 6px rgba(0,0,0,.55)}
.trick-card-pos.tag-above .who-tag{bottom:100%;margin-bottom:5px}
.trick-card-pos.tag-below .who-tag{top:100%;margin-top:5px}
.trick-card-pos.team-nous .who-tag{border-color:rgba(53,200,240,.75);color:#c9f2ff;background:rgba(3,26,36,.95)}
.trick-card-pos.team-vous .who-tag{border-color:rgba(255,157,61,.75);color:#ffdcb8;background:rgba(38,20,4,.95)}
.trick-card-pos .ord-badge{position:absolute;width:17px;height:17px;border-radius:50%;background:linear-gradient(180deg,#ffe9a8,#dfa437);color:#2a1a02;font-size:.55rem;font-weight:900;display:flex;align-items:center;justify-content:center;border:1.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.6);z-index:6}
.trick-card-pos.ord-tr .ord-badge{top:-7px;right:-7px}
.trick-card-pos.ord-br .ord-badge{bottom:-7px;right:-7px}
.trick-card-pos.ghost{opacity:.5}
.trick-card-pos.ghost .playing-card{border-style:dashed!important;border-color:#ffe9a8!important}
.trick-card-pos.ghost .ord-badge{display:none}
.trick-card-pos.win .playing-card{box-shadow:0 0 28px 9px rgba(230,180,85,.92),0 12px 24px rgba(0,0,0,.8)!important;border-color:#ffe9a8!important}
.trick-card-pos.win .ord-badge{background:linear-gradient(180deg,#7bf0b4,#1eb463);color:#04240f}
.trick-card-pos .cut-tag{top:-17px;font-size:.57rem;padding:1px 8px}
.court{background:#fffdf7}
.court::before,.court::after{display:none!important}
.court-fallback-svg{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:1}
.court-wiki-img{position:absolute;top:50%;left:50%;width:154%;height:106%;max-width:none;transform:translate(-50%,-50%);object-fit:fill;background:transparent!important;opacity:0;transition:opacity .22s ease;pointer-events:none;z-index:3}
.court-wiki-img.ready{opacity:1}
#myHandContainer .playing-card{transition:transform .15s cubic-bezier(.2,.85,.25,1),box-shadow .15s,filter .15s,opacity .15s}
#myHandContainer .playing-card.pressed{transform:rotate(var(--r)) translateY(-10px) scale(1.04)}
#myHandContainer .playing-card.selected{transform:rotate(var(--r)) translateY(-26px) scale(1.15)!important;z-index:70!important;border:3px solid var(--brass)!important;box-shadow:0 -16px 34px rgba(230,180,85,1),0 8px 18px rgba(0,0,0,.6)!important;filter:none!important}
#myHandContainer .playing-card.pending{opacity:.3;filter:grayscale(.6)}
#myHandContainer .playing-card.launching{transform:rotate(var(--r)) translateY(-34px) scale(1.1)!important;box-shadow:0 -18px 34px rgba(230,180,85,.95)}
#myHandContainer .playing-card.shake{animation:cardShake .26s ease-in-out}
@keyframes cardShake{0%,100%{transform:rotate(var(--r)) translateY(var(--y))}25%{transform:rotate(var(--r)) translateY(var(--y)) translateX(-6px)}75%{transform:rotate(var(--r)) translateY(var(--y)) translateX(6px)}}
#biddingBox{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
.bar{backdrop-filter:blur(6px)}
.amb{animation:none!important;filter:blur(44px);opacity:.24}
#turnBanner.mine{animation:none!important;box-shadow:0 0 18px rgba(53,208,127,.5)}
.bid-values-grid{contain:layout style;scrollbar-width:thin;scrollbar-color:#e6b455 rgba(0,0,0,.45)}
.bid-values-grid::-webkit-scrollbar{height:7px}
.bid-values-grid::-webkit-scrollbar-track{background:rgba(0,0,0,.45);border-radius:99px}
.bid-values-grid::-webkit-scrollbar-thumb{background:linear-gradient(90deg,#ffe9a8,#e6b455);border-radius:99px}
.bid-values-grid::-webkit-scrollbar-thumb:hover{background:linear-gradient(90deg,#fff6dc,#f0c46a)}
#chatBody{contain:layout style;scrollbar-width:thin;scrollbar-color:#1eb463 rgba(15,23,42,.12)}
#chatBody::-webkit-scrollbar{width:7px}
#chatBody::-webkit-scrollbar-track{background:rgba(15,23,42,.1);border-radius:99px}
#chatBody::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#35d07f,#0f7a44);border-radius:99px}
.lj-grid{contain:layout style}
.spd-btn{font-size:.82rem!important;letter-spacing:-1px}
[data-spd="fast"] #myHandContainer .playing-card{transition-duration:.09s}
[data-spd="slow"] #myHandContainer .playing-card{transition-duration:.22s}
@media(prefers-reduced-motion:reduce){.trick-card-pos,#myHandContainer .playing-card,.court-wiki-img{transition:none!important;animation:none!important}}
`;
  document.head.appendChild(st);
})();

function getRelativePosition(targetSeat, mySeat) {
  const base = mySeat >= 0 ? mySeat : 0;
  const diff = (targetSeat - base + 4) % 4;
  if (diff === 0) return 'Bottom';
  if (diff === 1) return 'Right';
  if (diff === 2) return 'Top';
  return 'Left';
}
function beloteRankLabel(rank) {
  if (rank === 'A' || rank === '1') return '1';
  if (rank === 'K' || rank === 'R') return 'R';
  if (rank === 'Q' || rank === 'D') return 'D';
  if (rank === 'J' || rank === 'V') return 'V';
  return (typeof DISPLAY_RANKS !== 'undefined' && DISPLAY_RANKS[rank]) ? DISPLAY_RANKS[rank] : String(rank);
}
function getSuitSvg(suit, extraClass = '', explicitFill = '') {
  const cls = ('suit-svg suit-' + suit + (extraClass ? ' ' + extraClass : '')).trim();
  const fillCol = explicitFill || 'currentColor';
  const szAttr = extraClass.indexOf('bid-picker-svg') !== -1 ? 'width="24" height="24"' : 'width="1em" height="1em"';
  if (suit === 'spades') {
    return `<svg class="${cls}" ${szAttr} viewBox="0 0 100 100" aria-hidden="true"><path fill="${fillCol}" d="M50 3 C24 34 6 50 6 67 C6 81 17 90 30 87 C38 85 43 79 45 72 L35 96 L65 96 L55 72 C57 79 62 85 70 87 C83 90 94 81 94 67 C94 50 76 34 50 3 Z"/><path fill="rgba(255,255,255,0.22)" d="M50 11 C31 35 16 50 16 65 C16 74 22 79 30 78 C36 77 41 72 44 65 L50 11 Z"/></svg>`;
  }
  if (suit === 'clubs') {
    return `<svg class="${cls}" ${szAttr} viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="23" r="20.5" fill="${fillCol}"/><circle cx="21.5" cy="57.5" r="20.5" fill="${fillCol}"/><circle cx="78.5" cy="57.5" r="20.5" fill="${fillCol}"/><circle cx="50" cy="49" r="11" fill="${fillCol}"/><path fill="${fillCol}" d="M44 54 L31 96 L69 96 L56 54 Z"/><circle cx="50" cy="49" r="5" fill="#ffffff" opacity="0.92"/></svg>`;
  }
  if (suit === 'hearts') {
    return `<svg class="${cls}" ${szAttr} viewBox="0 0 100 100" aria-hidden="true"><path fill="${fillCol}" d="M50 94 C50 94 7 65 7 33 C7 15 21 5 35 5 C43 5 48 10 50 16 C52 10 57 5 65 5 C79 5 93 15 93 33 C93 65 50 94 50 94 Z"/><path fill="rgba(255,255,255,0.22)" d="M34 12 C23 12 15 20 15 32 C15 44 25 56 36 66 C26 52 24 38 27 26 C29 18 34 15 41 14 C39 13 37 12 34 12 Z"/></svg>`;
  }
  return `<svg class="${cls}" ${szAttr} viewBox="0 0 100 100" aria-hidden="true"><path fill="${fillCol}" d="M50 3 L92 50 L50 97 L8 50 Z"/><path fill="rgba(255,255,255,0.22)" d="M50 10 L15 50 L50 90 L50 10 Z"/></svg>`;
}
function suitColorFor(suit, onDark) {
  const red = (suit === 'hearts' || suit === 'diamonds');
  if (onDark) { if (red) return '#ff8888'; return suit === 'clubs' ? '#7bf0b4' : '#eef3f7'; }
  if (red) return suit === 'diamonds' ? '#e02020' : '#d01428';
  return suit === 'clubs' ? '#0b4628' : '#11161f';
}
function suitInlineBadgeHtml(suit, onDark, sizeEm = 1.25) {
  const col = suitColorFor(suit, onDark);
  return `<span class="inline-suit-wrap" style="color:${col};width:${sizeEm}em;height:${sizeEm}em;">${getSuitSvg(suit, 'inline-suit-svg', col)}</span>`;
}
function bidRichHtml(b, onDark, big) {
  if (!b) return '';
  const val = b.value === 500 ? 'كبوت' : b.value;
  return `<b style="font-size:${big ? '1.22em' : '1.1em'};">${val}</b>${suitInlineBadgeHtml(b.suit, onDark, big ? 1.32 : 1.18)}`;
}
function khatafaLabel(mode) {
  if (mode === 'khatafa_finish') return ' 🏆 خطفة 2000';
  if (mode === 'khatafa_double') return ' ⚡ خطفة 640';
  if (mode === 'match_2000') return ' 🏆 طره كامل 2000';
  return '';
}
function isReactionWindowOpen(room, actingTeam) {
  if (!room || room.status !== 'bidding' || !room.currentContract) return false;
  if (room.biddingLocked || room.currentContract.sameSuitMode) return false;
  if (!room.reactionUntil || Date.now() >= room.reactionUntil) return false;
  if (room.currentContract.multiplier !== 1) return false;
  if (room.currentContract.value === 500) return false;
  return room.currentContract.team !== actingTeam;
}
function firstOpenerSeat(room) {
  const e = (room.bidHistory || []).find(x => x.action === 'bid');
  return e ? e.seat : -1;
}

let _room = null, _mySeat = 0, _myTeamIs1 = true;
function spd() { const s = Number(_room && _room.speed); return (s === 0.7 || s === 1.5) ? s : 1; }
function dur(ms) { return Math.max(70, Math.round(ms / spd())); }
function anim(el, frames, opts) { try { if (el && el.animate) return el.animate(frames, opts); } catch (e) {} return null; }
function setText(el, txt) { if (el && el.textContent !== txt) el.textContent = txt; }
function setSig(el, sig, html) { if (!el) return; if (el.dataset.sig !== sig) { el.dataset.sig = sig; el.innerHTML = html; } }

let biddingLayoutReady = false;
function ensureBiddingLayout() {
  if (biddingLayoutReady) return;
  const box = document.getElementById('biddingBox');
  const controls = document.getElementById('myBidControls');
  if (!box || !controls) return;
  const title = document.getElementById('biddingTitle');
  if (title) title.remove();
  if (!document.getElementById('snatchRowHost')) {
    const host = document.createElement('div');
    host.id = 'snatchRowHost';
    box.insertBefore(host, controls);
  }
  const actions = controls.querySelector('.bid-actions');
  if (actions && actions.parentNode === controls) { actions.id = 'mainBidActions'; box.appendChild(actions); }
  controls.querySelectorAll('.muted').forEach(el => el.remove());
  const suitBtns = controls.querySelectorAll('.suit-btn');
  const order = ['spades', 'hearts', 'clubs', 'diamonds'];
  const explicitColors = { spades: '#0f141d', hearts: '#d41628', clubs: '#093d24', diamonds: '#e02020' };
  const suitTitles = { spades: 'سباطة', hearts: 'كوب', clubs: 'ترفل', diamonds: 'كارو' };
  suitBtns.forEach((btn, idx) => {
    const s = btn.getAttribute('data-suit') || order[idx];
    if (s) {
      btn.classList.add('suit-btn-' + s);
      btn.setAttribute('aria-label', suitTitles[s] || s);
      btn.setAttribute('title', suitTitles[s] || s);
      btn.innerHTML = getSuitSvg(s, 'bid-picker-svg', explicitColors[s]);
    }
  });
  biddingLayoutReady = true;
}
function forceDisplay(el, mode) { if (el) el.style.setProperty('display', mode, 'important'); }

function ensureSpeedBtn() {
  const bar = document.querySelector('#gameView .top-right-actions');
  if (!bar || document.getElementById('spdBtn')) return;
  const b = document.createElement('button');
  b.id = 'spdBtn'; b.type = 'button'; b.className = 'icon-btn spd-btn';
  b.title = 'سرعة اللعب (مولى الطاولة)';
  b.onclick = () => {
    const order = [0.7, 1, 1.5];
    const nx = order[(order.indexOf(spd()) + 1) % order.length];
    sendPacket({ type: 'host_set_speed', speed: nx });
  };
  bar.insertBefore(b, bar.querySelector('.exit-btn') || null);
}
function paintSpeedBtn() {
  ensureSpeedBtn();
  const b = document.getElementById('spdBtn');
  const s = spd();
  if (b) { const t = s > 1.2 ? '⚡⚡' : (s < 0.9 ? '🐢' : '⚡'); if (b.textContent !== t) b.textContent = t; }
  const v = s > 1.2 ? 'fast' : (s < 0.9 ? 'slow' : 'normal');
  if (document.documentElement.dataset.spd !== v) document.documentElement.dataset.spd = v;
}

function resolvedCardWidth() {
  let probe = document.getElementById('cwProbe');
  if (!probe) {
    const host = document.getElementById('gameView') || document.body;
    probe = document.createElement('div');
    probe.id = 'cwProbe'; probe.setAttribute('aria-hidden', 'true');
    host.appendChild(probe);
  }
  const w = probe.getBoundingClientRect().width;
  return (w && w > 20) ? w : 90;
}

/* ===== بورتريهات Roi / Dame / Valet: تحميل مرة وحدة، فك ترميز مسبق، بلا وميض أبيض ===== */
const WIKI_COURT_URLS = {
  K: { spades: 'https://commons.wikimedia.org/wiki/Special:FilePath/King_of_spades_fr.svg', hearts: 'https://commons.wikimedia.org/wiki/Special:FilePath/King_of_hearts_fr.svg', clubs: 'https://commons.wikimedia.org/wiki/Special:FilePath/King_of_clubs_fr.svg', diamonds: 'https://commons.wikimedia.org/wiki/Special:FilePath/King_of_diamonds_fr.svg' },
  Q: { spades: 'https://commons.wikimedia.org/wiki/Special:FilePath/Queen_of_spades_fr.svg', hearts: 'https://commons.wikimedia.org/wiki/Special:FilePath/Queen_of_hearts_fr.svg', clubs: 'https://commons.wikimedia.org/wiki/Special:FilePath/Queen_of_clubs_fr.svg', diamonds: 'https://commons.wikimedia.org/wiki/Special:FilePath/Queen_of_diamonds_fr.svg' },
  J: { spades: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jack_of_spades_fr.svg', hearts: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jack_of_hearts_fr.svg', clubs: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jack_of_clubs_fr.svg', diamonds: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jack_of_diamonds_fr.svg' }
};
const COURT_READY = {};
const COURT_KEEPALIVE = {};
function upgradeCourtDom(key) {
  const info = COURT_READY[key];
  if (!info) return;
  document.querySelectorAll('.court[data-court-key="' + key + '"]').forEach(box => {
    let img = box.querySelector('img.court-wiki-img');
    if (!img) {
      img = document.createElement('img');
      img.className = 'court-wiki-img';
      img.alt = '';
      img.draggable = false;
      img.decoding = 'sync';
      img.setAttribute('data-court-key', key);
      box.appendChild(img);
    }
    if (img.getAttribute('src') !== info.url) img.setAttribute('src', info.url);
    requestAnimationFrame(() => img.classList.add('ready'));
  });
}
function markCourtReady(key, url, imgEl) {
  if (COURT_READY[key]) return;
  COURT_READY[key] = { url };
  COURT_KEEPALIVE[key] = imgEl;
  upgradeCourtDom(key);
}
(function preloadCourtPortraits() {
  try {
    Object.keys(WIKI_COURT_URLS).forEach(rKey => {
      Object.keys(WIKI_COURT_URLS[rKey]).forEach(sKey => {
        const key = rKey + '_' + sKey;
        const remote = WIKI_COURT_URLS[rKey][sKey];
        const finish = (url, im) => markCourtReady(key, url, im);
        const viaImage = () => {
          const im = new Image();
          im.decoding = 'sync';
          im.onload = () => finish(im.currentSrc || remote, im);
          im.onerror = () => {};
          im.src = remote;
        };
        if (typeof fetch === 'function' && typeof URL !== 'undefined' && URL.createObjectURL) {
          fetch(remote, { mode: 'cors', cache: 'force-cache' })
            .then(r => (r && r.ok) ? r.blob() : null)
            .then(blob => {
              if (!blob) { viaImage(); return; }
              const url = URL.createObjectURL(blob);
              const im = new Image();
              im.decoding = 'sync';
              const done = () => finish(url, im);
              im.onerror = () => { try { URL.revokeObjectURL(url); } catch (e) {} viaImage(); };
              im.src = url;
              if (im.decode) im.decode().then(done).catch(() => { if (im.complete) done(); else im.onload = done; });
              else if (im.complete) done(); else im.onload = done;
            })
            .catch(viaImage);
        } else viaImage();
      });
    });
  } catch (e) {}
})();

const FRENCH_COURT_NAMES = {
  K: { spades: 'DAVID', hearts: 'CHARLES', diamonds: 'CÉSAR', clubs: 'ALEXANDRE' },
  Q: { spades: 'PALLAS', hearts: 'JUDITH', diamonds: 'RACHEL', clubs: 'ARGINE' },
  J: { spades: 'OGIER', hearts: 'LA HIRE', diamonds: 'HECTOR', clubs: 'LANCELOT' }
};
function getCourtArt(rank, suit) {
  const rKey = (rank === 'R' ? 'K' : (rank === 'D' ? 'Q' : (rank === 'V' ? 'J' : rank)));
  const sKey = suit || 'spades';
  const key = rKey + '_' + sKey;
  const ready = COURT_READY[key];
  const charName = (FRENCH_COURT_NAMES[rKey] && FRENCH_COURT_NAMES[rKey][sKey]) ? FRENCH_COURT_NAMES[rKey][sKey] : '';
  const isRed = (sKey === 'hearts' || sKey === 'diamonds');
  const ROBE_1 = isRed ? '#b91c2c' : '#183668';
  const ROBE_2 = isRed ? '#1d3f7a' : '#a81c2a';
  const GOLD = '#eab84b', GOLD_DARK = '#8c5e14', SKIN = '#fce2c4', SKIN_SHADE = '#e4ba8e', HAIR = '#d8b467';
  let half = '';
  if (rKey === 'K') {
    half = `<path d="M16 72 C18 44 30 37 50 37 C70 37 82 44 84 72 Z" fill="${ROBE_1}" stroke="#14181f" stroke-width="1.3"/><path d="M30 38 L50 70 L70 38 Z" fill="${ROBE_2}" stroke="${GOLD}" stroke-width="1"/><path d="M43 39 L57 39 L54 72 L46 72 Z" fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width="0.9"/><circle cx="50" cy="48" r="2.2" fill="#b91c2c"/><circle cx="50" cy="58" r="2.2" fill="#183668"/><path d="M24 41 C28 34 72 34 76 41 L72 46 C60 42 40 42 28 46 Z" fill="#ffffff" stroke="#94a3b8" stroke-width="0.9"/><path d="M35 20 C31 25 32 35 37 38 L63 38 C68 35 69 25 65 20 Z" fill="${HAIR}" stroke="${GOLD_DARK}" stroke-width="0.9"/><rect x="38" y="18" width="24" height="20" rx="8" fill="${SKIN}" stroke="#8a5a2b" stroke-width="0.9"/><path d="M40 31 C43 38 57 38 60 31 L59 38 C54 43 46 43 41 38 Z" fill="#e5d5b5" stroke="#785c38" stroke-width="0.8"/><path d="M43 32 Q50 35 57 32" stroke="#6b4f2c" stroke-width="1.2" fill="none"/><circle cx="45.5" cy="25.5" r="1.4" fill="#14181f"/><circle cx="54.5" cy="25.5" r="1.4" fill="#14181f"/><path d="M43 23 Q45.5 21.8 48 23 M52 23 Q54.5 21.8 57 23" stroke="#5a3e1b" stroke-width="1" fill="none"/><path d="M50 25 L48.8 29.5 L51.2 29.5" stroke="${SKIN_SHADE}" stroke-width="1" fill="none"/><polygon points="33,19 37,7 43,15 50,4 57,15 63,7 67,19" fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width="1.2"/><rect x="35" y="17" width="30" height="4" rx="1.8" fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width="1"/><circle cx="43" cy="19" r="1.3" fill="#b91c2c"/><circle cx="50" cy="19" r="1.5" fill="#183668"/><circle cx="57" cy="19" r="1.3" fill="#b91c2c"/><rect x="75" y="12" width="3.5" height="54" rx="1.6" fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width="0.9"/><circle cx="76.7" cy="10" r="4.5" fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width="1"/>`;
  } else if (rKey === 'Q') {
    half = `<path d="M20 72 C22 45 32 38 50 38 C68 38 78 45 80 72 Z" fill="${ROBE_1}" stroke="#14181f" stroke-width="1.3"/><path d="M33 39 L50 68 L67 39 Z" fill="${ROBE_2}" stroke="${GOLD}" stroke-width="1"/><path d="M45 40 L55 40 L53 72 L47 72 Z" fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width="0.8"/><path d="M34 18 C27 26 28 38 35 42 L40 39 C35 33 35 25 38 19 Z" fill="#ffffff" stroke="#94a3b8" stroke-width="0.9"/><path d="M66 18 C73 26 72 38 65 42 L60 39 C65 33 65 25 62 19 Z" fill="#ffffff" stroke="#94a3b8" stroke-width="0.9"/><path d="M36 20 C34 26 35 33 39 36 L61 36 C65 33 66 26 64 20 Z" fill="${HAIR}" stroke="${GOLD_DARK}" stroke-width="0.9"/><rect x="40" y="19" width="20" height="18" rx="8.5" fill="${SKIN}" stroke="#8a5a2b" stroke-width="0.9"/><circle cx="46" cy="26.5" r="1.35" fill="#14181f"/><circle cx="54" cy="26.5" r="1.35" fill="#14181f"/><path d="M44 24.2 Q46 23 48 24.2 M52 24.2 Q54 23 56 24.2" stroke="#5a3e1b" stroke-width="0.9" fill="none"/><path d="M47 32.5 Q50 34.5 53 32.5" stroke="#c83e4d" stroke-width="1.3" fill="none"/><polygon points="36,19 40,9 45,16 50,6 55,16 60,9 64,19" fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width="1.2"/><rect x="38" y="17.5" width="24" height="3.5" rx="1.6" fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width="0.9"/><path d="M27 50 L27 68" stroke="#15803d" stroke-width="2.5" stroke-linecap="round"/><circle cx="27" cy="48" r="5.5" fill="#dc2626" stroke="${GOLD_DARK}" stroke-width="0.9"/><circle cx="27" cy="48" r="2.2" fill="${GOLD}"/>`;
  } else {
    half = `<path d="M22 72 C24 45 33 38 50 38 C67 38 76 45 78 72 Z" fill="${ROBE_2}" stroke="#14181f" stroke-width="1.3"/><path d="M35 39 L65 39 L59 72 L41 72 Z" fill="${ROBE_1}" stroke="${GOLD}" stroke-width="1"/><path d="M44 39 L48 39 L47 72 L43 72 Z M52 39 L56 39 L57 72 L53 72 Z" fill="${GOLD}"/><path d="M32 39 L50 45 L68 39 L64 35 L36 35 Z" fill="#ffffff" stroke="#94a3b8" stroke-width="0.9"/><path d="M35 21 C31 27 32 34 38 36 L62 36 C68 34 69 27 65 21 Z" fill="${HAIR}" stroke="${GOLD_DARK}" stroke-width="0.9"/><rect x="40" y="19.5" width="20" height="17" rx="7.5" fill="${SKIN}" stroke="#8a5a2b" stroke-width="0.9"/><circle cx="46" cy="26.5" r="1.35" fill="#14181f"/><circle cx="54" cy="26.5" r="1.35" fill="#14181f"/><path d="M47 32 Q50 33.6 53 32" stroke="#8a4b38" stroke-width="1.1" fill="none"/><polygon points="30,19 50,7 70,19 64,23 36,23" fill="${ROBE_1}" stroke="#14181f" stroke-width="1.2"/><rect x="35" y="18.5" width="30" height="3.5" rx="1.5" fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width="0.9"/><rect x="74" y="12" width="3.2" height="58" rx="1.5" fill="#78350f" stroke="#14181f" stroke-width="0.8"/><polygon points="75.6,2 83,14 75.6,20 69,14" fill="#cbd5e1" stroke="#334155" stroke-width="1"/>`;
  }
  const svg = `<svg class="court-fallback-svg" viewBox="0 0 100 144" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><rect x="0" y="0" width="100" height="144" fill="#fffdf7"/><g>${half}</g><g transform="rotate(180 50 72)">${half}</g><line x1="2" y1="142" x2="98" y2="2" stroke="#fffdf7" stroke-width="5.5"/><line x1="2" y1="142" x2="98" y2="2" stroke="${GOLD}" stroke-width="1.6"/><text x="8" y="66" font-size="6.2" font-weight="900" fill="#334155" transform="rotate(-90 8 66)" letter-spacing="0.6">${charName}</text></svg>`;
  const img = ready ? `<img class="court-wiki-img ready" data-court-key="${key}" src="${ready.url}" alt="" decoding="sync" draggable="false">` : '';
  return svg + img;
}
const PIP_MAP = {
  '7': [[35, 21], [65, 21], [50, 36], [35, 50], [65, 50], [35, 79], [65, 79]],
  '8': [[35, 21], [65, 21], [50, 35], [35, 50], [65, 50], [50, 65], [35, 79], [65, 79]],
  '9': [[35, 20], [65, 20], [35, 40], [65, 40], [50, 50], [35, 60], [65, 60], [35, 80], [65, 80]],
  '10': [[35, 20], [65, 20], [50, 31], [35, 40], [65, 40], [35, 60], [65, 60], [50, 69], [35, 80], [65, 80]]
};
function courtKeyOf(card) {
  const r = card.rank;
  const rKey = (r === 'K' || r === 'R') ? 'K' : (r === 'Q' || r === 'D') ? 'Q' : (r === 'J' || r === 'V') ? 'J' : null;
  return rKey ? (rKey + '_' + card.suit) : null;
}
function getCardInnerElements(card) {
  const dr = beloteRankLabel(card.rank);
  const col = suitColorFor(card.suit, false);
  const cornerSuitSvg = getSuitSvg(card.suit, 'corner-suit-svg', col);
  const corners = `<div class="card-corner tl"><span>${dr}</span><span class="cs">${cornerSuitSvg}</span></div><div class="card-corner br"><span>${dr}</span><span class="cs">${cornerSuitSvg}</span></div>`;
  let body;
  const ck = courtKeyOf(card);
  if (ck) {
    body = `<div class="court" data-court-key="${ck}">${getCourtArt(card.rank, card.suit)}</div>`;
  } else if (card.rank === 'A' || card.rank === '1') {
    body = `<div class="pip-ace">${getSuitSvg(card.suit, 'ace-suit-svg', col)}</div>`;
  } else {
    const pipSvg = getSuitSvg(card.suit, 'pip-suit-svg', col);
    body = (PIP_MAP[card.rank] || PIP_MAP['7']).map(p => `<span class="pip${p[1] > 52 ? ' flip' : ''}" style="left:${p[0]}%;top:${p[1]}%;">${pipSvg}</span>`).join('');
  }
  return corners + body;
}
function getCardSuitClass(suit) {
  const red = (suit === 'hearts' || suit === 'diamonds');
  return `${red ? 'red-suit' : 'black-suit'} suit-card-${suit}`;
}
function createCardHTML(card) {
  return `<div class="playing-card ${getCardSuitClass(card.suit)}" style="margin:0;cursor:default;">${getCardInnerElements(card)}</div>`;
}
function computeLocalTrickWinner(trick, trumpSuit) {
  if (!trick || !trick.length) return null;
  const ledSuit = trick[0].card.suit; let best = trick[0];
  for (let i = 1; i < trick.length; i++) {
    const c = trick[i];
    const bT = best.card.suit === trumpSuit, cT = c.card.suit === trumpSuit;
    if (cT && !bT) best = c;
    else if (cT && bT) { if (POWER_TRUMP[c.card.rank] > POWER_TRUMP[best.card.rank]) best = c; }
    else if (!cT && !bT && c.card.suit === ledSuit) { if (POWER_NORMAL[c.card.rank] > POWER_NORMAL[best.card.rank]) best = c; }
  }
  return best;
}
function trickPointsOf(trick, trumpSuit) {
  return (trick || []).reduce((s, p) => s + (p.card.suit === trumpSuit ? POINTS_TRUMP[p.card.rank] : POINTS_NORMAL[p.card.rank]), 0);
}

/* ===== شكل المعين: فوق / يسار / يمين / تحت — قراب وبلا تراكب ===== */
const DIR_OF = { top: 'n', left: 'w', right: 'e', bottom: 's' };
const ARROW_OF = { top: '▲', left: '◀', right: '▶', bottom: '▼' };
function computeTrickLayout(W, H) {
  const rad = 2.4 * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const wF = cos + 1.4 * sin;
  const hF = 1.4 * cos + sin;
  const gx = Math.max(6, Math.min(15, W * 0.017));
  const gv = Math.max(6, Math.min(15, H * 0.024));
  const tagH = 18;
  const availW = W * 0.92;
  const availH = H * 0.94 - 2 * tagH;
  let w = (availW - 2 * gx) / (3 * wF);
  w = Math.min(w, (availH - gv) / (2 * hF));
  w = Math.max(30, Math.min(150, Math.floor(w)));
  const h = Math.round(w * 1.4);
  const wEff = w * wF, hEff = h * hF;
  const dh = wEff + gx;
  const dv = (hEff + gv) / 2;
  const cx = W / 2, cy = H / 2;
  const mk = (px, py, rot, tag, ord) => ({
    x: Math.round(px - w / 2), y: Math.round(py - h / 2), rot, tag, ord, cx: px, cy: py
  });
  return {
    w, h, dh, dv,
    slots: {
      n: mk(cx, cy - dv, 0, 'tag-above', 'ord-tr'),
      w: mk(cx - dh, cy, -2.4, 'tag-below', 'ord-tr'),
      e: mk(cx + dh, cy, 2.4, 'tag-below', 'ord-tr'),
      s: mk(cx, cy + dv, 0, 'tag-below', 'ord-br')
    }
  };
}
function seatOffset(dir, layout, rect, posName) {
  const s = layout.slots[dir];
  const cx = rect.left + s.x + layout.w / 2;
  const cy = rect.top + s.y + layout.h / 2;
  const el = document.getElementById('slot' + posName.charAt(0).toUpperCase() + posName.slice(1));
  if (!el) return { dx: 0, dy: dir === 'n' ? -130 : dir === 's' ? 130 : (dir === 'w' ? -160 : 160) };
  const r = el.getBoundingClientRect();
  return { dx: Math.round((r.left + r.width / 2) - cx), dy: Math.round((r.top + r.height / 2) - cy) };
}

let pendingPlay = null, pendingTimer = null;
let isCollecting = false, collectionTimers = [], lastTrickKey = '';
function clearCollectionTimers() {
  collectionTimers.forEach(t => clearTimeout(t));
  collectionTimers = [];
  document.querySelectorAll('.player-slot.trick-winner-glow').forEach(el => el.classList.remove('trick-winner-glow'));
}
function clearPending() {
  if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
  if (pendingPlay) {
    const el = document.querySelector(`#myHandContainer [data-card-id="${pendingPlay.cardId}"]`);
    if (el) el.classList.remove('pending', 'launching', 'selected');
  }
  pendingPlay = null;
  const c = document.getElementById('centerTableArea');
  if (c) Array.from(c.querySelectorAll('.ghost')).forEach(g => g.remove());
}

function renderTrick(room) {
  const center = document.getElementById('centerTableArea');
  if (!center) return;
  const rect = center.getBoundingClientRect();
  if (rect.width < 60 || rect.height < 60) return;
  const L = computeTrickLayout(rect.width, rect.height);
  const trick = room.currentTrick || [];
  const tKey = trick.map(p => p.card.id + ':' + p.seat).join('|');
  const isNewTrick = tKey !== lastTrickKey;
  if (isNewTrick && trick.length < 4) { isCollecting = false; clearCollectionTimers(); }
  if (pendingPlay && trick.some(p => p.card.id === pendingPlay.cardId)) clearPending();

  const plays = trick.map((p, i) => ({ key: p.card.id + ':' + p.seat, seat: p.seat, card: p.card, isCut: p.isCut, isOvercut: p.isOvercut, ghost: false, ord: i + 1 }));
  if (pendingPlay && !trick.some(p => p.card.id === pendingPlay.cardId) && trick.length < 4) {
    plays.push({ key: 'GHOST:' + pendingPlay.cardId, seat: pendingPlay.seat, card: pendingPlay.card, ghost: true, ord: plays.length + 1 });
  }
  const keys = new Set(plays.map(p => p.key));
  Array.from(center.children).forEach(ch => { if (!keys.has(ch.dataset.playKey)) ch.remove(); });

  plays.forEach(p => {
    const posName = getRelativePosition(p.seat, _mySeat).toLowerCase();
    const dir = DIR_OF[posName];
    const s = L.slots[dir];
    let wrap = center.querySelector('[data-play-key="' + p.key + '"]');
    const teamCls = ((p.seat % 2 === 0) === _myTeamIs1) ? 'team-nous' : 'team-vous';
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.dataset.playKey = p.key;
      const nm = (room.seats[p.seat] && room.seats[p.seat].name) ? String(room.seats[p.seat].name).split(' ')[0].substring(0, 9) : '';
      const tag = p.isOvercut ? '<div class="cut-tag overcut">🔥 علّى!</div>' : (p.isCut ? '<div class="cut-tag">✂️ قصّ!</div>' : '');
      wrap.innerHTML = tag + createCardHTML(p.card) + `<span class="ord-badge">${p.ord}</span><span class="who-tag">${ARROW_OF[posName]} ${escapeHtml(nm)}</span>`;
      center.appendChild(wrap);
      wrap.style.left = s.x + 'px';
      wrap.style.top = s.y + 'px';
      wrap.style.setProperty('--card-w', L.w + 'px');
      wrap.style.transform = `rotate(${s.rot}deg)`;
      wrap.style.zIndex = String(10 + p.ord);
      if (!p.ghost && !isCollecting && isNewTrick) {
        const off = seatOffset(dir, L, rect, posName);
        anim(wrap, [
          { transform: `translate(${off.dx}px,${off.dy}px) scale(.66) rotate(0deg)`, opacity: .25 },
          { transform: `translate(0,0) scale(1) rotate(${s.rot}deg)`, opacity: 1 }
        ], { duration: dur(320), easing: 'cubic-bezier(.22,1,.36,1)' });
      } else if (p.ghost) {
        anim(wrap, [
          { transform: `translateY(16px) scale(.92) rotate(${s.rot}deg)`, opacity: 0 },
          { transform: `rotate(${s.rot}deg)`, opacity: .5 }
        ], { duration: dur(170), easing: 'ease-out' });
      }
    } else {
      wrap.style.left = s.x + 'px';
      wrap.style.top = s.y + 'px';
      wrap.style.setProperty('--card-w', L.w + 'px');
      if (!isCollecting) { wrap.style.transform = `rotate(${s.rot}deg)`; wrap.style.zIndex = String(10 + p.ord); }
      const ob = wrap.querySelector('.ord-badge');
      if (ob) setText(ob, String(p.ord));
      const ck = courtKeyOf(p.card);
      if (ck && COURT_READY[ck] && !wrap.querySelector('img.court-wiki-img')) upgradeCourtDom(ck);
    }
    wrap.className = 'trick-card-pos ' + teamCls + ' ' + s.tag + ' ' + s.ord + (p.ghost ? ' ghost' : '');
    wrap.dataset.dir = dir;
    const wt = wrap.querySelector('.who-tag');
    if (wt) wt.style.maxWidth = Math.round(L.w * 1.15) + 'px';
  });
  lastTrickKey = tKey;

  if (trick.length === 4 && !isCollecting) {
    isCollecting = true;
    clearPending();
    const w = computeLocalTrickWinner(trick, room.trumpSuit);
    const ws = w ? w.seat : trick[0].seat;
    const wp = getRelativePosition(ws, _mySeat);
    const winKey = w ? (w.card.id + ':' + w.seat) : null;
    collectionTimers.push(setTimeout(() => {
      const winWrap = winKey ? center.querySelector('[data-play-key="' + winKey + '"]') : null;
      if (winWrap) { winWrap.classList.add('win'); winWrap.style.zIndex = '60'; }
      const winSlot = document.getElementById('slot' + wp);
      if (winSlot) winSlot.classList.add('trick-winner-glow');
      collectionTimers.push(setTimeout(() => {
        const r2 = center.getBoundingClientRect();
        const L2 = computeTrickLayout(r2.width, r2.height);
        const wd = DIR_OF[wp.toLowerCase()];
        const off = seatOffset(wd, L2, r2, wp.toLowerCase());
        Array.from(center.querySelectorAll('.trick-card-pos')).forEach((wEl, i) => {
          const d = wEl.dataset.dir || 'n';
          const rot = L2.slots[d].rot;
          const a = anim(wEl, [
            { transform: `translate(0,0) scale(1) rotate(${rot}deg)`, opacity: 1 },
            { transform: `translate(${off.dx}px,${off.dy}px) scale(.42) rotate(${rot + (i * 6 - 9)}deg)`, opacity: 0 }
          ], { duration: dur(420), delay: i * dur(38), easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
          if (!a) wEl.style.opacity = '0';
        });
        try { playGameSound({ type: 'plie_collect', ts: Date.now() }); } catch (e) {}
        collectionTimers.push(setTimeout(() => { if (winSlot) winSlot.classList.remove('trick-winner-glow'); }, dur(780)));
      }, dur(420)));
    }, dur(320)));
  }
}

function sumChip(txt, bg, bd, col) {
  return `<span style="display:inline-block;padding:5px 13px;border-radius:999px;border:1px solid ${bd};background:${bg};color:${col};font-size:.74rem;font-weight:900;margin:2px;white-space:nowrap;">${txt}</span>`;
}
function buildRoundSummaryHtml(room, sum, myTeamIs1) {
  const cLabel = sum.contractValue === 500 ? 'كبوت' : sum.contractValue;
  const tBadge = room.trumpSuit ? suitInlineBadgeHtml(room.trumpSuit, true, 1.2) : '';
  const didWeTake = (sum.takerTeam === (myTeamIs1 ? 1 : 2));
  let chips = '';
  chips += sumChip(`العقد <b style="font-size:1.05em;">${cLabel}</b>${tBadge}`, 'rgba(230,180,85,.15)', 'rgba(230,180,85,.55)', '#ffe9a8');
  chips += sumChip(`عند <b>${didWeTake ? '🟦 نحن' : '🟧 هم'}</b>`, didWeTake ? 'rgba(53,200,240,.15)' : 'rgba(255,157,61,.15)', didWeTake ? 'rgba(53,200,240,.55)' : 'rgba(255,157,61,.55)', didWeTake ? '#9fe6ff' : '#ffd0a1');
  chips += sum.contractSucceeded ? sumChip('✅ نجح', 'rgba(53,208,127,.16)', 'rgba(53,208,127,.6)', '#7bf0b4') : sumChip('❌ طاح', 'rgba(255,90,90,.16)', 'rgba(255,90,90,.6)', '#ffb3b3');
  if (sum.sameSuitMode === 'khatafa_finish') chips += sumChip('🏆 خطفة 2000', 'rgba(230,180,85,.16)', 'rgba(230,180,85,.6)', '#ffe9a8');
  else if (sum.sameSuitMode === 'khatafa_double') chips += sumChip('⚡ خطفة 640', 'rgba(230,180,85,.16)', 'rgba(230,180,85,.6)', '#ffe9a8');
  else if (sum.multiplier === 4) chips += sumChip('⚡ سوركونتري 640', 'rgba(167,139,250,.2)', 'rgba(167,139,250,.65)', '#d6ccff');
  else if (sum.multiplier === 2) chips += sumChip('🔥 كونتري 320', 'rgba(255,90,90,.16)', 'rgba(255,90,90,.55)', '#ffc4c4');
  if (sum.isKass && sum.rawTakerPts != null) chips += sumChip(`🧮 كاص ${sum.rawTakerPts} → <b>${sum.effectiveTakerPts}</b>`, 'rgba(245,184,61,.16)', 'rgba(245,184,61,.6)', '#ffe1a3');
  if (sum.isCapot && sum.contractSucceeded) chips += sumChip(sum.contractValue === 500 ? '🔥 كبوت معلن' : '🔥 كبوط عربي 250', 'rgba(216,31,47,.2)', 'rgba(216,31,47,.65)', '#ffc4c4');
  if (room.payoutInfo && room.payoutInfo.prize) chips += sumChip(`🪙 +${room.payoutInfo.prize} لكل رابح`, 'rgba(53,208,127,.18)', 'rgba(53,208,127,.65)', '#8ff0bb');
  const teams = [
    { label: '🟦 نحن', col: '#9fe6ff', bg: 'rgba(53,200,240,.08)', cards: myTeamIs1 ? (sum.rawCardsTeam1 ?? 0) : (sum.rawCardsTeam2 ?? 0), farcha: myTeamIs1 ? (sum.farchaTeam1 ?? 0) : (sum.farchaTeam2 ?? 0), belote: myTeamIs1 ? (sum.beloteTeam1 ?? 0) : (sum.beloteTeam2 ?? 0), raw: myTeamIs1 ? sum.rawTotalTeam1 : sum.rawTotalTeam2, rec: myTeamIs1 ? sum.recordedTeam1 : sum.recordedTeam2, kass: myTeamIs1 ? sum.isKassTeam1 : sum.isKassTeam2, round: myTeamIs1 ? sum.team1Round : sum.team2Round, total: myTeamIs1 ? sum.totalTeam1 : sum.totalTeam2 },
    { label: '🟧 هم', col: '#ffd0a1', bg: 'rgba(255,157,61,.08)', cards: myTeamIs1 ? (sum.rawCardsTeam2 ?? 0) : (sum.rawCardsTeam1 ?? 0), farcha: myTeamIs1 ? (sum.farchaTeam2 ?? 0) : (sum.farchaTeam1 ?? 0), belote: myTeamIs1 ? (sum.beloteTeam2 ?? 0) : (sum.beloteTeam1 ?? 0), raw: myTeamIs1 ? sum.rawTotalTeam2 : sum.rawTotalTeam1, rec: myTeamIs1 ? sum.recordedTeam2 : sum.recordedTeam1, kass: myTeamIs1 ? sum.isKassTeam2 : sum.isKassTeam1, round: myTeamIs1 ? sum.team2Round : sum.team1Round, total: myTeamIs1 ? sum.totalTeam2 : sum.totalTeam1 }
  ];
  const winIdx = teams[0].round >= teams[1].round ? 0 : 1;
  const cell = 'padding:9px 4px;text-align:center;';
  let rows = '';
  teams.forEach((t, i) => {
    const isWin = (i === winIdx && t.round > 0);
    const rc = t.round > 0 ? '#7bf0b4' : '#9fb3a8';
    let sub = '';
    if (t.rec != null && t.raw != null && t.rec !== t.raw) sub = `<div style="font-size:.62rem;color:${t.kass ? '#ffe1a3' : '#9fb3a8'};font-weight:800;margin-top:2px;">${t.raw} → ${t.kass ? 'كاص' : 'صحاح'} ${t.rec}</div>`;
    rows += `<tr style="background:${isWin ? 'rgba(53,208,127,.12)' : t.bg};border-top:1px solid rgba(255,255,255,.1);"><td style="${cell}font-weight:900;color:${t.col};white-space:nowrap;">${t.label}${isWin ? ' 🏆' : ''}</td><td style="${cell}font-weight:800;">${t.cards}</td><td style="${cell}font-weight:800;">${t.farcha}</td><td style="${cell}font-weight:800;">${t.belote}</td><td style="${cell}"><b style="font-size:1.14rem;color:${rc};">+${t.round}</b>${sub}</td><td style="${cell}font-weight:900;color:#ffe9a8;font-size:1.04rem;">${t.total}</td></tr>`;
  });
  const table = `<table style="width:100%;border-collapse:collapse;font-size:.82rem;margin:12px 0 5px;direction:rtl;"><thead><tr style="color:#9fb3a8;font-size:.68rem;font-weight:900;"><th style="padding:6px;">الفريق</th><th style="padding:6px;">أوراق</th><th style="padding:6px;">فرشة</th><th style="padding:6px;">بلوت</th><th style="padding:6px;">الطرح</th><th style="padding:6px;">الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>`;
  const legend = (teams[0].kass || teams[1].kass || sum.isKass) ? `<div style="font-size:.66rem;color:#9fb3a8;margin-top:5px;">🧮 <b style="color:#ffe1a3;">الكاص:</b> الآحاد 5/6/7 تُكمّل للعشرة العليا.</div>` : '';
  return `<div style="text-align:center;line-height:2;">${chips}</div>${table}${legend}`;
}

function ensureLastJaryaPanel() {
  let p = document.getElementById('lastJaryaPanel');
  if (!p) {
    const rail = document.querySelector('.rail-left');
    if (!rail) return;
    p = document.createElement('section');
    p.id = 'lastJaryaPanel'; p.className = 'side-card jarya-card'; p.setAttribute('dir', 'ltr');
    p.innerHTML = '<div class="sc-title" dir="rtl">🎲 آخر جَرية</div><div class="lj-grid" id="ljGrid" dir="ltr"></div>';
    rail.appendChild(p);
  }
  p.style.setProperty('direction', 'ltr', 'important');
  const g = document.getElementById('ljGrid');
  if (g) { g.setAttribute('dir', 'ltr'); g.style.setProperty('direction', 'ltr', 'important'); }
}
function renderLastJaryaPanel(room, mySeat) {
  ensureLastJaryaPanel();
  const panel = document.getElementById('lastJaryaPanel');
  const grid = document.getElementById('ljGrid');
  if (!panel || !grid) return;
  const lt = room.lastTrickCards || [];
  if (!lt.length || room.status === 'waiting' || room.status === 'bidding') { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  const winSeat = room.lastTrickWinnerSeat;
  const sig = lt.map(p => p.card.id + p.seat).join('|') + '|' + winSeat + '|' + mySeat;
  if (grid.dataset.sig === sig) return;
  grid.dataset.sig = sig;
  const map = { Bottom: ['lj-s', 'grid-column:2;grid-row:3;'], Top: ['lj-n', 'grid-column:2;grid-row:1;'], Left: ['lj-w', 'grid-column:1;grid-row:2;'], Right: ['lj-e', 'grid-column:3;grid-row:2;'] };
  let cells = '';
  lt.forEach((p, i) => {
    const m = map[getRelativePosition(p.seat, mySeat)] || map.Bottom;
    const isWin = p.seat === winSeat;
    const red = (p.card.suit === 'hearts' || p.card.suit === 'diamonds');
    const col = suitColorFor(p.card.suit, false);
    cells += `<div class="lj-cell ${m[0]} ${isWin ? 'lj-win' : ''}" style="${m[1]}"><div class="lj-card ${red ? 'lj-red' : ''} lj-suit-${p.card.suit}"><b>${beloteRankLabel(p.card.rank)}</b><i>${getSuitSvg(p.card.suit, 'lj-suit-svg', col)}</i></div><span class="lj-ord">${isWin ? '★' : (i + 1)}</span></div>`;
  });
  const wName = winSeat != null && room.seats[winSeat] ? String(room.seats[winSeat].name).split(' ')[0].substring(0, 6) : '';
  cells += `<div class="lj-mid" dir="rtl" style="grid-column:2;grid-row:2;">${escapeHtml(wName)}</div>`;
  grid.innerHTML = cells;
}
function renderTricksCard(room, myTeamIs1) {
  const card = document.getElementById('tricksCard');
  if (!card) return;
  const show = room.status === 'playing' || room.status === 'round_end' || room.status === 'game_over';
  card.style.display = show ? 'block' : 'none';
  if (!show) return;
  const n = myTeamIs1 ? (room.tricksWon?.team1 || 0) : (room.tricksWon?.team2 || 0);
  const v = myTeamIs1 ? (room.tricksWon?.team2 || 0) : (room.tricksWon?.team1 || 0);
  const pips = document.getElementById('tkPips');
  if (pips && pips.dataset.sig !== n + '|' + v) {
    pips.dataset.sig = n + '|' + v;
    let h = '';
    for (let i = 0; i < 8; i++) h += `<span class="tk-pip ${i < n ? 'n' : (i < n + v ? 'v' : '')}"></span>`;
    pips.innerHTML = h;
  }
  setText(document.getElementById('tkNous'), String(n));
  setText(document.getElementById('tkVous'), String(v));
  const note = document.getElementById('tkNote');
  if (note) setText(note, (n + v) >= 7 ? '🔥 الفرشة +10 للجَرية الأخيرة' : 'الفرشة +10 لآخر جَرية');
}
function renderPot(room) {
  const pot = document.getElementById('potBadge');
  if (!pot) return;
  const trick = room.currentTrick || [];
  if (room.status !== 'playing' || !trick.length) { pot.classList.remove('show'); return; }
  pot.classList.add('show');
  const val = String(trickPointsOf(trick, room.trumpSuit));
  if (pot.dataset.v !== val) { pot.dataset.v = val; pot.innerHTML = `<b>${val}</b><small>نقطة</small>`; }
}

const HAND_STEP = 0.68;
let _lastHandCW = 0, _lastAvailW = -1;
function layoutHandSize(hand, n) {
  const wrap = hand.parentElement;
  const availRaw = wrap ? wrap.getBoundingClientRect().width : hand.getBoundingClientRect().width;
  const avail = Math.max(160, Math.floor(availRaw) - 10);
  const rootCW = resolvedCardWidth();
  const refCount = Math.max(8, n || 8);
  const denom = 1 + HAND_STEP * (refCount - 1);
  let cw = Math.min(rootCW, (avail * 0.985) / denom);
  cw = Math.max(44, Math.floor(cw));
  if (cw !== _lastHandCW || avail !== _lastAvailW) {
    _lastHandCW = cw; _lastAvailW = avail;
    hand.style.setProperty('--card-w', cw + 'px');
  }
  return cw;
}

let selectedCardId = null;
let autoPlayTimer = null, autoPlayKey = '';
function paintHandSelection() {
  const hand = document.getElementById('myHandContainer');
  if (!hand) return;
  Array.from(hand.children).forEach(el => {
    const on = el.dataset.cardId === String(selectedCardId) && el.classList.contains('playable');
    el.classList.toggle('selected', on);
  });
  _bannerSig = '';
  paintTurnBanner();
}
function playNow(card, el) {
  if (pendingPlay) return;
  pendingPlay = { cardId: card.id, card, seat: _mySeat, ts: Date.now() };
  selectedCardId = null;
  if (el) { el.classList.remove('selected'); el.classList.add('launching'); setTimeout(() => { if (el) el.classList.add('pending'); }, 90); }
  if (navigator.vibrate) { try { navigator.vibrate(14); } catch (e) {} }
  renderTrick(_room);
  sendPacket({ type: 'play_card', cardId: card.id });
  _bannerSig = '';
  paintTurnBanner();
  pendingTimer = setTimeout(() => { clearPending(); if (_room) renderTrick(_room); }, 2600);
}

function renderGameTable(room) {
  if (!room) return;
  _room = room;
  _mySeat = room.mySeat >= 0 ? room.mySeat : 0;
  _myTeamIs1 = (_mySeat % 2 === 0);
  const mySeat = _mySeat, myTeamIs1 = _myTeamIs1;
  const target = room.targetScore || 2000;
  const opener = firstOpenerSeat(room);
  paintSpeedBtn();
  setText(document.getElementById('hudTargetScore'), `الهدف ${target}`);
  if (room.lastSoundEvent) { try { playGameSound(room.lastSoundEvent); } catch (e) {} }

  const nousTotal = myTeamIs1 ? room.totalScores.team1 : room.totalScores.team2;
  const vousTotal = myTeamIs1 ? room.totalScores.team2 : room.totalScores.team1;
  setText(document.getElementById('paperNousQuick'), String(nousTotal));
  setText(document.getElementById('paperVousQuick'), String(vousTotal));
  setText(document.getElementById('scorePaperTotalNous'), String(nousTotal));
  setText(document.getElementById('scorePaperTotalVous'), String(vousTotal));

  const paperRows = document.getElementById('scorePaperRows');
  const hist = room.scoreHistory || [];
  const paperSig = hist.length + '|' + nousTotal + '|' + vousTotal;
  if (paperRows && paperRows.dataset.sig !== paperSig) {
    paperRows.dataset.sig = paperSig;
    paperRows.innerHTML = hist.length ? hist.map(r => {
      const nR = myTeamIs1 ? r.nousRound : r.vousRound, vR = myTeamIs1 ? r.vousRound : r.nousRound;
      const nT = myTeamIs1 ? r.nousTotal : r.vousTotal, vT = myTeamIs1 ? r.vousTotal : r.nousTotal;
      return `<tr><td style="border:1px solid #d9ab48;padding:6px;font-weight:900;">#${r.roundNum}</td><td style="border:1px solid #d9ab48;padding:6px;">${escapeHtml(r.contractText)}</td><td style="border:1px solid #d9ab48;padding:6px;color:#0b6f8f;"><b>+${nR}</b> (${nT})</td><td style="border:1px solid #d9ab48;padding:6px;color:#a4531a;"><b>+${vR}</b> (${vT})</td></tr>`;
    }).join('') : `<tr><td colspan="4" style="padding:12px;color:#8a7a55;">لم ينتهِ أي طرح بعد</td></tr>`;
  }

  const hud = document.getElementById('hudTrumpInfo');
  if (room.trumpSuit && room.currentContract) {
    const taker = room.seats[room.takerSeat] ? room.seats[room.takerSeat].name : '';
    const vTxt = room.currentContract.value === 500 ? 'كبوت 500' : room.currentContract.value;
    const mTxt = khatafaLabel(room.currentContract.sameSuitMode) || (room.currentContract.multiplier === 4 ? ' ⚡640' : (room.currentContract.multiplier === 2 ? ' 🔥320' : ''));
    setSig(hud, room.trumpSuit + vTxt + mTxt + taker, `الأتو ${suitInlineBadgeHtml(room.trumpSuit, true, 1.25)} • العقد <b>${vTxt}${mTxt}</b> • ${escapeHtml(taker)}`);
  } else {
    setSig(hud, room.status, room.status === 'waiting' ? 'بانتظار بدء اللعب' : 'المزايدة جارية — أقل فتحة 90');
  }

  const beloteBtn = document.getElementById('beloteArmBtn');
  if (beloteBtn) {
    if (room.status === 'playing' && room.beloteInfo && room.beloteInfo.canArm) {
      beloteBtn.style.display = 'inline-flex';
      beloteBtn.className = 'belote-declare-btn' + (room.beloteInfo.armed ? ' armed' : '');
      setText(beloteBtn, room.beloteInfo.armed ? '📢 البلوت ✅' : '🔇 البلوت +20؟');
    } else beloteBtn.style.display = 'none';
  }
  const ptb = document.getElementById('playThinkingBtn');
  if (ptb) ptb.style.display = (room.status === 'playing') ? 'inline-flex' : 'none';

  const bidEntries = (room.bidHistory || []).filter(x => x.action === 'bid');
  const lastBidSeat = bidEntries.length ? bidEntries[bidEntries.length - 1].seat : -1;

  for (let s = 0; s < 4; s++) {
    const pos = getRelativePosition(s, mySeat);
    const data = room.seats[s];
    const slot = document.getElementById('slot' + pos);
    if (!slot) continue;
    const isT1 = (s % 2 === 0);
    slot.classList.toggle('team-blue', isT1 !== myTeamIs1);
    slot.classList.toggle('is-opener', s === opener && room.status === 'bidding');
    setText(document.getElementById('name' + pos), data ? data.name : 'مقعد فارغ');
    const rPts = isT1 ? room.roundPoints.team1 : room.roundPoints.team2;
    const bPts = isT1 ? (room.beloteBonus?.team1 || 0) : (room.beloteBonus?.team2 || 0);
    const tPts = isT1 ? room.totalScores.team1 : room.totalScores.team2;
    setText(document.getElementById('roundPts' + pos), `${rPts} نقطة${bPts ? ` (+${bPts})` : ''}`);
    setText(document.getElementById('totalPts' + pos), `${tPts} / ${target}`);
    const dl = document.getElementById('dealer' + pos);
    if (dl) dl.classList.toggle('show', room.dealerSeat === s && room.status !== 'waiting');

    const say = room.lastActionBySeat ? room.lastActionBySeat[s] : '';
    const sp = document.getElementById('speech' + pos);
    if (sp && !slot.classList.contains('speaking-voice')) {
      const lb = room.lastBidBySeat ? room.lastBidBySeat[s] : null;
      const isB = (room.status === 'bidding');
      let cls = 'player-speech-bubble', html = '';
      if (room.thinkingSeat === s) { html = '⏱️ يخمّم'; cls += ' show thinking'; }
      else if (isB && say === 'باس') { html = '❌ باس'; cls += ' show passed'; }
      else if (isB && String(say).indexOf('🔥') === 0) { html = '🔥 كونتري 320'; cls += ' show contre'; }
      else if (isB && String(say).indexOf('⚡ سور') === 0) { html = '⚡ سوركونتري 640'; cls += ' show surcontre'; }
      else if (isB && lb) { html = (s === opener ? '🥇 فتح ' : '⬆ زيد ') + bidRichHtml(lb, false, true); cls += ' show' + (s === opener ? ' opener' : ''); }
      else if (say && (isB || (say !== 'باس' && String(say).indexOf('🔥') !== 0 && String(say).indexOf('⚡ سور') !== 0))) { html = escapeHtml(say); cls += ' show'; }
      if (sp.dataset.sig !== html + cls) { sp.dataset.sig = html + cls; sp.innerHTML = html; sp.className = cls; }
    }

    slot.classList.toggle('active-turn', room.turnSeat === s && (room.status === 'playing' || room.status === 'bidding'));
    const outline = (s === lastBidSeat && room.status === 'bidding') ? '2px solid rgba(230,180,85,.85)' : '';
    if (slot.style.outline !== outline) { slot.style.outline = outline; slot.style.outlineOffset = outline ? '2px' : ''; }

    let badge = '';
    if (room.takerSeat === s && room.trumpSuit && room.currentContract) {
      const cv = room.currentContract.value === 500 ? 'كبوت' : room.currentContract.value;
      const mShort = room.currentContract.multiplier === 4 ? ' ×4' : (room.currentContract.multiplier === 2 ? ' ×2' : '');
      badge = `<span class="trump-badge-mini">👑 ${cv}${mShort} ${suitInlineBadgeHtml(room.trumpSuit, false, 1.18)}</span>`;
    }
    const tbEl = document.getElementById('trumpBadge' + pos);
    if (tbEl && tbEl.dataset.lastBadge !== badge) { tbEl.dataset.lastBadge = badge; tbEl.innerHTML = badge; }

    if (pos !== 'Bottom') {
      const fan = document.getElementById('fan' + pos);
      const cnt = (room.cardCounts && room.cardCounts[s]) || 0;
      if (fan && fan.childElementCount !== cnt) {
        fan.innerHTML = '';
        for (let c = 0; c < cnt; c++) { const b = document.createElement('div'); b.className = 'card-back'; fan.appendChild(b); }
      }
    }
  }

  const wait = document.getElementById('waitingOverlay');
  if (wait) {
    if (room.status === 'waiting') {
      wait.style.display = 'block';
      setText(document.getElementById('waitingRoomTitle'), room.name);
      setText(document.getElementById('waitingRoomCode'), room.id);
      const isHost = (room.hostId === myPlayerId);
      const hab = document.getElementById('hostActionButtons');
      if (hab) hab.style.display = isHost ? 'flex' : 'none';
      const gwn = document.getElementById('guestWaitingNote');
      if (gwn) gwn.style.display = isHost ? 'none' : 'block';
      const cnt = room.seats.filter(Boolean).length;
      const sb = document.getElementById('startGameBtn');
      if (sb) { setText(sb, `▶️ ابدأ اللعب (${cnt}/4)`); sb.style.opacity = cnt === 4 ? '1' : '.6'; }
      if (typeof updateWaitingShareRow === 'function') updateWaitingShareRow(room);
      [0, 1, 2, 3].forEach(i => {
        const box = document.getElementById('seatBox' + i);
        if (!box) return;
        const p = room.seats[i];
        box.className = 'team-seat-row' + (selectedSwapSeat === i ? ' selected-swap' : '');
        const html = p
          ? `<span>👤 <b>${escapeHtml(p.name)}</b> ${p.id === room.hostId ? '👑' : ''}</span>${isHost && p.id !== myPlayerId ? `<button type="button" class="btn btn-red" style="padding:3px 9px;font-size:.72rem;min-height:30px;" onclick="event.stopPropagation(); hostKickSeat(${i})">إخراج</button>` : '<span style="font-size:.72rem;color:#9fb3a8;">اضغط للتبديل</span>'}`
          : `<span style="color:#9fb3a8;">مقعد فارغ (${i + 1})</span>`;
        if (box.dataset.sig !== html) { box.dataset.sig = html; box.innerHTML = html; }
      });
    } else wait.style.display = 'none';
  }

  const bidBox = document.getElementById('biddingBox');
  if (bidBox) {
    if (room.status === 'bidding') {
      ensureBiddingLayout();
      bidBox.style.display = 'flex';
      const banner = document.getElementById('currentContractBanner');
      const isContred = (room.currentContract && room.currentContract.multiplier >= 2);
      const isLocked = !!(room.biddingLocked || (room.currentContract && room.currentContract.sameSuitMode) || (room.currentContract && room.currentContract.value === 500));
      if (room.currentContract) {
        const c = room.currentContract;
        const holder = room.seats[c.seat] ? room.seats[c.seat].name : '';
        const vl = c.value === 500 ? 'كبوت' : c.value;
        const ml = khatafaLabel(c.sameSuitMode) || (c.multiplier === 4 ? ' ⚡640' : (c.multiplier === 2 ? ' 🔥320' : ''));
        const opName = opener >= 0 && room.seats[opener] ? room.seats[opener].name : '';
        setSig(banner, JSON.stringify(c) + holder + opName, `🥇 <b>${escapeHtml(opName)}</b> فتح • العقد <b style="font-size:1.15em;">${vl}</b>${suitInlineBadgeHtml(c.suit, true, 1.3)} عند <b>${escapeHtml(holder)}</b>${ml}`);
      } else setSig(banner, 'none', 'مازال ما فمّاش فتح — <b>أقل فتحة 90</b>');

      const turnPlayer = room.seats[room.turnSeat];
      const mine = (room.turnSeat === mySeat);
      const actingTeam = myTeamIs1 ? 1 : 2;
      const winOpen = isReactionWindowOpen(room, actingTeam);
      const turnEl = document.getElementById('biddingTurnText');
      const tHtml = mine
        ? (winOpen ? '🏃 خطفة متاحة! <span id="reactSecs" style="color:#ff9a9a;font-weight:900;"></span>' : '⚡ دورك — اختار رقم الطلبة ثم لون الأتو')
        : (winOpen ? `🏃 خطفة! <span id="reactSecs" style="color:#ff9a9a;font-weight:900;"></span> — دور ${turnPlayer ? escapeHtml(turnPlayer.name) : '...'}` : `⏳ دور ${turnPlayer ? escapeHtml(turnPlayer.name) : '...'}`);
      setSig(turnEl, tHtml, tHtml);

      const mainActions = document.getElementById('mainBidActions');
      const controls = document.getElementById('myBidControls');
      const vals = document.getElementById('bidValuesContainer');
      const suits = controls ? controls.querySelector('.suit-picker-btns') : null;
      const host = document.getElementById('snatchRowHost');
      let snatch = document.getElementById('snatchRow');
      if (!snatch && host) { snatch = document.createElement('div'); snatch.id = 'snatchRow'; snatch.style.cssText = 'display:none;gap:5px;width:100%;'; host.appendChild(snatch); }

      const eligible = room.currentContract && room.currentContract.team !== actingTeam && room.currentContract.multiplier === 1 && !room.currentContract.sameSuitMode && room.currentContract.value !== 500;
      const showSnatch = !isLocked && eligible && (mine || winOpen);
      const canSur = room.currentContract && room.currentContract.multiplier === 2 && room.currentContract.team === actingTeam && mine;
      if (snatch) {
        if (showSnatch) {
          const cs = room.currentContract.suit, cv = room.currentContract.value;
          let h = `<button type="button" class="btn btn-red snatch-btn" onclick="sendPacket({type:'bid',action:'contre'})">🔥 كونتري 320</button>`;
          h += `<button type="button" class="btn btn-gold snatch-btn" onclick="sendPacket({type:'bid',action:'bid',suit:'${cs}',value:${cv + 10}})">⚡ +10 (640)</button>`;
          if (cv + 20 <= 180) h += `<button type="button" class="btn btn-blue snatch-btn" onclick="sendPacket({type:'bid',action:'bid',suit:'${cs}',value:${cv + 20}})">🏆 +20 (2000)</button>`;
          if (snatch.dataset.sig !== h) { snatch.dataset.sig = h; snatch.innerHTML = h; }
          snatch.style.display = 'flex';
        } else if (snatch.style.display !== 'none') { snatch.style.display = 'none'; snatch.innerHTML = ''; snatch.dataset.sig = ''; }
      }
      const bc = document.getElementById('btnContre'), bs = document.getElementById('btnSurcontre');
      if (bc) bc.style.display = (!isLocked && eligible && mine) ? 'inline-flex' : 'none';
      if (bs) bs.style.display = canSur ? 'inline-flex' : 'none';

      if (isLocked) {
        if (mainActions) mainActions.style.display = 'none';
        forceDisplay(controls, 'none');
        setSig(turnEl, 'locked', '🔒 المزايدة انتهت — اللعب يبدا...');
      } else {
        if (mainActions) mainActions.style.display = mine ? 'flex' : 'none';
        forceDisplay(controls, mine ? 'flex' : 'none');
        if (isContred) { forceDisplay(vals, 'none'); forceDisplay(suits, 'none'); }
        else if (mine && vals) {
          forceDisplay(vals, 'flex'); forceDisplay(suits, 'flex');
          const minA = room.currentContract ? (room.currentContract.value >= 180 ? 500 : room.currentContract.value + 10) : 90;
          const key = room.currentContract ? `${room.currentContract.seat}_${room.currentContract.value}_${room.currentContract.suit}` : `e_${room.firstPlayerSeat}_${(room.scoreHistory || []).length}`;
          if (lastSeenContractKey !== key) { lastSeenContractKey = key; selectedBidValue = minA; }
          if (selectedBidValue < minA) selectedBidValue = minA;
          const vSig = key + '|' + selectedBidValue + '|' + minA;
          if (vals.dataset.sig !== vSig) {
            vals.dataset.sig = vSig;
            vals.innerHTML = '';
            VALID_BID_VALUES.forEach(v => {
              const b = document.createElement('button');
              b.type = 'button';
              b.className = 'bid-val-btn' + (selectedBidValue === v ? ' selected' : '');
              b.textContent = v === 500 ? 'كبوت' : v;
              b.disabled = (v < minA);
              b.onclick = () => { selectedBidValue = v; renderGameTable(_room); };
              vals.appendChild(b);
            });
            const sel = vals.querySelector('.selected');
            if (sel) requestAnimationFrame(() => { try { sel.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' }); } catch (e) {} });
          }
        }
      }
    } else bidBox.style.display = 'none';
  }

  renderTrick(room);

  const hand = document.getElementById('myHandContainer');
  if (hand) {
    const myCards = room.myHand || [];
    const valid = room.validCardIds || [];
    const myTurn = (room.status === 'playing' && room.turnSeat === mySeat);
    const n = myCards.length;
    layoutHandSize(hand, n);
    if (!myTurn) selectedCardId = null;
    const existingById = new Map();
    Array.from(hand.children).forEach(ch => { if (ch.dataset && ch.dataset.cardId) existingById.set(ch.dataset.cardId, ch); });
    const currentCardIds = new Set(myCards.map(c => String(c.id)));
    existingById.forEach((el, id) => { if (!currentCardIds.has(id)) { el.remove(); existingById.delete(id); } });
    myCards.forEach((card, i) => {
      const cid = String(card.id);
      const can = myTurn && valid.includes(card.id);
      const mid = (n - 1) / 2;
      const offset = i - mid;
      const ang = offset * 1.5;
      const yv = Math.pow(Math.abs(offset), 1.8) * 0.55;
      let el = existingById.get(cid);
      if (!el) {
        el = document.createElement('div');
        el.dataset.cardId = cid;
        el.innerHTML = getCardInnerElements(card);
      } else {
        const ck = courtKeyOf(card);
        if (ck && COURT_READY[ck] && !el.querySelector('img.court-wiki-img')) upgradeCourtDom(ck);
      }
      el.style.removeProperty('--card-w');
      const isPending = pendingPlay && pendingPlay.cardId === card.id;
      const isSel = can && selectedCardId === card.id && !isPending;
      const nextClass = `playing-card ${getCardSuitClass(card.suit)} ${can ? 'playable' : (myTurn ? 'disabled-card' : '')}${isSel ? ' selected' : ''}${isPending ? ' pending' : ''}`;
      if (el.className !== nextClass) el.className = nextClass;
      el.style.setProperty('--r', ang.toFixed(2) + 'deg');
      el.style.setProperty('--y', yv.toFixed(1) + 'px');
      el.onpointerdown = () => { if (can && !pendingPlay && selectedCardId !== card.id) el.classList.add('pressed'); };
      el.onpointerup = () => el.classList.remove('pressed');
      el.onpointercancel = () => el.classList.remove('pressed');
      el.onpointerleave = () => el.classList.remove('pressed');
      el.onclick = () => {
        el.classList.remove('pressed');
        if (!_room || _room.status !== 'playing') return;
        if (_room.turnSeat !== _mySeat) { showToast('⏳ ماهوش دورك توّة'); return; }
        if (pendingPlay) return;
        if (!can) {
          el.classList.add('shake');
          setTimeout(() => el.classList.remove('shake'), 300);
          sendPacket({ type: 'play_card', cardId: card.id });
          return;
        }
        if (selectedCardId === card.id) { playNow(card, el); return; }
        selectedCardId = card.id;
        if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }
        paintHandSelection();
      };
      if (hand.children[i] !== el) hand.insertBefore(el, hand.children[i] || null);
    });
    if (myTurn && valid.length === 1 && !pendingPlay) {
      const k = mySeat + '_' + valid[0] + '_' + n;
      if (autoPlayKey !== k) {
        autoPlayKey = k;
        if (autoPlayTimer) clearTimeout(autoPlayTimer);
        autoPlayTimer = setTimeout(() => {
          const c = (_room.myHand || []).find(x => x.id === valid[0]);
          const el2 = hand.querySelector('[data-card-id="' + valid[0] + '"]');
          if (c && _room.turnSeat === _mySeat && !pendingPlay) playNow(c, el2);
        }, dur(560));
      }
    } else {
      autoPlayKey = '';
      if (autoPlayTimer) { clearTimeout(autoPlayTimer); autoPlayTimer = null; }
    }
  }

  const sb = document.getElementById('roundSummaryBox');
  if (sb) {
    if ((room.status === 'round_end' || room.status === 'game_over') && room.lastRoundSummary) {
      sb.style.display = 'block';
      setText(document.getElementById('summaryHeader'), room.status === 'game_over' ? '🏆 نهاية المباراة!' : '📊 نتيجة الطرح');
      const det = document.getElementById('summaryDetails');
      const sig = JSON.stringify(room.lastRoundSummary) + '|' + myTeamIs1 + '|' + JSON.stringify(room.payoutInfo || null);
      if (det && det.dataset.sig !== sig) { det.dataset.sig = sig; det.innerHTML = buildRoundSummaryHtml(room, room.lastRoundSummary, myTeamIs1); }
    } else sb.style.display = 'none';
  }

  const cb = document.getElementById('chatBody');
  if (cb) {
    const chat = room.chat || [];
    const cSig = chat.length + '|' + (chat.length ? chat[chat.length - 1].text : '');
    if (cb.dataset.sig !== cSig) {
      cb.dataset.sig = cSig;
      cb.innerHTML = chat.map(c => c.isSystem ? `<div class="chat-line sys">${escapeHtml(c.text)}</div>` : `<div class="chat-line"><b>${escapeHtml(c.sender)}:</b> ${escapeHtml(c.text)}</div>`).join('');
      cb.scrollTop = cb.scrollHeight;
    }
  }

  renderPot(room);
  renderTricksCard(room, myTeamIs1);
  renderLastJaryaPanel(room, mySeat);
  enhanceTurnUI(room, mySeat);
  requestAnimationFrame(fitBiddingBox);
}

let _fitRaf = 0;
function fitBiddingBox() {
  const box = document.getElementById('biddingBox');
  if (!box || box.style.display === 'none') return;
  const vw = (window.visualViewport && window.visualViewport.width) ? window.visualViewport.width : window.innerWidth;
  const vh = (window.visualViewport && window.visualViewport.height) ? window.visualViewport.height : window.innerHeight;
  const bar = document.querySelector('#gameView .bar');
  const handEl = document.getElementById('myHandContainer');
  const barRect = bar ? bar.getBoundingClientRect() : null;
  const handRect = handEl ? handEl.getBoundingClientRect() : null;
  const topLimit = (barRect && barRect.height > 10) ? (barRect.bottom + 4) : 46;
  const bottomLimit = (handRect && handRect.top > topLimit + 70) ? (handRect.top + 6) : (vh - 104);
  const availH = Math.max(115, bottomLimit - topLimit);
  const availW = Math.max(240, vw - 16);
  const centerY = Math.round(topLimit + availH / 2);
  box.style.maxHeight = 'none';
  box.style.overflowY = 'visible';
  box.style.left = '50%';
  box.style.top = centerY + 'px';
  box.style.transform = 'translate(-50%,-50%) scale(1)';
  const needH = box.scrollHeight || box.offsetHeight;
  const needW = box.scrollWidth || box.offsetWidth;
  let s = Math.min(1, availH / Math.max(1, needH), availW / Math.max(1, needW));
  if (s < 0.62) { s = 0.62; box.style.maxHeight = Math.floor(availH / s) + 'px'; box.style.overflowY = 'auto'; }
  box.style.transform = `translate(-50%,-50%) scale(${s.toFixed(3)})`;
}
function scheduleFit() {
  if (_fitRaf) return;
  _fitRaf = requestAnimationFrame(() => { _fitRaf = 0; fitBiddingBox(); });
}

let _turnKey = '', _turnDeadline = Date.now() + 60000, _turnTimer = null, _turnRoom = null, _bannerSig = '', _bannerTp = -1;
function enhanceTurnUI(room, mySeat) {
  _turnRoom = room;
  const live = room.status === 'playing' || room.status === 'bidding';
  const mine = live && room.turnSeat === mySeat;
  const key = [room.status, room.turnSeat, (room.currentTrick || []).length, room.currentContract ? room.currentContract.value + room.currentContract.suit + room.currentContract.multiplier : '-'].join('|');
  if (key !== _turnKey) {
    _turnKey = key; selectedCardId = null;
    if (mine && navigator.vibrate) { try { navigator.vibrate(60); } catch (e) {} }
  }
  if (typeof room.turnRemainingMs === 'number') _turnDeadline = Date.now() + room.turnRemainingMs;
  const gv = document.getElementById('gameView');
  if (gv) { gv.classList.toggle('live', live); gv.classList.toggle('my-turn', mine); }
  for (let s = 0; s < 4; s++) {
    const slot = document.getElementById('slot' + getRelativePosition(s, mySeat >= 0 ? mySeat : 0));
    if (slot) slot.classList.toggle('first-seat', live && room.firstPlayerSeat === s);
  }
  paintTurnBanner();
  if (!_turnTimer) _turnTimer = setInterval(paintTurnBanner, 300);
}
function paintTurnBanner() {
  const room = _turnRoom, el = document.getElementById('turnBanner');
  if (!room || !el) return;
  const mySeat = room.mySeat >= 0 ? room.mySeat : 0;
  const live = room.status === 'playing' || room.status === 'bidding';
  if (!live) {
    if (_bannerSig !== 'off') { _bannerSig = 'off'; el.className = ''; el.innerHTML = ''; el.style.removeProperty('--tp'); }
    return;
  }
  const mine = room.turnSeat === mySeat;
  const remMs = Math.max(0, _turnDeadline - Date.now());
  const remSec = Math.ceil(remMs / 1000);
  const late = remSec <= 15;
  const who = room.seats[room.turnSeat] ? room.seats[room.turnSeat].name : '...';
  const phase = room.status === 'bidding' ? 'المزايدة' : 'اللعب';
  let sub;
  if (mine && selectedCardId && room.status === 'playing') sub = '🎴 اضغط مرة أخرى باش تلعب الورقة';
  else if (mine && pendingPlay) sub = '🃏 الورقة ماشية للطاولة...';
  else sub = `${phase} • ⏰ ${remSec}ث${room.seats[room.firstPlayerSeat] ? ` • 🥇 ${escapeHtml(room.seats[room.firstPlayerSeat].name)}` : ''}`;
  const cls = 'show' + (mine ? ' mine' : '') + (late ? ' late' : '');
  const html = `<span class="tb-main">${mine ? '⚡ دورك الآن!' : `⏳ دور <b>${escapeHtml(who)}</b>`}</span><small class="tb-sub">${sub}</small>`;
  const sig = cls + html;
  if (sig !== _bannerSig) { _bannerSig = sig; el.className = cls; el.innerHTML = html; }
  const tp = Math.round(Math.max(0, Math.min(100, (remMs / 60000) * 100)));
  if (Math.abs(tp - _bannerTp) >= 1) { _bannerTp = tp; el.style.setProperty('--tp', tp + '%'); }
  const slot = document.getElementById('slot' + getRelativePosition(room.turnSeat, mySeat));
  document.querySelectorAll('.player-slot.late').forEach(x => { if (x !== slot) x.classList.remove('late'); });
  if (slot) slot.classList.toggle('late', late);
  if (room.status === 'bidding') {
    const actingTeam = (mySeat % 2 === 0) ? 1 : 2;
    const open = isReactionWindowOpen(room, actingTeam);
    const rs = document.getElementById('reactSecs');
    if (rs && room.reactionUntil) setText(rs, `(${Math.max(0, Math.ceil((room.reactionUntil - Date.now()) / 1000))}ث)`);
    if (!open && !mine) {
      const row = document.getElementById('snatchRow');
      if (row && row.style.display !== 'none') { row.style.display = 'none'; row.innerHTML = ''; row.dataset.sig = ''; scheduleFit(); }
    }
  }
}

let _resizeT = null;
function onViewportResize() {
  if (_resizeT) clearTimeout(_resizeT);
  _resizeT = setTimeout(() => {
    _lastHandCW = 0; _lastAvailW = -1;
    const gv = document.getElementById('gameView');
    if (typeof currentRoomState !== 'undefined' && currentRoomState && gv && gv.style.display !== 'none') {
      renderGameTable(currentRoomState);
    } else scheduleFit();
  }, 120);
}
window.addEventListener('resize', onViewportResize, { passive: true });
window.addEventListener('orientationchange', onViewportResize, { passive: true });
if (window.visualViewport) window.visualViewport.addEventListener('resize', onViewportResize, { passive: true });