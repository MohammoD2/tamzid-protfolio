(() => {
  const rotator = document.querySelector('[data-role-rotator]');
  if (!rotator) return;

  const roles = [...rotator.querySelectorAll('.hero-role')];
  if (roles.length < 2) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const holdDuration = 3000;
  const transitionDuration = 450;
  let currentIndex = 0;
  let holdTimer = null;
  let transitionTimer = null;

  const resetToFirstRole = () => {
    currentIndex = 0;
    roles.forEach((role, index) => {
      role.classList.toggle('is-active', index === 0);
      role.classList.remove('is-leaving');
    });
  };

  const scheduleNextRole = () => {
    holdTimer = window.setTimeout(showNextRole, holdDuration);
  };

  const showNextRole = () => {
    const currentRole = roles[currentIndex];
    const nextIndex = (currentIndex + 1) % roles.length;
    const nextRole = roles[nextIndex];

    currentRole.classList.add('is-leaving');
    nextRole.classList.add('is-active');

    transitionTimer = window.setTimeout(() => {
      currentRole.classList.remove('is-active', 'is-leaving');
      currentIndex = nextIndex;
      scheduleNextRole();
    }, transitionDuration);
  };

  const syncMotionPreference = () => {
    window.clearTimeout(holdTimer);
    window.clearTimeout(transitionTimer);
    resetToFirstRole();
    if (!reducedMotion.matches) scheduleNextRole();
  };

  reducedMotion.addEventListener('change', syncMotionPreference);
  syncMotionPreference();
})();
