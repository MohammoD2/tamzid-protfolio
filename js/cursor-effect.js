(() => {
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!finePointer || reducedMotion) {
    return;
  }

  const follower = document.createElement('div');
  follower.className = 'cursor-follower';
  document.body.appendChild(follower);

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;

  const moveFollower = () => {
    currentX += (targetX - currentX) * 0.14;
    currentY += (targetY - currentY) * 0.14;
    follower.style.transform = `translate3d(${currentX - follower.offsetWidth / 2}px, ${currentY - follower.offsetHeight / 2}px, 0)`;
    requestAnimationFrame(moveFollower);
  };

  window.addEventListener('mousemove', (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    follower.classList.add('is-visible');
  });

  window.addEventListener('mouseleave', () => {
    follower.classList.remove('is-visible');
  });

  document.querySelectorAll('a, button, input, textarea, select, .custom-btn, .review-card[role="button"], .add-review-btn, .work-card, .youtube-thumbnail, .game-library-card, .service-detail-card, .patreon-cta').forEach((element) => {
    element.addEventListener('mouseenter', () => follower.classList.add('is-hovering'));
    element.addEventListener('mouseleave', () => follower.classList.remove('is-hovering'));
  });

  moveFollower();
})();
