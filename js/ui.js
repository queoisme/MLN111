'use strict';

const UI = (() => {
  // ── Screen management ──────────────────────────────────────
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`screen-${name}`);
    if (target) target.classList.add('active');
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

    container.innerHTML = availableIds.map(id => {
      const action = ACTIONS[id];
      const isSelected = state.selectedActions.includes(id);
      const isDisabled = !isSelected && !canAfford(action, state);
      const isMaxed = !isSelected && state.selectedActions.length >= 2;

      const costText = buildCostText(action);
      return `
        <div class="action-card${isSelected ? ' selected' : ''}${(isDisabled || isMaxed) ? ' disabled' : ''}"
             onclick="Game.toggleAction('${id}')"
             title="${action.flavorText}">
          <div class="action-card-icon">${action.icon}</div>
          <div class="action-card-name">${action.name}</div>
          <div class="action-card-cost">${costText}</div>
          <div class="action-card-desc">${action.description}</div>
        </div>`;
    }).join('');

    renderSelectedPreview(state);
    document.getElementById('actions-remaining').textContent =
      `Đã chọn: ${state.selectedActions.length}/2`;
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
    return parts.length ? parts.join(', ') : 'Miễn phí';
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

    if (state.pendingWaves.length === 0 && !state.currentWave) {
      content.innerHTML = '<div class="wave-placeholder">Ngày yên tĩnh — chuẩn bị cho làn sóng tiếp theo.</div>';
      return;
    }

    const upcoming = state.pendingWaves.map(id => WAVES[id]);
    if (upcoming.length === 0 && state.phase === 'DECISION') {
      content.innerHTML = '<div class="wave-placeholder">Ngày yên tĩnh — chuẩn bị cho làn sóng tiếp theo.</div>';
      return;
    }

    const wave = upcoming[0] || WAVES[state.pendingWaves[0]];
    if (!wave) {
      content.innerHTML = '<div class="wave-placeholder">Đang chờ làn sóng tiếp theo...</div>';
      return;
    }

    const dmgRows = Object.entries(wave.damage)
      .map(([s, v]) => `<div class="wave-dmg-row">
        <span class="wave-dmg-value">${v}</span>
        <span class="wave-dmg-label">${STAT_META[s].label}</span>
      </div>`).join('');

    const mitigatorRows = wave.mitigators.map(m => {
      const cur = state.stats[m.stat];
      const met = cur >= m.threshold;
      return `<div class="wave-mit-row ${met ? 'mit-met' : 'mit-unmet'}">
        ${STAT_META[m.stat].icon} ${STAT_META[m.stat].label} ≥ ${m.threshold} → -${Math.round(m.reduction * 100)}%
        <span class="mit-cur">[${cur} ${met ? '✓' : '✗'}]</span>
      </div>`;
    }).join('');

    const defenseSection = mitigatorRows
      ? `<div class="wave-defense-section">
           <div class="wave-defense-label">Phòng Thủ</div>
           ${mitigatorRows}
         </div>`
      : '';

    const extra = upcoming.length > 1
      ? `<div class="wave-placeholder" style="margin-top:8px">+${upcoming.length - 1} làn sóng nữa hôm nay</div>`
      : '';

    content.innerHTML = `
      <div class="wave-incoming">
        <div class="wave-icon">${wave.icon}</div>
        <div class="wave-name">${wave.name}</div>
        <div class="wave-incoming-damages">${dmgRows}</div>
        ${defenseSection}
        ${extra}
      </div>`;
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
    el.className = 'log-entry';
    el.innerHTML = `
      <span class="log-day">🎓</span>
      <span class="log-text type-ai">${text}<br>
        <button class="btn-ask-ai">Hỏi sâu hơn về ${sourceName} →</button>
      </span>`;
    el.querySelector('.btn-ask-ai').addEventListener('click', () => {
      AI.openChat(`Hãy phân tích sâu hơn về "${sourceName}" trong bối cảnh đấu tranh giai cấp lịch sử.`, ctx);
    });
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }

  // ── Day transition overlay ────────────────────────────────
  function showDayTransition(day, factionId, isLast, callback) {
    const existing = document.getElementById('day-transition');
    if (existing) existing.remove();

    const briefing   = DAY_BRIEFINGS[day];
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
          <div class="dt-tip-text">${briefing.tip}</div>
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
    if (img) img.src = imgSrc || '';
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
    appendAICommentary
  };
})();
