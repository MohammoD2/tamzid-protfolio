(() => {
  const sections = [...document.querySelectorAll('main > section.portfolio-hero, main > section.section-padding')];
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
  // A sparse, irregular selection replaces the previous one-object-per-section pattern.
  const wireSections = new Set();
  const candidates = sections.map((_, index) => index);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random(0, i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const budget = Math.max(1, Math.floor(sections.length / 4));
  for (const index of candidates) {
    if (wireSections.size >= budget) break;
    if (![...wireSections].some((selected) => Math.abs(selected - index) <= 1)) wireSections.add(index);
  }
  // Explicit homepage placements stay stable across reloads.
  if (sections.some((section) => section.dataset.wireShape)) {
    wireSections.clear();
    sections.forEach((section, index) => {
      if (section.dataset.wireShape) wireSections.add(index);
    });
  }
  const wires = [];
  const makeWire = (section, layer) => {
    const sphere = section.dataset.wireShape ? section.dataset.wireShape === 'sphere' : Math.random() < .5;
    let geometry;
    if (sphere) {
      geometry = [0, Math.PI / 3, Math.PI * 2 / 3].map((meridian) =>
        Array.from({ length: 65 }, (_, i) => {
          const t = i / 64 * Math.PI * 2;
          return [Math.cos(t) * Math.cos(meridian), Math.sin(t), Math.cos(t) * Math.sin(meridian)];
        }));
      geometry.push(Array.from({ length: 65 }, (_, i) => {
        const t = i / 64 * Math.PI * 2;
        return [Math.cos(t), 0, Math.sin(t)];
      }));
    } else {
      const vertices = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
      geometry = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].map((edge) => edge.map((i) => vertices[i]));
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const left = section.dataset.wireSide ? section.dataset.wireSide === 'left' : Math.random() < .5;
    svg.setAttribute('class', `ambient-motif${left ? ' ambient-wire-left' : ''}`);
    svg.setAttribute('viewBox', '0 0 300 300');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.style.setProperty('--wire-top', `${section.dataset.wireTop || random(10, 52).toFixed(1)}%`);
    const paths = geometry.map(() => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      svg.appendChild(path);
      return path;
    });
    layer.appendChild(svg);
    wires.push({ section, geometry, paths, angle: random(0, Math.PI * 2), speed: (Math.random() < .5 ? -1 : 1) * Math.PI * 2 / random(32, 44), visible: false });
  };
  sections.forEach((section, index) => {
    if (section.querySelector('.ambient-layer')) return;
    section.classList.add('ambient-section');
    const layer = document.createElement('div');
    layer.className = 'ambient-layer';
    layer.setAttribute('aria-hidden', 'true');
    const bottom = index % 2 === 1;
    layer.innerHTML = `<svg class="ambient-circles${bottom ? ' ambient-circles-bottom' : ''}${Math.random() < .5 ? ' ambient-circles-swap' : ''}" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false" style="--circle-size:${Math.round(random(760, 1400))}px;--arc-duration:${random(10, 15).toFixed(1)}s"><circle cx="500" cy="500" r="460" pathLength="100"/><circle class="ambient-circle-secondary" cx="500" cy="500" r="400" pathLength="100"/></svg>`;
    if (wireSections.has(index)) makeWire(section, layer);
    for (let i = 0; i < 2; i++) {
      const traveler = document.createElement('div');
      traveler.className = `ambient-traveler${i ? ' ambient-traveler-secondary' : ''}`;
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
  // Project actual 3D coordinates, so rear edges remain visible during Y rotation.
  const renderWire = (wire) => {
    const cos = Math.cos(wire.angle), sin = Math.sin(wire.angle);
    const tilt = .28, scale = 65;
    wire.geometry.forEach((points, index) => {
      let depth = 0;
      const d = points.map(([x, y, z], i) => {
        const rx = x * cos + z * sin;
        const rz = -x * sin + z * cos;
        const ry = y * Math.cos(tilt) - rz * Math.sin(tilt);
        const zz = y * Math.sin(tilt) + rz * Math.cos(tilt);
        const perspective = 5 / (5 + zz);
        depth += zz;
        return `${i ? 'L' : 'M'}${(150 + rx * scale * perspective).toFixed(2)},${(150 + ry * scale * perspective).toFixed(2)}`;
      }).join(' ');
      wire.paths[index].setAttribute('d', d);
      wire.paths[index].style.opacity = String(Math.max(.32, Math.min(1, .65 - depth / points.length * .22)));
    });
  };
  wires.forEach(renderWire);
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = null, lastTime = null;
  const canAnimate = () => !document.hidden && !motionPreference.matches && wires.some((wire) => wire.visible);
  const tick = (time) => {
    frame = null;
    if (!canAnimate()) { lastTime = null; return; }
    const delta = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, .05);
    lastTime = time;
    wires.forEach((wire) => {
      if (!wire.visible) return;
      wire.angle = (wire.angle + wire.speed * delta) % (Math.PI * 2);
      renderWire(wire);
    });
    frame = requestAnimationFrame(tick);
  };
  const syncMotion = () => {
    document.documentElement.classList.toggle('ambient-paused', document.hidden);
    if (canAnimate() && frame === null) { lastTime = null; frame = requestAnimationFrame(tick); }
    else if (!canAnimate() && frame !== null) { cancelAnimationFrame(frame); frame = null; lastTime = null; }
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-ambient-visible', entry.isIntersecting);
        wires.forEach((wire) => { if (wire.section === entry.target) wire.visible = entry.isIntersecting; });
      });
      syncMotion();
    }, { threshold: 0 });
    sections.forEach((section) => observer.observe(section));
  } else {
    sections.forEach((section) => section.classList.add('is-ambient-visible'));
    wires.forEach((wire) => { wire.visible = true; });
  }
  document.addEventListener('visibilitychange', syncMotion);
  motionPreference.addEventListener('change', syncMotion);
  syncMotion();
})();
