let deferredInstallPrompt = null;
let screenWakeLock = null;

function onSeatClickForSwap(seatIdx) {
    if (!currentRoomState || currentRoomState.hostId !== myPlayerId) {
        showToast('كان مولى الطاولة ينجم يبدّل بلايص الفريقين');
        return;
    }
    if (selectedSwapSeat === null) {
        selectedSwapSeat = seatIdx;
        renderGameTable(currentRoomState);
    } else if (selectedSwapSeat === seatIdx) {
        selectedSwapSeat = null;
        renderGameTable(currentRoomState);
    } else {
        sendPacket({
            type: 'host_swap_seats',
            seatA: selectedSwapSeat,
            seatB: seatIdx
        });
        selectedSwapSeat = null;
    }
}

function hostRandomizeTeams() { sendPacket({ type: 'host_randomize_teams' }); }
function hostAddBot() { sendPacket({ type: 'host_add_bot' }); }
function hostKickSeat(seat) { sendPacket({ type: 'host_kick_seat', seat }); }
function hostStartGame() { sendPacket({ type: 'host_start_game' }); }

function sendTunisianBid(action, suit = null) {
    sendPacket({
        type: 'bid',
        action,
        suit,
        value: selectedBidValue
    });
}

function requestNextRound() { sendPacket({ type: 'next_round' }); }

function sendChatMessage(e) {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    sendPacket({ type: 'chat_msg', text });
    input.value = '';
}

function toggleChatMinimize() {
    const widget = document.getElementById('chatWidget');
    widget.classList.toggle('minimized');
    document.getElementById('chatToggleIcon').textContent =
        widget.classList.contains('minimized') ? '▲' : '_';
}

function isMobileOrTabletDevice() {
    return window.innerWidth <= 1024 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

async function keepScreenAwake() {
    try {
        if ('wakeLock' in navigator && !screenWakeLock) {
            screenWakeLock = await navigator.wakeLock.request('screen');
            screenWakeLock.addEventListener('release', () => {
                screenWakeLock = null;
            });
        }
    } catch (e) {}
}

async function enterImmersiveLandscape(silent = false) {
    keepScreenAwake();
    const el = document.documentElement;
    try {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (el.requestFullscreen) {
                await el.requestFullscreen({ navigationUI: 'hide' });
            } else if (el.webkitRequestFullscreen) {
                await el.webkitRequestFullscreen();
            }
        }
    } catch (e) {
        if (!silent) {
            showToast('ℹ️ دور تليفونك بالعرض باش تلعب براحتك');
        }
    }

    try {
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock('landscape');
        }
    } catch (e) {}
}

function dismissRotateOverlay() {
    document.body.classList.add('allow-portrait');
    const overlay = document.getElementById('rotateDeviceOverlay');
    if (overlay) overlay.style.display = 'none';
}

function requestFullscreenMode() {
    const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (!isFull) {
        enterImmersiveLandscape(false);
    } else {
        try {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        } catch (e) {}
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

// تثبيت اللعبة كتطبيق أندرويد (PWA) بضغطة زر واحدة
async function triggerAppInstall() {
    if (deferredInstallPrompt) {
        try {
            deferredInstallPrompt.prompt();
            const choice = await deferredInstallPrompt.userChoice;
            if (choice && choice.outcome === 'accepted') {
                showToast('🎉 تم تثبيت تطبيق البلوت التونسي على تليفونك بنجاح!');
            }
            deferredInstallPrompt = null;
            return;
        } catch (err) {}
    }
    const modal = document.getElementById('installAppModal');
    if (modal) modal.style.display = 'flex';
}

function closeInstallModal() {
    const modal = document.getElementById('installAppModal');
    if (modal) modal.style.display = 'none';
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
}