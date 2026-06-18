(() => {
  const panel = document.querySelector('#game2048Panel');
  const boardEl = document.querySelector('#game2048Board');
  const scoreEl = document.querySelector('#game2048Score');
  const bestEl = document.querySelector('#game2048Best');
  const statusEl = document.querySelector('#game2048Status');
  const newGameButton = document.querySelector('#game2048New');
  const moveButtons = document.querySelectorAll('.game-2048-controls [data-move]');

  if (!panel || !boardEl || !scoreEl || !bestEl || !statusEl || !newGameButton) {
    return;
  }

  const size = 4;
  let board = [];
  let score = 0;
  let best = Number(localStorage.getItem('tamzid2048Best') || 0);
  let won = false;

  const emptyBoard = () => Array.from({ length: size }, () => Array(size).fill(0));
  const cloneBoard = () => board.map((row) => [...row]);
  const boardsMatch = (first, second) => first.every((row, rowIndex) => row.every((value, colIndex) => value === second[rowIndex][colIndex]));

  const getEmptyCells = () => {
    const cells = [];

    board.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        if (!value) {
          cells.push([rowIndex, colIndex]);
        }
      });
    });

    return cells;
  };

  const addRandomTile = () => {
    const cells = getEmptyCells();

    if (!cells.length) {
      return;
    }

    const [row, col] = cells[Math.floor(Math.random() * cells.length)];
    board[row][col] = Math.random() < 0.9 ? 2 : 4;
  };

  const getTileClass = (value) => {
    if (!value) {
      return '';
    }

    return value > 2048 ? 'tile-super' : `tile-${value}`;
  };

  const canMove = () => {
    if (getEmptyCells().length) {
      return true;
    }

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const value = board[row][col];

        if (board[row]?.[col + 1] === value || board[row + 1]?.[col] === value) {
          return true;
        }
      }
    }

    return false;
  };

  const render = () => {
    boardEl.replaceChildren();

    board.flat().forEach((value) => {
      const tile = document.createElement('div');
      tile.className = `game-2048-tile ${getTileClass(value)}`.trim();
      tile.setAttribute('role', 'gridcell');
      tile.textContent = value ? String(value) : '';
      boardEl.appendChild(tile);
    });

    scoreEl.textContent = score;
    bestEl.textContent = best;

    if (!canMove()) {
      statusEl.textContent = 'Game over. Start a new game and try again.';
      return;
    }

    if (!won && board.flat().includes(2048)) {
      won = true;
      statusEl.textContent = 'You reached 2048. Keep going for a higher score.';
      return;
    }

    statusEl.textContent = 'Join the numbers and keep the board moving.';
  };

  const mergeLine = (line) => {
    const numbers = line.filter(Boolean);
    const merged = [];

    for (let index = 0; index < numbers.length; index += 1) {
      if (numbers[index] === numbers[index + 1]) {
        const value = numbers[index] * 2;
        merged.push(value);
        score += value;
        index += 1;
      } else {
        merged.push(numbers[index]);
      }
    }

    while (merged.length < size) {
      merged.push(0);
    }

    return merged;
  };

  const move = (direction) => {
    const previous = cloneBoard();

    if (direction === 'left') {
      board = board.map((row) => mergeLine(row));
    }

    if (direction === 'right') {
      board = board.map((row) => mergeLine([...row].reverse()).reverse());
    }

    if (direction === 'up') {
      for (let col = 0; col < size; col += 1) {
        const merged = mergeLine(board.map((row) => row[col]));
        merged.forEach((value, rowIndex) => {
          board[rowIndex][col] = value;
        });
      }
    }

    if (direction === 'down') {
      for (let col = 0; col < size; col += 1) {
        const merged = mergeLine(board.map((row) => row[col]).reverse()).reverse();
        merged.forEach((value, rowIndex) => {
          board[rowIndex][col] = value;
        });
      }
    }

    if (boardsMatch(previous, board)) {
      render();
      return;
    }

    addRandomTile();

    if (score > best) {
      best = score;
      localStorage.setItem('tamzid2048Best', String(best));
    }

    render();
  };

  const pulseMoveButton = (direction) => {
    const button = document.querySelector(`.game-2048-controls [data-move="${direction}"]`);

    if (!button) {
      return;
    }

    button.classList.remove('is-pressed');
    requestAnimationFrame(() => {
      button.classList.add('is-pressed');
      window.setTimeout(() => button.classList.remove('is-pressed'), 150);
    });
  };

  const startNewGame = () => {
    board = emptyBoard();
    score = 0;
    won = false;
    addRandomTile();
    addRandomTile();
    render();

    if (!panel.hidden) {
      boardEl.focus({ preventScroll: true });
    }
  };

  newGameButton.addEventListener('click', startNewGame);

  moveButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const direction = button.dataset.move;
      pulseMoveButton(direction);
      move(direction);
      boardEl.focus({ preventScroll: true });
    });
  });

  window.addEventListener('keydown', (event) => {
    if (panel.hidden) {
      return;
    }

    const moves = {
      ArrowUp: 'up',
      ArrowRight: 'right',
      ArrowDown: 'down',
      ArrowLeft: 'left'
    };
    const direction = moves[event.key];

    if (!direction) {
      return;
    }

    event.preventDefault();
    pulseMoveButton(direction);
    move(direction);
  });

  startNewGame();
})();
