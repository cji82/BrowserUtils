/**
 * 15 퍼즐 (슬라이딩 퍼즐)
 * 난이도: 셔플 횟수 (쉬움/보통/어려움)
 */

const SHUFFLE = { easy: 20, medium: 50, hard: 100 };
let tiles = [];
let emptyIndex = 15;
let initialized = false;

function shuffle(arr, count) {
  const a = [...arr];
  let empty = a.indexOf(0);
  for (let n = 0; n < count; n++) {
    const row = Math.floor(empty / 4);
    const col = empty % 4;
    const moves = [];
    if (row > 0) moves.push(empty - 4);
    if (row < 3) moves.push(empty + 4);
    if (col > 0) moves.push(empty - 1);
    if (col < 3) moves.push(empty + 1);
    const next = moves[Math.floor(Math.random() * moves.length)];
    [a[empty], a[next]] = [a[next], a[empty]];
    empty = next;
  }
  return a;
}

function getDifficulty() {
  const el = document.querySelector('input[name="puzzle15-diff"]:checked');
  return (el && el.value) || 'medium';
}

function render() {
  const container = document.getElementById('puzzle15-container');
  const msg = document.getElementById('puzzle15-message');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < 16; i++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'puzzle15-tile';
    cell.dataset.index = String(i);
    if (tiles[i] === 0) {
      cell.classList.add('empty');
      cell.textContent = '';
    } else {
      cell.textContent = tiles[i];
      cell.addEventListener('click', () => move(i));
    }
    container.appendChild(cell);
  }
  if (msg) msg.textContent = '';
  checkWin();
}

function move(i) {
  if (tiles[i] === 0) return;
  const row = Math.floor(i / 4);
  const col = i % 4;
  const erow = Math.floor(emptyIndex / 4);
  const ecol = emptyIndex % 4;
  const sameRow = row === erow;
  const sameCol = col === ecol;
  if (!sameRow && !sameCol) return;
  if (sameRow) {
    if (i > emptyIndex) {
      for (let j = emptyIndex; j < i; j++) tiles[j] = tiles[j + 1];
    } else {
      for (let j = emptyIndex; j > i; j--) tiles[j] = tiles[j - 1];
    }
  } else {
    if (i > emptyIndex) {
      for (let j = emptyIndex; j < i; j += 4) tiles[j] = tiles[j + 4];
    } else {
      for (let j = emptyIndex; j > i; j -= 4) tiles[j] = tiles[j - 4];
    }
  }
  tiles[i] = 0;
  emptyIndex = i;
  render();
  saveState();
}

function checkWin() {
  const win = tiles.slice(0, 15).every((v, i) => v === i + 1) && tiles[15] === 0;
  const msg = document.getElementById('puzzle15-message');
  if (win && msg) msg.innerHTML = '완성! <img class="emoji-icon" src="img/emoji/1f389.svg" alt="">';
}

function saveState() {
  chrome.storage.local.set({ puzzle15State: tiles.join(','), puzzle15Empty: emptyIndex });
}

function loadState(cb) {
  chrome.storage.local.get(['puzzle15State', 'puzzle15Empty'], (data) => {
    if (data.puzzle15State && data.puzzle15Empty != null) {
      tiles = data.puzzle15State.split(',').map(Number);
      emptyIndex = data.puzzle15Empty;
      cb(true);
    } else cb(false);
  });
}

function newGame() {
  const diff = getDifficulty();
  const count = SHUFFLE[diff] || SHUFFLE.medium;
  tiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
  emptyIndex = 15;
  tiles = shuffle(tiles, count);
  emptyIndex = tiles.indexOf(0);
  render();
  saveState();
}

function init(api) {
  const safeOn = api && api.safeOn ? api.safeOn : (id, ev, fn) => { const e = document.getElementById(id); if (e) e.addEventListener(ev, fn); };
  if (initialized) return;
  initialized = true;
  safeOn('puzzle15-new', 'click', () => newGame());
  loadState((restored) => {
    if (restored) render();
    else newGame();
  });
}

export const Puzzle15Game = { featureId: 'puzzle15', init };
