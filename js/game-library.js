(() => {
  const gameCards = document.querySelectorAll('.game-library-card[data-game-target]');
  const gamePanels = document.querySelectorAll('.game-panel');
  const arcadeModules = {
    citySlidePanel: () => import('./city-slide-advanced.mjs?v=3')
  };
  const arcadeInstances = new Map();

  if (!gameCards.length || !gamePanels.length) {
    return;
  }

  const loadArcadeGame = async targetId => {
    if (!arcadeModules[targetId] || arcadeInstances.has(targetId)) return;
    const panel = document.getElementById(targetId);
    panel?.setAttribute('aria-busy', 'true');
    try {
      const module = await arcadeModules[targetId]();
      if (panel) arcadeInstances.set(targetId, module.mount(panel));
    } finally { panel?.removeAttribute('aria-busy'); }
  };

  const selectGame = async (targetId) => {
    arcadeInstances.forEach((instance, id) => { if (id !== targetId) instance.close?.(); });
    gameCards.forEach((card) => {
      const active = card.dataset.gameTarget === targetId;
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-pressed', String(active));
    });

    gamePanels.forEach((panel) => {
      panel.hidden = panel.id !== targetId;
    });

    document.dispatchEvent(new CustomEvent('gamepanelchange', { detail: { targetId } }));
    await loadArcadeGame(targetId);
  };

  gameCards.forEach((card) => {
    card.addEventListener('click', () => {
      const targetId = card.dataset.gameTarget;

      if (!targetId) {
        return;
      }

      const gameId = {
        flappyGamePanel: 'flappy',
        chessGamePanel: 'chess',
        citySlidePanel: 'city'
      }[targetId];
      if (gameId) window.GameAudio?.activate(gameId);
      selectGame(targetId);
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('[data-game-close]')) return;
    const panel = event.target.closest('.game-panel');
    arcadeInstances.get(panel?.id)?.close?.();
    selectGame('flappyGamePanel');
    document.querySelector('.game-library')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  selectGame(gameCards[0].dataset.gameTarget);
})();
