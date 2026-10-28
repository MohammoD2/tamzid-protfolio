import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

// Exercise the actual controller with a small DOM/worker harness. No production
// debug hooks or remote chess services are needed.
export async function runChessChecks() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const { Chess } = await import(pathToFileURL(resolve(root, 'js/vendor/chess/chess.js')).href);
  const source = await readFile(resolve(root, 'js/chess-game.js'), 'utf8');
  const controller = source.replace(/^import[^\n]+\n/, '')
    .replaceAll('import.meta.url', '"http://localhost/js/chess-game.js"')
    .replace(/}\s*$/, 'globalThis.controller = { game, render, selectSquare, requestComputer, get mode() { return mode; }, get pendingPromotion() { return pendingPromotion; } };\n}');
  const checks = [];

  class Element {
    constructor() {
      this.children = [];
      this.dataset = {};
      this.attributes = {};
      this.listeners = {};
      this.hidden = false;
      this.textContent = '';
      this.innerHTML = '';
      this.open = false;
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    appendChild(child) {
      const oldIndex = this.children.indexOf(child);
      if (oldIndex >= 0) this.children.splice(oldIndex, 1);
      this.children.push(child);
    }
    insertAdjacentHTML(_, html) { this.innerHTML += html; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    click() { this.listeners.click?.({ target: this }); }
    focus() { this.focused = true; }
  }

  const makeHarness = () => {
    const elements = new Map();
    const get = selector => {
      if (!elements.has(selector)) elements.set(selector, new Element());
      return elements.get(selector);
    };
    const modes = ['computer', 'local'].map(mode => Object.assign(new Element(), { dataset: { chessMode: mode } }));
    const promotions = ['q', 'r', 'b', 'n'].map(type => Object.assign(new Element(), { dataset: { promote: type } }));
    const discs = [new Element(), new Element()];
    get('#chessGamePanel').querySelectorAll = () => discs;
    get('#chessPromotion').querySelectorAll = () => promotions;
    const workers = [];
    class FakeWorker {
      constructor() { this.commands = []; workers.push(this); }
      postMessage(command) { this.commands.push(command); }
      terminate() { this.terminated = true; }
      reply(line) { this.onmessage?.({ data: line }); }
      ready() { this.reply('uciok'); this.reply('readyok'); }
    }
    const sandbox = {
      Chess, URL, Worker: FakeWorker,
      document: { querySelector: get, querySelectorAll: () => modes, createElement: () => new Element() },
      window: { addEventListener() {} }, MutationObserver: class { observe() {} },
      setTimeout: () => 1, clearTimeout() {}
    };
    vm.runInNewContext(controller, sandbox);
    return { ...sandbox.controller, controller: sandbox.controller, get, workers, modes, promotions,
      move: (from, to) => { sandbox.controller.selectSquare(from); sandbox.controller.selectSquare(to); } };
  };

  const h = makeHarness();
  const initialFen = h.game.fen();
  assert.equal(h.get('#chessBoard').children.length, 64);
  assert.equal(h.modes[0].attributes['aria-pressed'], 'true');
  assert.equal(h.get('#chessUndo').disabled, true);
  assert.equal(h.get('#chessBoard').children[56].dataset.square, 'a1');
  assert.match(h.get('#chessBoard').children[56].className, /is-dark/);
  h.workers[0].ready();
  assert(h.workers[0].commands.includes('setoption name Skill Level value 20'));
  assert(h.workers[0].commands.includes('setoption name UCI_LimitStrength value false'));
  checks.push('64 squares, correct orientation, hard computer mode by default');

  h.move('e2', 'e4');
  const firstWorker = h.workers[0];
  assert(firstWorker.commands.includes('position startpos moves e2e4'));
  assert(firstWorker.commands.includes('go movetime 2500'));
  firstWorker.reply('info depth 18 score cp 20 pv e7e5 g1f3');
  assert.equal(h.get('#chessStatus').textContent, 'Computer is thinking…');
  firstWorker.reply('bestmove e7e5 ponder g1f3');
  assert.equal(h.game.history().length, 2);
  assert.equal(h.get('#chessStatus').textContent, 'White to play');
  assert(h.get('#chessBoard').children.every(square => /^chess-square(?: is-dark)?$/.test(square.className)));
  h.get('#chessUndo').click();
  assert.equal(h.game.fen(), initialFen);
  assert(firstWorker.terminated);
  firstWorker.reply('bestmove d7d5');
  assert.equal(h.game.fen(), initialFen);
  checks.push('legal computer reply, private analysis, full-turn undo, stale response rejection');

  h.workers.at(-1).ready();
  h.move('d2', 'd4');
  const searching = h.workers.at(-1);
  h.get('#chessUndo').click();
  searching.reply('bestmove d7d5');
  assert.equal(h.game.fen(), initialFen);
  checks.push('undo cancels an in-progress computer search');

  h.workers.at(-1).ready();
  h.move('e2', 'e4');
  const beforeNew = h.workers.at(-1);
  h.get('#chessNew').click();
  beforeNew.reply('bestmove e7e5');
  assert.equal(h.game.fen(), initialFen);
  h.workers.at(-1).ready();
  h.move('e2', 'e4');
  const beforeMode = h.workers.at(-1);
  h.modes[1].click();
  beforeMode.reply('bestmove e7e5');
  assert.equal(h.game.fen(), initialFen);
  assert(beforeMode.terminated);
  assert.equal(h.controller.mode, 'local');
  checks.push('new game and mode changes cancel pending engine responses');

  h.move('e2', 'e4');
  h.move('e7', 'e5');
  assert.equal(h.game.history().length, 2);
  h.get('#chessUndo').click();
  assert.equal(h.game.history().length, 1);
  assert.equal(h.game.turn(), 'b');
  h.get('#chessUndo').click();
  assert.equal(h.game.fen(), initialFen);
  checks.push('two-player turns and single-move undo');

  h.game.load('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  h.move('e1', 'g1');
  assert.equal(h.game.get('g1').type, 'k');
  assert.equal(h.game.get('f1').type, 'r');
  h.get('#chessUndo').click();
  assert.equal(h.game.get('h1').type, 'r');
  assert(h.game.fen().includes('KQkq'));
  h.game.load('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
  h.move('e5', 'd6');
  assert.equal(h.game.get('d5'), undefined);
  assert.equal(h.game.get('d6').type, 'p');
  h.get('#chessUndo').click();
  assert.equal(h.game.get('d5').color, 'b');
  assert.equal(h.game.get('e5').color, 'w');
  checks.push('castling, en passant, and undo restore pieces and rights');

  h.game.load('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
  h.move('a7', 'a8');
  assert(h.get('#chessPromotion').open);
  assert.equal(h.game.get('a7').type, 'p');
  h.get('#chessPromotionCancel').click();
  assert.equal(h.controller.pendingPromotion, null);
  assert.equal(h.game.get('a7').type, 'p');
  h.controller.selectSquare('a8');
  h.promotions.find(button => button.dataset.promote === 'n').click();
  assert.equal(h.game.get('a8').type, 'n');
  assert.match(h.get('#chessStatus').textContent, /insufficient material/);
  h.get('#chessUndo').click();
  assert.equal(h.game.get('a7').type, 'p');
  checks.push('promotion dialog, cancellation, underpromotion, and undo');

  h.game.load('k3r3/8/8/8/8/8/4R3/4K3 w - - 0 1');
  const pinnedFen = h.game.fen();
  h.move('e2', 'f2');
  assert.equal(h.game.fen(), pinnedFen);
  assert.match(h.get('#chessStatus').textContent, /not legal/);
  h.get('#chessNew').click();
  ['f3', 'e5', 'g4', 'Qh4#'].forEach(move => h.game.move(move));
  h.controller.render();
  assert.equal(h.get('#chessStatus').textContent, 'Black wins by checkmate.');
  h.get('#chessUndo').click();
  assert(!h.game.isCheckmate());
  checks.push('king safety, checkmate detection, undo after game over');

  h.game.load('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  h.controller.render();
  assert.equal(h.get('#chessStatus').textContent, 'Draw by stalemate.');
  h.game.reset();
  ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8'].forEach(move => h.game.move(move));
  h.controller.render();
  assert.match(h.get('#chessStatus').textContent, /threefold/);
  h.game.load('4k3/8/8/8/8/8/8/R3K3 w - - 100 70');
  h.controller.render();
  assert.match(h.get('#chessStatus').textContent, /fifty-move/);
  checks.push('stalemate, repetition, insufficient material, fifty-move draws');

  h.get('#chessFlip').click();
  const flippedOrder = Array.from({ length: 64 }, (_, index) => `${'hgfedcba'[index % 8]}${Math.floor(index / 8) + 1}`);
  assert.deepEqual(h.get('#chessBoard').children.map(square => square.dataset.square), flippedOrder);
  h.modes[0].click();
  const broken = h.workers.at(-1);
  broken.onerror({ preventDefault() {} });
  assert.equal(h.get('#chessRetry').hidden, false);
  h.get('#chessRetry').click();
  assert.notEqual(h.workers.at(-1), broken);
  h.workers.at(-1).ready();
  assert.equal(h.get('#chessRetry').hidden, true);
  checks.push('board flipping and computer failure/retry');
  return checks;
}

if (typeof process !== 'undefined' && process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  console.log((await runChessChecks()).map(check => `PASS ${check}`).join('\n'));
}
