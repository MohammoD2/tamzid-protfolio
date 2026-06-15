(() => {
  const gameCards = document.querySelectorAll('.game-library-card[data-game-target]');
  const gamePanels = document.querySelectorAll('.game-panel');

  if (!gameCards.length || !gamePanels.length) {
    return;
  }

  const selectGame = (targetId) => {
    gameCards.forEach((card) => {
      card.classList.toggle('is-active', card.dataset.gameTarget === targetId);
    });

    gamePanels.forEach((panel) => {
      panel.hidden = panel.id !== targetId;
    });
  };

  gameCards.forEach((card) => {
    card.addEventListener('click', () => {
      const targetId = card.dataset.gameTarget;

      if (!targetId) {
        return;
      }

      selectGame(targetId);
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  selectGame(gameCards[0].dataset.gameTarget);
})();
