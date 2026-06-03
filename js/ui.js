'use strict';

const UI = (() => {
  let layoutResizerReady = false;
  let syncGameLayout = null;
  // ── Screen management ──────────────────────────────────────
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`screen-${name}`);
    if (target) target.classList.add('active');
    if (name === 'game' && typeof syncGameLayout === 'function') {
      window.requestAnimationFrame(() => syncGameLayout());
    }
  }

  // ── Faction theme ──────────────────────────────────────────
  function setFactionTheme(faction) {
    document.documentElement.style.setProperty('--faction-color', faction.color);
    document.documentElement.style.setProperty('--faction-dim', faction.colorDim);
    const title = document.getElementById('header-faction-name');
    if (title) {
      title.textContent = faction.name;
      title.style.color = faction.color;
    }
  }

  // ── Stats rendering ────────────────────────────────────────
  function setupLayoutResizer() {
    if (layoutResizerReady) return;
    layoutResizerReady = true;

    const root = document.documentElement;
    const gameScreen = document.getElementById('screen-game');
    const gameBody = gameScreen?.querySelector('.game-body');
    const gameHeader = gameScreen?.querySelector('.game-header');
    const rightPanel = gameScreen?.querySelector('.panel-right');
    const panelStats = gameScreen?.querySelector('.panel-stats');
    const gameFooter = gameScreen?.querySelector('.game-footer');
    const resizerX = document.getElementById('layout-resizer');
    const resizerSidebarY = document.getElementById('sidebar-resizer');
    const resizerFooterY = document.getElementById('footer-resizer');
    if (!root || !gameScreen || !gameHeader || !gameBody || !rightPanel || !panelStats || !gameFooter || !resizerX || !resizerSidebarY || !resizerFooterY) return;

    const STORAGE_KEYS = {
      rightWidth: 'mln111.panelRightWidth',
      statsHeight: 'mln111.panelStatsHeight',
      footerHeight: 'mln111.gameFooterHeight'
    };
    const KEYBOARD_STEP = 14;
    const MQL_SMALL = '(max-width: 480px)';

    const setRootVar = (name, value, storageKey = null, persist = false) => {
      root.style.setProperty(name, `${Math.round(value)}px`);
      if (persist && storageKey) {
        try {
          localStorage.setItem(storageKey, String(Math.round(value)));
        } catch (_) {}
      }
    };

    const getStoredValue = (storageKey, fallback) => {
      try {
        const raw = Number(localStorage.getItem(storageKey));
        if (Number.isFinite(raw) && raw > 0) return raw;
      } catch (_) {}
      return fallback;
    };

    const getRect = (el) => el.getBoundingClientRect();

    const applyRightWidth = (value, persist = false) => {
      const minRight = 160;
      const minNarrative = 220;
      const available = gameBody.clientWidth - minNarrative - resizerX.offsetWidth;
      const maxRight = Math.max(minRight, available);
      const clamped = Math.max(minRight, Math.min(maxRight, Math.round(value)));
      setRootVar('--panel-right-width', clamped, STORAGE_KEYS.rightWidth, persist);
      return clamped;
    };

    const applyStatsHeight = (value, persist = false) => {
      const minStats = 150;
      const minWave = 140;
      const available = rightPanel.clientHeight - minWave - resizerSidebarY.offsetHeight;
      const maxStats = Math.max(minStats, available);
      const clamped = Math.max(minStats, Math.min(maxStats, Math.round(value)));
      setRootVar('--panel-stats-height', clamped, STORAGE_KEYS.statsHeight, persist);
      return clamped;
    };

    const applyFooterHeight = (value, persist = false) => {
      const minFooter = 96;
      const minBody = 240;
      const softMaxFooter = 220;
      const available = gameScreen.clientHeight - gameHeader.offsetHeight - resizerFooterY.offsetHeight - minBody;
      const maxFooter = Math.max(minFooter, Math.min(softMaxFooter, available));
      const clamped = Math.max(minFooter, Math.min(maxFooter, Math.round(value)));
      setRootVar('--game-footer-height', clamped, STORAGE_KEYS.footerHeight, persist);
      return clamped;
    };

    const currentRightWidth = () => Math.max(1, Math.round(getRect(rightPanel).width));
    const currentStatsHeight = () => Math.max(1, Math.round(getRect(panelStats).height));
    const currentFooterHeight = () => Math.max(1, Math.round(getRect(gameFooter).height));
    const readCssVarPx = (name, fallback) => {
      const raw = parseFloat(getComputedStyle(root).getPropertyValue(name));
      return Number.isFinite(raw) && raw > 0 ? raw : fallback;
    };

    const stopDrag = (cssClass, moveHandler, upHandler, persistHandler) => {
      document.body.classList.remove(cssClass);
      window.removeEventListener('pointermove', moveHandler);
      window.removeEventListener('pointerup', upHandler);
      persistHandler();
    };

    setRootVar('--panel-right-width', getStoredValue(STORAGE_KEYS.rightWidth, 260));
    setRootVar('--panel-stats-height', getStoredValue(STORAGE_KEYS.statsHeight, 238));
    setRootVar('--game-footer-height', getStoredValue(STORAGE_KEYS.footerHeight, 124));

    const syncLayoutToViewport = () => {
      if (!gameScreen.classList.contains('active')) return;
      if (window.matchMedia(MQL_SMALL).matches) return;
      applyRightWidth(readCssVarPx('--panel-right-width', 260), true);
      applyStatsHeight(readCssVarPx('--panel-stats-height', 238), true);
      applyFooterHeight(readCssVarPx('--game-footer-height', 124), true);
    };
    syncGameLayout = syncLayoutToViewport;

    let dragX = null;
    const onMoveX = (evt) => {
      if (!dragX) return;
      const delta = dragX.startPointer - evt.clientX;
      applyRightWidth(dragX.startValue + delta);
    };
    const onUpX = () => {
      if (!dragX) return;
      stopDrag('is-resizing-layout-x', onMoveX, onUpX, () => applyRightWidth(currentRightWidth(), true));
      dragX = null;
    };

    let dragStatsY = null;
    const onMoveStatsY = (evt) => {
      if (!dragStatsY) return;
      const delta = evt.clientY - dragStatsY.startPointer;
      applyStatsHeight(dragStatsY.startValue + delta);
    };
    const onUpStatsY = () => {
      if (!dragStatsY) return;
      stopDrag('is-resizing-layout-y', onMoveStatsY, onUpStatsY, () => applyStatsHeight(currentStatsHeight(), true));
      dragStatsY = null;
    };

    let dragFooterY = null;
    const onMoveFooterY = (evt) => {
      if (!dragFooterY) return;
      const delta = dragFooterY.startPointer - evt.clientY;
      applyFooterHeight(dragFooterY.startValue + delta);
    };
    const onUpFooterY = () => {
      if (!dragFooterY) return;
      stopDrag('is-resizing-layout-y', onMoveFooterY, onUpFooterY, () => applyFooterHeight(currentFooterHeight(), true));
      dragFooterY = null;
    };

    resizerX.addEventListener('pointerdown', (evt) => {
      if (window.matchMedia(MQL_SMALL).matches) return;
      dragX = { startPointer: evt.clientX, startValue: currentRightWidth() };
      document.body.classList.add('is-resizing-layout-x');
      window.addEventListener('pointermove', onMoveX);
      window.addEventListener('pointerup', onUpX);
      evt.preventDefault();
    });

    resizerSidebarY.addEventListener('pointerdown', (evt) => {
      if (window.matchMedia(MQL_SMALL).matches) return;
      dragStatsY = { startPointer: evt.clientY, startValue: currentStatsHeight() };
      document.body.classList.add('is-resizing-layout-y');
      window.addEventListener('pointermove', onMoveStatsY);
      window.addEventListener('pointerup', onUpStatsY);
      evt.preventDefault();
    });

    resizerFooterY.addEventListener('pointerdown', (evt) => {
      if (window.matchMedia(MQL_SMALL).matches) return;
      dragFooterY = { startPointer: evt.clientY, startValue: currentFooterHeight() };
      document.body.classList.add('is-resizing-layout-y');
      window.addEventListener('pointermove', onMoveFooterY);
      window.addEventListener('pointerup', onUpFooterY);
      evt.preventDefault();
    });

    resizerX.addEventListener('keydown', (evt) => {
      if (evt.key !== 'ArrowLeft' && evt.key !== 'ArrowRight') return;
      const dir = evt.key === 'ArrowLeft' ? 1 : -1;
      const step = evt.shiftKey ? KEYBOARD_STEP * 2 : KEYBOARD_STEP;
      applyRightWidth(currentRightWidth() + (dir * step), true);
      evt.preventDefault();
    });

    resizerSidebarY.addEventListener('keydown', (evt) => {
      if (evt.key !== 'ArrowUp' && evt.key !== 'ArrowDown') return;
      const dir = evt.key === 'ArrowDown' ? 1 : -1;
      const step = evt.shiftKey ? KEYBOARD_STEP * 2 : KEYBOARD_STEP;
      applyStatsHeight(currentStatsHeight() + (dir * step), true);
      evt.preventDefault();
    });

    resizerFooterY.addEventListener('keydown', (evt) => {
      if (evt.key !== 'ArrowUp' && evt.key !== 'ArrowDown') return;
      const dir = evt.key === 'ArrowUp' ? 1 : -1;
      const step = evt.shiftKey ? KEYBOARD_STEP * 2 : KEYBOARD_STEP;
      applyFooterHeight(currentFooterHeight() + (dir * step), true);
      evt.preventDefault();
    });

    window.addEventListener('resize', () => {
      syncLayoutToViewport();
    });
  }

  function renderStats(state) {
    const container = document.getElementById('stats-container');
    if (!container) return;

    const stats = state.stats;
    container.innerHTML = Object.entries(STAT_META).map(([key, meta]) => {
      const val = Math.max(0, Math.min(100, stats[key]));
      const danger = val <= 20 ? ' danger' : '';
      return `
        <div class="stat-row" id="stat-row-${key}">
          <div class="stat-header">
            <span class="stat-label">${meta.icon} ${meta.label}</span>
            <button class="stat-help-btn" onclick="UI.toggleStatHelp('${key}')" aria-label="Mô tả ${meta.label}">?</button>
            <span class="stat-value" style="color:${meta.color}">${val}</span>
          </div>
          <div class="stat-bar-track">
            <div class="stat-bar-fill${danger}"
                 style="width:${val}%;background:${meta.color}"></div>
          </div>
          <div class="stat-description" id="stat-desc-${key}"></div>
        </div>`;
    }).join('');
    renderBuffs(state);
  }

  function shakeStatRow(statKey) {
    const row = document.getElementById(`stat-row-${statKey}`);
    if (!row) return;
    row.classList.remove('shaking');
    void row.offsetWidth;
    row.classList.add('shaking');
    setTimeout(() => row.classList.remove('shaking'), 500);
  }

  // ── Action cards ───────────────────────────────────────────
  function renderActionCards(state) {
    const container = document.getElementById('action-cards');
    if (!container) return;

    const faction = FACTIONS[state.faction];
    const availableIds = faction.actions.filter(id => {
      const a = ACTIONS[id];
      return a && a.availableFrom <= state.day;
    });

    const paidSelected = state.selectedActions
      .filter(id => Object.keys(ACTIONS[id].cost).length > 0).length;

    container.innerHTML = availableIds.map(id => {
      const action = ACTIONS[id];
      const isFree = Object.keys(action.cost).length === 0;
      const isSelected = state.selectedActions.includes(id);
      const isOneTime = action.buff?.permanent && state.automateUsed;
      const isDisabled = !isSelected && (!canAfford(action, state) || isOneTime);
      const isMaxed = !isSelected && !isFree && paidSelected >= 2;

      const costText = buildCostText(action);
      return `
        <div class="action-card${isSelected ? ' selected' : ''}${(isDisabled || isMaxed) ? ' disabled' : ''}${isFree ? ' free-action' : ''}"
             onclick="Game.toggleAction('${id}')"
             title="${action.flavorText}">
          ${isFree ? '<div class="action-card-free-badge">+</div>' : ''}
          <div class="action-card-icon">${action.icon}</div>
          <div class="action-card-name">${action.name}</div>
          <div class="action-card-cost">${costText}</div>
          <div class="action-card-desc">${action.description}</div>
        </div>`;
    }).join('');

    renderSelectedPreview(state);
    document.getElementById('actions-remaining').textContent =
      `Chọn ${paidSelected}/2`;
  }

  function canAfford(action, state) {
    for (const [stat, cost] of Object.entries(action.cost)) {
      if (state.stats[stat] < cost) return false;
    }
    return true;
  }

  function buildCostText(action) {
    const parts = [];
    for (const [stat, cost] of Object.entries(action.cost)) {
      const meta = STAT_META[stat];
      parts.push(`<span class="cost-val">-${cost}</span> ${meta.label}`);
    }
    return parts.join(', ');
  }

  function renderSelectedPreview(state) {
    const el = document.getElementById('selected-actions-preview');
    if (!el) return;
    if (state.selectedActions.length === 0) {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = state.selectedActions
      .map(id => `<div class="sel-item">${ACTIONS[id].icon} ${ACTIONS[id].name}</div>`)
      .join('');
  }

  // ── Wave panel ─────────────────────────────────────────────
  function updateWavePanel(state) {
    const content = document.getElementById('wave-content');
    if (!content) return;

    const upcoming = state.pendingWaves.map(id => WAVES[id]).filter(Boolean);

    if (upcoming.length === 0 && !state.currentWave) {
      content.innerHTML = '<div class="wave-placeholder">Ngày yên tĩnh — chuẩn bị cho làn sóng tiếp theo.</div>';
      return;
    }

    const wave = upcoming[0];
    if (!wave) {
      content.innerHTML = '<div class="wave-placeholder">Đang chờ làn sóng tiếp theo...</div>';
      return;
    }

    const totalDamage = Object.values(wave.damage)
      .reduce((sum, val) => sum + Math.abs(val), 0);
    const level = totalDamage >= 60
      ? { label: 'Khẩn Cấp', className: 'is-critical' }
      : totalDamage >= 40
        ? { label: 'Rất Cao', className: 'is-high' }
        : totalDamage >= 25
          ? { label: 'Cao', className: 'is-mid' }
          : { label: 'Vừa', className: 'is-low' };

    const dmgRows = Object.entries(wave.damage)
      .map(([s, v]) => {
        const meta = STAT_META[s];
        const impact = Math.min(100, Math.abs(v) * 3);
        return `<div class="wave-dmg-row">
          <div class="wave-dmg-head">
            <span class="wave-dmg-label">${meta.icon} ${meta.label}</span>
            <span class="wave-dmg-value">${v}</span>
          </div>
          <div class="wave-dmg-track">
            <div class="wave-dmg-fill" style="width:${impact}%;background:${meta.color}"></div>
          </div>
        </div>`;
      }).join('');

    const mitigatorRows = wave.mitigators.map(m => {
      const cur = state.stats[m.stat];
      const met = cur >= m.threshold;
      return `<div class="wave-mit-row ${met ? 'mit-met' : 'mit-unmet'}">
        ${STAT_META[m.stat].icon} ${STAT_META[m.stat].label} >= ${m.threshold} -> -${Math.round(m.reduction * 100)}%
        <span class="mit-cur">[${cur}] ${met ? 'OK' : 'THIẾU'}</span>
      </div>`;
    }).join('');

    const defenseSection = mitigatorRows
      ? `<div class="wave-defense-section">
           <div class="wave-defense-label">Phòng Thủ</div>
           ${mitigatorRows}
         </div>`
      : '';

    const extra = upcoming.length > 1
      ? `<div class="wave-next">+${upcoming.length - 1} làn sóng nữa hôm nay</div>`
      : '';

    content.innerHTML = `
      <div class="wave-incoming">
        <div class="wave-topline">
          <div class="wave-icon">${wave.icon}</div>
          <div class="wave-title-wrap">
            <div class="wave-name">${wave.name}</div>
            <div class="wave-sub">Tổng tác động: <strong>-${totalDamage}</strong></div>
          </div>
          <div class="wave-level ${level.className}">${level.label}</div>
        </div>
        <div class="wave-incoming-damages">${dmgRows}</div>
        ${defenseSection}
        ${extra}
      </div>`;
    content.scrollTop = 0;
  }

  function clearLog() {
    const log = document.getElementById('narrative-log');
    if (log) log.innerHTML = '';
  }

  // ── Log ────────────────────────────────────────────────────
  function appendLog(entry) {
    const log = document.getElementById('narrative-log');
    if (!log) return;

    const el = document.createElement('div');
    el.className = 'log-entry';
    el.innerHTML = `
      <span class="log-day">D${entry.day}</span>
      <span class="log-text type-${entry.type}">${entry.text}</span>`;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }

  // ── Phase label ────────────────────────────────────────────
  function setPhaseLabel(text, cssClass) {
    const el = document.getElementById('phase-label');
    if (!el) return;
    el.textContent = text;
    el.className = `header-phase${cssClass ? ' ' + cssClass : ''}`;
  }

  function updateDayCounter(state) {
    const el = document.getElementById('day-number');
    if (el) el.textContent = state.day;
  }

  // ── Resolve screen ─────────────────────────────────────────
  function showResolveScreen(wave, damages, mitigationLog, resolutionText, state) {
    document.getElementById('resolve-wave-name').textContent = wave.name;
    document.getElementById('resolve-icon').textContent = wave.icon;
    document.getElementById('resolve-text').textContent = resolutionText;

    const dmgRows = Object.entries(damages).map(([stat, val]) => {
      const cls = val < 0 ? 'neg' : 'pos';
      const prefix = val > 0 ? '+' : '';
      return `<div class="resolve-dmg-row">
        <span class="dmg-label">${STAT_META[stat].label}</span>
        <span class="dmg-value ${cls}">${prefix}${val}</span>
      </div>`;
    }).join('');
    document.getElementById('resolve-damages').innerHTML = dmgRows;

    const buffsEl = document.getElementById('resolve-buffs');
    buffsEl.textContent = mitigationLog.length
      ? mitigationLog.join(' · ')
      : '';

    // Set wave image + visual background
    const waveImg = document.getElementById('resolve-wave-img');
    if (waveImg) {
      const wrap = waveImg.parentElement;
      wrap.setAttribute('data-wave', wave.id);
      waveImg.style.display = '';
      waveImg.src = `img/wave-${wave.id}.jpg`;
    }

    // "Hỏi sâu hơn" button
    const resolveContainer = document.querySelector('.resolve-container');
    const oldAiBtn = resolveContainer?.querySelector('.btn-ask-ai-screen');
    if (oldAiBtn) oldAiBtn.remove();
    if (resolveContainer) {
      const aiBtn = document.createElement('button');
      aiBtn.className = 'btn-ask-ai-screen';
      aiBtn.textContent = `🎓 Hỏi về "${wave.name}" trong lịch sử`;
      aiBtn.addEventListener('click', () => {
        const s = window.Game?.getState();
        AI.openChat(
          `"${wave.name}" trong game phản ánh cơ chế lịch sử nào? Hãy cho tôi ví dụ thực tế và lý thuyết liên quan.`,
          AI.buildCtx(s, { event: `Wave ${wave.name} vừa được giải quyết.` })
        );
      });
      const continueBtn = resolveContainer.querySelector('.btn-primary');
      resolveContainer.insertBefore(aiBtn, continueBtn);
    }

    // Shake affected stats
    Object.keys(damages).forEach(s => setTimeout(() => shakeStatRow(s), 300));

    showScreen('resolve');
  }

  // ── Event screen ───────────────────────────────────────────
  function showEvent(event, state) {
    const eventImg = document.getElementById('event-img');
    if (eventImg) {
      const wrap = eventImg.parentElement;
      wrap.setAttribute('data-event', event.id);
      eventImg.style.display = '';
      eventImg.src = `img/event-${event.id}.jpg`;
    }
    document.getElementById('event-day-label').textContent = `Ngày ${state.day}`;
    document.getElementById('event-title').textContent = event.title;
    document.getElementById('event-text').textContent = event.text;
    const choicesEl = document.getElementById('event-choices');
    choicesEl.innerHTML = event.choices.map((c, i) => `
      <button class="btn-choice" onclick="Game.resolveEvent(${i}, ${JSON.stringify(event).replace(/"/g, '&quot;')})">
        ${c.label}
      </button>`).join('');
    // "Hỏi sâu hơn" button in event screen
    const eventContainer = document.querySelector('.event-container');
    const oldEvAiBtn = eventContainer?.querySelector('.btn-ask-ai-screen');
    if (oldEvAiBtn) oldEvAiBtn.remove();
    if (eventContainer) {
      const aiBtn = document.createElement('button');
      aiBtn.className = 'btn-ask-ai-screen';
      aiBtn.textContent = `🎓 Hỏi về tình huống này`;
      aiBtn.style.marginTop = '6px';
      aiBtn.addEventListener('click', () => {
        const s = window.Game?.getState();
        AI.openChat(
          `Tình huống "${event.title}" trong game tương ứng với những thách thức nào trong lịch sử thực tế của các phong trào chính trị?`,
          AI.buildCtx(s, { event: `Sự kiện: ${event.title} — ${event.text}` })
        );
      });
      eventContainer.appendChild(aiBtn);
    }

    showScreen('event');
  }

  // ── Active buffs ───────────────────────────────────────────
  function renderBuffs(state) {
    const el = document.getElementById('buffs-container');
    if (!el) return;
    const rows = state.activeBuffs.map(b => {
      const label = BUFF_LABELS[b.type] || b.type;
      const turns = b.permanent ? '∞' : `${b.turns} lượt còn lại`;
      return `<div class="buff-row">🛡️ ${label} <span class="buff-turns">(${turns})</span></div>`;
    });
    if (state.passiveCapital > 0)
      rows.push(`<div class="buff-row">⚙️ Tự động hóa +${state.passiveCapital} tài nguyên/ngày <span class="buff-turns">(∞)</span></div>`);
    el.innerHTML = rows.join('');
  }

  // ── Stat help tooltip ─────────────────────────────────────
  function toggleStatHelp(key) {
    const el = document.getElementById(`stat-desc-${key}`);
    if (!el) return;
    const isOpen = el.classList.contains('open');
    document.querySelectorAll('.stat-description.open')
      .forEach(d => d.classList.remove('open'));
    if (!isOpen) {
      el.textContent = STAT_META[key].description;
      el.classList.add('open');
    }
  }

  // ── AI commentary in narrative log ───────────────────────
  function appendAICommentary(text, sourceName, ctx) {
    const log = document.getElementById('narrative-log');
    if (!log) return;
    const el = document.createElement('div');
    el.className = 'log-entry ai-card';
    el.innerHTML = `
      <div class="ai-card-header">
        <span class="ai-card-icon">🎓</span>
        <span class="ai-card-label">AI Cố Vấn</span>
      </div>
      <div class="ai-card-body">${text}</div>
      <button class="btn-ask-ai">Hỏi sâu hơn về ${sourceName} →</button>`;
    el.querySelector('.btn-ask-ai').addEventListener('click', () => {
      AI.openChat(`Hãy phân tích sâu hơn về "${sourceName}" trong bối cảnh đấu tranh giai cấp lịch sử.`, ctx);
    });
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }

  // ── Opponent reaction in narrative log ───────────────────
  function appendOpponentReaction(text, oppName, ctx) {
    const log = document.getElementById('narrative-log');
    if (!log) return;
    const el = document.createElement('div');
    el.className = 'log-entry opponent-card';
    el.innerHTML = `
      <div class="opponent-card-header">
        <span class="opponent-card-icon">⚔️</span>
        <span class="opponent-card-label">${oppName}</span>
      </div>
      <div class="opponent-card-body">${text}</div>
      <button class="btn-challenge-opponent">Đối đáp lại →</button>`;
    el.querySelector('.btn-challenge-opponent').addEventListener('click', () => {
      AI.openOpponentChat(null, ctx, text);
    });
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }

  // ── Image banner in narrative log ────────────────────────
  function appendLogBanner(type, id, label, day) {
    const log = document.getElementById('narrative-log');
    if (!log) return;
    const el = document.createElement('div');
    el.className = 'log-image-banner';
    el.setAttribute('data-type', type);
    if (id)  el.setAttribute('data-id', id);
    if (day) el.setAttribute('data-day', String(day));

    const imgSrc = type === 'wave'      ? `img/wave-${id}.jpg`
                 : type === 'event'     ? `img/event-${id}.jpg`
                 : type === 'day-start' ? `img/day-${day}.jpg`
                 : type === 'day-end'   ? `img/day-end.jpg`
                 : null;

    el.innerHTML = `
      ${imgSrc ? `<img src="${imgSrc}" alt="" onerror="this.style.display='none'">` : ''}
      <div class="log-banner-overlay">
        <span class="log-banner-label">${label || ''}</span>
      </div>`;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }

  // ── Mailbox badge ──────────────────────────────────────────
  function setBadge(type, count) {
    const id = type === 'advisor' ? 'advisor-badge' : 'opponent-badge';
    const el = document.getElementById(id);
    if (!el) return;
    const n = Math.max(0, count);
    el.textContent = n > 0 ? (n > 99 ? '99+' : String(n)) : '';
    el.classList.toggle('visible', n > 0);
  }

  // ── Day transition overlay ────────────────────────────────
  function showDayTransition(day, factionId, isLast, callback) {
    const existing = document.getElementById('day-transition');
    if (existing) existing.remove();

    const briefing   = DAY_BRIEFINGS[day];
    const tipText    = typeof briefing.tip === 'object'
      ? (briefing.tip[factionId] || briefing.tip.proletariat)
      : briefing.tip;
    const narrative  = NARRATIVE.dailyNarrative[factionId]?.[day];
    const schedule   = WAVE_SCHEDULE[day] || [];
    const waveData   = schedule.map(id => WAVES[id]).filter(Boolean);
    const iconsBg    = waveData.map(w => w.icon).join(' ');

    const narrativeHtml = narrative
      ? `<div class="dt-narrative">${narrative}</div><div class="dt-divider"></div>`
      : '';

    const wavesHtml = waveData.length
      ? `<div>
           <div class="dt-waves-label">Mối đe dọa hôm nay</div>
           <div class="dt-waves">
             ${waveData.map(w => `<div class="dt-wave-row">${w.icon} ${w.name}</div>`).join('')}
           </div>
         </div>`
      : '';

    const overlay = document.createElement('div');
    overlay.id = 'day-transition';
    overlay.setAttribute('data-day', day);
    overlay.innerHTML = `
      <div class="dt-card">
        <div class="dt-visual">
          <div class="dt-visual-icons">${iconsBg}</div>
        </div>
        <div class="dt-header">
          <div class="dt-number">${day}</div>
          <div class="dt-header-right">
            <div class="dt-label">Ngày</div>
            <div class="dt-day-name${isLast ? ' is-final' : ''}">${briefing.label}</div>
          </div>
        </div>
        <div class="dt-divider"></div>
        ${narrativeHtml}
        <div class="dt-tip-box">
          <div class="dt-tip-label">Gợi ý chiến lược</div>
          <div class="dt-tip-text">${tipText}</div>
        </div>
        ${wavesHtml}
        <button class="btn-primary" id="dt-continue-btn">Bắt Đầu →</button>
      </div>`;
    document.body.appendChild(overlay);

    document.getElementById('dt-continue-btn').addEventListener('click', () => {
      overlay.classList.add('dt-leaving');
      setTimeout(() => {
        overlay.remove();
        if (callback) callback();
      }, 400);
    });
  }

  // ── Narrative screen ──────────────────────────────────────
  function showNarrative(text, label, imgSrc) {
    document.getElementById('narrative-label').textContent = label;
    document.getElementById('narrative-body').textContent = text;
    const wrap = document.getElementById('narrative-img-wrap');
    const img  = document.getElementById('narrative-img');
    if (wrap) {
      const key = imgSrc ? imgSrc.replace('img/narrative-', '').replace('.jpg', '') : 'prologue';
      wrap.setAttribute('data-narrative', key);
    }
    if (img) { img.style.display = ''; img.src = imgSrc || ''; }
    showScreen('narrative');
  }

  // ── Game over ──────────────────────────────────────────────
  function showGameOver(isWin, title, text, state) {
    document.getElementById('gameover-outcome').textContent = isWin ? '✓ CHIẾN THẮNG' : '✗ THẤT BẠI';
    document.getElementById('gameover-outcome').className = `gameover-outcome ${isWin ? 'win' : 'lose'}`;
    document.getElementById('gameover-title').textContent = title;
    document.getElementById('gameover-text').textContent = text;

    const statsEl = document.getElementById('gameover-stats');
    statsEl.innerHTML = Object.entries(STAT_META).map(([key, meta]) => `
      <div class="gf-stat">
        <span class="gf-stat-label">${meta.label}</span>
        <span class="gf-stat-value" style="color:${meta.color}">${state.stats[key]}</span>
      </div>`).join('');

    showScreen('gameover');
  }

  setupLayoutResizer();

  return {
    showScreen,
    setFactionTheme,
    clearLog,
    renderStats,
    renderBuffs,
    toggleStatHelp,
    renderActionCards,
    renderSelectedPreview,
    updateWavePanel,
    appendLog,
    setPhaseLabel,
    updateDayCounter,
    showResolveScreen,
    showEvent,
    showGameOver,
    showNarrative,
    showDayTransition,
    appendAICommentary,
    appendOpponentReaction,
    setBadge,
    appendLogBanner
  };
})();

