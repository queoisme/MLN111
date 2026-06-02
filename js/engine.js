'use strict';

const Game = (() => {
  // ── State ─────────────────────────────────────────────────
  let state = null;
  let _narrativeCallback = null;
  let _narrativeBackScreen = null;

  function freshState(factionId) {
    const faction = FACTIONS[factionId];
    return {
      faction: factionId,
      day: 1,
      maxDays: 7,
      stats: { ...faction.startStats },
      activeBuffs: [],
      selectedActions: [],
      pendingWaves: [],
      currentWaveIndex: 0,
      log: [],
      phase: 'DECISION',
      passiveCapital: 0
    };
  }

  // ── Navigation ────────────────────────────────────────────
  function startFactionSelect() {
    _narrativeBackScreen = 'menu';
    _narrativeCallback = () => UI.showScreen('faction');
    UI.showNarrative(NARRATIVE.prologue, 'Lời Mở Đầu', 'img/narrative-prologue.jpg');
  }

  function selectFaction(factionId) {
    state = freshState(factionId);
    if (typeof AI !== 'undefined') AI.resetMessages();
    const faction = FACTIONS[factionId];
    UI.setFactionTheme(faction);
    _narrativeBackScreen = 'faction';
    _narrativeCallback = () => _initGame(factionId);
    UI.showNarrative(NARRATIVE.factionIntro[factionId], faction.name, `img/narrative-${factionId}.jpg`);
  }

  function goBackNarrative() {
    const back = _narrativeBackScreen;
    _narrativeBackScreen = null;
    _narrativeCallback = null;
    if (back === 'faction') state = null;
    UI.showScreen(back || 'menu');
  }

  function _initGame(factionId) {
    const faction = FACTIONS[factionId];
    UI.clearLog();
    UI.showScreen('game');
    document.getElementById('screen-game').classList.remove('day-final');
    document.getElementById('day-number').textContent = '1';
    document.getElementById('end-turn-btn').disabled = true;
    UI.renderStats(state);
    UI.renderActionCards(state);
    UI.setPhaseLabel('Quyết Sách', '');

    UI.showDayTransition(1, factionId, false, () => {
      UI.appendLogBanner('day-start', null, `Ngày 1 · ${DAY_BRIEFINGS[1].label}`, 1);
      addLog(`Phe ${faction.name} chuẩn bị chiến đấu. Ngày 1 bắt đầu.`, 'system');
      addLog(`Mục tiêu: Trụ vững 7 ngày trước các làn sóng khủng hoảng.`, 'system');
      const b1 = DAY_BRIEFINGS[1];
      addLog(`[${b1.label}] ${b1.tip}`, 'briefing');
      scheduleWaves();
    });
  }

  function continueNarrative() {
    if (_narrativeCallback) {
      const cb = _narrativeCallback;
      _narrativeCallback = null;
      cb();
    }
  }

  function restart() {
    state = null;
    UI.showScreen('menu');
  }

  // ── Wave Scheduling ────────────────────────────────────────
  function scheduleWaves() {
    const schedule = WAVE_SCHEDULE[state.day] || ['strike'];
    state.pendingWaves = [...schedule];
    state.currentWaveIndex = 0;
    UI.updateWavePanel(state);
  }

  // ── Decision Phase ─────────────────────────────────────────
  function toggleAction(actionId) {
    if (state.phase !== 'DECISION') return;

    const idx = state.selectedActions.indexOf(actionId);
    if (idx !== -1) {
      state.selectedActions.splice(idx, 1);
    } else {
      if (state.selectedActions.length >= 2) return;

      const action = ACTIONS[actionId];
      if (!canAfford(action)) return;

      state.selectedActions.push(actionId);
    }
    UI.renderActionCards(state);
    UI.renderSelectedPreview(state);
    document.getElementById('end-turn-btn').disabled = state.selectedActions.length === 0;
  }

  function canAfford(action) {
    for (const [stat, cost] of Object.entries(action.cost)) {
      if (state.stats[stat] < cost) return false;
    }
    return true;
  }

  function endTurn() {
    if (state.phase !== 'DECISION') return;
    state.phase = 'APPLYING_ACTIONS';

    // Apply passive capital first
    if (state.passiveCapital > 0) {
      state.stats.capital = Math.min(100, state.stats.capital + state.passiveCapital);
    }

    // Apply lockout buff (capital_gain_next)
    const lockoutIdx = state.activeBuffs.findIndex(b => b.type === 'capital_gain_next');
    if (lockoutIdx !== -1) {
      state.stats.capital = Math.min(100, state.stats.capital + state.activeBuffs[lockoutIdx].amount);
      addLog(`Đóng cửa nhà máy kỳ trước: +${state.activeBuffs[lockoutIdx].amount} tài nguyên.`, 'action');
      state.activeBuffs.splice(lockoutIdx, 1);
    }

    // Apply selected actions
    for (const actionId of state.selectedActions) {
      applyAction(actionId);
    }
    state.selectedActions = [];

    // Check if wave is skipped by bribe
    const skipIdx = state.activeBuffs.findIndex(b => b.type === 'skip_next_wave');
    if (skipIdx !== -1) {
      state.activeBuffs.splice(skipIdx, 1);
      addLog(`Quan chức đã bị mua chuộc — làn sóng bị hoãn lại.`, 'action');
      state.pendingWaves = [];
    }

    // Check for event
    const event = EVENTS.find(e => e.day === state.day);
    if (event && !state.shownEvents) {
      state.shownEvents = state.shownEvents || {};
    }
    if (event && !state.shownEvents?.[event.id]) {
      state.shownEvents = state.shownEvents || {};
      state.shownEvents[event.id] = true;
      state.phase = 'EVENT';
      UI.showEvent(event, state);
      return;
    }

    startNextWave();
  }

  function resolveEvent(choiceIndex, event) {
    const choice = event.choices[choiceIndex];
    for (const [stat, val] of Object.entries(choice.effect)) {
      state.stats[stat] = Math.max(0, Math.min(100, state.stats[stat] + val));
    }
    const effectParts = Object.entries(choice.effect)
      .map(([s, v]) => `${v > 0 ? '+' : ''}${v} ${STAT_META[s].label}`)
      .join(', ');
    addLog(`[Sự kiện] Bạn chọn "${choice.label}": ${effectParts}`, 'event');

    if (typeof AI !== 'undefined') {
      AI.autoAfterEvent(event, choice.label, state);
    }

    UI.showScreen('game');
    UI.appendLogBanner('event', event.id, event.title, state.day);
    startNextWave();
  }

  function startNextWave() {
    if (state.pendingWaves.length === 0) {
      endDay();
      return;
    }
    const waveId = state.pendingWaves.shift();
    state.currentWave = WAVES[waveId];
    state.phase = 'WAVE_INCOMING';
    UI.setPhaseLabel('Làn Sóng', 'phase-wave');
    addLog(`— Ngày ${state.day}: ${state.currentWave.name} đang đến! —`, 'wave');
    addLog(randomFrom(state.currentWave.announcement), 'wave');
    UI.updateWavePanel(state);

    setTimeout(() => {
      resolveWave();
    }, 1800);
  }

  function resolveWave() {
    state.phase = 'WAVE_RESOLVING';
    UI.setPhaseLabel('Giải Quyết', 'phase-resolve');

    const wave = state.currentWave;
    const damages = {};
    const mitigationLog = [];

    // Collect active mitigators once (not per-damage-stat)
    for (const m of wave.mitigators) {
      if (state.stats[m.stat] >= m.threshold) {
        mitigationLog.push(`${STAT_META[m.stat].label} cao → giảm ${Math.round(m.reduction * 100)}% sát thương`);
      }
    }
    const buffKey = `reduce_wave_${wave.id}`;
    const buff = state.activeBuffs.find(b => b.type === buffKey);
    if (buff) mitigationLog.push(`Buff hiện tại → giảm thêm ${Math.round(buff.reduction * 100)}%`);

    // Damage scales up with day: 60% on day1, 80% on day2, 100% from day3+
    const dayScale = Math.min(1, 0.4 + state.day * 0.2);

    for (const [stat, baseDmg] of Object.entries(wave.damage)) {
      let dmg = baseDmg * dayScale;
      for (const m of wave.mitigators) {
        if (state.stats[m.stat] >= m.threshold) dmg = dmg * (1 - m.reduction);
      }
      if (buff) dmg = dmg * (1 - buff.reduction);
      damages[stat] = Math.round(dmg);
    }

    // Remove used wave-reduction buffs
    state.activeBuffs = state.activeBuffs.filter(b => !b.type.startsWith('reduce_wave_'));

    // Apply damages
    const before = { ...state.stats };
    for (const [stat, dmg] of Object.entries(damages)) {
      state.stats[stat] = Math.max(0, Math.min(100, state.stats[stat] + dmg));
    }

    // Calculate resolution quality
    const totalDamageApplied = Object.values(damages).reduce((s, v) => s + Math.abs(v), 0);
    const maxPossibleDamage = Object.values(wave.damage).reduce((s, v) => s + Math.abs(v), 0);
    const mitigationRatio = 1 - (totalDamageApplied / maxPossibleDamage);
    let resolutionKey = 'low';
    if (mitigationRatio >= 0.6) resolutionKey = 'high';
    else if (mitigationRatio >= 0.3) resolutionKey = 'mid';

    const resolutionText = wave.resolution[resolutionKey];
    addLog(resolutionText, 'resolve');

    UI.renderBuffs(state);

    // Prefetch AI commentary while player reads resolve screen
    if (typeof AI !== 'undefined') {
      AI.autoAfterWave(wave, mitigationRatio, state);
      AI.opponentAutoAfterWave(wave, mitigationRatio, state);
    }

    UI.showResolveScreen(wave, damages, mitigationLog, resolutionText, state);
  }

  function continueAfterResolve() {
    UI.showScreen('game');
    UI.renderStats(state);
    UI.setPhaseLabel('Quyết Sách', '');

    if (state.currentWave) {
      UI.appendLogBanner('wave', state.currentWave.id, state.currentWave.name, state.day);
    }

    // Flush prefetched wave commentary into the log
    if (typeof AI !== 'undefined') {
      AI.flushPendingAuto();
      AI.flushOpponentAuto();
    }

    // Check lose condition
    const faction = FACTIONS[state.faction];
    for (const [stat, threshold] of Object.entries(faction.loseConditions)) {
      if (state.stats[stat] <= threshold) {
        setTimeout(() => triggerGameOver(false, stat), 400);
        return;
      }
    }

    // More waves to resolve?
    if (state.pendingWaves.length > 0) {
      setTimeout(() => startNextWave(), 600);
      return;
    }

    endDay();
  }

  function endDay() {
    addLog(`— Ngày ${state.day} kết thúc. —`, 'system');
    UI.appendLogBanner('day-end', null, `Ngày ${state.day} · Kết thúc`, state.day);

    // Tick buffs
    state.activeBuffs = state.activeBuffs
      .map(b => ({ ...b, turns: (b.turns || 0) - 1 }))
      .filter(b => b.permanent || b.turns > 0);

    if (state.day >= state.maxDays) {
      triggerGameOver(true, null);
      return;
    }

    state.day++;
    state.phase = 'DECISION';

    // Daily base income
    const BASE_INCOME = { proletariat: 8, bourgeoisie: 5 };
    const income = BASE_INCOME[state.faction] || 0;
    state.stats.capital = Math.min(100, state.stats.capital + income);

    UI.showDayTransition(state.day, state.faction, state.day === state.maxDays, () => {
      UI.updateDayCounter(state);
      UI.renderStats(state);
      UI.renderActionCards(state);
      UI.setPhaseLabel('Quyết Sách', '');
      document.getElementById('end-turn-btn').disabled = true;

      const briefing = DAY_BRIEFINGS[state.day];
      UI.appendLogBanner('day-start', null, `Ngày ${state.day} · ${briefing.label}`, state.day);

      const dayNarrative = NARRATIVE.dailyNarrative[state.faction]?.[state.day];
      if (dayNarrative) addLog(dayNarrative, 'narrative');

      if (state.day === 7) {
        document.getElementById('screen-game').classList.add('day-final');
        addLog(`⚠ [${briefing.label}] ${briefing.tip}`, 'briefing');
      } else {
        addLog(`Ngày ${state.day} bắt đầu.`, 'system');
        addLog(`[${briefing.label}] ${briefing.tip}`, 'briefing');
      }

      scheduleWaves();
      UI.updateWavePanel(state);

      if (typeof AI !== 'undefined') {
        AI.autoNewDay(state);
        setTimeout(() => AI.opponentAutoNewDay(state), 2500);
      }
    });
  }

  // ── Apply Action ───────────────────────────────────────────
  function applyAction(actionId) {
    const action = ACTIONS[actionId];
    const effectParts = [];

    // Pay costs
    for (const [stat, cost] of Object.entries(action.cost)) {
      state.stats[stat] = Math.max(0, state.stats[stat] - cost);
    }

    // Apply immediate effects
    for (const [stat, val] of Object.entries(action.effect)) {
      const before = state.stats[stat];
      state.stats[stat] = Math.max(0, Math.min(100, state.stats[stat] + val));
      const actual = state.stats[stat] - before;
      if (actual !== 0) {
        effectParts.push(`${actual > 0 ? '+' : ''}${actual} ${STAT_META[stat].label}`);
      }
    }

    // Apply buff
    if (action.buff) {
      const buff = { ...action.buff };
      if (buff.permanent) {
        state.passiveCapital += buff.amount;
        effectParts.push(`Tự động hóa: +${buff.amount} tài nguyên/ngày (thụ động)`);
      } else {
        state.activeBuffs.push(buff);
        effectParts.push(`Buff: ${buffDescription(buff)}`);
      }
    }

    const parts = effectParts.length ? effectParts.join(', ') : 'không có hiệu quả tức thì';
    addLog(`[Hành động] ${action.name}: ${parts}`, 'action');
    UI.renderStats(state);
    UI.renderBuffs(state);
  }

  function buffDescription(buff) {
    const desc = {
      reduce_wave_strike:           'giảm thiệt hại Đình Công lần tới',
      reduce_wave_sabotage:         'giảm thiệt hại Phá Hoại lần tới',
      reduce_wave_crackdown:        'giảm thiệt hại Đàn Áp lần tới',
      reduce_wave_general_strike:   'giảm thiệt hại Tổng Đình Công lần tới',
      reduce_wave_media_war:        'giảm thiệt hại Chiến Tranh Truyền Thông lần tới',
      reduce_wave_political_crisis: 'giảm thiệt hại Khủng Hoảng Chính Trị lần tới',
      skip_next_wave:               'bỏ qua wave tiếp theo hoàn toàn',
      capital_gain_next:            `+${buff.amount} tài nguyên đầu ngày sau`
    };
    return desc[buff.type] || buff.type;
  }

  // ── Game Over ──────────────────────────────────────────────
  function triggerGameOver(isWin, loseStatKey) {
    state.phase = 'GAME_OVER';
    const faction = FACTIONS[state.faction];

    let title, text;
    if (isWin) {
      title = 'Bạn Đã Trụ Vững';
      text = NARRATIVE.epilogue[state.faction].win;
    } else {
      title = 'Thất Bại';
      text = NARRATIVE.epilogue[state.faction][`lose_${loseStatKey}`]
          || faction.loseTexts[loseStatKey]
          || 'Phe bạn đã không thể tiếp tục chiến đấu.';
    }

    UI.showGameOver(isWin, title, text, state);
  }

  // ── Helpers ────────────────────────────────────────────────
  function addLog(text, type = 'system') {
    const entry = { text, type, day: state.day };
    state.log.push(entry);
    UI.appendLog(entry);
  }

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ── Public API ─────────────────────────────────────────────
  return {
    startFactionSelect,
    selectFaction,
    toggleAction,
    endTurn,
    continueAfterResolve,
    resolveEvent,
    restart,
    continueNarrative,
    goBackNarrative,
    getState: () => state
  };
})();
