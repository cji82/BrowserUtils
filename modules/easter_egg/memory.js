/**
 * Memory card game (match pairs). Difficulty = number of pairs (8/10/12).
 */

const PAIRS = { easy: 8, medium: 10, hard: 12 };
let cards = [];
let revealed = [];
let matched = [];
let initialized = false;

// Emoji code points only (ASCII source = no encoding issues)
const EMOJIS = [0x1F436, 0x1F431, 0x1F42D, 0x1F439, 0x1F430, 0x1F98A, 0x1F43B, 0x1F43C, 0x1F428, 0x1F42F, 0x1F981, 0x1F42E, 0x1F437, 0x1F438, 0x1F435, 0x1F414, 0x1F427, 0x1F426, 0x1F424, 0x1F984, 0x1F419, 0x1F98B, 0x1F40C, 0x1F41E, 0x1F980, 0x1F420, 0x1F41F, 0x1F42C, 0x1F433, 0x1F40B, 0x1F988].map(function(c) { return String.fromCodePoint(c); });

function getDifficulty() {
  const el = document.querySelector('input[name="memory-diff"]:checked');
  return (el && el.value) || 'easy';
}

function buildDeck(pairs) {
  const em = EMOJIS.slice(0, pairs);
  const deck = [...em, ...em].map((v, i) => ({ id: i, emoji: v }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function render() {
  const container = document.getElementById('memory-container');
  const msg = document.getElementById('memory-message');
  if (!container) return;
  const pairs = PAIRS[getDifficulty()] || 8;
  const cols = pairs <= 8 ? 4 : pairs <= 10 ? 5 : 6;
  container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  container.innerHTML = '';
  cards.forEach((c, i) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'memory-card';
    cell.dataset.index = String(i);
    const isRevealed = revealed.includes(i) || matched.includes(i);
    if (isRevealed) {
      cell.classList.add('revealed', 'flipped');
      if (matched.includes(i)) cell.classList.add('matched');
      cell.disabled = true;
    } else {
      cell.classList.add('face-down');
      cell.addEventListener('click', () => flip(i));
    }
    const inner = document.createElement('span');
    inner.className = 'memory-card-inner';
    const back = document.createElement('span');
    back.className = 'memory-card-back';
    const front = document.createElement('span');
    front.className = 'memory-card-front';
    front.textContent = c.emoji;
    inner.appendChild(back);
    inner.appendChild(front);
    cell.appendChild(inner);
    container.appendChild(cell);
  });
  if (matched.length === cards.length && cards.length > 0 && msg) msg.textContent = '모두 맞췄어요! ' + String.fromCodePoint(0x1F389);
  else if (msg && revealed.length === 0 && matched.length === 0) msg.textContent = '';
}

function flip(i) {
  if (revealed.length >= 2 || revealed.includes(i) || matched.includes(i)) return;
  revealed.push(i);
  render();
  if (revealed.length === 2) {
    const [a, b] = revealed;
    if (cards[a].emoji === cards[b].emoji) {
      matched.push(a, b);
      revealed = [];
      render();
      saveState();
    } else {
      setTimeout(() => {
        revealed = [];
        render();
      }, 600);
    }
  }
}

function saveState() {
  chrome.storage.local.set({
    memoryCards: JSON.stringify(cards.map(c => c.emoji)),
    memoryMatched: JSON.stringify(matched),
    memoryRevealed: JSON.stringify(revealed)
  });
}

function loadState(cb) {
  chrome.storage.local.get(['memoryCards', 'memoryMatched', 'memoryRevealed'], function(data) {
    if (data.memoryCards && data.memoryMatched) {
      try {
        const emojis = JSON.parse(data.memoryCards);
        var valid = Array.isArray(emojis) && emojis.length > 0 && emojis.every(function(e) { return EMOJIS.indexOf(e) !== -1; });
        if (!valid) { cb(false); return; }
        cards = emojis.map(function(emoji, id) { return { id: id, emoji: emoji }; });
        matched = JSON.parse(data.memoryMatched);
        revealed = data.memoryRevealed ? JSON.parse(data.memoryRevealed) : [];
        cb(true);
      } catch (e) { cb(false); }
    } else cb(false);
  });
}

function newGame() {
  const pairs = PAIRS[getDifficulty()] || 8;
  cards = buildDeck(pairs);
  revealed = [];
  matched = [];
  render();
  saveState();
}

function init(api) {
  const safeOn = api && api.safeOn ? api.safeOn : (id, ev, fn) => { const e = document.getElementById(id); if (e) e.addEventListener(ev, fn); };
  if (initialized) return;
  initialized = true;
  safeOn('memory-new', 'click', () => newGame());
  loadState((restored) => {
    if (restored && cards.length > 0) render();
    else newGame();
  });
}

export const MemoryGame = { featureId: 'memory', init };
