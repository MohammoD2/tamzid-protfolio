(() => {
  const panel = document.querySelector('#keyRushPanel');
  const wrap = document.querySelector('.key-rush-wrap');
  const arena = document.querySelector('#keyRushArena');
  const effectsLayer = document.querySelector('#keyRushEffects');
  const overlay = document.querySelector('#keyRushOverlay');
  const overlayTitle = document.querySelector('#keyRushOverlayTitle');
  const overlayText = document.querySelector('#keyRushOverlayText');
  const bottomBar = document.querySelector('.key-rush-bottom-bar');
  const typingInput = document.querySelector('#keyRushInput');
  const startButton = document.querySelector('#keyRushStart');
  const statusEl = document.querySelector('#keyRushStatus');
  const bufferEl = document.querySelector('#keyRushBuffer');
  const scoreEl = document.querySelector('#keyRushScore');
  const bestEl = document.querySelector('#keyRushBest');
  const comboEl = document.querySelector('#keyRushCombo');
  const livesEl = document.querySelector('#keyRushLives');
  const bestComboEl = document.querySelector('#keyRushBestCombo');
  const wordsTypedEl = document.querySelector('#keyRushWordsTyped');
  const accuracyEl = document.querySelector('#keyRushAccuracy');
  const gamesEl = document.querySelector('#keyRushGames');
  const destroyedEl = document.querySelector('#keyRushDestroyed');

  if (!panel || !wrap || !arena || !effectsLayer || !overlay || !overlayTitle || !overlayText || !bottomBar || !typingInput || !startButton || !statusEl || !bufferEl) {
    return;
  }

  const easyWords = ['art', 'key', 'sky', 'box', 'move', 'shape', 'color', 'light', 'scene', 'frame', 'pixel', 'focus'];
  const mediumWords = ['render', 'shader', 'vertex', 'camera', 'motion', 'texture', 'studio', 'design', 'object', 'shadow', 'timeline', 'preview'];
  const creativeWords = ['lighting', 'rigging', 'animation', 'composite', 'material', 'viewport', 'modeling', 'sequence', 'character', 'environment'];
  const advancedWords = ['compositing', 'photoreal', 'cinematic', 'simulation', 'storyboard', 'procedural', 'keyframing', 'typography', 'visualization'];
  const bossWords = ['photorealistic', 'characterization', 'synchronization', 'environmental', 'cinematography'];

  const statsKey = 'tamzidKeyRushStats';
  const defaultStats = {
    highScore: 0,
    highCombo: 0,
    wordsTyped: 0,
    gamesPlayed: 0,
    totalDestroyed: 0,
    correctChars: 0,
    totalChars: 0
  };

  const readStats = () => {
    try {
      return { ...defaultStats, ...JSON.parse(localStorage.getItem(statsKey) || '{}') };
    } catch (error) {
      return { ...defaultStats };
    }
  };

  let stats = readStats();
  let activeWords = [];
  let running = false;
  let lastTime = 0;
  let spawnTimer = 0;
  let nextWordId = 1;
  let score = 0;
  let lives = 5;
  let combo = 0;
  let sessionBestCombo = 0;
  let typedBuffer = '';
  let freezeUntil = 0;
  let animationId = 0;

  const randomItem = (items) => items[Math.floor(Math.random() * items.length)];
  const now = () => performance.now();
  const isFrozen = () => now() < freezeUntil;

  const saveStats = () => {
    localStorage.setItem(statsKey, JSON.stringify(stats));
  };

  const getAccuracy = () => {
    if (!stats.totalChars) {
      return 100;
    }

    return Math.round((stats.correctChars / stats.totalChars) * 100);
  };

  const updateHud = () => {
    scoreEl.textContent = score;
    bestEl.textContent = stats.highScore;
    comboEl.textContent = combo;
    livesEl.textContent = lives;
    bestComboEl.textContent = stats.highCombo;
    wordsTypedEl.textContent = stats.wordsTyped;
    accuracyEl.textContent = `${getAccuracy()}%`;
    gamesEl.textContent = stats.gamesPlayed;
    destroyedEl.textContent = stats.totalDestroyed;
    bufferEl.textContent = typedBuffer || (running ? 'Type...' : 'Ready');
  };

  const showOverlay = (title, text) => {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlay.classList.remove('is-hidden');
  };

  const hideOverlay = () => {
    overlay.classList.add('is-hidden');
  };

  const createEffect = (className, x, y) => {
    const effect = document.createElement('span');
    effect.className = `key-rush-effect ${className}`;

    if (className !== 'freeze') {
      effect.style.left = `${x}px`;
      effect.style.top = `${y}px`;
    }

    effectsLayer.appendChild(effect);
    window.setTimeout(() => effect.remove(), 760);
  };

  const renderWordText = (word) => {
    const typedLength = word.text.startsWith(typedBuffer) ? typedBuffer.length : 0;
    const visible = word.label.split('').map((letter, index) => {
      const className = index < typedLength ? 'typed' : '';
      return `<span class="${className}">${letter}</span>`;
    }).join('');

    word.el.innerHTML = visible;
    word.el.classList.toggle('is-target', Boolean(typedBuffer) && word.text.startsWith(typedBuffer));
  };

  const getWordPool = () => {
    if (score < 120) {
      return easyWords;
    }

    if (score < 360) {
      return [...easyWords, ...mediumWords];
    }

    if (score < 760) {
      return [...mediumWords, ...creativeWords];
    }

    return [...creativeWords, ...advancedWords];
  };

  const chooseWordType = () => {
    if (score > 650 && !activeWords.some((word) => word.type === 'boss') && Math.random() < 0.045) {
      return 'boss';
    }

    const roll = Math.random();

    if (roll < 0.012) return 'live';
    if (roll < 0.034) return 'freeze';
    if (roll < 0.06) return 'bomb';
    if (roll < 0.082) return 'golden';
    if (roll < 0.12) return 'ghost';

    return 'normal';
  };

  const getWordData = (type) => {
    const specialWords = {
      live: ['Life', 'Heal', 'Heart'],
      freeze: ['Freeze', 'Frost', 'Ice'],
      bomb: ['Bomb', 'Blast', 'Boom'],
      golden: ['Golden', 'Treasure', 'Bonus'],
      ghost: ['Ghost', 'Spirit', 'Vanish']
    };

    if (type === 'boss') {
      return randomItem(bossWords);
    }

    if (specialWords[type]) {
      return randomItem(specialWords[type]);
    }

    return randomItem(getWordPool());
  };

  const getDifficulty = () => ({
    maxWords: Math.min(11, 3 + Math.floor(score / 180)),
    spawnInterval: Math.max(720, 1850 - score * 1.65),
    speedBonus: Math.min(42, score * 0.035)
  });

  const spawnWord = () => {
    const difficulty = getDifficulty();

    if (!running || isFrozen() || activeWords.length >= difficulty.maxWords) {
      return;
    }

    const type = chooseWordType();
    const label = getWordData(type);
    const arenaWidth = arena.clientWidth || 520;
    const x = 52 + Math.random() * Math.max(160, arenaWidth - 104);
    const isBoss = type === 'boss';
    const word = {
      id: nextWordId,
      label,
      text: label.toLowerCase(),
      type,
      x,
      y: -46,
      speed: isBoss ? 18 + difficulty.speedBonus * 0.45 : 28 + difficulty.speedBonus + label.length * 0.7,
      ghostWarningShown: false,
      el: document.createElement('span')
    };

    nextWordId += 1;
    word.el.className = `key-rush-word is-${type}`;
    word.el.style.left = `${word.x}px`;
    renderWordText(word);
    arena.appendChild(word.el);
    activeWords.push(word);
  };

  const removeWord = (word, effect = 'pop') => {
    activeWords = activeWords.filter((item) => item.id !== word.id);
    word.el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    word.el.style.transform = `translate(-50%, ${word.y}px) scale(1.35)`;
    word.el.classList.add('is-destroyed');
    createEffect(effect, word.x, Math.max(20, word.y));
    window.setTimeout(() => word.el.remove(), 320);
  };

  const updateStatsForHit = (word, points) => {
    score += points;
    combo += 1;
    sessionBestCombo = Math.max(sessionBestCombo, combo);
    stats.wordsTyped += 1;
    stats.totalDestroyed += 1;
    stats.correctChars += word.text.length;
    stats.highScore = Math.max(stats.highScore, score);
    stats.highCombo = Math.max(stats.highCombo, sessionBestCombo);
    saveStats();
  };

  const destroyNearbyWords = (sourceWord) => {
    const blastRadius = 160;
    const nearby = activeWords.filter((word) => {
      if (word.id === sourceWord.id) {
        return false;
      }

      return Math.hypot(word.x - sourceWord.x, word.y - sourceWord.y) <= blastRadius;
    });

    nearby.forEach((word) => {
      score += Math.max(8, word.text.length * 4);
      stats.totalDestroyed += 1;
      removeWord(word, 'bomb');
    });
  };

  const handleSpecialWord = (word) => {
    if (word.type === 'live') {
      lives = Math.min(5, lives + 1);
      statusEl.textContent = 'Extra life gained.';
    }

    if (word.type === 'freeze') {
      freezeUntil = now() + 5000;
      wrap.classList.add('is-frozen');
      createEffect('freeze', 0, 0);
      statusEl.textContent = 'Freeze activated for 5 seconds.';
      window.setTimeout(() => wrap.classList.remove('is-frozen'), 5000);
    }

    if (word.type === 'bomb') {
      destroyNearbyWords(word);
      statusEl.textContent = 'Bomb cleared nearby words.';
    }

    if (word.type === 'golden') {
      createEffect('gold', word.x, word.y);
      statusEl.textContent = 'Golden word scored triple points.';
    }

    if (word.type === 'boss') {
      statusEl.textContent = 'Boss word defeated.';
    }
  };

  const getPoints = (word) => {
    const base = word.text.length * 10 + Math.floor(combo * 1.5);

    if (word.type === 'golden') {
      return base * 3;
    }

    if (word.type === 'boss') {
      return base + 220;
    }

    if (word.type !== 'normal') {
      return base + 55;
    }

    return base;
  };

  const clearBuffer = () => {
    typedBuffer = '';
    activeWords.forEach(renderWordText);
    updateHud();
  };

  const handleTypedWord = (word) => {
    const points = getPoints(word);
    updateStatsForHit(word, points);
    handleSpecialWord(word);
    removeWord(word, word.type === 'bomb' ? 'bomb' : 'pop');
    clearBuffer();
    statusEl.textContent = `+${points} points`;
  };

  const showWrongInput = () => {
    bufferEl.classList.remove('is-wrong');
    requestAnimationFrame(() => bufferEl.classList.add('is-wrong'));
    window.setTimeout(() => bufferEl.classList.remove('is-wrong'), 320);
  };

  const typeCharacter = (character) => {
    if (!running || panel.hidden) {
      return;
    }

    typedBuffer += character.toLowerCase();
    stats.totalChars += 1;

    const prefixMatches = activeWords.filter((word) => word.text.startsWith(typedBuffer));
    const exactMatch = prefixMatches.find((word) => word.text === typedBuffer);

    if (exactMatch) {
      handleTypedWord(exactMatch);
      saveStats();
      updateHud();
      return;
    }

    if (!prefixMatches.length) {
      typedBuffer = '';
      combo = 0;
      statusEl.textContent = 'Missed key. Combo reset.';
      showWrongInput();
    }

    activeWords.forEach(renderWordText);
    saveStats();
    updateHud();
  };

  const loseLife = (word) => {
    activeWords = activeWords.filter((item) => item.id !== word.id);
    word.el.remove();

    if (word.type !== 'ghost') {
      lives -= 1;
      combo = 0;
      statusEl.textContent = `${word.label} reached the bottom.`;
    } else {
      statusEl.textContent = 'Ghost vanished without damage.';
    }

    if (typedBuffer && !activeWords.some((item) => item.text.startsWith(typedBuffer))) {
      typedBuffer = '';
    }

    if (lives <= 0) {
      endGame();
    }
  };

  const updateWords = (delta) => {
    const arenaHeight = arena.clientHeight || 480;
    const bottomLine = arenaHeight - bottomBar.offsetHeight - 32;

    activeWords.forEach((word) => {
      if (!running) {
        return;
      }

      if (!isFrozen()) {
        word.y += word.speed * delta;
      }

      if (word.type === 'ghost' && !word.ghostWarningShown && word.y > arenaHeight * 0.62) {
        word.ghostWarningShown = true;
        word.el.classList.add('is-warning');
      }

      word.el.style.transform = `translate(-50%, ${word.y}px)`;

      if (word.y >= bottomLine) {
        loseLife(word);
      }
    });
  };

  const gameLoop = (timestamp) => {
    if (!running) {
      return;
    }

    const delta = Math.min(0.05, (timestamp - lastTime) / 1000 || 0);
    lastTime = timestamp;

    if (!isFrozen()) {
      spawnTimer += delta * 1000;
    }

    if (spawnTimer >= getDifficulty().spawnInterval) {
      spawnTimer = 0;
      spawnWord();
    }

    updateWords(delta);
    updateHud();
    animationId = requestAnimationFrame(gameLoop);
  };

  const resetArena = () => {
    activeWords.forEach((word) => word.el.remove());
    activeWords = [];
    effectsLayer.replaceChildren();
    wrap.classList.remove('is-frozen');
    typedBuffer = '';
    spawnTimer = 0;
    freezeUntil = 0;
  };

  const startGame = () => {
    cancelAnimationFrame(animationId);
    resetArena();
    running = true;
    score = 0;
    lives = 5;
    combo = 0;
    sessionBestCombo = 0;
    nextWordId = 1;
    stats.gamesPlayed += 1;
    saveStats();
    startButton.textContent = 'Restart Key Rush';
    statusEl.textContent = 'Type words before they reach the red line.';
    hideOverlay();
    lastTime = now();
    spawnWord();
    spawnWord();
    updateHud();
    typingInput.focus({ preventScroll: true });
    animationId = requestAnimationFrame(gameLoop);
  };

  function endGame() {
    running = false;
    cancelAnimationFrame(animationId);
    stats.highScore = Math.max(stats.highScore, score);
    stats.highCombo = Math.max(stats.highCombo, sessionBestCombo);
    saveStats();
    statusEl.textContent = 'Press Play Again when you are ready.';
    showOverlay('Game Over', `Final score: ${score}. Best score: ${stats.highScore}.`);
    startButton.textContent = 'Play Again';
    updateHud();
  }

  startButton.addEventListener('click', startGame);
  arena.addEventListener('click', () => typingInput.focus({ preventScroll: true }));
  typingInput.addEventListener('input', () => {
    const letters = typingInput.value.replace(/[^a-z]/gi, '');
    typingInput.value = '';

    letters.split('').forEach(typeCharacter);
  });

  window.addEventListener('keydown', (event) => {
    if (panel.hidden || !running) {
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      typedBuffer = typedBuffer.slice(0, -1);
      activeWords.forEach(renderWordText);
      updateHud();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      clearBuffer();
      return;
    }

    if (/^[a-zA-Z]$/.test(event.key)) {
      event.preventDefault();
      typeCharacter(event.key);
    }
  });

  showOverlay('Key Rush', 'Tap Start, then type the falling words before they reach the red line.');
  updateHud();
})();
