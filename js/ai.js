'use strict';

const AI = (() => {
  const BACKEND    = '';   // relative — hoạt động cả local lẫn Vercel
  let chatHistory  = [];
  let chatContext  = null;
  let pendingAuto  = null;

  let opponentHistory = [];
  let opponentContext = null;
  let pendingOpponent = null;

  // ── Mailbox queues ─────────────────────────────────────────
  let advisorMessages  = [];  // { text, label, ctx, read: false }
  let opponentMessages = [];  // { text, label, ctx, read: false }

  // ── Persistent conversation logs ──────────────────────────
  // { role: 'user'|'assistant', content: string, label?: string }
  let advisorConvo  = [];
  let opponentConvo = [];

  // ── Helpers ────────────────────────────────────────────────
  function opponentFactionName(state) {
    return state.faction === 'proletariat' ? 'Tư Sản' : 'Vô Sản';
  }

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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let msg = data.error || `HTTP ${res.status}`;
        try { const parsed = JSON.parse(msg); msg = parsed?.error?.message || msg; } catch {}
        return { content: null, error: msg };
      }
      return { content: data.content || null, error: null };
    } catch (err) {
      return { content: null, error: err.message };
    }
  }

  // ── Auto commentary after wave ────────────────────────────
  function autoAfterWave(wave, mitigationRatio, state) {
    const level = mitigationRatio >= 0.6 ? 'cao (thiệt hại giảm nhiều)'
                : mitigationRatio >= 0.3 ? 'trung bình'
                : 'thấp (thiệt hại nặng)';

    const ctx = buildCtx(state, {
      event: `Wave "${wave.name}" xảy ra, mức giảm thiệt hại: ${level}.`
    });
    const prompt = `Trong game, làn sóng "${wave.name}" vừa xảy ra với mức giảm thiệt hại ${level}. Hãy kết nối điều này với một sự kiện lịch sử thực tế cụ thể (nêu tên, năm, địa điểm) trong 2-3 câu.`;

    pendingAuto = { ctx, prompt, waveId: wave.id, waveName: wave.name, content: null };
    callAPI([{ role: 'user', content: prompt }], ctx, 'auto').then(({ content: c }) => {
      if (pendingAuto) pendingAuto.content = c;
    });
  }

  function flushPendingAuto() {
    if (!pendingAuto) return;
    const p = pendingAuto;
    pendingAuto = null;

    const show = () => {
      if (p.content) receiveAdvisorMessage(p.content, p.waveName, p.ctx);
    };

    if (p.content) {
      show();
    } else {
      const t = setTimeout(show, 5000);
      const poll = setInterval(() => {
        if (p.content) { clearInterval(poll); clearTimeout(t); show(); }
      }, 300);
    }
  }

  // ── Opponent auto-reaction after wave ────────────────────
  function opponentAutoAfterWave(wave, mitigationRatio, state) {
    const playerWinning = mitigationRatio >= 0.5;
    const oppName = opponentFactionName(state);
    const ctx = buildCtx(state, {
      event: `Wave "${wave.name}" vừa xảy ra. Người chơi ${playerWinning ? 'phòng thủ tốt' : 'bị thiệt hại nặng'}.`
    });
    const prompt = `Bạn là thủ lĩnh phe ${oppName}. Làn sóng "${wave.name}" vừa xảy ra — đối thủ của bạn ${playerWinning ? 'đã cản được phần lớn thiệt hại' : 'chịu thiệt hại nặng nề'}. Phản ứng ngắn gọn, đúng nhân vật (1-2 câu).`;
    pendingOpponent = { ctx, prompt, waveName: wave.name, oppName, content: null };
    callAPI([{ role: 'user', content: prompt }], ctx, 'opponent').then(({ content: c }) => {
      if (pendingOpponent) pendingOpponent.content = c;
    });
  }

  function flushOpponentAuto() {
    if (!pendingOpponent) return;
    const p = pendingOpponent;
    pendingOpponent = null;
    const show = () => {
      if (p.content) receiveOpponentMessage(p.content, p.oppName, p.ctx);
    };
    if (p.content) { show(); return; }
    const t = setTimeout(show, 5000);
    const poll = setInterval(() => {
      if (p.content) { clearInterval(poll); clearTimeout(t); show(); }
    }, 300);
  }

  // ── Auto commentary after event choice ───────────────────
  async function autoAfterEvent(event, choiceLabel, state) {
    const ctx = buildCtx(state, {
      event: `Sự kiện "${event.title}" — người chơi chọn: "${choiceLabel}".`
    });
    const prompt = `Trong game, người chơi đối mặt với tình huống "${event.title}" và chọn "${choiceLabel}". Trong 2-3 câu, phân tích lựa chọn này qua góc nhìn lịch sử chính trị thực tế.`;
    const { content } = await callAPI([{ role: 'user', content: prompt }], ctx, 'auto');
    if (content) receiveAdvisorMessage(content, event.title, ctx);
  }

  // ── Mailbox: receive and display messages ─────────────────
  function receiveAdvisorMessage(text, label, ctx) {
    if (!text) return;
    const msg = { text, label, ctx, read: false };
    advisorMessages.push(msg);
    advisorConvo.push({ role: 'assistant', content: text, label });
    if (typeof Voice !== 'undefined') Voice.speak(text, 'advisor');

    const unread = advisorMessages.filter(m => !m.read).length;
    UI.setBadge('advisor', unread);
    showToast('advisor', text, label);

    const box = document.getElementById('ai-messages');
    if (box) {
      _renderAdvisorBubble(box, msg);
      msg.read = true;
      UI.setBadge('advisor', advisorMessages.filter(m => !m.read).length);
    }
  }

  function receiveOpponentMessage(text, oppName, ctx) {
    if (!text) return;
    const msg = { text, label: oppName, ctx, read: false };
    opponentMessages.push(msg);
    opponentConvo.push({ role: 'assistant', content: text, label: oppName });
    if (typeof Voice !== 'undefined') Voice.speak(text, 'opponent');

    const unread = opponentMessages.filter(m => !m.read).length;
    UI.setBadge('opponent', unread);
    showToast('opponent', text, oppName);

    const box = document.getElementById('opponent-messages');
    if (box) {
      _renderOpponentBubble(box, msg);
      msg.read = true;
      UI.setBadge('opponent', opponentMessages.filter(m => !m.read).length);
    }
  }

  function _renderAdvisorBubble(box, msg) {
    if (msg.label) {
      const labelEl = document.createElement('div');
      labelEl.className = 'ai-msg-inbox-label';
      labelEl.textContent = msg.label;
      box.appendChild(labelEl);
    }
    const el = document.createElement('div');
    el.className = 'ai-msg ai-msg-ai';
    el.textContent = msg.text;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
  }

  function _renderOpponentBubble(box, msg) {
    if (msg.label) {
      const labelEl = document.createElement('div');
      labelEl.className = 'ai-msg-inbox-label';
      labelEl.textContent = msg.label;
      box.appendChild(labelEl);
    }
    const el = document.createElement('div');
    el.className = 'ai-msg ai-msg-ai';
    el.textContent = msg.text;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
  }

  // ── Toast notifications ───────────────────────────────────
  function showToast(type, text, label) {
    const toastId = `ai-toast-${type}`;
    const stale = document.getElementById(toastId);
    if (stale) { clearTimeout(stale._dismissTimer); stale.remove(); }

    const isAdvisor  = type === 'advisor';
    const icon       = isAdvisor ? '🎓 Cố Vấn' : '⚔️ Đối Thủ';
    const senderLine = label ? `${icon} · ${label}` : icon;

    const toast = document.createElement('div');
    toast.id        = toastId;
    toast.className = `ai-toast ai-toast-${type}`;
    toast.innerHTML = `
      <div class="toast-sender">${senderLine}</div>
      <div class="toast-preview">${text}</div>`;

    toast.addEventListener('click', () => {
      dismissToast(toast);
      if (isAdvisor) openChat(null, null);
      else           openOpponentChat(null, null);
    });

    document.body.appendChild(toast);
    toast._dismissTimer = setTimeout(() => dismissToast(toast), 3500);
  }

  function dismissToast(toast) {
    if (!toast || !document.body.contains(toast)) return;
    clearTimeout(toast._dismissTimer);
    toast.classList.add('toast-out');
    setTimeout(() => { if (document.body.contains(toast)) toast.remove(); }, 320);
  }

  // ── Reset queues (call on new game) ───────────────────────
  function resetMessages() {
    advisorMessages  = [];
    opponentMessages = [];
    advisorConvo     = [];
    opponentConvo    = [];
    UI.setBadge('advisor',  0);
    UI.setBadge('opponent', 0);
    ['ai-toast-advisor', 'ai-toast-opponent'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  // ── Chat panel ────────────────────────────────────────────
  function setAdvisorButtonState(isOpen) {
    const btn = document.querySelector('.ai-toggle-btn');
    if (!btn) return;
    btn.classList.toggle('active', isOpen);
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  function setOpponentButtonState(isOpen) {
    const btn = document.querySelector('.opponent-toggle-btn');
    if (!btn) return;
    btn.classList.toggle('active', isOpen);
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  function openChat(initialPrompt, ctx) {
    const existing = document.getElementById('ai-panel');
    if (existing) {
      const existingInput = document.getElementById('ai-input');
      if (existingInput) {
        if (initialPrompt) { existingInput.value = initialPrompt; handleSend(); }
        else existingInput.focus();
      }
      return;
    }

    chatContext = ctx || buildCtx(Game.getState());
    chatHistory = advisorConvo.map(m => ({ role: m.role, content: m.content }));

    const backdrop = document.createElement('div');
    backdrop.id = 'ai-backdrop';
    backdrop.addEventListener('click', closeChat);
    document.body.appendChild(backdrop);

    const panel = document.createElement('div');
    panel.id = 'ai-panel';
    panel.innerHTML = `
      <div class="ai-header">
        <span class="ai-header-icon">AI</span>
        <div class="ai-header-text">
          <div class="ai-header-title">Cố Vấn Chiến Lược</div>
          <div class="ai-header-sub">Hỏi nhanh về tình huống hiện tại</div>
        </div>
        <button class="ai-voice-btn" id="ai-voice-btn" title="Bật/tắt giọng đọc">🔊</button>
        <button class="ai-close-btn" onclick="AI.closeChat()">x</button>
      </div>
      <div class="ai-starters" id="ai-starters">
        <button class="ai-starter-btn" type="button" data-prompt="Trong 2 hành động trước mắt, ưu tiên nào an toàn nhất cho phe của tôi?">Gợi ý an toàn</button>
        <button class="ai-starter-btn" type="button" data-prompt="Phân tích nhanh wave hiện tại và điều kiện phòng thủ cần đạt.">Đọc wave nhanh</button>
        <button class="ai-starter-btn" type="button" data-prompt="Nếu tôi đánh đổi tài nguyên để lấy chính danh, rủi ro lớn nhất là gì?">Cảnh báo rủi ro</button>
      </div>
      <div class="ai-messages" id="ai-messages">
        <div class="ai-msg ai-msg-system">Tôi đang theo dõi ván chơi của bạn. Bạn có thể bấm các gợi ý ở trên hoặc đặt câu hỏi tự do.</div>
      </div>
      <div class="ai-input-wrap">
        <textarea class="ai-input" id="ai-input" rows="2"
          placeholder="Ví dụ: Nếu đây là Ngày 3, tôi nên ưu tiên chỉ số nào?"></textarea>
        <button class="ai-mic-btn" id="ai-mic-btn" title="Nói thay vì gõ">🎤</button>
        <button class="ai-send-btn" id="ai-send-btn">Gửi</button>
      </div>`;
    document.body.appendChild(panel);
    document.body.classList.add('ai-chat-open');

    // Render full conversation history into the panel
    const messagesBox = document.getElementById('ai-messages');
    if (messagesBox && advisorConvo.length > 0) {
      advisorConvo.forEach(item => {
        if (item.role === 'user') {
          const el = document.createElement('div');
          el.className = 'ai-msg ai-msg-user';
          el.textContent = item.content;
          messagesBox.appendChild(el);
        } else {
          _renderAdvisorBubble(messagesBox, { text: item.content, label: item.label });
        }
      });
      messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    // Mark all as read, clear badge
    advisorMessages.forEach(m => { m.read = true; });
    UI.setBadge('advisor', 0);

    // Wire voice toggle + mic buttons
    if (typeof Voice !== 'undefined') {
      document.getElementById('ai-voice-btn')?.addEventListener('click', () => {
        const on  = Voice.toggleAdvisor();
        const btn = document.getElementById('ai-voice-btn');
        if (btn) { btn.textContent = on ? '🔊' : '🔇'; btn.classList.toggle('muted', !on); }
      });
      document.getElementById('ai-mic-btn')?.addEventListener('click', () => {
        Voice.startSTT('ai-input', 'ai-mic-btn');
      });
    }

    setAdvisorButtonState(true);

    const input = document.getElementById('ai-input');
    document.getElementById('ai-send-btn').addEventListener('click', handleSend);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });

    document.querySelectorAll('.ai-starter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        input.value = btn.dataset.prompt || '';
        handleSend();
      });
    });

    if (initialPrompt) {
      input.value = initialPrompt;
      handleSend();
    } else {
      input.focus();
    }
  }

  function closeChat() {
    if (typeof Voice !== 'undefined') Voice.stop();
    const panel = document.getElementById('ai-panel');
    const backdrop = document.getElementById('ai-backdrop');
    if (!panel) return;
    panel.classList.add('ai-panel-out');
    if (backdrop) backdrop.classList.add('ai-backdrop-out');
    setTimeout(() => {
      panel.remove();
      if (backdrop) backdrop.remove();
      document.body.classList.remove('ai-chat-open');
      setAdvisorButtonState(false);
    }, 280);
  }

  async function handleSend() {
    const input   = document.getElementById('ai-input');
    const text    = input.value.trim();
    if (!text) return;
    input.value = '';
    input.style.height = '';

    appendMsg('user', text);
    chatHistory.push({ role: 'user', content: text });
    advisorConvo.push({ role: 'user', content: text });

    const typingEl = appendMsg('ai', '…', true);
    const { content, error } = await callAPI(chatHistory, chatContext, 'chat');
    typingEl.remove();

    const reply = content || `⚠️ Lỗi kết nối AI: ${error || 'Hãy chắc chắn server đang chạy (node server.js).'}`;
    appendMsg('ai', reply);
    chatHistory.push({ role: 'assistant', content: reply });
    advisorConvo.push({ role: 'assistant', content: reply });
    if (typeof Voice !== 'undefined') Voice.speak(reply, 'advisor');
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

  // ── Opponent chat panel ───────────────────────────────────
  function openOpponentChat(initialPrompt, ctx, priorMessage = null) {
    const existing = document.getElementById('opponent-panel');
    if (existing) {
      const existingInput = document.getElementById('opponent-input');
      if (existingInput) {
        if (initialPrompt) { existingInput.value = initialPrompt; handleOpponentSend(); }
        else existingInput.focus();
      }
      return;
    }

    opponentContext = ctx || buildCtx(Game.getState());
    opponentHistory = opponentConvo.map(m => ({ role: m.role, content: m.content }));

    const backdrop = document.createElement('div');
    backdrop.id = 'opponent-backdrop';
    backdrop.addEventListener('click', closeOpponentChat);
    document.body.appendChild(backdrop);

    const state = Game.getState();
    const oppName = state ? opponentFactionName(state) : 'Đối Thủ';
    const oppSub  = oppName === 'Tư Sản' ? 'Thủ lĩnh Tư Bản & Chủ Xưởng' : 'Lãnh tụ Công Nhân & Công Đoàn';

    const panel = document.createElement('div');
    panel.id = 'opponent-panel';
    panel.innerHTML = `
      <div class="ai-header">
        <span class="ai-header-icon">⚔️</span>
        <div class="ai-header-text">
          <div class="ai-header-title">${oppName}</div>
          <div class="ai-header-sub">${oppSub}</div>
        </div>
        <button class="ai-voice-btn" id="opponent-voice-btn" title="Bật/tắt giọng đọc">🔊</button>
        <button class="ai-close-btn" onclick="AI.closeOpponentChat()">x</button>
      </div>
      <div class="ai-starters" id="opponent-starters">
        <button class="ai-starter-btn" type="button" data-prompt="Phe của ngươi sẽ không trụ được đến ngày cuối.">Khiêu khích</button>
        <button class="ai-starter-btn" type="button" data-prompt="Điều gì khiến ngươi nghĩ mình có thể thắng?">Thách thức</button>
        <button class="ai-starter-btn" type="button" data-prompt="Ta đã chuẩn bị sẵn cho bước đi tiếp theo của ngươi.">Đe dọa</button>
      </div>
      <div class="ai-messages" id="opponent-messages">
        <div class="ai-msg ai-msg-system">Kẻ thù của ngươi đang theo dõi. Ngươi có điều gì muốn nói không?</div>
      </div>
      <div class="ai-input-wrap">
        <textarea class="ai-input" id="opponent-input" rows="2"
          placeholder="Nói chuyện với đối thủ..."></textarea>
        <button class="ai-mic-btn" id="opponent-mic-btn" title="Nói thay vì gõ">🎤</button>
        <button class="ai-send-btn" id="opponent-send-btn">Gửi</button>
      </div>`;
    document.body.appendChild(panel);

    // Render full conversation history into the panel
    const messagesBox = document.getElementById('opponent-messages');
    if (messagesBox && opponentConvo.length > 0) {
      opponentConvo.forEach(item => {
        if (item.role === 'user') {
          const el = document.createElement('div');
          el.className = 'ai-msg ai-msg-user';
          el.textContent = item.content;
          messagesBox.appendChild(el);
        } else {
          _renderOpponentBubble(messagesBox, { text: item.content, label: item.label });
        }
      });
      messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    // Mark all as read, clear badge
    opponentMessages.forEach(m => { m.read = true; });
    UI.setBadge('opponent', 0);

    // Wire voice toggle + mic buttons
    if (typeof Voice !== 'undefined') {
      document.getElementById('opponent-voice-btn')?.addEventListener('click', () => {
        const on  = Voice.toggleOpponent();
        const btn = document.getElementById('opponent-voice-btn');
        if (btn) { btn.textContent = on ? '🔊' : '🔇'; btn.classList.toggle('muted', !on); }
      });
      document.getElementById('opponent-mic-btn')?.addEventListener('click', () => {
        Voice.startSTT('opponent-input', 'opponent-mic-btn');
      });
    }

    setOpponentButtonState(true);

    const input = document.getElementById('opponent-input');
    document.getElementById('opponent-send-btn').addEventListener('click', handleOpponentSend);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleOpponentSend(); }
    });
    document.querySelectorAll('#opponent-starters .ai-starter-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const label = btn.textContent.trim();
        const starters = document.getElementById('opponent-starters');
        if (starters) starters.style.display = 'none';

        const typingEl = appendOpponentMsg('ai', '…', true);
        const trigger = `[Người chơi muốn nghe lời ${label.toLowerCase()} từ phía ngươi. Hãy nói 1-2 câu sắc bén, đúng nhân vật.]`;
        opponentHistory.push({ role: 'user', content: trigger });
        const { content, error } = await callAPI(opponentHistory, opponentContext, 'opponent-chat');
        typingEl.remove();
        const reply = content || `⚠️ Lỗi: ${error}`;
        appendOpponentMsg('ai', reply);
        opponentHistory.push({ role: 'assistant', content: reply });
        opponentConvo.push({ role: 'assistant', content: reply });
        if (typeof Voice !== 'undefined') Voice.speak(reply, 'opponent');
      });
    });

    if (initialPrompt) { input.value = initialPrompt; handleOpponentSend(); }
    else input.focus();
  }

  function closeOpponentChat() {
    if (typeof Voice !== 'undefined') Voice.stop();
    const panel    = document.getElementById('opponent-panel');
    const backdrop = document.getElementById('opponent-backdrop');
    if (!panel) return;
    panel.classList.add('opponent-panel-out');
    if (backdrop) backdrop.classList.add('opponent-backdrop-out');
    setTimeout(() => {
      panel.remove();
      if (backdrop) backdrop.remove();
      setOpponentButtonState(false);
    }, 280);
  }

  async function handleOpponentSend() {
    const input = document.getElementById('opponent-input');
    const text  = input.value.trim();
    if (!text) return;
    input.value = '';
    input.style.height = '';

    appendOpponentMsg('user', text);
    opponentHistory.push({ role: 'user', content: text });
    opponentConvo.push({ role: 'user', content: text });

    const typingEl = appendOpponentMsg('ai', '…', true);
    const { content, error } = await callAPI(opponentHistory, opponentContext, 'opponent-chat');
    typingEl.remove();

    const reply = content || `⚠️ Lỗi kết nối AI: ${error || 'server chưa chạy.'}`;
    appendOpponentMsg('ai', reply);
    opponentHistory.push({ role: 'assistant', content: reply });
    opponentConvo.push({ role: 'assistant', content: reply });
    if (typeof Voice !== 'undefined') Voice.speak(reply, 'opponent');
  }

  function appendOpponentMsg(role, text, isTyping = false) {
    const box = document.getElementById('opponent-messages');
    if (!box) return document.createElement('div');
    const el = document.createElement('div');
    el.className = `ai-msg ai-msg-${role}${isTyping ? ' ai-typing' : ''}`;
    el.textContent = text;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
    return el;
  }

  return {
    autoAfterWave, flushPendingAuto, autoAfterEvent, openChat, closeChat, buildCtx,
    opponentAutoAfterWave, flushOpponentAuto, openOpponentChat, closeOpponentChat,
    resetMessages
  };
})();
