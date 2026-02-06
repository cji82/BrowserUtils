/**
 * 삼목 (Tic-tac-toe) vs AI
 * 난이도: 쉬움(랜덤) / 어려움(미니맥스)
 */

let board = [];
let human = 'X';
let ai = 'O';
let currentTurn = 'X';
let initialized = false;

function getDifficulty() {
  const el = document.querySelector('input[name="tictactoe-diff"]:checked');
  return (el && el.value) || 'easy';
}

function checkWin(b) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a, i, j] of lines) {
    if (b[a] && b[a] === b[i] && b[a] === b[j]) return b[a];
  }
  return b.every(c => c) ? 'T' : null;
}

function minimax(b, isMax) {
  const win = checkWin(b);
  if (win === ai) return 1;
  if (win === human) return -1;
  if (win === 'T') return 0;
  let best = isMax ? -2 : 2;
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = isMax ? ai : human;
    const score = minimax(b, !isMax);
    b[i] = '';
    if (isMax) best = Math.max(best, score);
    else best = Math.min(best, score);
  }
  return best;
}

function aiMove() {
  const diff = getDifficulty();
  let empty = board.map((c, i) => c ? -1 : i).filter(i => i >= 0);
  if (empty.length === 0) return;
  let move;
  if (diff === 'hard') {
    let bestScore = -2;
    for (const i of empty) {
      board[i] = ai;
      const score = minimax([...board], false);
      board[i] = '';
      if (score > bestScore) { bestScore = score; move = i; }
    }
  } else {
    move = empty[Math.floor(Math.random() * empty.length)];
  }
  if (move != null) {
    board[move] = ai;
    currentTurn = human;
    render();
    const win = checkWin(board);
    const msg = document.getElementById('tictactoe-message');
    if (msg) {
      if (win === ai) msg.textContent = 'AI 승리!';
      else if (win === 'T') msg.textContent = '무승부!';
    }
  }
}

function render() {
  const container = document.getElementById('tictactoe-container');
  const msg = document.getElementById('tictactoe-message');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'tictactoe-cell';
    cell.dataset.index = String(i);
    cell.textContent = board[i] || '';
    if (board[i]) cell.classList.add('taken');
    else {
      cell.addEventListener('click', () => humanMove(i));
    }
    container.appendChild(cell);
  }
}

function humanMove(i) {
  if (board[i] || currentTurn !== human) return;
  board[i] = human;
  currentTurn = ai;
  const win = checkWin(board);
  const msg = document.getElementById('tictactoe-message');
  if (win) {
    render();
    if (msg) msg.innerHTML = win === human ? '당신 승리! <img class="emoji-icon" src="img/emoji/1f389.svg" alt="">' : win === 'T' ? '무승부!' : '';
    return;
  }
  render();
  setTimeout(() => aiMove(), 300);
}

function newGame() {
  board = Array(9).fill('');
  currentTurn = 'X';
  render();
  const msg = document.getElementById('tictactoe-message');
  if (msg) msg.textContent = '';
}

function init(api) {
  const safeOn = api && api.safeOn ? api.safeOn : (id, ev, fn) => { const e = document.getElementById(id); if (e) e.addEventListener(ev, fn); };
  if (initialized) return;
  initialized = true;
  safeOn('tictactoe-new', 'click', () => newGame());
  newGame();
}

export const TictactoeGame = { featureId: 'tictactoe', init };
