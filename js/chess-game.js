import { Chess } from './vendor/chess/chess.js';

const panel = document.querySelector('#chessGamePanel');
const board = document.querySelector('#chessBoard');

if (panel && board) {
  const game = new Chess();
  const status = document.querySelector('#chessStatus');
  const undoButton = document.querySelector('#chessUndo');
  const retryButton = document.querySelector('#chessRetry');
  const promotionDialog = document.querySelector('#chessPromotion');
  const modes = [...document.querySelectorAll('[data-chess-mode]')];
  const names = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
  const colors = { w: 'White', b: 'Black' };
  const files = 'abcdefgh';
  // Original vector pieces keep the set consistent across devices and themes.
  const shapes = {
    p: '<circle cx="32" cy="17" r="8"/><path d="M26 25h12l-3 9 7 12H22l7-12z"/><path d="M22 46h20l4 8H18z"/>',
    r: '<path d="M18 10h7v7h4v-7h6v7h4v-7h7v15l-7 5v16H25V30l-7-5z"/><path d="M23 25h18M23 46h18l5 8H18z"/>',
    n: '<path d="m21 46 3-11 12-11-10 3-9-1 3-10 7-5 1-7 8 6c13 2 16 16 10 29l-4 7z"/><path d="m20 19 8 1M35 15l-2 2M22 46h20l4 8H18z"/>',
    b: '<path d="M32 7c-3 6-12 12-12 20 0 6 5 9 12 9s12-3 12-9c0-8-9-14-12-20z"/><path d="m35 17-7 9M28 36l-5 10h18l-5-10M22 46h20l4 8H18z"/>',
    q: '<path d="m18 18 6 9 8-15 8 15 6-9-6 23H24z"/><circle cx="17" cy="15" r="3"/><circle cx="32" cy="9" r="3"/><circle cx="47" cy="15" r="3"/><path d="M24 41h16l2 5H22zM22 46h20l4 8H18z"/>',
    k: '<path d="M32 5v12M27 10h10" fill="none" stroke-width="4"/><path d="M32 20c-9-9-20 0-13 12l6 9h14l6-9c7-12-4-21-13-12z"/><path d="M24 41h16l2 5H22zM22 46h20l4 8H18zM32 21v12"/>'
  };
  const pieceSvg = (type, color) => `<svg class="chess-piece chess-piece-${color === 'w' ? 'white' : 'black'}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${shapes[type]}</svg>`;

  let mode = 'computer';
  let selected = null;
  let flipped = false;
  let focusSquare = 'e2';
  let pendingPromotion = null;
  let feedback = '';
  let engine = null;
  let engineReady = false;
  let engineError = false;
  let searchFen = null;
  let engineTimer;
  let searchTimer;

  const squareButtons = new Map();
  for (let rank = 8; rank >= 1; rank -= 1) {
    for (let file = 0; file < 8; file += 1) {
      const square = `${files[file]}${rank}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.square = square;
      button.className = `chess-square${(file + rank) % 2 === 1 ? ' is-dark' : ''}`;
      squareButtons.set(square, button);
    }
  }

  const stopEngine = () => {
    clearTimeout(engineTimer);
    clearTimeout(searchTimer);
    if (engine) engine.terminate();
    engine = null;
    engineReady = false;
    searchFen = null;
  };

  const gameStatus = () => {
    if (game.isCheckmate()) return `${colors[game.turn() === 'w' ? 'b' : 'w']} wins by checkmate.`;
    if (game.isStalemate()) return 'Draw by stalemate.';
    if (game.isThreefoldRepetition()) return 'Draw by threefold repetition.';
    if (game.isInsufficientMaterial()) return 'Draw — insufficient material.';
    if (game.isDrawByFiftyMoves()) return 'Draw by the fifty-move rule.';
    if (mode === 'computer' && engineError) return 'Computer unavailable. Retry or choose 2 Players.';
    if (feedback) return feedback;
    if (mode === 'computer' && game.turn() === 'b') {
      return engineReady ? 'Computer is thinking…' : 'Preparing computer…';
    }
    return `${colors[game.turn()]} to play${game.isCheck() ? ' · Check' : ''}`;
  };

  const render = () => {
    const order = [...squareButtons.keys()];
    if (flipped) order.reverse();
    order.forEach((square, index) => {
      const button = squareButtons.get(square);
      const piece = game.get(square);
      button.innerHTML = piece ? pieceSvg(piece.type, piece.color) : '';
      button.setAttribute('aria-label', `${square}, ${piece ? `${colors[piece.color]} ${names[piece.type]}` : 'empty'}`);
      button.setAttribute('aria-pressed', String(selected === square));
      button.tabIndex = square === focusSquare ? 0 : -1;
      if (index % 8 === 0) button.insertAdjacentHTML('beforeend', `<span class="chess-coordinate chess-rank" aria-hidden="true">${square[1]}</span>`);
      if (index >= 56) button.insertAdjacentHTML('beforeend', `<span class="chess-coordinate chess-file" aria-hidden="true">${square[0]}</span>`);
      // Keep existing buttons in place so selecting a piece preserves keyboard focus.
      if (board.children[index] !== button) board.appendChild(button);
    });
    const message = gameStatus();
    if (status.textContent !== message) status.textContent = message;
    undoButton.disabled = game.history().length === 0;
    retryButton.hidden = mode !== 'computer' || !engineError;
    modes.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.chessMode === mode)));
    document.querySelector('#chessModeNote').textContent = mode === 'computer'
      ? 'You play White. The computer plays Black.' : 'Two players, one board. Take turns on this device.';
    const topColor = flipped ? 'w' : 'b';
    const bottomColor = flipped ? 'b' : 'w';
    const playerName = color => mode === 'computer' ? (color === 'w' ? 'You' : 'Computer') : `${colors[color]} player`;
    document.querySelector('#chessTopPlayer').textContent = playerName(topColor);
    document.querySelector('#chessBottomPlayer').textContent = playerName(bottomColor);
    document.querySelector('#chessOpponentBadge').textContent = mode === 'computer' && topColor === 'b' ? 'Hard' : colors[topColor];
    document.querySelector('#chessBottomColor').textContent = mode === 'computer' && bottomColor === 'b' ? 'Hard' : colors[bottomColor];
    panel.querySelectorAll('.chess-player-disc').forEach((disc, index) => {
      disc.className = `chess-player-disc chess-player-${(index === 0 ? topColor : bottomColor) === 'w' ? 'white' : 'black'}`;
    });
  };

  const engineFailed = () => {
    stopEngine();
    engineError = true;
    render();
  };

  const requestComputer = () => {
    if (mode !== 'computer' || panel.hidden || game.isGameOver() || game.turn() !== 'b' || engineError || searchFen) return;
    if (!engineReady) {
      startEngine();
      render();
      return;
    }
    searchFen = game.fen();
    // Send the full position history internally so the engine recognizes repetition.
    // Engine analysis, candidate moves, and history are never rendered in the UI.
    const moves = game.history({ verbose: true }).map(move => move.from + move.to + (move.promotion || ''));
    engine.postMessage(`position startpos moves ${moves.join(' ')}`);
    engine.postMessage('go movetime 2500');
    searchTimer = setTimeout(engineFailed, 15000);
    render();
  };

  const startEngine = () => {
    if (engine || engineError || mode !== 'computer' || panel.hidden) return;
    try {
      const worker = new Worker(new URL('./vendor/stockfish/stockfish-19-lite-single.js', import.meta.url));
      engine = worker;
      engineTimer = setTimeout(engineFailed, 30000);
      worker.onerror = event => {
        event.preventDefault();
        if (worker === engine) engineFailed();
      };
      worker.onmessageerror = () => { if (worker === engine) engineFailed(); };
      worker.onmessage = event => {
        if (worker !== engine || typeof event.data !== 'string') return;
        for (const line of event.data.split('\n')) {
          if (line.trim() === 'uciok') {
            worker.postMessage('setoption name Hash value 32');
            worker.postMessage('setoption name Skill Level value 20');
            worker.postMessage('setoption name UCI_LimitStrength value false');
            worker.postMessage('ucinewgame');
            worker.postMessage('isready');
          } else if (line.trim() === 'readyok') {
            clearTimeout(engineTimer);
            engineReady = true;
            render();
            requestComputer();
          } else if (line.startsWith('bestmove ') && searchFen) {
            clearTimeout(searchTimer);
            const expectedFen = searchFen;
            searchFen = null;
            if (game.fen() !== expectedFen || game.turn() !== 'b' || mode !== 'computer') continue;
            const match = /^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/.exec(line);
            if (!match) { engineFailed(); return; }
            try {
              game.move({ from: match[1], to: match[2], ...(match[3] ? { promotion: match[3] } : {}) });
              feedback = '';
              render();
            } catch {
              engineFailed();
            }
          }
        }
      };
      worker.postMessage('uci');
    } catch {
      engineFailed();
    }
  };

  const closePromotion = () => {
    pendingPromotion = null;
    if (promotionDialog.open) promotionDialog.close();
  };

  const commitMove = move => {
    try {
      game.move(move);
    } catch {
      feedback = 'That move is not legal. Choose another square.';
      render();
      return;
    }
    selected = null;
    feedback = '';
    closePromotion();
    render();
    requestComputer();
  };

  const selectSquare = square => {
    if (game.isGameOver() || pendingPromotion || (mode === 'computer' && game.turn() === 'b')) return;
    feedback = '';
    const piece = game.get(square);
    if (selected === square) {
      selected = null;
    } else if (piece?.color === game.turn()) {
      selected = square;
    } else if (selected) {
      const candidates = game.moves({ square: selected, verbose: true }).filter(move => move.to === square);
      if (candidates.length && candidates[0].promotion) {
        pendingPromotion = { from: selected, to: square };
        promotionDialog.querySelectorAll('[data-promote]').forEach(button => {
          const type = button.dataset.promote;
          button.innerHTML = `${pieceSvg(type, game.turn())}<span>${names[type][0].toUpperCase() + names[type].slice(1)}</span>`;
        });
        promotionDialog.showModal();
      } else if (candidates.length) {
        commitMove({ from: selected, to: square });
        return;
      } else {
        feedback = 'That move is not legal. Choose another square.';
      }
    }
    render();
  };

  const newGame = () => {
    stopEngine();
    closePromotion();
    game.reset();
    selected = null;
    feedback = '';
    engineError = false;
    render();
    startEngine();
  };

  board.addEventListener('click', event => {
    const button = event.target.closest('[data-square]');
    if (button) selectSquare(button.dataset.square);
  });
  board.addEventListener('focusin', event => {
    const button = event.target.closest('[data-square]');
    if (!button) return;
    focusSquare = button.dataset.square;
    squareButtons.forEach((squareButton, square) => { squareButton.tabIndex = square === focusSquare ? 0 : -1; });
  });
  board.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      selected = null;
      feedback = '';
      render();
      return;
    }
    const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    const buttons = [...board.children];
    const index = buttons.indexOf(event.target.closest('[data-square]'));
    const next = index + offsets[event.key];
    if (index < 0 || next < 0 || next >= 64) return;
    if (Math.abs(offsets[event.key]) === 1 && Math.floor(index / 8) !== Math.floor(next / 8)) return;
    buttons[next].focus();
  });

  modes.forEach(button => button.addEventListener('click', () => {
    if (mode === button.dataset.chessMode) return;
    mode = button.dataset.chessMode;
    newGame();
  }));
  document.querySelector('#chessNew').addEventListener('click', newGame);
  undoButton.addEventListener('click', () => {
    stopEngine();
    closePromotion();
    const history = game.history({ verbose: true });
    const count = mode === 'computer' && history.at(-1)?.color === 'b' ? 2 : 1;
    for (let i = 0; i < count; i += 1) game.undo();
    selected = null;
    feedback = '';
    engineError = false;
    render();
    startEngine();
  });
  document.querySelector('#chessFlip').addEventListener('click', () => {
    flipped = !flipped;
    render();
  });
  retryButton.addEventListener('click', () => {
    engineError = false;
    startEngine();
    render();
  });
  promotionDialog.querySelectorAll('[data-promote]').forEach(button => button.addEventListener('click', () => {
    if (pendingPromotion) commitMove({ ...pendingPromotion, promotion: button.dataset.promote });
  }));
  document.querySelector('#chessPromotionCancel').addEventListener('click', () => { closePromotion(); render(); });
  promotionDialog.addEventListener('cancel', () => { pendingPromotion = null; });

  new MutationObserver(() => {
    if (panel.hidden) {
      stopEngine();
      closePromotion();
      selected = null;
    } else {
      startEngine();
      requestComputer();
    }
    render();
  }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('pagehide', stopEngine);
  window.addEventListener('pageshow', () => { if (!panel.hidden) { startEngine(); requestComputer(); } });
  render();
  if (!panel.hidden) startEngine();
}
