/* ==========================================================================
   FILE: /public/js/site.js  —  v3 (الكوكيز تختفي فعلاً + تتحفظ)
========================================================================== */
'use strict';
(function () {
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var drawer = document.getElementById('drawer');

  function onScroll() { if (nav) nav.classList.toggle('stuck', window.scrollY > 12); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (burger && drawer) {
    burger.addEventListener('click', function () {
      var open = drawer.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { drawer.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
    });
  }

  var els = document.querySelectorAll('.card,.step,.term,.faq-item,.cta-band,.sec-head,.hero-facts li');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    els.forEach(function (el, i) { el.classList.add('reveal'); el.style.transitionDelay = (Math.min(i % 6, 5) * 55) + 'ms'; io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('in'); });
  }

  /* ================= موافقة الكوكيز ================= */
  var CK = 'bk_consent';
  var box = document.getElementById('cookie');
  var btnAccept = document.getElementById('ckAccept');
  var btnReject = document.getElementById('ckReject');
  var btnSettings = document.getElementById('cookieSettings');

  function readConsent() {
    try {
      var m = document.cookie.match(/(?:^|;\s*)bk_consent=([^;]*)/);
      if (m) return decodeURIComponent(m[1]);
    } catch (e) {}
    try { return localStorage.getItem(CK); } catch (e) {}
    return null;
  }
  function writeConsent(v) {
    var secure = location.protocol === 'https:' ? ';Secure' : '';
    try {
      document.cookie = CK + '=' + v + ';path=/;max-age=' + (60 * 60 * 24 * 365) + ';SameSite=Lax' + secure;
    } catch (e) {}
    try { localStorage.setItem(CK, v); } catch (e) {}
  }
  function hideBox() {
    if (!box) return;
    box.classList.add('closing');
    setTimeout(function () {
      box.classList.remove('show', 'closing');
      box.hidden = true;
      box.setAttribute('aria-hidden', 'true');
      box.style.display = 'none';
    }, 220);
  }
  function showBox() {
    if (!box) return;
    box.hidden = false;
    box.removeAttribute('aria-hidden');
    box.style.display = '';
    requestAnimationFrame(function () { box.classList.add('show'); });
  }
  function flash(msg) {
    var t = document.createElement('div');
    t.className = 'cookie-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 300); }, 2200);
  }
  function decide(v) {
    writeConsent(v);
    hideBox();
    if (v === '1') {
      flash('✅ تم حفظ موافقتك — الإعلانات مفعّلة');
      setTimeout(function () { location.reload(); }, 700);
    } else {
      flash('🔒 تم حفظ اختيارك — الإعلانات الإعلانية معطّلة');
    }
  }

  var saved = readConsent();
  if (box) {
    if (saved === '1' || saved === '0') {
      box.classList.remove('show');
      box.hidden = true;
      box.style.display = 'none';
    } else {
      showBox();
    }
  }
  if (btnAccept) btnAccept.addEventListener('click', function (e) { e.preventDefault(); decide('1'); });
  if (btnReject) btnReject.addEventListener('click', function (e) { e.preventDefault(); decide('0'); });
  if (btnSettings) btnSettings.addEventListener('click', function (e) {
    e.preventDefault();
    showBox();
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && box && box.classList.contains('show') && readConsent() !== null) hideBox();
  });

  /* ================= نموذج الاتصال ================= */
  var form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = document.getElementById('contactMsg');
      var btn = form.querySelector('button[type=submit]');
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      data.consent = form.querySelector('[name=consent]').checked;
      msg.className = 'form-msg';
      msg.textContent = '⏳ قاعدين نبعثو...';
      btn.disabled = true;
      fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (res) { return res.json().then(function (j) { return { ok: res.ok && j.ok, j: j }; }); })
        .then(function (out) {
          if (out.ok) { msg.className = 'form-msg ok'; msg.textContent = '✅ وصلتنا رسالتك. نجاوبوك على بريدك في أقرب وقت.'; form.reset(); }
          else { msg.className = 'form-msg bad'; msg.textContent = '⚠️ ' + (out.j.error || 'فشل الإرسال. جرّب البريد المباشر.'); }
        })
        .catch(function () { msg.className = 'form-msg bad'; msg.textContent = '⚠️ تعذّر الاتصال. راسلنا مباشرة على contact@belotetounsi.online'; })
        .finally(function () { btn.disabled = false; });
    });
  }

  /* ================= روابط داخلية ================= */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href').slice(1);
      var t = id && document.getElementById(id);
      if (t) {
        e.preventDefault();
        var y = t.getBoundingClientRect().top + window.scrollY - (nav ? nav.offsetHeight + 14 : 80);
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });
})();