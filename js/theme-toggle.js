(() => {
  const storageKey = 'tamzid-portfolio-theme';
  const root = document.documentElement;
  // Add future themes here; the list is generated from this registry.
  const themes = [
    { id: 'light', name: 'Classic White', description: 'Bright, clean, and timeless.', preview: 'light' },
    { id: 'dark', name: 'Midnight Blue', description: 'Deep blue with soft, elegant contrast.', preview: 'dark' },
    { id: 'glass', name: 'Liquid Glass', description: 'Sunlit color, luminous edges, and clear glass.', preview: 'glass' }
  ];
  const normalizeTheme = (id) => themes.some((theme) => theme.id === id) ? id : 'glass';
  const readSavedTheme = () => {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  };
  const initialize = () => {
    const triggers = [...document.querySelectorAll('[data-theme-picker-open]')];
    if (!triggers.length) return;
    const dialog = document.createElement('dialog');
    dialog.id = 'themePicker';
    dialog.className = 'theme-picker';
    dialog.setAttribute('aria-labelledby', 'themePickerTitle');
    dialog.setAttribute('aria-describedby', 'themePickerDescription');
    dialog.innerHTML = `
      <div class="theme-picker-header">
        <div><span class="theme-picker-eyebrow">MAKE IT YOURS</span>
          <h2 id="themePickerTitle">Choose your theme</h2>
        </div>
        <button class="theme-picker-close" type="button" aria-label="Close themes"><i class="bi-x-lg" aria-hidden="true"></i></button>
      </div>
      <p id="themePickerDescription">A different mood. The same creative world.</p>
      <div class="theme-picker-list" role="radiogroup" aria-label="Website theme">
        ${themes.map((theme) => `
          <button class="theme-picker-option" type="button" role="radio" aria-checked="false" tabindex="-1" data-theme-choice="${theme.id}">
            <span class="theme-preview theme-preview-${theme.preview}" aria-hidden="true"><span></span><span></span><span></span></span>
            <span class="theme-option-copy"><strong>${theme.name}</strong><span>${theme.description}</span></span>
            <span class="theme-option-check" aria-hidden="true"><i class="bi-check-lg"></i></span>
          </button>`).join('')}
      </div>
      <p class="theme-picker-note"><i class="bi-check2-circle" aria-hidden="true"></i> Saved for your next visit</p>
      <span class="visually-hidden" role="status" aria-live="polite" data-theme-status></span>`;
    document.body.appendChild(dialog);
    const options = [...dialog.querySelectorAll('[data-theme-choice]')];
    const status = dialog.querySelector('[data-theme-status]');
    let closingTimer;
    const applyTheme = (id, persist = false) => {
      const selected = normalizeTheme(id);
      root.setAttribute('data-theme', selected);
      options.forEach((option) => {
        const active = option.dataset.themeChoice === selected;
        option.setAttribute('aria-checked', String(active));
        option.tabIndex = active ? 0 : -1;
      });
      const name = themes.find((theme) => theme.id === selected).name;
      triggers.forEach((trigger) => trigger.setAttribute('aria-label', `Themes, current theme: ${name}`));
      if (persist) {
        try { localStorage.setItem(storageKey, selected); } catch { /* Works without storage. */ }
        status.textContent = `${name} applied`;
      }
    };
    const closePicker = () => {
      if (!dialog.open || dialog.classList.contains('is-closing')) return;
      dialog.classList.add('is-closing');
      closingTimer = window.setTimeout(() => dialog.close(), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160);
    };
    triggers.forEach((trigger) => trigger.addEventListener('click', () => {
      if (dialog.open) return;
      dialog.classList.remove('is-closing');
      dialog.showModal();
      document.body.classList.add('theme-picker-open');
      triggers.forEach((button) => button.setAttribute('aria-expanded', 'true'));
      options.find((option) => option.getAttribute('aria-checked') === 'true').focus({ preventScroll: true });
    }));
    dialog.querySelector('.theme-picker-close').addEventListener('click', closePicker);
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); closePicker(); });
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closePicker();
    });
    dialog.addEventListener('close', () => {
      window.clearTimeout(closingTimer);
      dialog.classList.remove('is-closing');
      document.body.classList.remove('theme-picker-open');
      triggers.forEach((button) => button.setAttribute('aria-expanded', 'false'));
    });
    options.forEach((option, index) => {
      option.addEventListener('click', () => applyTheme(option.dataset.themeChoice, true));
      option.addEventListener('keydown', (event) => {
        let next;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % options.length;
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index - 1 + options.length) % options.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = options.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        applyTheme(options[next].dataset.themeChoice, true);
        options[next].focus();
      });
    });
    window.addEventListener('storage', (event) => {
      if (event.key === storageKey || event.key === null) applyTheme(readSavedTheme());
    });
    // Reflections follow a fine pointer; touch receives a small elastic press.
    const glassControls = '[data-glass-surface]:not([data-glass-surface=link])';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reflectionFrame = null;
    let reflectionTarget, pointerX, pointerY;
    document.addEventListener('pointermove', (event) => {
      if (root.dataset.theme !== 'glass' || reducedMotion.matches || event.pointerType !== 'mouse') return;
      const target = event.target.closest(glassControls);
      if (!target) return;
      reflectionTarget = target; pointerX = event.clientX; pointerY = event.clientY;
      if (reflectionFrame !== null) return;
      reflectionFrame = requestAnimationFrame(() => {
        reflectionFrame = null;
        if (root.dataset.theme !== 'glass' || !reflectionTarget.isConnected) return;
        const rect = reflectionTarget.getBoundingClientRect();
        const x = ((pointerX - rect.left) / Math.max(rect.width, 1) * 100).toFixed(1);
        const y = ((pointerY - rect.top) / Math.max(rect.height, 1) * 100).toFixed(1);
        const strength = getComputedStyle(reflectionTarget).getPropertyValue('--glass-reflection-strength').trim() || '.25';
        reflectionTarget.style.setProperty('--glass-reflection', `radial-gradient(ellipse at ${x}% ${y}%, rgba(255,255,255,${strength}), transparent 55%)`);
      });
    }, { passive: true });
    const pressGlass = (target) => {
      if (root.dataset.theme !== 'glass' || reducedMotion.matches || !target || !target.animate || !target.matches('button,a,[role=button]')) return;
      target.animate([{ scale: '1' }, { scale: '.96', offset: .35 }, { scale: '1' }], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' });
    };
    document.addEventListener('pointerdown', (event) => {
      if (event.button === 0) pressGlass(event.target.closest(glassControls));
    }, { passive: true });
    document.addEventListener('keydown', (event) => {
      if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) pressGlass(event.target.closest(glassControls));
    });
    applyTheme(readSavedTheme());
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
