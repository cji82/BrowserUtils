/**
 * 스도쿠 게임 (이스터에그)
 * 랜덤 생성, 난이도, 실시간 충돌 표시, 저장/복원
 */

let currentSudokuSolution = '';
let sudokuInitialized = false;

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateSudokuSolution() {
  const grid = Array(81).fill(0);
  const row = (i) => Math.floor(i / 9);
  const col = (i) => i % 9;
  const boxStart = (i) => 27 * Math.floor(row(i) / 3) + 3 * Math.floor(col(i) / 3);
  function usedInRow(i, n) {
    const r = row(i);
    for (let c = 0; c < 9; c++) if (grid[r * 9 + c] === n) return true;
    return false;
  }
  function usedInCol(i, n) {
    const c = col(i);
    for (let r = 0; r < 9; r++) if (grid[r * 9 + c] === n) return true;
    return false;
  }
  function usedInBox(i, n) {
    const start = boxStart(i);
    for (let o = 0; o < 9; o++) {
      const idx = start + Math.floor(o / 3) * 9 + (o % 3);
      if (grid[idx] === n) return true;
    }
    return false;
  }
  function canPlace(i, n) {
    return !usedInRow(i, n) && !usedInCol(i, n) && !usedInBox(i, n);
  }
  function solve(idx) {
    if (idx >= 81) return true;
    if (grid[idx] !== 0) return solve(idx + 1);
    const candidates = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const n of candidates) {
      if (!canPlace(idx, n)) continue;
      grid[idx] = n;
      if (solve(idx + 1)) return true;
      grid[idx] = 0;
    }
    return false;
  }
  solve(0);
  return grid.join('');
}

function solutionToPuzzle(solution, removeCount) {
  const indices = shuffleArray(Array.from({ length: 81 }, (_, i) => i)).slice(0, removeCount);
  const arr = solution.split('');
  for (const i of indices) arr[i] = '0';
  return arr.join('');
}

function getSudokuRemoveCount(difficulty) {
  const ranges = { easy: [35, 42], medium: [42, 50], hard: [50, 58] };
  const [min, max] = ranges[difficulty] || ranges.medium;
  return min + Math.floor(Math.random() * (max - min));
}

function generateRandomSudoku(difficulty = 'medium') {
  const solution = generateSudokuSolution();
  const removeCount = getSudokuRemoveCount(difficulty);
  const puzzle = solutionToPuzzle(solution, removeCount);
  return { puzzle, solution };
}

function getSudokuCellsByIndex() {
  const grid = document.getElementById('sudoku-grid');
  if (!grid) return [];
  const cells = Array.from(grid.querySelectorAll('.sudoku-cell')).sort((a, b) => +(a.dataset.index) - +(b.dataset.index));
  return cells;
}

function getSudokuGridState() {
  const cells = getSudokuCellsByIndex();
  return cells.length === 81 ? cells.map(c => c.value || '0').join('') : '';
}

function highlightSudokuConflicts() {
  const cells = getSudokuCellsByIndex();
  if (cells.length !== 81) return;
  cells.forEach(c => c.classList.remove('conflict'));
  const row = (i) => Math.floor(i / 9);
  const col = (i) => i % 9;
  const boxStart = (i) => 27 * Math.floor(row(i) / 3) + 3 * Math.floor(col(i) / 3);
  const sameBox = (i, j) => boxStart(i) === boxStart(j);
  for (let i = 0; i < 81; i++) {
    const v = (cells[i].value || '').trim();
    if (!v) continue;
    const conflictIndices = new Set();
    for (let j = 0; j < 81; j++) {
      if (i === j) continue;
      const w = (cells[j].value || '').trim();
      if (w !== v) continue;
      if (row(i) === row(j) || col(i) === col(j) || sameBox(i, j)) {
        conflictIndices.add(i);
        conflictIndices.add(j);
      }
    }
    if (conflictIndices.size > 0) {
      conflictIndices.forEach(idx => cells[idx].classList.add('conflict'));
    }
  }
}

function checkSudoku() {
  const msg = document.getElementById('sudoku-message');
  const grid = document.getElementById('sudoku-grid');
  if (!grid || !msg) return;
  const state = getSudokuGridState();
  if (state.length !== 81) return;
  grid.querySelectorAll('.sudoku-cell').forEach(c => c.classList.remove('error', 'conflict'));
  if (state === currentSudokuSolution) {
    msg.innerHTML = '정답입니다! <img class="emoji-icon" src="img/emoji/1f389.svg" alt="">';
    msg.className = 'sudoku-message success';
    return;
  }
  msg.textContent = '틀린 칸이 있어요. 빨간 칸을 확인해 보세요.';
  msg.className = 'sudoku-message fail';
  for (let i = 0; i < 81; i++) {
    if (state[i] !== '0' && state[i] !== currentSudokuSolution[i]) {
      const cell = grid.querySelector('.sudoku-cell[data-index="' + i + '"]');
      if (cell && !cell.classList.contains('given')) cell.classList.add('error');
    }
  }
}

function trySudokuAutoCheck() {
  const state = getSudokuGridState();
  if (state.length !== 81 || state.includes('0')) return;
  checkSudoku();
}

function saveSudokuState() {
  const state = getSudokuGridState();
  if (state.length !== 81) return;
  chrome.storage.local.set({ sudokuState: state });
}

function buildSudokuGrid(puzzle, solution, restoreState) {
  currentSudokuSolution = solution;
  const grid = document.getElementById('sudoku-grid');
  const msg = document.getElementById('sudoku-message');
  const startBtn = document.getElementById('sudoku-start-btn');
  const newBtn = document.getElementById('sudoku-new');
  if (!grid) return;
  if (msg) { msg.textContent = ''; msg.className = 'sudoku-message'; }
  grid.innerHTML = '';
  for (let block = 0; block < 9; block++) {
    const blockDiv = document.createElement('div');
    blockDiv.className = 'sudoku-block';
    const startRow = Math.floor(block / 3) * 3;
    const startCol = (block % 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const i = (startRow + r) * 9 + (startCol + c);
        const cell = document.createElement('input');
        cell.type = 'text';
        cell.inputMode = 'numeric';
        cell.maxLength = 1;
        cell.className = 'sudoku-cell';
        cell.dataset.index = String(i);
        const p = puzzle[i];
        const isGiven = p !== '0' && p !== '';
        if (isGiven) {
          cell.value = p;
          cell.readOnly = true;
          cell.classList.add('given');
        } else {
          cell.classList.add('user');
          cell.addEventListener('input', (e) => {
            const v = e.target.value.replace(/\D/g, '');
            e.target.value = v.slice(-1);
            cell.classList.remove('error');
            highlightSudokuConflicts();
            trySudokuAutoCheck();
            saveSudokuState();
          });
        }
        blockDiv.appendChild(cell);
      }
    }
    grid.appendChild(blockDiv);
  }
  if (restoreState && restoreState.length === 81) {
    const cells = getSudokuCellsByIndex();
    cells.forEach((cell, i) => {
      const v = restoreState[i];
      if (v !== '0' && v !== '') cell.value = v;
    });
  }
  if (startBtn) startBtn.style.display = 'none';
  if (grid) grid.style.display = 'grid';
  if (newBtn) newBtn.style.display = 'inline-block';
  highlightSudokuConflicts();
}

function startSudokuGame() {
  const diffEl = document.querySelector('input[name="sudoku-diff"]:checked');
  const difficulty = (diffEl && diffEl.value) || 'medium';
  const item = generateRandomSudoku(difficulty);
  buildSudokuGrid(item.puzzle, item.solution);
  chrome.storage.local.set({
    sudokuActive: true,
    sudokuPuzzle: item.puzzle,
    sudokuSolution: item.solution,
    sudokuState: item.puzzle
  });
}

function resetSudokuToStart() {
  const grid = document.getElementById('sudoku-grid');
  const startBtn = document.getElementById('sudoku-start-btn');
  const newBtn = document.getElementById('sudoku-new');
  const msg = document.getElementById('sudoku-message');
  if (grid) { grid.innerHTML = ''; grid.style.display = 'none'; }
  if (startBtn) startBtn.style.display = 'block';
  if (newBtn) newBtn.style.display = 'none';
  if (msg) { msg.textContent = ''; msg.className = 'sudoku-message'; }
  chrome.storage.local.set({ sudokuActive: false });
}

function restoreSudokuGame() {
  chrome.storage.local.get(['sudokuActive', 'sudokuPuzzle', 'sudokuSolution', 'sudokuState'], (data) => {
    if (!data.sudokuActive || !data.sudokuPuzzle || !data.sudokuSolution) return;
    buildSudokuGrid(data.sudokuPuzzle, data.sudokuSolution, data.sudokuState);
  });
}

/**
 * 스도쿠 게임 초기화. 게임 탭에서 스도쿠 뷰가 열릴 때 호출.
 * @param {{ safeOn: (id: string, event: string, fn: () => void) => void }} api - popup의 safeOn
 */
function init(api) {
  const safeOn = api && api.safeOn ? api.safeOn : (id, event, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, fn);
  };
  if (sudokuInitialized) return;
  sudokuInitialized = true;
  safeOn('sudoku-start-btn', 'click', () => startSudokuGame());
  safeOn('sudoku-new', 'click', () => resetSudokuToStart());
  restoreSudokuGame();
}

export const SudokuGame = {
  featureId: 'sudoku',
  init
};
