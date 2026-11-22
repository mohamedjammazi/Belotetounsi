/* ==========================================================================
   APP.JS v54 — BOOTSTRAP ONLY (المُقلع)
   ✅ هذا الملف ليس زائداً: هو اللي يستدعي connectWebSocket() عند تحميل الصفحة
   ✅ ربط كل الدوال بـ window + PWA + Service Worker + وضع ملء الشاشة
========================================================================== */
'use strict';

/* ربط الدوال المعتمدة بـ window (ضمان توافق كل المتصفحات) */
Object.assign(window, {
  savePlayerName, toggleAdminPanel, submitAdminLogin,
  createRoom, joinRoom, deleteRoom, leaveCurrentRoom,
  togglePointsTableModal, toggleScorePaperModal, sendThinkingSignal, toggleBeloteAnnouncement,
  onSeatClickForSwap, hostRandomizeTeams, hostAddBot, hostKickSeat, hostStartGame, hostTogglePrivacy,
  shareRoomLink, copyRoomCode, quickJoinTable,
  sendTunisianBid, requestNextRound, sendChatMessage, toggleChatMinimize,
  requestFullscreenMode, enterImmersiveLandscape, dismissRotateOverlay,
  triggerAppInstall, closeInstallModal, toggleSoundMute
});

/* ===== PWA Install ===== */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const installBtn = document.getElementById('installAppBtn');
  const banner = document.getElementById('pwaInstallBanner');
  if (installBtn) installBtn.style.display = 'inline-flex';
  if (banner) banner.style.display = 'flex';
});
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) banner.style.display = 'none';
  showToast('🎉 تم تثبيت تطبيق البلوت التونسي بنجاح!');
});

/* ===== الإقلاع ===== */
window.addEventListener('DOMContentLoaded', () => {
  renderLobbyRooms();
  connectWebSocket();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  const isStandalone = window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  if (isStandalone && isMobileOrTabletDevice()) {
    document.addEventListener('click', () => { enterImmersiveLandscape(true); }, { once: true });
  }
});