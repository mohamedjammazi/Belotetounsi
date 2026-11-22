/* ==========================================
2. WEB AUDIO SOUND ENGINE, CLOCK TIK-TAK & ADPCM4 PUSH-TO-TALK
✅ + صوت جمع الطشّة (plie_collect)
========================================== */
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}
function toggleSoundMute() {
  soundMuted = !soundMuted;
  document.getElementById('soundToggleBtn').textContent = soundMuted ? '🔇' : '🔊';
  showToast(soundMuted ? '🔇 تم كتم المؤثرات الصوتية' : '🔊 تم تفعيل المؤثرات الصوتية');
}
function playTone(freq, duration, type = 'sine', gainVal = 0.15, delay = 0) {
  if (soundMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const startAt = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(gainVal, startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration);
}
function playGameSound(eventObj) {
  if (!eventObj || soundMuted) return;
  if (eventObj.ts && eventObj.ts === lastPlayedSoundTs) return;
  if (eventObj.ts) lastPlayedSoundTs = eventObj.ts;
  const type = eventObj.type;
  if (type === 'card_play') {
    playTone(240, 0.07, 'triangle', 0.22, 0);
    playTone(420, 0.05, 'sine', 0.12, 0.02);
  } else if (type === 'cut') {
    playTone(180, 0.09, 'sawtooth', 0.25, 0);
    playTone(540, 0.12, 'triangle', 0.22, 0.04);
  } else if (type === 'deal') {
    for (let i = 0; i < 5; i++) playTone(300 + i * 45, 0.05, 'triangle', 0.14, i * 0.06);
  } else if (type === 'pass') {
    playTone(280, 0.1, 'sine', 0.12, 0);
  } else if (type === 'bid') {
    playTone(523.25, 0.12, 'triangle', 0.18, 0);
    playTone(659.25, 0.16, 'triangle', 0.18, 0.1);
  } else if (type === 'contre' || type === 'surcontre') {
    playTone(440, 0.14, 'sawtooth', 0.18, 0);
    playTone(587.33, 0.14, 'sawtooth', 0.2, 0.12);
    playTone(880, 0.28, 'sawtooth', 0.22, 0.24);
  } else if (type === 'belote') {
    playTone(587.33, 0.12, 'triangle', 0.22, 0);
    playTone(783.99, 0.15, 'triangle', 0.22, 0.11);
    playTone(1046.5, 0.25, 'triangle', 0.24, 0.22);
    if ('speechSynthesis' in window && eventObj.word) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(eventObj.word);
        utter.lang = 'fr-FR'; utter.rate = 1.05;
        window.speechSynthesis.speak(utter);
      } catch (e) {}
    }
  } else if (type === 'plie_collect') {
    // صوت جمع الطشّة الناعم
    playTone(523.25, 0.07, 'sine', 0.13, 0);
    playTone(659.25, 0.07, 'sine', 0.13, 0.055);
    playTone(783.99, 0.09, 'sine', 0.15, 0.11);
    playTone(1046.5, 0.13, 'triangle', 0.17, 0.19);
  } else if (type === 'clock_tick') {
    if (clockTickInterval) clearInterval(clockTickInterval);
    let ticks = 0;
    const doTick = () => {
      playTone(ticks % 2 === 0 ? 960 : 720, 0.035, 'square', 0.16, 0);
      ticks++;
      if (ticks >= 8 && clockTickInterval) { clearInterval(clockTickInterval); clockTickInterval = null; }
    };
    doTick();
    clockTickInterval = setInterval(doTick, 500);
  } else if (type === 'round_end') {
    playTone(523.25, 0.14, 'triangle', 0.2, 0);
    playTone(659.25, 0.14, 'triangle', 0.2, 0.12);
    playTone(783.99, 0.25, 'triangle', 0.22, 0.24);
  }
}
/* ===== Ultra-Low-Bandwidth Push-To-Talk (IMA ADPCM 4-bit @ 6000Hz) ===== */
const IMA_INDEX_TABLE = [-1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8];
const IMA_STEP_TABLE = [
7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45,
50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230,
253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963,
1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327,
3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442,
11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767
];
function encodeAdpcm4(floatSamples) {
  let pred = 0, index = 0;
  const out = new Uint8Array(Math.ceil(floatSamples.length / 2));
  let outIdx = 0, highNibble = false, byteVal = 0;
  for (let i = 0; i < floatSamples.length; i++) {
    const s = Math.max(-32768, Math.min(32767, Math.round(floatSamples[i] * 32767)));
    let diff = s - pred;
    let step = IMA_STEP_TABLE[index];
    let nibble = 0;
    if (diff < 0) { nibble = 8; diff = -diff; }
    let vpdiff = step >> 3;
    if (diff >= step) { nibble |= 4; diff -= step; vpdiff += step; }
    step >>= 1;
    if (diff >= step) { nibble |= 2; diff -= step; vpdiff += step; }
    step >>= 1;
    if (diff >= step) { nibble |= 1; vpdiff += step; }
    if (nibble & 8) pred -= vpdiff; else pred += vpdiff;
    pred = Math.max(-32768, Math.min(32767, pred));
    index = Math.max(0, Math.min(88, index + IMA_INDEX_TABLE[nibble]));
    if (!highNibble) { byteVal = nibble & 0x0F; highNibble = true; }
    else { byteVal |= (nibble & 0x0F) << 4; out[outIdx++] = byteVal; highNibble = false; }
  }
  if (highNibble) out[outIdx++] = byteVal;
  let binary = '';
  for (let i = 0; i < out.length; i++) binary += String.fromCharCode(out[i]);
  return btoa(binary);
}
function decodeAdpcm4(base64Str) {
  const binary = atob(base64Str);
  const len = binary.length;
  const out = new Float32Array(len * 2);
  let pred = 0, index = 0, outIdx = 0;
  for (let i = 0; i < len; i++) {
    const b = binary.charCodeAt(i);
    for (let shift = 0; shift <= 4; shift += 4) {
      const nibble = (b >> shift) & 0x0F;
      let step = IMA_STEP_TABLE[index];
      let vpdiff = step >> 3;
      if (nibble & 4) vpdiff += step;
      if (nibble & 2) vpdiff += step >> 1;
      if (nibble & 1) vpdiff += step >> 2;
      if (nibble & 8) pred -= vpdiff; else pred += vpdiff;
      pred = Math.max(-32768, Math.min(32767, pred));
      index = Math.max(0, Math.min(88, index + IMA_INDEX_TABLE[nibble]));
      out[outIdx++] = pred / 32768;
    }
  }
  return out;
}
let pttStream = null, pttProcessor = null, pttSource = null, pttActive = false, pttBuffer = [], pttSendTimer = null;
let nextVoicePlayTime = 0;
async function startPushToTalk(e) {
  if (e && e.cancelable) e.preventDefault();
  if (pttActive) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('⚠️ المتصفح متاعك ما يدعمش المايكروفون (لازم HTTPS أو localhost)');
    return;
  }
  try {
    const ctx = getAudioContext();
    if (!pttStream) {
      pttStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    }
    pttActive = true;
    pttBuffer = [];
    const btn = document.getElementById('pttVoiceBtn');
    if (btn) btn.classList.add('recording');
    sendPacket({ type: 'voice_state', speaking: true });
    pttSource = ctx.createMediaStreamSource(pttStream);
    pttProcessor = ctx.createScriptProcessor(2048, 1, 1);
    const ratio = ctx.sampleRate / 6000;
    pttProcessor.onaudioprocess = (ev) => {
      if (!pttActive) return;
      const input = ev.inputBuffer.getChannelData(0);
      for (let i = 0; i < input.length; i += ratio) pttBuffer.push(input[Math.floor(i)] || 0);
    };
    pttSource.connect(pttProcessor);
    pttProcessor.connect(ctx.destination);
    pttSendTimer = setInterval(() => {
      if (pttBuffer.length >= 900) {
        const chunk = pttBuffer.splice(0, pttBuffer.length);
        const encoded = encodeAdpcm4(chunk);
        sendPacket({ type: 'voice_ptt', codec: 'adpcm4', sampleRate: 6000, data: encoded });
      }
    }, 280);
  } catch (err) {
    pttActive = false;
    showToast('⚠️ اعطي صلاحية المايكروفون للمتصفح باش تنجم تتكلم');
  }
}
function stopPushToTalk(e) {
  if (e && e.cancelable) e.preventDefault();
  if (!pttActive) return;
  pttActive = false;
  if (pttSendTimer) { clearInterval(pttSendTimer); pttSendTimer = null; }
  const btn = document.getElementById('pttVoiceBtn');
  if (btn) btn.classList.remove('recording');
  if (pttBuffer.length > 120) {
    const chunk = pttBuffer.splice(0, pttBuffer.length);
    const encoded = encodeAdpcm4(chunk);
    sendPacket({ type: 'voice_ptt', codec: 'adpcm4', sampleRate: 6000, data: encoded });
  }
  if (pttProcessor) { try { pttProcessor.disconnect(); } catch (e) {} pttProcessor = null; }
  if (pttSource) { try { pttSource.disconnect(); } catch (e) {} pttSource = null; }
  sendPacket({ type: 'voice_state', speaking: false });
}
function playIncomingVoicePacket(pkt) {
  if (soundMuted || !pkt || !pkt.data) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const samples = decodeAdpcm4(pkt.data);
    const sr = Number(pkt.sampleRate) || 6000;
    const audioBuf = ctx.createBuffer(1, samples.length, sr);
    audioBuf.getChannelData(0).set(samples);
    const src = ctx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(ctx.destination);
    const now = ctx.currentTime;
    if (nextVoicePlayTime < now) nextVoicePlayTime = now + 0.04;
    src.start(nextVoicePlayTime);
    nextVoicePlayTime += audioBuf.duration;
  } catch (e) {}
}