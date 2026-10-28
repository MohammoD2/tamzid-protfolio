(() => {
  const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const follower = document.createElement('div');
  follower.className = 'cursor-follower';
  follower.setAttribute('aria-hidden', 'true');
  document.body.appendChild(follower);
  let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
  let frame = null, lastTime = null, visible = false;
  const enabled = () => pointer.matches && !motion.matches && !document.hidden;
  const tick = (time) => {
    frame = null;
    if (!enabled() || !visible) return;
    const delta = lastTime === null ? 16.67 : Math.min(time - lastTime, 50);
    lastTime = time;
    const ease = 1 - Math.exp(-delta / 65);
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;
    follower.style.transform = 'translate3d(' + currentX + 'px, ' + currentY + 'px, 0) translate(-50%, -50%)';
    if (Math.hypot(targetX - currentX, targetY - currentY) > .1) frame = requestAnimationFrame(tick);
    else lastTime = null;
  };
  const hide = () => {
    visible = false;
    follower.classList.remove('is-visible', 'is-hovering');
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastTime = null;
  };
  window.addEventListener('pointermove', (event) => {
    if (!enabled() || event.pointerType !== 'mouse') return;
    targetX = event.clientX;
    targetY = event.clientY;
    if (!visible) { currentX = targetX; currentY = targetY; }
    visible = true;
    follower.classList.add('is-visible');
    follower.classList.toggle('is-hovering', Boolean(event.target.closest('a,button,input,textarea,select,[role="button"],.work-card,.youtube-thumbnail,.game-library-card,.service-detail-card')));
    if (frame === null) frame = requestAnimationFrame(tick);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', hide);
  window.addEventListener('blur', hide);
  document.addEventListener('visibilitychange', hide);
  document.addEventListener('keydown', (event) => { if (event.key === 'Tab') hide(); });
  pointer.addEventListener('change', hide);
  motion.addEventListener('change', hide);
})();
