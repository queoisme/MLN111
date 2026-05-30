'use strict';

const AI = (() => {
  const BACKEND    = '';   // relative — hoạt động cả local lẫn Vercel
  let chatHistory  = [];
  let chatContext  = null;
  let pendingAuto  = null; // wave auto-commentary prefetched during resolve screen

  // ── State helpers ─────────────────────────────────────────
  function buildCtx(state, extra = {}) {
    if (!state) return extra;
    return {
      faction: state.faction === 'proletariat' ? 'Vô Sản' : 'Tư Sản',
      day:     state.day,
      stats:   state.stats,
      ...extra
    };
  }

  async function callAPI(messages, gameContext, mode = 'chat') {
    try {
      const res = await fetch(`${BACKEND}/api/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages, gameContext, mode })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.content || null;
    } catch {
      return null;
    }
  }

  // ── Auto commentary after wave ────────────────────────────
  // Called in engine.js right before showResolveScreen.
  // Fires async so the result is (usually) ready when the player
  // clicks "Tiếp Tục" and we call flushPendingAuto().
  function autoAfterWave(wave, mitigationRatio, state) {
    const level = mitigationRatio >= 0.6 ? 'cao (thiệt hại giảm nhiều)'
                : mitigationRatio >= 0.3 ? 'trung bình'
                : 'thấp (thiệt hại nặng)';

    const ctx = buildCtx(state, {
      event: `Wave "${wave.name}" xảy ra, mức giảm thiệt hại: ${level}.`
    });
    const prompt = `Trong game, làn sóng "${wave.name}" vừa xảy ra với mức giảm thiệt hại ${level}. Hãy kết nối điều này với một sự kiện lịch sử thực tế cụ thể (nêu tên, năm, địa điểm) trong 2-3 câu.`;

    pendingAuto = { ctx, prompt, waveId: wave.id, waveName: wave.name, content: null };
    callAPI([{ role: 'user', content: prompt }], ctx, 'auto').then(c => {
      if (pendingAuto) pendingAuto.content = c;
    });
  }

  // Called in engine.js inside continueAfterResolve()
  function flushPendingAuto() {
    if (!pendingAuto) return;
    const p = pendingAuto;
    pendingAuto = null;

    const show = () => {
      if (p.content) UI.appendAICommentary(p.content, p.waveName, p.ctx);
    };

    if (p.content) {
      show();
    } else {
      // Still waiting — show once the response lands (max 5 s)
      const t = setTimeout(show, 5000);
      const poll = setInterval(() => {
        if (p.content) { clearInterval(poll); clearTimeout(t); show(); }
      }, 300);
    }
  }

  // ── Auto commentary after event choice ───────────────────
  async function autoAfterEvent(event, choiceLabel, state) {
    const ctx = buildCtx(state, {
      event: `Sự kiện "${event.title}" — người chơi chọn: "${choiceLabel}".`
    });
    const prompt = `Trong game, người chơi đối mặt với tình huống "${event.title}" và chọn "${choiceLabel}". Trong 2-3 câu, phân tích lựa chọn này qua góc nhìn lịch sử chính trị thực tế.`;
    const content = await callAPI([{ role: 'user', content: prompt }], ctx, 'auto');
    if (content) UI.appendAICommentary(content, event.title, ctx);
  }

  // ── Chat panel ────────────────────────────────────────────
  function openChat(initialPrompt, ctx) {
    chatHistory = [];
    chatContext  = ctx || buildCtx(Game.getState());

    const existing = document.getElementById('ai-panel');
    if (existing) { existing.remove(); }

    const panel = document.createElement('div');
    panel.id = 'ai-panel';
    panel.innerHTML = `
      <div class="ai-header">
        <span class="ai-header-icon">🎓</span>
        <div class="ai-header-text">
          <div class="ai-header-title">Nhà Phân Tích Lịch Sử</div>
          <div class="ai-header-sub">Hỏi về lý thuyết, lịch sử đấu tranh giai cấp</div>
        </div>
        <button class="ai-close-btn" onclick="AI.closeChat()">✕</button>
      </div>
      <div class="ai-messages" id="ai-messages">
        <div class="ai-msg ai-msg-system">Tôi đang theo dõi ván chơi của bạn. Hỏi tôi bất cứ điều gì về lịch sử, lý thuyết, hoặc những gì vừa xảy ra trong game.</div>
      </div>
      <div class="ai-input-wrap">
        <textarea class="ai-input" id="ai-input" rows="2"
          placeholder="Ví dụ: Đình công lịch sử nào giống tình huống này nhất?"></textarea>
        <button class="ai-send-btn" id="ai-send-btn">→</button>
      </div>`;
    document.body.appendChild(panel);

    const input = document.getElementById('ai-input');
    document.getElementById('ai-send-btn').addEventListener('click', handleSend);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });

    if (initialPrompt) {
      input.value = initialPrompt;
      handleSend();
    } else {
      input.focus();
    }
  }

  function closeChat() {
    const p = document.getElementById('ai-panel');
    if (!p) return;
    p.classList.add('ai-panel-out');
    setTimeout(() => p.remove(), 280);
  }

  async function handleSend() {
    const input   = document.getElementById('ai-input');
    const text    = input.value.trim();
    if (!text) return;
    input.value = '';
    input.style.height = '';

    appendMsg('user', text);
    chatHistory.push({ role: 'user', content: text });

    const typingEl = appendMsg('ai', '…', true);
    const content  = await callAPI(chatHistory, chatContext, 'chat');
    typingEl.remove();

    const reply = content || '⚠️ Không kết nối được AI backend. Hãy chắc chắn server đang chạy (`node server.js`).';
    appendMsg('ai', reply);
    chatHistory.push({ role: 'assistant', content: reply });
  }

  function appendMsg(role, text, isTyping = false) {
    const box = document.getElementById('ai-messages');
    if (!box) return document.createElement('div');
    const el  = document.createElement('div');
    el.className = `ai-msg ai-msg-${role}${isTyping ? ' ai-typing' : ''}`;
    el.textContent = text;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
    return el;
  }

  return { autoAfterWave, flushPendingAuto, autoAfterEvent, openChat, closeChat, buildCtx };
})();
