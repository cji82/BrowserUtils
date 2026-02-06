/**
 * Memory card game (match pairs). Difficulty = number of pairs (8/10/12).
 */

const PAIRS = { easy: 8, medium: 10, hard: 12 };
let cards = [];
let revealed = [];
let matched = [];
let initialized = false;

// Use Twemoji assets (OS independent)
const EMOJI_CODES = [
  '1f436','1f431','1f42d','1f439','1f430','1f98a','1f43b','1f43c',
  '1f428','1f42f','1f981','1f42e','1f437','1f438','1f435','1f414',
  '1f427','1f426','1f424','1f984','1f419','1f98b','1f40c','1f41e',
  '1f980','1f420','1f41f','1f42c','1f433','1f40b','1f988'
];
const EMOJI_BASE = 'img/emoji/';
const PARTY_SRC = EMOJI_BASE + '1f389.svg';
const CARD_BACK_SRC = EMOJI_BASE + '1f0a0.svg';

function emojiSrc(code) { return EMOJI_BASE + code + '.svg'; }

function getDifficulty() {
  const el = document.querySelector('input[name="memory-diff"]:checked');
  return (el && el.value) || 'easy';
}

function buildDeck(pairs) {
  const em = EMOJI_CODES.slice(0, pairs);
  const deck = [...em, ...em].map((v, i) => ({ id: i, code: v }));
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
    const backImg = document.createElement('img');
    backImg.className = 'memory-card-back-img';
    backImg.src = CARD_BACK_SRC;
    backImg.alt = '';
    back.appendChild(backImg);
    const front = document.createElement('span');
    front.className = 'memory-card-front';
    const img = document.createElement('img');
    img.className = 'emoji-icon';
    img.src = emojiSrc(c.code);
    img.alt = '';
    img.style.width = '22px';
    img.style.height = '22px';
    front.appendChild(img);
    inner.appendChild(back);
    inner.appendChild(front);
    cell.appendChild(inner);
    container.appendChild(cell);
  });
  if (matched.length === cards.length && cards.length > 0 && msg) {
    msg.innerHTML = '모두 맞췄어요! <img class=\"emoji-icon\" src=\"' + PARTY_SRC + '\" alt=\"\">';
  }
  else if (msg && revealed.length === 0 && matched.length === 0) msg.textContent = '';
}

function flip(i) {
  if (revealed.length >= 2 || revealed.includes(i) || matched.includes(i)) return;
  revealed.push(i);
  render();
  if (revealed.length === 2) {
    const [a, b] = revealed;
    if (cards[a].code === cards[b].code) {
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
    memoryCards: JSON.stringify(cards.map(c => c.code)),
    memoryMatched: JSON.stringify(matched),
    memoryRevealed: JSON.stringify(revealed)
  });
}

function loadState(cb) {
  chrome.storage.local.get(['memoryCards', 'memoryMatched', 'memoryRevealed'], function(data) {
    if (data.memoryCards && data.memoryMatched) {
      try {
        const codes = JSON.parse(data.memoryCards);
        var valid = Array.isArray(codes) && codes.length > 0 && codes.every(function(code) { return EMOJI_CODES.indexOf(code) !== -1; });
        if (!valid) { cb(false); return; }
        cards = codes.map(function(code, id) { return { id: id, code: code }; });
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
