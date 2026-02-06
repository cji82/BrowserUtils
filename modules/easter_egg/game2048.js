/**
 * 2048 게임
 * 방향키로 타일을 밀어 같은 숫자를 합치고 2048을 만드세요.
 */

const SIZE = 4;
let grid = [];
let score = 0;
let gameOver = false;
let won = false;
let initialized = false;

function emptyGrid() {
  return Array(SIZE * SIZE).fill(0);
}

function getEmptyIndices() {
  const out = [];
  for (let i = 0; i < SIZE * SIZE; i++) if (grid[i] === 0) out.push(i);
  return out;
}

function spawnOne() {
  const empty = getEmptyIndices();
  if (empty.length === 0) return;
  const i = empty[Math.floor(Math.random() * empty.length)];
  grid[i] = Math.random() < 0.9 ? 2 : 4;
}

function mergeLine(line) {
  const filtered = line.filter(function (x) { return x !== 0; });
  const out = [];
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      out.push(filtered[i] * 2);
      score += filtered[i] * 2;
      i += 2;
    } else {
      out.push(filtered[i]);
      i += 1;
    }
  }
  while (out.length < SIZE) out.push(0);
  return out;
}

function move(dir) {
  if (gameOver) return;
  let changed = false;
  if (dir === 0) {
    for (let c = 0; c < SIZE; c++) {
      const col = [grid[c], grid[4 + c], grid[8 + c], grid[12 + c]];
      const merged = mergeLine(col);
      for (let r = 0; r < SIZE; r++) {
        const idx = r * 4 + c;
        if (grid[idx] !== merged[r]) changed = true;
        grid[idx] = merged[r];
      }
    }
  } else if (dir === 1) {
    for (let r = 0; r < SIZE; r++) {
      const row = [grid[r * 4 + 3], grid[r * 4 + 2], grid[r * 4 + 1], grid[r * 4]];
      const merged = mergeLine(row);
      for (let c = 0; c < SIZE; c++) {
        const idx = r * 4 + (3 - c);
        if (grid[idx] !== merged[c]) changed = true;
        grid[idx] = merged[c];
      }
    }
  } else if (dir === 2) {
    for (let c = 0; c < SIZE; c++) {
      const col = [grid[12 + c], grid[8 + c], grid[4 + c], grid[c]];
      const merged = mergeLine(col);
      for (let r = 0; r < SIZE; r++) {
        const idx = (3 - r) * 4 + c;
        if (grid[idx] !== merged[r]) changed = true;
        grid[idx] = merged[r];
      }
    }
  } else {
    for (let r = 0; r < SIZE; r++) {
      const row = [grid[r * 4], grid[r * 4 + 1], grid[r * 4 + 2], grid[r * 4 + 3]];
      const merged = mergeLine(row);
      for (let c = 0; c < SIZE; c++) {
        const idx = r * 4 + c;
        if (grid[idx] !== merged[c]) changed = true;
        grid[idx] = merged[c];
      }
    }
  }
  if (changed) {
    spawnOne();
    render();
    checkEnd();
    saveState();
  }
}

function canMove() {
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (grid[i] === 0) return true;
    const r = Math.floor(i / 4), c = i % 4;
    if (c < 3 && grid[i] === grid[i + 1]) return true;
    if (r < 3 && grid[i] === grid[i + 4]) return true;
  }
  return false;
}

function checkEnd() {
  if (getEmptyIndices().length > 0) return;
  if (!canMove()) gameOver = true;
}

function render() {
  const container = document.getElementById('game2048-container');
  const scoreEl = document.getElementById('game2048-score');
  const overlay = document.getElementById('game2048-overlay');
  if (!container) return;
  if (scoreEl) scoreEl.textContent = score;
  container.innerHTML = '';
  for (let i = 0; i < SIZE * SIZE; i++) {
    const cell = document.createElement('div');
    cell.className = 'g2048-cell';
    const val = grid[i];
    if (val > 0) {
      const tile = document.createElement('div');
      tile.className = 'g2048-tile g2048-tile-' + val;
      tile.textContent = val;
      cell.appendChild(tile);
    }
    container.appendChild(cell);
  }
  if (overlay) {
    overlay.style.display = 'none';
    overlay.innerHTML = '';
    if (gameOver) {
      overlay.style.display = '';
      var p = document.createElement('p');
      p.className = 'g2048-overlay-msg';
      p.textContent = '게임 오버';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'g2048-overlay-btn';
      btn.textContent = '다시 하기';
      btn.addEventListener('click', function () { newGame(); });
      overlay.appendChild(p);
      overlay.appendChild(btn);
    } else if (won === false && grid.some(function (v) { return v === 2048; })) {
      won = true;
      overlay.style.display = '';
      var p2 = document.createElement('p');
      p2.className = 'g2048-overlay-msg';
      p2.textContent = '2048 달성! \uD83C\uDF89';
      var btn2 = document.createElement('button');
      btn2.type = 'button';
      btn2.className = 'g2048-overlay-btn';
      btn2.textContent = '계속하기';
      btn2.addEventListener('click', function () { overlay.style.display = 'none'; overlay.innerHTML = ''; });
      overlay.appendChild(p2);
      overlay.appendChild(btn2);
    }
  }
}

function newGame() {
  grid = emptyGrid();
  score = 0;
  gameOver = false;
  won = false;
  spawnOne();
  spawnOne();
  render();
  saveState();
}

function saveState() {
  chrome.storage.local.set({
    game2048Grid: JSON.stringify(grid),
    game2048Score: score
  });
}

function loadState(cb) {
  chrome.storage.local.get(['game2048Grid', 'game2048Score'], function (data) {
    if (data.game2048Grid) {
      try {
        grid = JSON.parse(data.game2048Grid);
        score = data.game2048Score || 0;
        if (grid.length === SIZE * SIZE) {
          gameOver = !canMove();
          cb(true);
          return;
        }
      } catch (e) {}
    }
    cb(false);
  });
}

function onKey(e) {
  const container = document.getElementById('game2048-container');
  if (!container || !container.closest('.feature-view.active')) return;
  let dir = -1;
  if (e.key === 'ArrowUp') dir = 0;
  else if (e.key === 'ArrowRight') dir = 1;
  else if (e.key === 'ArrowDown') dir = 2;
  else if (e.key === 'ArrowLeft') dir = 3;
  if (dir >= 0) {
    e.preventDefault();
    move(dir);
  }
}

function init(api) {
  var safeOn = api && api.safeOn ? api.safeOn : function (id, ev, fn) { var el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
  if (initialized) return;
  initialized = true;
  document.addEventListener('keydown', onKey);
  safeOn('game2048-new', 'click', function () { newGame(); });
  loadState(function (restored) {
    if (restored && grid.some(function (v) { return v > 0; })) render();
    else newGame();
  });
}

export const Game2048 = { featureId: 'game2048', init };
