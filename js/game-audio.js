(() => {
  const STORAGE_KEY = 'tamzidGameAudio';
  const MAX_VOICES = 28;
  const MAX_NPC_HIT_VOICES = 4;
  const MAX_CRASH_VOICES = 2;
  const MAX_HEARTBEAT_VOICES = 1;
  const HEARTBEAT_THRESHOLD = 40;
  const CITY_AUDIO_URLS = {
    hit1: 'audio/city-slide/city-hit-1.wav',
    hit2: 'audio/city-slide/city-hit-2.wav',
    hit3: 'audio/city-slide/city-hit-3.wav',
    crash: 'audio/city-slide/city-car-crash.wav',
    heartbeat: 'audio/city-slide/city-heartbeat.wav'
  };
  const GAME_BY_PANEL = { flappyGamePanel: 'flappy', chessGamePanel: 'chess', citySlidePanel: 'city' };
  const defaults = { effects: .72 };
  const state = { ...defaults, ...readPreferences() };
  let context = null;
  let masterGain = null;
  let effectsGain = null;
  let heartbeatGain = null;
  let activeGame = null;
  let session = 0;
  let voices = [];
  let noiseBuffer = null;
  let cityAudioPromise = null;
  let cityBuffers = null;
  let npcHitBag = [];
  let lastNpcHit = -1;
  let npcHitHistory = [];
  let cityHealth = 100;
  let cityRunning = false;
  let heartbeatSource = null;
  let heartbeatState = 'stopped';
  let heartbeatStopTimer = 0;

  function readPreferences() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        effects: value.muted === true ? 0 : Number.isFinite(value.effects) ? clamp(value.effects, 0, 1) : defaults.effects
      };
    } catch (_) { return {}; }
  }

  function savePreferences() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (_) { /* Audio remains usable when storage is blocked. */ }
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function ensureContext() {
    if (context) return context;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    try {
      try { context = new AudioContextClass({ latencyHint: 'interactive' }); }
      catch (_) { context = new AudioContextClass(); }
      masterGain = context.createGain();
      effectsGain = context.createGain();
      heartbeatGain = context.createGain();
      effectsGain.connect(masterGain);
      heartbeatGain.connect(masterGain);
      masterGain.connect(context.destination);
      effectsGain.gain.value = state.effects;
      heartbeatGain.gain.value = .0001;
      masterGain.gain.value = .86;
      return context;
    } catch (_) { return null; }
  }

  function unlock() {
    const audio = ensureContext();
    if (audio?.state === 'suspended') audio.resume().catch(() => {});
    return audio;
  }

  function ramp(parameter, value, duration = .05) {
    if (!context || !parameter) return;
    const now = context.currentTime;
    parameter.cancelScheduledValues(now);
    parameter.setValueAtTime(Math.max(.0001, parameter.value), now);
    parameter.linearRampToValueAtTime(Math.max(.0001, value), now + duration);
  }

  function pruneVoices() {
    if (!context) return;
    voices = voices.filter(voice => voice.end > context.currentTime && !voice.stopped);
    while (voices.length >= MAX_VOICES) {
      const oldest = voices.shift();
      oldest.nodes.forEach(node => { try { node.stop?.(); } catch (_) {} });
      oldest.stopped = true;
    }
  }

  function registerVoice(game, nodes, end) {
    pruneVoices();
    const voice = { game, nodes, end, session, stopped: false };
    voices.push(voice);
    const source = nodes.find(node => 'onended' in node);
    if (source) source.onended = () => {
      voice.stopped = true;
      nodes.forEach(node => { try { node.disconnect(); } catch (_) {} });
    };
  }

  function shuffle(values) {
    const result = values.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    if (result.length > 1 && result[result.length - 1] === lastNpcHit) {
      [result[0], result[result.length - 1]] = [result[result.length - 1], result[0]];
    }
    return result;
  }

  function loadCityAudio() {
    const audio = ensureContext();
    if (!audio) return Promise.resolve(null);
    if (cityBuffers) return Promise.resolve(cityBuffers);
    if (cityAudioPromise) return cityAudioPromise;
    cityAudioPromise = Promise.all(Object.entries(CITY_AUDIO_URLS).map(async ([name, url]) => {
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Unable to load ${url}`);
      const buffer = await audio.decodeAudioData(await response.arrayBuffer());
      return [name, buffer];
    })).then(entries => {
      cityBuffers = Object.fromEntries(entries);
      npcHitBag = shuffle([0, 1, 2]);
      syncHeartbeat();
      return cityBuffers;
    }).catch(() => {
      cityAudioPromise = null;
      return null;
    });
    return cityAudioPromise;
  }

  function heartbeatLevel() {
    if (cityHealth < 15) return .22;
    if (cityHealth < 30) return .16;
    return .105;
  }

  function stopHeartbeat(fade = .3) {
    if (!context || !heartbeatSource || heartbeatState === 'stopping') {
      if (!heartbeatSource) heartbeatState = 'stopped';
      return;
    }
    heartbeatState = 'stopping';
    const source = heartbeatSource;
    ramp(heartbeatGain?.gain, 0, fade);
    try { source.stop(context.currentTime + fade + .015); } catch (_) {}
    let finalized = false;
    const finalize = () => {
      if (finalized) return;
      finalized = true;
      clearTimeout(heartbeatStopTimer);
      heartbeatStopTimer = 0;
      try { source.disconnect(); } catch (_) {}
      if (heartbeatSource === source) heartbeatSource = null;
      heartbeatState = 'stopped';
      syncHeartbeat();
    };
    source.onended = finalize;
    heartbeatStopTimer = window.setTimeout(() => {
      try { source.stop(); } catch (_) {}
      finalize();
    }, (fade + .015) * 1000);
  }

  function syncHeartbeat() {
    const shouldPlay = Boolean(context && cityBuffers?.heartbeat && cityHealth < HEARTBEAT_THRESHOLD && cityRunning && activeGame === 'city' && state.effects > 0 && !document.hidden);
    if (!shouldPlay) { stopHeartbeat(); return; }
    const target = heartbeatLevel() * state.effects;
    if (heartbeatSource && (heartbeatState === 'playing' || heartbeatState === 'starting')) {
      ramp(heartbeatGain?.gain, target, .18);
      heartbeatState = 'playing';
      return;
    }
    if (heartbeatState === 'stopping') return;
    const source = context.createBufferSource();
    clearTimeout(heartbeatStopTimer);
    heartbeatStopTimer = 0;
    source.buffer = cityBuffers.heartbeat;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = cityBuffers.heartbeat.duration;
    source.connect(heartbeatGain);
    heartbeatSource = source;
    heartbeatState = 'starting';
    heartbeatGain.gain.cancelScheduledValues(context.currentTime);
    heartbeatGain.gain.setValueAtTime(.0001, context.currentTime);
    heartbeatGain.gain.linearRampToValueAtTime(target, context.currentTime + .22);
    source.start(context.currentTime);
    source.onended = () => {
      if (heartbeatSource === source) heartbeatSource = null;
      heartbeatState = 'stopped';
    };
    heartbeatState = 'playing';
  }

  function setCityHealth(value) {
    cityHealth = clamp(Number(value), 0, 100);
    syncHeartbeat();
  }

  function playCityBuffer(kind, options = {}) {
    if (!context || !cityBuffers || state.effects <= 0 || activeGame !== 'city' || document.hidden) return false;
    pruneVoices();
    let buffer;
    let category;
    let maxVoices;
    let volume;
    if (kind === 'hit') {
      if (!npcHitBag.length) npcHitBag = shuffle([0, 1, 2]);
      const selected = npcHitBag.pop();
      lastNpcHit = selected;
      npcHitHistory.push(selected + 1);
      if (npcHitHistory.length > 12) npcHitHistory.shift();
      buffer = cityBuffers[`hit${selected + 1}`];
      category = 'city-hit';
      maxVoices = MAX_NPC_HIT_VOICES;
      const normalized = clamp(((options.impactSpeed || 70) - 52) / (300 - 52), 0, 1);
      volume = .65 + normalized * .35;
    } else {
      buffer = cityBuffers.crash;
      category = 'city-crash';
      maxVoices = MAX_CRASH_VOICES;
      volume = .88;
    }
    if (!buffer) return false;
    const categoryVoices = voices.filter(voice => voice.category === category && !voice.stopped);
    if (categoryVoices.length >= maxVoices) {
      const oldest = categoryVoices[0];
      oldest.stopped = true;
      oldest.nodes.forEach(node => { try { node.stop?.(); } catch (_) {} });
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    if (kind === 'hit') source.playbackRate.value = .97 + Math.random() * .06;
    gain.gain.value = volume;
    source.connect(gain).connect(effectsGain);
    const start = context.currentTime;
    source.start(start);
    registerVoice('city', [source, gain], start + buffer.duration / source.playbackRate.value + .02);
    const voice = voices[voices.length - 1];
    if (voice) voice.category = category;
    return true;
  }

  function cancelVoices(game = null) {
    if (!game || game === 'city') {
      cityRunning = false;
      stopHeartbeat(.22);
    }
    session += 1;
    voices.forEach(voice => {
      if (game && voice.game !== game) return;
      voice.stopped = true;
      voice.nodes.forEach(node => { try { node.stop?.(); } catch (_) {} });
    });
    voices = game ? voices.filter(voice => voice.game !== game) : [];
  }

  function tone(game, frequency, duration, volume, options = {}) {
    if (!context || state.effects <= 0 || activeGame !== game) return;
    pruneVoices();
    const start = context.currentTime + (options.delay || 0);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    oscillator.type = options.type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    if (options.to) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.to), start + duration);
    filter.type = 'lowpass';
    filter.frequency.value = options.filter || 2400;
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), start + Math.min(.018, duration * .25));
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(filter).connect(gain).connect(effectsGain);
    oscillator.start(start);
    oscillator.stop(start + duration + .02);
    registerVoice(game, [oscillator, filter, gain], start + duration + .03);
  }

  function noise(game, duration, volume, options = {}) {
    if (!context || state.effects <= 0 || activeGame !== game) return;
    if (!noiseBuffer) {
      noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * .5), context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    }
    pruneVoices();
    const start = context.currentTime + (options.delay || 0);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noiseBuffer;
    filter.type = options.filterType || 'bandpass';
    filter.frequency.value = options.frequency || 700;
    filter.Q.value = options.q || 1.1;
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), start + .006);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter).connect(gain).connect(effectsGain);
    source.start(start, Math.random() * .12, duration + .02);
    source.stop(start + duration + .03);
    registerVoice(game, [source, filter, gain], start + duration + .04);
  }

  function playFlappy(event) {
    if (event === 'flap') {
      tone('flappy', 245, .075, .045, { type: 'sine', to: 355, filter: 1500 });
      noise('flappy', .035, .012, { frequency: 1100, q: .7 });
    } else if (event === 'score') {
      tone('flappy', 587.33, .105, .048, { type: 'sine', filter: 2200 });
      tone('flappy', 783.99, .13, .038, { delay: .06, type: 'sine', filter: 2400 });
    } else if (event === 'collision') {
      noise('flappy', .12, .045, { frequency: 330, q: .8 });
      tone('flappy', 145, .16, .05, { type: 'triangle', to: 82, filter: 650 });
      tone('flappy', 246.94, .18, .028, { delay: .23, type: 'sine', to: 164.81, filter: 1000 });
      tone('flappy', 164.81, .24, .024, { delay: .36, type: 'sine', to: 110, filter: 850 });
    }
  }

  function playChessMove(details = {}) {
    if (!canPlay('chess')) return;
    const delay = details.delay ?? .3;
    if (details.castle) {
      noise('chess', .055, .032, { delay, frequency: 470, q: 1.2 });
      tone('chess', 126, .075, .028, { delay, type: 'triangle', filter: 500 });
      noise('chess', .055, .03, { delay: delay + .105, frequency: 520, q: 1.2 });
      tone('chess', 145, .075, .026, { delay: delay + .105, type: 'triangle', filter: 540 });
    } else if (details.capture) {
      noise('chess', .09, .042, { delay, frequency: 390, q: .9 });
      tone('chess', 112, .12, .035, { delay, type: 'triangle', to: 86, filter: 460 });
    } else {
      noise('chess', .052, .027, { delay, frequency: 560, q: 1.35 });
      tone('chess', 142, .075, .023, { delay, type: 'triangle', filter: 560 });
    }
    if (details.promotion) {
      tone('chess', 392, .12, .026, { delay: delay + .14, type: 'sine', filter: 1500 });
      tone('chess', 523.25, .16, .024, { delay: delay + .2, type: 'sine', filter: 1700 });
    }
    const endingDelay = delay + (details.castle ? .24 : .17) + (details.promotion ? .1 : 0);
    if (details.checkmate) {
      [293.66, 246.94, 196, 146.83].forEach((note, index) => tone('chess', note, .25, .03, { delay: endingDelay + index * .13, type: 'sine', filter: 1200 }));
    } else if (details.draw) {
      tone('chess', 220, .28, .024, { delay: endingDelay, type: 'sine', filter: 1000 });
      tone('chess', 164.81, .32, .022, { delay: endingDelay + .16, type: 'sine', filter: 900 });
    } else if (details.check) {
      tone('chess', 659.25, .13, .027, { delay: endingDelay, type: 'sine', filter: 1900 });
      tone('chess', 523.25, .17, .02, { delay: endingDelay + .075, type: 'sine', filter: 1600 });
    }
  }

  function playArcade(game, event, details = {}) {
    const cues = {
      city: {
        engine: () => tone(game, 78, .12, .012, { type: 'triangle', to: 92, filter: 360 }),
        skid: () => noise(game, .1, .018, { frequency: 950, q: .7 }),
        impact: () => { noise(game, .11, .035, { frequency: 260 }); tone(game, 105, .12, .03, { type: 'triangle', to: 72, filter: 420 }); },
        pedestrian: details => { if (!playCityBuffer('hit', details)) { tone(game, 230, .09, .03, { type: 'triangle', to: 150, filter: 850 }); noise(game, .06, .018, { frequency: 520 }); } },
        combo: () => { tone(game, 520, .09, .025, { type: 'sine', filter: 1700 }); tone(game, 720, .12, .02, { delay: .05, type: 'sine', filter: 2000 }); },
        angry: () => { tone(game, 190, .08, .022, { type: 'square', to: 150, filter: 700 }); },
        attack: () => { noise(game, .06, .022, { frequency: 420 }); tone(game, 125, .08, .02, { type: 'triangle', filter: 500 }); },
        damage: () => { noise(game, .09, .032, { frequency: 230 }); tone(game, 92, .11, .03, { type: 'sawtooth', to: 68, filter: 360 }); },
        traffic: details => { if (!playCityBuffer('crash', details)) { noise(game, .13, .038, { frequency: 190 }); tone(game, 82, .15, .035, { type: 'triangle', to: 55, filter: 320 }); } },
        heal: () => { tone(game, 440, .09, .025, { type: 'sine', filter: 1600 }); tone(game, 660, .13, .022, { delay: .07, type: 'sine', filter: 2000 }); },
        warning: () => { tone(game, 260, .1, .025, { type: 'square', filter: 900 }); tone(game, 260, .1, .025, { delay: .16, type: 'square', filter: 900 }); },
        milestone: () => { tone(game, 523.25, .12, .035, { type: 'sine', filter: 1800 }); tone(game, 659.25, .15, .032, { delay: .08, type: 'sine', filter: 2100 }); tone(game, 783.99, .2, .028, { delay: .17, type: 'sine', filter: 2400 }); },
        shoot: () => { noise(game, .045, .025, { frequency: 1250, q: .8 }); tone(game, 185, .055, .018, { type: 'square', to: 115, filter: 800 }); },
        bulletImpact: () => { noise(game, .07, .028, { frequency: 720, q: 1 }); tone(game, 110, .08, .024, { type: 'triangle', to: 72, filter: 500 }); }
      }
    };
    cues[game]?.[event]?.(details);
  }

  function canPlay(game) {
    return Boolean(unlock() && state.effects > 0 && activeGame === game && !document.hidden);
  }

  function play(game, event, options) {
    if (!canPlay(game)) return false;
    if (game === 'flappy') playFlappy(event, options);
    else playArcade(game, event, options);
    return true;
  }

  function activate(game) {
    unlock();
    if (activeGame !== game) {
      cancelVoices();
      activeGame = game;
    }
    if (game === 'city') loadCityAudio();
  }

  function startGame(game) {
    activate(game);
    cancelVoices(game);
    if (game === 'city') {
      cityRunning = true;
      loadCityAudio().then(syncHeartbeat);
    }
  }

  function pauseGame(game) {
    if (activeGame !== game) return;
    cancelVoices(game);
  }

  function resumeGame(game) {
    activate(game);
    if (game === 'city') {
      cityRunning = true;
      syncHeartbeat();
    }
  }

  function endGame(game) {
    if (game === 'city') {
      cityRunning = false;
      stopHeartbeat(.25);
    }
  }

  function setMuted(muted) {
    setVolume('effects', muted ? 0 : defaults.effects);
  }

  function setVolume(kind, value) {
    if (kind !== 'effects') return;
    state.effects = clamp(Number(value), 0, 1);
    savePreferences();
    unlock();
    ramp(effectsGain?.gain, state.effects, .05);
    syncHeartbeat();
    syncControls();
  }

  function syncControls() {
    const toggle = document.querySelector('#gameAudioToggle');
    const effectsInput = document.querySelector('#gameEffectsVolume');
    if (!toggle || !effectsInput) return;
    const muted = state.effects <= 0;
    toggle.classList.toggle('is-muted', muted);
    toggle.setAttribute('aria-label', `Sound settings, volume ${Math.round(state.effects * 100)}%`);
    toggle.querySelector('i').className = `bi-volume-${muted ? 'mute' : 'up'}-fill`;
    effectsInput.value = String(Math.round(state.effects * 100));
    document.querySelector('#gameEffectsOutput').value = `${effectsInput.value}%`;
  }

  function bindControls() {
    const toggle = document.querySelector('#gameAudioToggle');
    const settings = document.querySelector('#gameAudioSettings');
    const effectsInput = document.querySelector('#gameEffectsVolume');
    const status = document.querySelector('#gameAudioStatus');
    if (!toggle || !settings || !effectsInput) return;
    syncControls();
    toggle.addEventListener('click', () => {
      const open = settings.hidden;
      settings.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open) effectsInput.focus();
    });
    effectsInput.addEventListener('input', () => {
      setVolume('effects', Number(effectsInput.value) / 100);
      status.textContent = `Sound effects volume ${effectsInput.value} percent.`;
    });
    document.addEventListener('pointerdown', event => {
      if (!settings.hidden && !event.target.closest('#gameAudioControls')) {
        settings.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !settings.hidden) {
        settings.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (!context) return;
    if (document.hidden) {
      cancelVoices();
      context.suspend().catch(() => {});
    }
  });
  window.addEventListener('pagehide', () => {
    cancelVoices();
    context?.suspend().catch(() => {});
  });
  document.addEventListener('gamepanelchange', event => {
    const game = GAME_BY_PANEL[event.detail?.targetId];
    if (game && game !== activeGame) {
      cancelVoices();
      activeGame = game;
    }
  });

  const safe = callback => (...args) => {
    try { return callback(...args); }
    catch (_) { return false; }
  };

  window.GameAudio = Object.freeze({
    activate: safe(activate),
    startGame: safe(startGame),
    pauseGame: safe(pauseGame),
    resumeGame: safe(resumeGame),
    endGame: safe(endGame),
    play: safe(play),
    chessMove: safe(playChessMove),
    setCityHealth: safe(setCityHealth),
    cancel: safe(cancelVoices),
    setMuted: safe(setMuted),
    setVolume: safe(setVolume),
    get preferences() { return { ...state }; },
    get cityState() {
      return {
        loaded: Boolean(cityBuffers),
        loading: Boolean(cityAudioPromise && !cityBuffers),
        health: cityHealth,
        running: cityRunning,
        heartbeat: heartbeatState,
        hitVoices: voices.filter(voice => voice.category === 'city-hit' && !voice.stopped).length,
        crashVoices: voices.filter(voice => voice.category === 'city-crash' && !voice.stopped).length,
        heartbeatVoices: heartbeatSource ? MAX_HEARTBEAT_VOICES : 0,
        hitBagRemaining: npcHitBag.length,
        hitHistory: npcHitHistory.slice(),
        limits: { hit: MAX_NPC_HIT_VOICES, crash: MAX_CRASH_VOICES, heartbeat: MAX_HEARTBEAT_VOICES }
      };
    },
    get activeGame() { return activeGame; }
  });

  bindControls();
})();
