(() => {
  const modal = document.querySelector('#allReviewsModal');

  if (!modal) {
    return;
  }

  const filterButtons = Array.from(modal.querySelectorAll('[data-review-filter]'));
  const reviewCards = Array.from(modal.querySelectorAll('.all-review-card'));
  const emptyMessage = modal.querySelector('.review-filter-empty');

  if (!filterButtons.length || !reviewCards.length) {
    return;
  }

  const getRating = (card) => {
    const label = card.querySelector('.review-stars')?.getAttribute('aria-label') || '';
    const match = label.match(/(\d+(?:\.\d+)?)/);

    return match ? Math.floor(Number(match[1])) : 0;
  };

  const applyFilter = (rating) => {
    let visibleCount = 0;

    reviewCards.forEach((card) => {
      const isVisible = rating === 'all' || String(getRating(card)) === rating;
      card.hidden = !isVisible;

      if (isVisible) {
        visibleCount += 1;
      }
    });

    if (emptyMessage) {
      emptyMessage.hidden = visibleCount !== 0;
    }
  };

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      filterButtons.forEach((item) => item.classList.toggle('is-active', item === button));
      applyFilter(button.dataset.reviewFilter || 'all');
    });
  });
})();
