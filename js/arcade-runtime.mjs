export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const length = (x, y) => Math.hypot(x, y);

export function safeBest(key, value) {
  try {
    if (value === undefined) return Number(localStorage.getItem(key)) || 0;
    const best = Math.max(safeBest(key), Math.floor(value));
    localStorage.setItem(key, String(best));
    return best;
  } catch (_) { return Math.max(0, Math.floor(value || 0)); }
}

export function fitCanvas(canvas, width, height, maxDpr = 2) {
  const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
  const pixelWidth = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const pixelHeight = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  ctx.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0);
  return ctx;
}

export function canvasPoint(event, canvas, width, height) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * width / rect.width,
    y: (event.clientY - rect.top) * height / rect.height
  };
}

export function createLoop({ step = 1 / 120, maxSteps = 8, update, render }) {
  let frame = 0;
  let last = 0;
  let accumulator = 0;
  let running = false;

  const tick = time => {
    if (!running) return;
    if (!last) last = time;
    accumulator += Math.min(.1, (time - last) / 1000);
    last = time;
    let count = 0;
    while (accumulator >= step && count < maxSteps) {
      update(step);
      accumulator -= step;
      count += 1;
    }
    if (count === maxSteps) accumulator = 0;
    render(accumulator / step);
    frame = requestAnimationFrame(tick);
  };

  return {
    start() { if (running) return; running = true; last = 0; accumulator = 0; frame = requestAnimationFrame(tick); },
    stop() { running = false; cancelAnimationFrame(frame); frame = 0; last = 0; accumulator = 0; },
    render() { render(0); },
    get running() { return running; }
  };
}

export function circleRect(circle, rect) {
  const nx = clamp(circle.x, rect.x, rect.x + rect.w);
  const ny = clamp(circle.y, rect.y, rect.y + rect.h);
  const dx = circle.x - nx;
  const dy = circle.y - ny;
  return dx * dx + dy * dy < circle.r * circle.r;
}

export function bindVisibility(pause) {
  const handler = () => { if (document.hidden) pause(true); };
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}

export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
}
