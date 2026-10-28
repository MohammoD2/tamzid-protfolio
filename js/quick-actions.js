(() => {
  const launcher = document.querySelector('[data-quick-actions]');
  if (!launcher) return;
  const toggle = launcher.querySelector('[data-quick-actions-toggle]');
  const panel = launcher.querySelector('.quick-actions-panel');
  const actions = [...panel.querySelectorAll('a,button')];
  const setOpen = (open, restoreFocus = false) => {
    launcher.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close quick actions' : 'Open quick actions');
    panel.inert = !open;
    if (restoreFocus) toggle.focus({ preventScroll: true });
  };
  toggle.addEventListener('click', () => setOpen(!launcher.classList.contains('is-open')));
  toggle.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault(); setOpen(true);
      actions[event.key === 'ArrowUp' ? actions.length - 1 : 0].focus();
    }
  });
  panel.addEventListener('click', (event) => {
    const action = event.target.closest('.quick-action');
    if (!action) return;
    // The theme dialog remembers the launcher as its focus-return target.
    setOpen(false, action.hasAttribute('data-theme-picker-open'));
  }, true);
  panel.addEventListener('keydown', (event) => {
    const index = actions.indexOf(document.activeElement);
    if (index === -1) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      actions[(index + direction + actions.length) % actions.length].focus();
    }
  });
  document.addEventListener('pointerdown', (event) => {
    if (!launcher.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && launcher.classList.contains('is-open')) {
      event.preventDefault(); setOpen(false, true);
    }
  });
  launcher.addEventListener('focusout', () => {
    requestAnimationFrame(() => { if (!launcher.contains(document.activeElement)) setOpen(false); });
  });
  const currentFile = location.pathname.split('/').pop() || 'index.html';
  actions.forEach((action) => {
    if (action.dataset.quickPage === currentFile) action.setAttribute('aria-current','page');
  });
})();
