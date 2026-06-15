(() => {
  const canvas = document.querySelector('#flappyCanvas');
  const startButton = document.querySelector('#startGame');
  const overlay = document.querySelector('#gameOverlay');
  const scoreEl = document.querySelector('#gameScore');
  const bestEl = document.querySelector('#gameBest');
  const skinButtons = document.querySelectorAll('.skin-option');

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
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const groundHeight = 70;
  const pipeWidth = 70;
  const gapHeight = 190;
  const gravity = 0.24;
  const flapPower = -6.2;
  const pipeSpeed = 1.85;
  const pipeSpacing = 310;
  const blenderLogo = new Image();
  blenderLogo.src = 'images/Blender_logo_no_text.svg.png';
  blenderLogo.addEventListener('load', () => {
    if (selectedSkin === 'blender') {
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

  bestEl.textContent = best;

  const getUnlockScore = (button) => Number(button.dataset.unlockScore || 0);

  const isSkinUnlocked = (button) => best >= getUnlockScore(button);

  const isSelectedSkinUnlocked = () => {
    const selectedButton = [...skinButtons].find((button) => button.dataset.skin === selectedSkin);
    return !selectedButton || isSkinUnlocked(selectedButton);
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
    scoreEl.textContent = score;

    for (let i = 0; i < 2; i += 1) {
      addPipe(width + 230 + i * pipeSpacing);
    }
  };

  const addPipe = (x) => {
    const minTop = 95;
    const maxTop = height - groundHeight - gapHeight - 105;
    const topHeight = minTop + Math.random() * (maxTop - minTop);

    pipes.push({
      x,
      topHeight,
      passed: false
    });
  };

  const drawBackground = () => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#eef4f9');
    gradient.addColorStop(1, '#ffffff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(59, 93, 125, 0.08)';
    for (let x = 18; x < width; x += 38) {
      for (let y = 22; y < height - groundHeight; y += 38) {
        ctx.beginPath();
        ctx.arc(x, y, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const drawPipes = () => {
    pipes.forEach((pipe) => {
      const bottomY = pipe.topHeight + gapHeight;
      const pipeGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
      pipeGradient.addColorStop(0, '#2f4a64');
      pipeGradient.addColorStop(1, '#3B5D7D');

      ctx.fillStyle = pipeGradient;
      ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
      ctx.fillRect(pipe.x, bottomY, pipeWidth, height - groundHeight - bottomY);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(pipe.x + 10, 0, 8, pipe.topHeight);
      ctx.fillRect(pipe.x + 10, bottomY, 8, height - groundHeight - bottomY);

      ctx.fillStyle = '#223a52';
      ctx.fillRect(pipe.x - 8, pipe.topHeight - 18, pipeWidth + 16, 18);
      ctx.fillRect(pipe.x - 8, bottomY, pipeWidth + 16, 18);
    });
  };

  const drawGround = () => {
    ctx.fillStyle = '#d8e3ec';
    ctx.fillRect(0, height - groundHeight, width, groundHeight);
    ctx.fillStyle = '#3B5D7D';
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
    const logoWidth = 54;
    const logoHeight = 44;

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

  const drawBird = () => {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    if (selectedSkin === 'pigeon') {
      drawPigeonBird();
    } else if (selectedSkin === 'blender') {
      drawBlenderBird();
    } else if (selectedSkin === 'crow') {
      drawCrowBird();
    } else if (selectedSkin === 'robin') {
      drawRobinBird();
    } else if (selectedSkin === 'parrot') {
      drawParrotBird();
    } else if (selectedSkin === 'owl') {
      drawOwlBird();
    } else if (selectedSkin === 'eagle') {
      drawEagleBird();
    } else {
      drawDefaultBird();
    }

    ctx.restore();
  };

  const drawStartText = () => {
    ctx.fillStyle = '#3B5D7D';
    ctx.font = '700 24px Metropolis, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click Start to Play', width / 2, height * 0.44);
    ctx.font = '400 15px Metropolis, sans-serif';
    ctx.fillText('Tap, click, or press Space to flap', width / 2, height * 0.49);
  };

  const draw = () => {
    drawBackground();
    drawPipes();
    drawGround();
    drawBird();

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
      const inGap = bird.y - bird.radius > pipe.topHeight && bird.y + bird.radius < pipe.topHeight + gapHeight;
      return inPipeX && !inGap;
    });
  };

  const update = () => {
    bird.velocity += gravity;
    bird.y += bird.velocity;
    bird.rotation = Math.max(-0.45, Math.min(0.85, bird.velocity * 0.08));

    pipes.forEach((pipe) => {
      pipe.x -= pipeSpeed;

      if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
        pipe.passed = true;
        score += 1;
        scoreEl.textContent = score;
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

  const loop = () => {
    update();
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
  };

  const startGame = () => {
    cancelAnimationFrame(animationFrame);
    resetGame();
    gameState = 'playing';
    overlay.classList.add('is-hidden');
    flap();
    loop();
  };

  const endGame = () => {
    gameState = 'ended';
    cancelAnimationFrame(animationFrame);

    if (score > best) {
      best = score;
      localStorage.setItem('tamzidFlappyBest', String(best));
      bestEl.textContent = best;
      updateSkinButtons();
    }

    overlay.querySelector('h3').textContent = 'Game Over';
    overlay.querySelector('p').textContent = `Score: ${score}. Click restart to try again.`;
    startButton.textContent = 'Restart Game';
    overlay.classList.remove('is-hidden');
    draw();
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

  canvas.addEventListener('click', flap);
  canvas.addEventListener('touchstart', (event) => {
    event.preventDefault();
    flap();
  }, { passive: false });

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Space') {
      return;
    }

    event.preventDefault();
    flap();
  });

  resetGame();
  updateSkinButtons();
  draw();
})();
