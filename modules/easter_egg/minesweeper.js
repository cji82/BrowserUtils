/**
 * 지뢰찾기
 * 난이도: 쉬움 9×9 10개 / 보통 12×12 20개 / 어려움 16×16 40개
 */

const PRESETS = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 12, cols: 12, mines: 20 },
  hard: { rows: 16, cols: 16, mines: 40 }
};
let grid = [];
let revealed = [];
let flagged = [];
let rows = 9, cols = 9, mineCount = 10;
let gameOver = false;
let initialized = false;

function getDifficulty() {
  const el = document.querySelector('input[name="minesweeper-diff"]:checked');
  return (el && el.value) || 'easy';
}

function index(r, c) { return r * cols + c; }
function rc(i) { return [Math.floor(i / cols), i % cols]; }

function placeMines(safeIndex) {
  const total = rows * cols;
  const indices = [];
  for (let i = 0; i < total; i++) if (i !== safeIndex) indices.push(i);
  for (let k = indices.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [indices[k], indices[j]] = [indices[j], indices[k]];
  }
  const mineSet = new Set(indices.slice(0, mineCount));
  grid = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = index(r, c);
      grid[i] = mineSet.has(i) ? -1 : 0;
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
    const i = index(r, c);
    if (grid[i] === -1) continue;
    let n = 0;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[index(nr, nc)] === -1) n++;
      }
    grid[i] = n;
  }
  }
}

function revealCell(i) {
  if (gameOver || revealed[i] || flagged[i]) return;
  if (grid.length === 0) {
    placeMines(i);
    revealed = [];
    flagged = Array(rows * cols).fill(false);
  }
  if (grid[i] === -1) {
    gameOver = true;
    revealed[i] = true;
    render();
    showGameOverOverlay();
    return;
  }
  const stack = [i];
  while (stack.length) {
    const idx = stack.pop();
    if (revealed[idx]) continue;
    revealed[idx] = true;
    if (grid[idx] === 0) {
      const [r, c] = rc(idx);
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const ni = index(nr, nc);
            if (!revealed[ni] && !flagged[ni]) stack.push(ni);
          }
        }
    }
  }
  render();
  checkWin();
}

function toggleFlag(i) {
  if (gameOver || revealed[i] || grid.length === 0) return;
  flagged[i] = !flagged[i];
  render();
}

function checkWin() {
  const total = rows * cols;
  let revealedSafe = 0;
  for (let i = 0; i < total; i++) if (revealed[i] && grid[i] !== -1) revealedSafe++;
  if (revealedSafe === total - mineCount) {
    gameOver = true;
    showResultOverlay('승리! \uD83C\uDF89');
  }
}

function render() {
  const container = document.getElementById('minesweeper-container');
  if (!container) return;
  const inner = container.querySelector('.minesweeper-grid') || document.createElement('div');
  inner.className = 'minesweeper-grid';
  inner.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  inner.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
  inner.innerHTML = '';
  const total = rows * cols;
  for (let i = 0; i < total; i++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'minesweeper-cell';
    cell.dataset.index = String(i);
    if (revealed[i]) {
      cell.classList.add('revealed');
      if (grid[i] === -1) {
        cell.classList.add('mine');
        cell.textContent = '💣';
      } else if (grid[i] === 0) {
        cell.classList.add('empty');
      } else {
        cell.textContent = grid[i];
      }
    } else {
      if (flagged[i]) {
        cell.classList.add('flagged');
        cell.textContent = '🚩';
      }
      cell.addEventListener('click', (e) => {
        if (document.getElementById('minesweeper-flag')?.checked) toggleFlag(i);
        else revealCell(i);
      });
    }
    inner.appendChild(cell);
  }
  if (!container.querySelector('.minesweeper-grid')) container.appendChild(inner);
  var overlay = document.getElementById('minesweeper-overlay');
  if (overlay) overlay.style.display = gameOver ? '' : 'none';
}

function showGameOverOverlay() {
  showResultOverlay('지뢰! \uD83D\uDCA5');
}

function showResultOverlay(text) {
  var overlay = document.getElementById('minesweeper-overlay');
  if (!overlay) return;
  overlay.innerHTML = '';
  var p = document.createElement('p');
  p.className = 'minesweeper-overlay-msg';
  p.textContent = text;
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'minesweeper-overlay-btn';
  btn.textContent = '새 게임';
  btn.addEventListener('click', function() { newGame(); });
  overlay.appendChild(p);
  overlay.appendChild(btn);
  overlay.style.display = '';
}

function newGame() {
  const preset = PRESETS[getDifficulty()] || PRESETS.easy;
  rows = preset.rows;
  cols = preset.cols;
  mineCount = preset.mines;
  grid = [];
  revealed = [];
  flagged = Array(rows * cols).fill(false);
  gameOver = false;
  var overlay = document.getElementById('minesweeper-overlay');
  if (overlay) overlay.style.display = 'none';
  render();
}

function init(api) {
  const safeOn = api && api.safeOn ? api.safeOn : (id, ev, fn) => { const e = document.getElementById(id); if (e) e.addEventListener(ev, fn); };
  if (initialized) return;
  initialized = true;
  safeOn('minesweeper-new', 'click', () => newGame());
  newGame();
}

export const MinesweeperGame = { featureId: 'minesweeper', init };
