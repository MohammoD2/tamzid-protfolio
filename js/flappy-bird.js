(() => {
  const canvas = document.querySelector('#flappyCanvas');
  const startButton = document.querySelector('#startGame');
  const overlay = document.querySelector('#gameOverlay');
  const scoreEl = document.querySelector('#gameScore');
  const bestEl = document.querySelector('#gameBest');
  const speedEl = document.querySelector('#gameSpeed');
  const levelEl = document.querySelector('#gameLevel');
  const skinButtons = document.querySelectorAll('.skin-option[data-skin]');

  if (!canvas || !startButton || !overlay || !scoreEl || !bestEl) {
    return;
  }

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);

  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  canvas.style.touchAction = 'none';
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const groundHeight = 70;
  const pipeWidth = 70;
  const initialGapHeight = 190;
  const minimumGapHeight = 150;
  const gravity = 0.5;
  const flapPower = -7.2;
  const maxFallSpeed = 11;
  const physicsStep = 1000 / 120;
  // Speeds are pixels per 60 Hz frame. There is intentionally no hard speed cap.
  const initialPipeSpeed = 2.4;
  const timeAcceleration = 0.014;
  const scoreAcceleration = 0.115;
  const pipeSpacing = 310;
  const crashDuration = 780;
  const blenderLogo = new Image();
  blenderLogo.src = 'images/Blender_logo_no_text.svg.png';
  blenderLogo.addEventListener('load', () => {
    if (selectedSkin === 'blender') {
      draw();
    }
  });
  const plane911 = new Image();
  plane911.src = 'images/plane-911.svg';
  plane911.addEventListener('load', () => {
    if (selectedSkin === 'plane911') {
      draw();
    }
  });
  let bird;
  let pipes;
  let score;
  let best = Number(localStorage.getItem('tamzidFlappyBest') || 0);
  let selectedSkin = localStorage.getItem('tamzidFlappySkin') || 'default';
  let gameState = 'ready';
  let animationFrame;
  let elapsedTime;
  let previousFrameTime;
  let physicsAccumulator;
  let currentPipeSpeed;
  let currentGapHeight;
  let difficultyLevel;
  let crashParticles = [];
  let crashStartedAt = 0;
  let crashPreviousTime = 0;

  bestEl.textContent = best;

  const getUnlockScore = (button) => Number(button.dataset.unlockScore || 0);

  const isSkinUnlocked = (button) => best >= getUnlockScore(button);

  const isSelectedSkinUnlocked = () => {
    const selectedButton = [...skinButtons].find((button) => button.dataset.skin === selectedSkin);
    return Boolean(selectedButton) && isSkinUnlocked(selectedButton);
  };

  const updateSkinButtons = () => {
    if (!isSelectedSkinUnlocked()) {
      selectedSkin = 'default';
      localStorage.setItem('tamzidFlappySkin', selectedSkin);
    }

    skinButtons.forEach((button) => {
      const unlocked = isSkinUnlocked(button);
      button.classList.toggle('is-active', button.dataset.skin === selectedSkin);
      button.classList.toggle('is-locked', !unlocked);
      button.disabled = !unlocked;
      button.setAttribute('aria-disabled', String(!unlocked));
    });
  };

  const resetGame = () => {
    bird = {
      x: 92,
      y: height * 0.42,
      radius: 16,
      velocity: 0,
      rotation: 0
    };

    pipes = [];
    score = 0;
    elapsedTime = 0;
    currentPipeSpeed = initialPipeSpeed;
    currentGapHeight = initialGapHeight;
    difficultyLevel = 1;
    previousFrameTime = null;
    physicsAccumulator = 0;
    crashParticles = [];
    crashStartedAt = 0;
    crashPreviousTime = 0;
    scoreEl.textContent = score;
    if (speedEl) speedEl.textContent = '1.0x';
    if (levelEl) levelEl.textContent = 'Level 1';

    for (let i = 0; i < 2; i += 1) {
      addPipe(width + 230 + i * pipeSpacing);
    }
  };

  const addPipe = (x) => {
    const minTop = 95;
    const maxTop = height - groundHeight - currentGapHeight - 105;
    const topHeight = minTop + Math.random() * (maxTop - minTop);

    pipes.push({
      x,
      topHeight,
      gapHeight: currentGapHeight,
      passed: false
    });
  };

  const drawBackground = () => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#dceefa');
    gradient.addColorStop(0.62, '#eef7fd');
    gradient.addColorStop(1, '#ffffff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255,255,255,.62)';
    [[72, 110, 48], [330, 165, 62], [210, 72, 36]].forEach(([x, y, size]) => {
      ctx.beginPath();
      ctx.ellipse(x, y, size, size * .34, 0, 0, Math.PI * 2);
      ctx.ellipse(x - size * .34, y + 2, size * .48, size * .27, 0, 0, Math.PI * 2);
      ctx.ellipse(x + size * .35, y + 4, size * .45, size * .24, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = 'rgba(97,160,205,.11)';
    ctx.beginPath();
    ctx.moveTo(0, height - groundHeight - 70);
    ctx.quadraticCurveTo(105, height - groundHeight - 135, 210, height - groundHeight - 62);
    ctx.quadraticCurveTo(315, height - groundHeight - 118, width, height - groundHeight - 54);
    ctx.lineTo(width, height - groundHeight);
    ctx.lineTo(0, height - groundHeight);
    ctx.closePath();
    ctx.fill();
  };

  const eachPillarSegment = (pipe, drawSegment) => {
    const bottomY = pipe.topHeight + pipe.gapHeight;
    drawSegment(pipe.x, 0, pipeWidth, pipe.topHeight, 'top');
    drawSegment(pipe.x, bottomY, pipeWidth, height - groundHeight - bottomY, 'bottom');
  };

  const getPillarPalette = () => document.documentElement.dataset.theme === 'dark'
    ? {
        deep: '#284760',
        primary: '#527c9d',
        mid: '#6e9aba',
        light: '#a6c9e2',
        pale: '#dce9f2'
      }
    : {
        deep: '#2f4a64',
        primary: '#3b5d7d',
        mid: '#5f7f9b',
        light: '#8fb0c7',
        pale: '#dceaf6'
      };

  const drawClassicPillars = (pipe) => {
    const palette = getPillarPalette();
    const bottomY = pipe.topHeight + pipe.gapHeight;
    const pipeGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
    pipeGradient.addColorStop(0, palette.primary);
    pipeGradient.addColorStop(1, palette.mid);

    ctx.fillStyle = pipeGradient;
    ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
    ctx.fillRect(pipe.x, bottomY, pipeWidth, height - groundHeight - bottomY);

    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(pipe.x + 10, 0, 8, pipe.topHeight);
    ctx.fillRect(pipe.x + 10, bottomY, 8, height - groundHeight - bottomY);

    ctx.fillStyle = palette.deep;
    ctx.fillRect(pipe.x - 8, pipe.topHeight - 18, pipeWidth + 16, 18);
    ctx.fillRect(pipe.x - 8, bottomY, pipeWidth + 16, 18);
  };

  const drawForestPillars = (pipe) => {
    const palette = getPillarPalette();
    eachPillarSegment(pipe, (x, y, segmentWidth, segmentHeight, edge) => {
      const wood = ctx.createLinearGradient(x, y, x + segmentWidth, y);
      wood.addColorStop(0, palette.deep);
      wood.addColorStop(0.45, palette.mid);
      wood.addColorStop(0.72, palette.primary);
      wood.addColorStop(1, palette.deep);
      ctx.fillStyle = wood;
      ctx.fillRect(x, y, segmentWidth, segmentHeight);

      ctx.strokeStyle = palette.deep;
      ctx.lineWidth = 2;
      for (let offset = 12; offset < segmentWidth; offset += 15) {
        ctx.beginPath();
        ctx.moveTo(x + offset, y);
        ctx.bezierCurveTo(x + offset - 5, y + segmentHeight * .32, x + offset + 6, y + segmentHeight * .68, x + offset - 2, y + segmentHeight);
        ctx.stroke();
      }

      const cutY = edge === 'top' ? y + segmentHeight - 16 : y;
      ctx.fillStyle = palette.light;
      ctx.fillRect(x, cutY, segmentWidth, 16);
      ctx.strokeStyle = palette.primary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x + segmentWidth / 2, cutY + 8, 23, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(x + segmentWidth / 2, cutY + 8, 12, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = palette.pale;
      ctx.fillRect(x, edge === 'top' ? cutY : cutY + 12, segmentWidth, 4);
    });
  };

  const drawBlenderPillars = (pipe) => {
    const palette = getPillarPalette();
    eachPillarSegment(pipe, (x, y, segmentWidth, segmentHeight) => {
      ctx.fillStyle = palette.deep;
      ctx.fillRect(x, y, segmentWidth, segmentHeight);

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, segmentWidth, segmentHeight);
      ctx.clip();

      const cubeSize = 35;
      for (let cubeY = y - 2; cubeY < y + segmentHeight; cubeY += cubeSize) {
        for (let column = 0; column < 2; column += 1) {
          const cubeX = x + column * cubeSize;

          ctx.fillStyle = palette.primary;
          ctx.fillRect(cubeX + 3, cubeY + 7, 25, 25);

          ctx.fillStyle = palette.light;
          ctx.beginPath();
          ctx.moveTo(cubeX + 3, cubeY + 7);
          ctx.lineTo(cubeX + 10, cubeY + 2);
          ctx.lineTo(cubeX + 33, cubeY + 2);
          ctx.lineTo(cubeX + 28, cubeY + 7);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = palette.deep;
          ctx.beginPath();
          ctx.moveTo(cubeX + 28, cubeY + 7);
          ctx.lineTo(cubeX + 33, cubeY + 2);
          ctx.lineTo(cubeX + 33, cubeY + 27);
          ctx.lineTo(cubeX + 28, cubeY + 32);
          ctx.closePath();
          ctx.fill();
        }
      }

      ctx.restore();
    });
  };

  const drawTowerPillars = (pipe) => {
    const palette = getPillarPalette();
    eachPillarSegment(pipe, (x, y, segmentWidth, segmentHeight, edge) => {
      const tower = ctx.createLinearGradient(x, y, x + segmentWidth, y);
      tower.addColorStop(0, palette.deep);
      tower.addColorStop(0.48, palette.light);
      tower.addColorStop(1, palette.primary);
      ctx.fillStyle = tower;
      ctx.fillRect(x, y, segmentWidth, segmentHeight);

      ctx.fillStyle = palette.pale;
      for (let row = y + 12; row < y + segmentHeight - 20; row += 22) {
        ctx.fillRect(x + 8, row, 14, 7);
        ctx.fillRect(x + 28, row, 14, 7);
        ctx.fillRect(x + 48, row, 14, 7);
      }

      const deckY = edge === 'top' ? y + segmentHeight - 18 : y;
      ctx.fillStyle = palette.deep;
      ctx.fillRect(x, deckY, segmentWidth, 18);
      ctx.fillStyle = palette.light;
      ctx.fillRect(x + 9, deckY + 5, segmentWidth - 18, 7);
      ctx.fillStyle = palette.pale;
      ctx.fillRect(x + segmentWidth / 2 - 2, edge === 'top' ? deckY : deckY + 12, 4, 6);
    });
  };

  const drawPipes = () => {
    pipes.forEach((pipe) => {
      if (selectedSkin === 'owl') {
        drawForestPillars(pipe);
      } else if (selectedSkin === 'blender') {
        drawBlenderPillars(pipe);
      } else if (selectedSkin === 'plane911') {
        drawTowerPillars(pipe);
      } else {
        drawClassicPillars(pipe);
      }
    });
  };

  const drawGround = () => {
    ctx.fillStyle = '#d5e5f0';
    ctx.fillRect(0, height - groundHeight, width, groundHeight);
    ctx.fillStyle = '#0067c0';
    ctx.fillRect(0, height - groundHeight, width, 4);
  };

  const drawDefaultBird = () => {
    ctx.fillStyle = '#3B5D7D';
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(5, -6, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#102033';
    ctx.beginPath();
    ctx.arc(6, -6, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f5b642';
    ctx.beginPath();
    ctx.moveTo(14, -6);
    ctx.lineTo(29, 1);
    ctx.lineTo(14, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.ellipse(-8, 4, 9, 5, -0.4, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawPigeonBird = () => {
    const bodyGradient = ctx.createLinearGradient(-16, -16, 18, 18);
    bodyGradient.addColorStop(0, '#c9d1d9');
    bodyGradient.addColorStop(0.55, '#7b8794');
    bodyGradient.addColorStop(1, '#4b5563');

    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#eef4f9';
    ctx.beginPath();
    ctx.arc(5, -6, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#102033';
    ctx.beginPath();
    ctx.arc(6, -6, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f5b642';
    ctx.beginPath();
    ctx.moveTo(14, -5);
    ctx.lineTo(27, 1);
    ctx.lineTo(14, 7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(16, 32, 51, 0.22)';
    ctx.beginPath();
    ctx.ellipse(-7, 5, 10, 5.5, -0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5f6f7d';
    ctx.beginPath();
    ctx.arc(-11, -12, 5, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawStyledBird = ({
    body,
    belly,
    wing,
    head,
    beak = '#f5b642',
    eye = '#ffffff',
    pupil = '#102033',
    crest = null
  }) => {
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fill();

    if (belly) {
      ctx.fillStyle = belly;
      ctx.beginPath();
      ctx.ellipse(0, 6, 10, 8, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (head) {
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.arc(-7, -10, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    if (crest) {
      ctx.fillStyle = crest;
      ctx.beginPath();
      ctx.moveTo(-8, -15);
      ctx.lineTo(-4, -26);
      ctx.lineTo(1, -15);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = eye;
    ctx.beginPath();
    ctx.arc(5, -6, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = pupil;
    ctx.beginPath();
    ctx.arc(6, -6, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = beak;
    ctx.beginPath();
    ctx.moveTo(14, -5);
    ctx.lineTo(29, 1);
    ctx.lineTo(14, 7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.ellipse(-7, 5, 10, 5.5, -0.35, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawCrowBird = () => {
    drawStyledBird({
      body: '#111827',
      wing: '#374151',
      beak: '#2f4a64',
      eye: '#d8e3ec',
      pupil: '#000000'
    });
  };

  const drawRobinBird = () => {
    drawStyledBird({
      body: '#7f1d1d',
      belly: '#f97316',
      wing: '#5f1f1f',
      head: '#4b1414',
      beak: '#facc15'
    });
  };

  const drawParrotBird = () => {
    drawStyledBird({
      body: '#16a34a',
      belly: '#facc15',
      wing: '#15803d',
      head: '#22c55e',
      beak: '#f97316',
      crest: '#ef4444'
    });
  };

  const drawOwlBird = () => {
    ctx.fillStyle = '#8b5e34';
    ctx.beginPath();
    ctx.ellipse(0, 2, 17, 19, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#6b4423';
    ctx.beginPath();
    ctx.moveTo(-12, -10);
    ctx.lineTo(-15, -23);
    ctx.lineTo(-4, -14);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(2, -14);
    ctx.lineTo(13, -23);
    ctx.lineTo(10, -10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-5, -5, 6, 0, Math.PI * 2);
    ctx.arc(7, -5, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#102033';
    ctx.beginPath();
    ctx.arc(-4, -5, 2, 0, Math.PI * 2);
    ctx.arc(8, -5, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f5b642';
    ctx.beginPath();
    ctx.moveTo(3, 0);
    ctx.lineTo(9, 4);
    ctx.lineTo(3, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.ellipse(-7, 8, 7, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawEagleBird = () => {
    drawStyledBird({
      body: '#92400e',
      belly: '#b45309',
      wing: '#78350f',
      head: '#ffffff',
      beak: '#facc15',
      eye: '#eef4f9',
      pupil: '#102033'
    });
  };

  const drawBlenderBird = () => {
    const logoWidth = 36;
    const logoHeight = 30;

    if (!blenderLogo.complete) {
      ctx.fillStyle = '#f57c00';
      ctx.beginPath();
      ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(blenderLogo, -logoWidth / 2, -logoHeight / 2, logoWidth, logoHeight);
  };

  const drawPlane911 = () => {
    const planeWidth = 40;
    const planeHeight = 20;

    if (!plane911.complete) {
      ctx.fillStyle = '#5f7f9b';
      ctx.beginPath();
      ctx.ellipse(0, 0, bird.radius + 3, bird.radius * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(plane911, -planeWidth / 2, -planeHeight / 2, planeWidth, planeHeight);
  };

  const drawBird = () => {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    if (selectedSkin === 'plane911') {
      drawPlane911();
    } else if (selectedSkin === 'blender') {
      drawBlenderBird();
    } else if (selectedSkin === 'owl') {
      drawOwlBird();
    } else {
      drawDefaultBird();
    }

    ctx.restore();
  };

  const crashPalettes = {
    default: ['#6e9aba', '#dce9f2', '#f5b642', '#ffffff'],
    owl: ['#7c4a24', '#c89152', '#f5b642', '#eef4f9'],
    blender: ['#f57c00', '#ffad42', '#1e78bd', '#ffffff'],
    plane911: ['#cbd5e1', '#64748b', '#ef4444', '#f8fafc']
  };

  const createCrashEffect = () => {
    const colors = crashPalettes[selectedSkin] || crashPalettes.default;
    crashParticles = [];

    for (let i = 0; i < 34; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.4 + Math.random() * 6.5;
      crashParticles.push({
        kind: 'fragment',
        x: bird.x,
        y: bird.y,
        vx: Math.cos(angle) * speed + currentPipeSpeed * 0.2,
        vy: Math.sin(angle) * speed - 1.2,
        size: 2.5 + Math.random() * 6,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.45,
        color: colors[i % colors.length],
        life: 0.65 + Math.random() * 0.35
      });
    }

    for (let i = 0; i < 18; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 7;
      crashParticles.push({
        kind: 'spark',
        x: bird.x,
        y: bird.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1 + Math.random() * 2,
        color: i % 2 ? '#ffd166' : '#ff6b35',
        life: 0.35 + Math.random() * 0.35
      });
    }

    for (let i = 0; i < 7; i += 1) {
      crashParticles.push({
        kind: 'smoke',
        x: bird.x + (Math.random() - 0.5) * 16,
        y: bird.y + (Math.random() - 0.5) * 12,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -0.8 - Math.random() * 1.2,
        size: 8 + Math.random() * 10,
        color: '#334155',
        life: 0.55 + Math.random() * 0.4
      });
    }
  };

  const updateCrashEffect = (frameScale) => {
    crashParticles.forEach((particle) => {
      particle.x += particle.vx * frameScale;
      particle.y += particle.vy * frameScale;
      particle.vy += (particle.kind === 'smoke' ? -0.015 : 0.28) * frameScale;
      particle.vx *= Math.pow(particle.kind === 'spark' ? 0.94 : 0.985, frameScale);
      if (particle.rotation !== undefined) particle.rotation += particle.spin * frameScale;
    });
  };

  const drawCrashEffect = (progress) => {
    const ringRadius = 10 + progress * 58;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 137, 54, ${Math.max(0, 0.72 - progress)})`;
    ctx.lineWidth = 6 * (1 - progress) + 1;
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    crashParticles.forEach((particle) => {
      const alpha = Math.max(0, Math.min(1, (particle.life - progress) * 3));
      if (!alpha) return;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;

      if (particle.kind === 'smoke') {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * (1 + progress), 0, Math.PI * 2);
        ctx.fill();
      } else if (particle.kind === 'spark') {
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = particle.size;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particle.x - particle.vx * 2.2, particle.y - particle.vy * 2.2);
        ctx.stroke();
      } else {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        if (selectedSkin === 'plane911' || selectedSkin === 'blender') {
          ctx.fillRect(-particle.size / 2, -particle.size / 3, particle.size, particle.size * 0.66);
        } else {
          ctx.beginPath();
          ctx.ellipse(0, 0, particle.size, particle.size * 0.38, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    });
    ctx.restore();
  };

  // Canvas typography follows the selected website theme as well.
  const canvasFonts = {};
  const updateCanvasFonts = () => {
    const styles = getComputedStyle(document.documentElement);
    canvasFonts.heading = styles.getPropertyValue('--heading-font-family').trim() || 'sans-serif';
    canvasFonts.body = styles.getPropertyValue('--body-font-family').trim() || 'sans-serif';
  };
  updateCanvasFonts();
  new MutationObserver(() => {
    updateCanvasFonts();
    if (bird) draw();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  const drawStartText = () => {
    ctx.fillStyle = '#3B5D7D';
    ctx.font = `600 24px ${canvasFonts.heading}`;
    ctx.textAlign = 'center';
    ctx.fillText('Click Start to Play', width / 2, height * 0.44);
    ctx.font = `400 15px ${canvasFonts.body}`;
    ctx.fillText('Tap, click, or press Space to flap', width / 2, height * 0.49);
  };

  const drawHud = () => {
    if (gameState === 'ready') return;
    ctx.save();
    ctx.fillStyle = 'rgba(16,47,74,.84)';
    ctx.beginPath();
    ctx.roundRect(14, 14, 92, 50, 10);
    ctx.fill();
    ctx.fillStyle = '#dce9f2';
    ctx.font = `600 10px ${canvasFonts.body}`;
    ctx.textAlign = 'left';
    ctx.fillText('SCORE', 27, 33);
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 22px ${canvasFonts.heading}`;
    ctx.fillText(String(score), 27, 55);
    ctx.restore();
  };

  const draw = () => {
    drawBackground();
    drawPipes();
    drawGround();
    if (gameState !== 'crashing' && gameState !== 'ended') {
      drawBird();
    }
    if (crashParticles.length) {
      const progress = crashStartedAt ? Math.min(1, (crashPreviousTime - crashStartedAt) / crashDuration) : 0;
      drawCrashEffect(progress);
    }
    drawHud();

    if (gameState === 'ready') {
      drawStartText();
    }
  };

  const collide = () => {
    if (bird.y + bird.radius >= height - groundHeight || bird.y - bird.radius <= 0) {
      return true;
    }

    return pipes.some((pipe) => {
      const inPipeX = bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + pipeWidth;
      const inGap = bird.y - bird.radius > pipe.topHeight && bird.y + bird.radius < pipe.topHeight + pipe.gapHeight;
      return inPipeX && !inGap;
    });
  };

  const update = (frameScale) => {
    elapsedTime += frameScale / 60;
    currentPipeSpeed = initialPipeSpeed + elapsedTime * timeAcceleration + score * scoreAcceleration;
    currentGapHeight = Math.max(
      minimumGapHeight,
      initialGapHeight - elapsedTime * 0.08 - score * 2
    );
    const nextLevel = 1 + Math.floor((currentPipeSpeed - initialPipeSpeed) / 0.55);
    if (nextLevel !== difficultyLevel) {
      difficultyLevel = nextLevel;
      if (levelEl) levelEl.textContent = `Level ${difficultyLevel}`;
    }
    if (speedEl) speedEl.textContent = `${(currentPipeSpeed / initialPipeSpeed).toFixed(1)}x`;
    const previousVelocity = bird.velocity;
    bird.velocity = Math.min(maxFallSpeed, bird.velocity + gravity * frameScale);
    bird.y += (previousVelocity + bird.velocity) * 0.5 * frameScale;
    const targetRotation = Math.max(-0.45, Math.min(1.2, bird.velocity * 0.1));
    bird.rotation += (targetRotation - bird.rotation) * (1 - Math.exp(-0.22 * frameScale));

    pipes.forEach((pipe) => {
      pipe.x -= currentPipeSpeed * frameScale;

      if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
        pipe.passed = true;
        score += 1;
        scoreEl.textContent = score;
        window.GameAudio?.play('flappy', 'score');
      }
    });

    if (pipes[0] && pipes[0].x + pipeWidth < -20) {
      pipes.shift();
      addPipe(pipes[pipes.length - 1].x + pipeSpacing);
    }

    if (collide()) {
      endGame();
    }
  };

  const loop = (timestamp) => {
    // Fixed physics steps keep flight and collisions consistent across refresh rates.
    // Limit catch-up time so returning to a hidden tab cannot cause a large jump.
    const frameTime = previousFrameTime === null ? 1000 / 60 : Math.max(0, Math.min(timestamp - previousFrameTime, 1000 / 30));
    previousFrameTime = timestamp;
    physicsAccumulator += frameTime;
    while (physicsAccumulator >= physicsStep && gameState === 'playing') {
      update(physicsStep / (1000 / 60));
      physicsAccumulator -= physicsStep;
    }
    draw();

    if (gameState === 'playing') {
      animationFrame = requestAnimationFrame(loop);
    }
  };

  const flap = () => {
    if (gameState === 'ready') {
      startGame();
      return;
    }

    if (gameState !== 'playing') {
      return;
    }

    bird.velocity = flapPower;
    window.GameAudio?.play('flappy', 'flap');
  };

  const startGame = () => {
    cancelAnimationFrame(animationFrame);
    resetGame();
    window.GameAudio?.startGame('flappy');
    gameState = 'playing';
    overlay.classList.add('is-hidden');
    flap();
    animationFrame = requestAnimationFrame(loop);
  };

  const finishGameOver = () => {
    gameState = 'ended';
    window.GameAudio?.endGame('flappy');
    if (score > best) {
      best = score;
      localStorage.setItem('tamzidFlappyBest', String(best));
      bestEl.textContent = best;
      updateSkinButtons();
    }

    overlay.querySelector('h3').textContent = 'Game Over';
    overlay.querySelector('p').textContent = `Score: ${score}. Press Enter or Space to restart.`;
    startButton.textContent = 'Restart Game';
    overlay.classList.remove('is-hidden');
    draw();
  };

  const crashLoop = (timestamp) => {
    if (!crashStartedAt) {
      crashStartedAt = timestamp;
      crashPreviousTime = timestamp;
    }

    const delta = Math.min(32, timestamp - crashPreviousTime);
    crashPreviousTime = timestamp;
    updateCrashEffect(delta / (1000 / 60));
    draw();

    if (timestamp - crashStartedAt < crashDuration) {
      animationFrame = requestAnimationFrame(crashLoop);
    } else {
      finishGameOver();
    }
  };

  const endGame = () => {
    if (gameState !== 'playing') return;
    gameState = 'crashing';
    window.GameAudio?.play('flappy', 'collision');
    createCrashEffect();
    crashStartedAt = 0;
    crashPreviousTime = 0;
    animationFrame = requestAnimationFrame(crashLoop);
  };

  startButton.addEventListener('click', startGame);
  skinButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (!isSkinUnlocked(button)) {
        return;
      }

      selectedSkin = button.dataset.skin || 'default';
      localStorage.setItem('tamzidFlappySkin', selectedSkin);
      updateSkinButtons();
      draw();
    });
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) {
      return;
    }
    event.preventDefault();
    flap();
  });

  window.addEventListener('keydown', (event) => {
    if (canvas.closest('.game-panel')?.hidden) {
      return;
    }

    const isSpace = event.code === 'Space';
    const isEnter = event.code === 'Enter';

    if (gameState === 'ended' && (isSpace || isEnter)) {
      event.preventDefault();
      if (!event.repeat) {
        startButton.click();
      }
      return;
    }

    if (!isSpace) {
      return;
    }

    event.preventDefault();
    if (event.repeat) {
      return;
    }
    flap();
  });

  resetGame();
  updateSkinButtons();
  draw();
})();
