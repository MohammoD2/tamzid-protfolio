(() => {
  const sections = [...document.querySelectorAll('main > section.portfolio-hero, main > section.section-padding, main > section[data-ambient]')];
  if (!sections.length) return;
  const random = (min, max) => min + Math.random() * (max - min);
  const shapes = [
    '<circle cx="50" cy="50" r="44"/>',
    '<rect x="9" y="9" width="82" height="82" rx="5"/>',
    '<path d="M27 9H73L96 50 73 91H27L4 50Z"/>',
    '<path d="M50 5 95 89H5Z"/>'
  ];
  const setTravel = (traveler) => {
    const lane = Math.random() < .5 ? random(4, 18) : random(78, 93);
    const exitLane = Math.max(3, Math.min(94, lane + random(-10, 10)));
    const direction = Math.floor(random(0, 4));
    const points = [
      ['-80px', `${lane}%`, 'calc(100% + 80px)', `${exitLane}%`],
      ['calc(100% + 80px)', `${lane}%`, '-80px', `${exitLane}%`],
      [`${lane}%`, '-80px', `${exitLane}%`, 'calc(100% + 80px)'],
      [`${lane}%`, 'calc(100% + 80px)', `${exitLane}%`, '-80px']
    ][direction];
    ['--from-x', '--from-y', '--to-x', '--to-y'].forEach((name, i) => traveler.style.setProperty(name, points[i]));
    traveler.style.setProperty('--shape-size', `${random(16, 42).toFixed(1)}px`);
    traveler.style.setProperty('--shape-angle', `${random(-90, 90).toFixed(1)}deg`);
    traveler.style.setProperty('--shape-color', Math.random() < .5 ? 'var(--solid-blue)' : 'var(--solid-blue-soft)');
    traveler.innerHTML = `<svg class="ambient-flat" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${shapes[Math.floor(random(0, shapes.length))]}</svg>`;
  };
  sections.forEach((section, index) => {
    if (section.querySelector('.ambient-layer')) return;
    section.classList.add('ambient-section');
    const layer = document.createElement('div');
    layer.className = 'ambient-layer';
    layer.setAttribute('aria-hidden', 'true');
    const bottom = index % 2 === 1;
    layer.innerHTML = `<svg class="ambient-circles${bottom ? ' ambient-circles-bottom' : ''}${Math.random() < .5 ? ' ambient-circles-swap' : ''}" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false" style="--circle-size:${Math.round(random(760, 1400))}px;--arc-duration:${random(10, 15).toFixed(1)}s"><circle cx="500" cy="500" r="460" pathLength="100"/><circle class="ambient-circle-secondary" cx="500" cy="500" r="400" pathLength="100"/></svg>`;
    for (let i = 0; i < 5; i++) {
      const traveler = document.createElement('div');
      traveler.className = `ambient-traveler${i >= 3 ? ' ambient-traveler-extra' : ''}`;
      traveler.style.setProperty('--travel-duration', `${random(36, 52).toFixed(1)}s`);
      traveler.style.setProperty('--travel-delay', `${random(0, 2).toFixed(1)}s`);
      setTravel(traveler);
      traveler.addEventListener('animationiteration', (event) => {
        if (event.target === traveler && event.animationName === 'studio-shape-travel') setTravel(traveler);
      });
      layer.appendChild(traveler);
    }
    section.prepend(layer);
  });
  const syncMotion = () => {
    document.documentElement.classList.toggle('ambient-paused', document.hidden);
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-ambient-visible', entry.isIntersecting);
      });
    }, { threshold: 0 });
    sections.forEach((section) => observer.observe(section));
  } else {
    sections.forEach((section) => section.classList.add('is-ambient-visible'));
  }
  document.addEventListener('visibilitychange', syncMotion);
  syncMotion();
})();
