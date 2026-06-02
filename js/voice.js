'use strict';

const Voice = (() => {
  let voices = [];
  let advisorVoiceEnabled  = true;
  let opponentVoiceEnabled = true;
  const speakQueue = [];
  let isSpeaking   = false;

  // ── Voice parameters per character ───────────────────────
  const CONFIG = {
    advisor:  { rate: 0.88, pitch: 0.82 },  // trầm, chậm — học giả
    opponent: { rate: 1.08, pitch: 1.18 }   // nhanh, cao  — đối địch
  };

  // ── Voice loading ─────────────────────────────────────────
  function loadVoices() {
    voices = speechSynthesis.getVoices();
  }

  function getVoice(type) {
    const viVoices = voices.filter(v => v.lang.startsWith('vi'));
    const fallback = viVoices[0] || voices[0] || null;
    if (type === 'opponent') return viVoices[1] || fallback;
    return fallback;
  }

  // ── TTS queue ─────────────────────────────────────────────
  function processQueue() {
    if (isSpeaking || speakQueue.length === 0) return;
    const { text, type } = speakQueue.shift();
    isSpeaking = true;

    const cfg   = CONFIG[type] || CONFIG.advisor;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang  = 'vi-VN';
    utter.rate  = cfg.rate;
    utter.pitch = cfg.pitch;
    const voice = getVoice(type);
    if (voice) utter.voice = voice;

    utter.onend   = () => { isSpeaking = false; processQueue(); };
    utter.onerror = () => { isSpeaking = false; processQueue(); };

    speechSynthesis.speak(utter);
  }

  function speak(text, type = 'advisor') {
    if (!window.speechSynthesis) return;
    if (type === 'advisor'  && !advisorVoiceEnabled)  return;
    if (type === 'opponent' && !opponentVoiceEnabled) return;
    speakQueue.push({ text, type });
    processQueue();
  }

  function stop() {
    speakQueue.length = 0;
    isSpeaking = false;
    if (window.speechSynthesis) speechSynthesis.cancel();
  }

  // ── Toggle per character ──────────────────────────────────
  function toggleAdvisor() {
    advisorVoiceEnabled = !advisorVoiceEnabled;
    if (!advisorVoiceEnabled) stop();
    return advisorVoiceEnabled;
  }

  function toggleOpponent() {
    opponentVoiceEnabled = !opponentVoiceEnabled;
    if (!opponentVoiceEnabled) stop();
    return opponentVoiceEnabled;
  }

  // ── STT ───────────────────────────────────────────────────
  function startSTT(inputId, micBtnId) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Trình duyệt không hỗ trợ nhận diện giọng nói.\nHãy dùng Chrome hoặc Edge.');
      return;
    }

    const micBtn = document.getElementById(micBtnId);
    // Nếu đang recording thì hủy
    if (micBtn && micBtn._recognition) {
      micBtn._recognition.stop();
      return;
    }

    const rec = new SR();
    rec.lang = 'vi-VN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    if (micBtn) { micBtn.classList.add('recording'); micBtn._recognition = rec; }

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      const input = document.getElementById(inputId);
      if (input) {
        input.value = transcript;
        input.focus();
      }
      if (micBtn) { micBtn.classList.remove('recording'); micBtn._recognition = null; }
    };

    rec.onerror = () => {
      if (micBtn) { micBtn.classList.remove('recording'); micBtn._recognition = null; }
    };

    rec.onend = () => {
      if (micBtn) { micBtn.classList.remove('recording'); micBtn._recognition = null; }
    };

    rec.start();
  }

  // ── Init ──────────────────────────────────────────────────
  if (window.speechSynthesis) {
    speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }

  return { speak, stop, toggleAdvisor, toggleOpponent, startSTT };
})();
