'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const SKINS = {
  retro: {
    label: 'Retro',
    colors: [null, '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#7986cb', '#ffb74d'],
    gridColor: '#22222e',
    boardBg: '#1a1a25',
    drawBlock(context, x, y, color, size) {
      const px = x * size + 1;
      const py = y * size + 1;
      const s = size - 2;
      context.fillStyle = color;
      context.fillRect(px, py, s, s);
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(px, py, s, 4);
    },
  },
  neon: {
    label: 'Neon',
    colors: [null, '#00e5ff', '#ffee00', '#e000ff', '#39ff14', '#ff1744', '#2979ff', '#ff9100'],
    gridColor: '#12121a',
    boardBg: '#050507',
    drawBlock(context, x, y, color, size) {
      const px = x * size + 1;
      const py = y * size + 1;
      const s = size - 2;
      context.save();
      context.shadowBlur = 12;
      context.shadowColor = color;
      context.fillStyle = color;
      context.fillRect(px, py, s, s);
      context.restore();
      context.fillStyle = 'rgba(255,255,255,0.25)';
      context.fillRect(px, py, s, 3);
    },
  },
  pastel: {
    label: 'Pastel',
    colors: [null, '#a8d8ea', '#fff2b2', '#d9b8e8', '#b8e8c8', '#f7b8c0', '#c2c8f0', '#f9d5a7'],
    gridColor: '#3a3448',
    boardBg: '#2b2438',
    drawBlock(context, x, y, color, size) {
      const px = x * size + 1;
      const py = y * size + 1;
      const s = size - 2;
      const r = Math.min(6, s / 3);
      traceRoundedRect(context, px, py, s, s, r);
      context.fillStyle = color;
      context.fill();
      context.save();
      context.clip();
      context.fillStyle = 'rgba(255,255,255,0.35)';
      context.fillRect(px, py, s, 4);
      context.restore();
    },
  },
  pixel: {
    label: 'Pixel art',
    colors: [null, '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#7986cb', '#ffb74d'],
    gridColor: '#22222e',
    boardBg: '#1a1a25',
    drawBlock(context, x, y, color, size) {
      const px = x * size + 1;
      const py = y * size + 1;
      const s = size - 2;
      context.fillStyle = color;
      context.fillRect(px, py, s, s);
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(px, py, s, 4);
      const cell = Math.max(2, Math.floor(s / 6));
      context.fillStyle = 'rgba(0,0,0,0.18)';
      for (let ry = 0; ry < s; ry += cell) {
        for (let rx = 0; rx < s; rx += cell) {
          if (((rx / cell) + (ry / cell)) % 2 === 0) context.fillRect(px + rx, py + ry, cell, cell);
        }
      }
    },
  },
};

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const START_LEVEL_KEY = 'tetris.startLevel';

const RECORDS_KEY = 'tetris.records';
const STATS_KEY = 'tetris.stats';
const MAX_RECORDS = 5;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const freezeEl = document.getElementById('freeze-charges');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const skinSelect = document.getElementById('skin-select');
const pauseOverlay = document.getElementById('pause-overlay');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const toggleControlsBtn = document.getElementById('toggle-controls-btn');
const pauseControls = document.getElementById('pause-controls');
const startLevelSelect = document.getElementById('start-level-select');
const overlayRecordsPanel = document.getElementById('overlay-records-panel');
const nameInput = document.getElementById('name-input');
const saveRecordBtn = document.getElementById('save-record-btn');
const overlayRecordsTable = document.getElementById('overlay-records-table');
const overlayBestCombo = document.getElementById('overlay-best-combo');
const overlayMaxLines = document.getElementById('overlay-max-lines');
const startScreen = document.getElementById('start-screen');
const startRecordsTable = document.getElementById('start-records-table');
const startBestCombo = document.getElementById('start-best-combo');
const startMaxLines = document.getElementById('start-max-lines');
const playBtn = document.getElementById('play-btn');
const resetRecordsBtn = document.getElementById('reset-records-btn');

let board, current, next, score, lines, level, paused, gameOver = true, lastTime, dropAccum, dropInterval, animId;
let freezeCharges, freezeActive, freezeTimer, combo, maxCombo;
let activeSkin;
let startLevel;

function loadSkin() {
  try {
    const saved = localStorage.getItem('tetris.skin');
    if (saved && SKINS[saved]) return saved;
  } catch (e) {}
  return 'retro';
}

function saveSkin(skin) {
  try {
    localStorage.setItem('tetris.skin', skin);
  } catch (e) {}
}

function applySkin(skin) {
  activeSkin = skin;
  const boardBg = SKINS[activeSkin].boardBg;
  canvas.style.background = boardBg;
  nextCanvas.style.background = boardBg;
}

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function loadStartLevel() {
  try {
    const parsed = parseInt(localStorage.getItem(START_LEVEL_KEY), 10);
    if (parsed >= 1 && parsed <= 10) return parsed;
  } catch (e) {}
  return 1;
}

function saveStartLevel(value) {
  try {
    localStorage.setItem(START_LEVEL_KEY, String(value));
  } catch (e) {}
}

function dropIntervalForLevel(lvl) {
  return Math.max(100, 1000 - (lvl - 1) * 90);
}

function resetPauseMenuUI() {
  pauseControls.classList.add('hidden');
  toggleControlsBtn.textContent = 'Ver controles';
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.max(startLevel, Math.floor(lines / 10) + 1);
    dropInterval = dropIntervalForLevel(level);
    if (cleared >= 2) freezeCharges++;
    combo++;
    maxCombo = Math.max(maxCombo, combo);
    updateHUD();
  } else {
    combo = 0;
  }
  return cleared;
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  freezeEl.textContent = freezeCharges;
}

function traceRoundedRect(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + w - r, y);
  context.quadraticCurveTo(x + w, y, x + w, y + r);
  context.lineTo(x + w, y + h - r);
  context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  context.lineTo(x + r, y + h);
  context.quadraticCurveTo(x, y + h, x, y + h - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const skin = SKINS[activeSkin];
  const color = skin.colors[colorIndex];
  context.globalAlpha = alpha ?? 1;
  skin.drawBlock(context, x, y, color, size);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = SKINS[activeSkin].gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);

  // freeze tint
  if (freezeActive) {
    ctx.fillStyle = 'rgba(100,200,255,0.07)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(r => r && typeof r === 'object' && typeof r.name === 'string' && typeof r.score === 'number')
      .map(r => ({
        name: r.name,
        score: r.score,
        lines: typeof r.lines === 'number' ? r.lines : 0,
        combo: typeof r.combo === 'number' ? r.combo : 0,
        date: typeof r.date === 'string' ? r.date : '',
      }));
  } catch {
    return [];
  }
}

function saveRecords(records) {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {}
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { bestCombo: 0, maxLines: 0 };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { bestCombo: 0, maxLines: 0 };
    return {
      bestCombo: typeof parsed.bestCombo === 'number' ? parsed.bestCombo : 0,
      maxLines: typeof parsed.maxLines === 'number' ? parsed.maxLines : 0,
    };
  } catch {
    return { bestCombo: 0, maxLines: 0 };
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function renderRecordsTable(tableEl, records, highlightIndex) {
  if (!records.length) {
    tableEl.innerHTML = '<tr><td class="records-empty" colspan="3">Sin récords aún</td></tr>';
    return;
  }
  tableEl.innerHTML = records
    .map((r, i) => `
      <tr class="record-row${i === highlightIndex ? ' highlight' : ''}">
        <td>${i + 1}. ${escapeHtml(r.name)}</td>
        <td>${r.score.toLocaleString()}</td>
        <td>${r.lines}L x${r.combo}</td>
      </tr>
    `)
    .join('');
}

function renderStats(comboEl, maxLinesEl, stats) {
  comboEl.textContent = stats.bestCombo;
  maxLinesEl.textContent = stats.maxLines;
}

function refreshStartScreen() {
  renderRecordsTable(startRecordsTable, loadRecords(), -1);
  renderStats(startBestCombo, startMaxLines, loadStats());
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlayRecordsPanel.classList.remove('hidden');

  const stats = loadStats();
  const updatedStats = {
    bestCombo: Math.max(stats.bestCombo, maxCombo),
    maxLines: Math.max(stats.maxLines, lines),
  };
  if (updatedStats.bestCombo !== stats.bestCombo || updatedStats.maxLines !== stats.maxLines) {
    saveStats(updatedStats);
  }
  renderStats(overlayBestCombo, overlayMaxLines, updatedStats);
  renderRecordsTable(overlayRecordsTable, loadRecords(), -1);
  nameInput.value = '';
  nameInput.disabled = false;
  saveRecordBtn.disabled = false;

  overlay.classList.remove('hidden');
}

function openPauseMenu() {
  if (gameOver || paused) return;
  paused = true;
  cancelAnimationFrame(animId);
  resetPauseMenuUI();
  startLevelSelect.value = String(loadStartLevel());
  pauseOverlay.classList.remove('hidden');
}

function closePauseMenu() {
  if (!paused) return;
  paused = false;
  pauseOverlay.classList.add('hidden');
  lastTime = performance.now();
  animId = requestAnimationFrame(loop);
}

function togglePause() {
  if (gameOver) return;
  if (paused) closePauseMenu();
  else openPauseMenu();
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  if (freezeActive) {
    freezeTimer -= dt;
    if (freezeTimer <= 0) {
      freezeActive = false;
      freezeTimer = 0;
      canvas.classList.remove('freeze-active');
    }
  } else {
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  startLevel = loadStartLevel();
  level = startLevel;
  paused = false;
  gameOver = false;
  dropInterval = dropIntervalForLevel(startLevel);
  dropAccum = 0;
  freezeCharges = 0;
  freezeActive = false;
  freezeTimer = 0;
  combo = 0;
  maxCombo = 0;
  canvas.classList.remove('freeze-active');
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  pauseOverlay.classList.add('hidden');
  resetPauseMenuUI();
  startLevelSelect.value = String(startLevel);
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.code === 'Escape' && document.activeElement === startLevelSelect) return;
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
    case 'KeyG':
      if (freezeCharges > 0 && !freezeActive) {
        freezeCharges--;
        freezeActive = true;
        freezeTimer = 3000;
        dropAccum = 0;
        canvas.classList.add('freeze-active');
        updateHUD();
      }
      break;
  }
  updateHUD();
});

skinSelect.addEventListener('change', () => {
  applySkin(skinSelect.value);
  saveSkin(activeSkin);
  draw();
  drawNext();
});

restartBtn.addEventListener('click', init);
resumeBtn.addEventListener('click', closePauseMenu);
pauseRestartBtn.addEventListener('click', init);
toggleControlsBtn.addEventListener('click', () => {
  const isHidden = pauseControls.classList.toggle('hidden');
  toggleControlsBtn.textContent = isHidden ? 'Ver controles' : 'Ocultar controles';
});
startLevelSelect.addEventListener('change', () => {
  saveStartLevel(parseInt(startLevelSelect.value, 10));
});

const initialSkin = loadSkin();
skinSelect.value = initialSkin;
applySkin(initialSkin);

playBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  init();
});

resetRecordsBtn.addEventListener('click', () => {
  if (!confirm('¿Seguro que quieres borrar todos los récords guardados?')) return;
  try {
    localStorage.removeItem(RECORDS_KEY);
    localStorage.removeItem(STATS_KEY);
  } catch {}
  refreshStartScreen();
});

saveRecordBtn.addEventListener('click', () => {
  const name = nameInput.value.trim().slice(0, 12) || 'Jugador';
  const record = { name, score, lines, combo: maxCombo, date: new Date().toISOString() };
  const records = loadRecords();
  records.push(record);
  records.sort((a, b) => b.score - a.score);
  records.length = Math.min(records.length, MAX_RECORDS);
  saveRecords(records);
  renderRecordsTable(overlayRecordsTable, records, records.indexOf(record));
  nameInput.disabled = true;
  saveRecordBtn.disabled = true;
});

nameInput.addEventListener('keydown', e => {
  if (e.code === 'Enter' && !saveRecordBtn.disabled) saveRecordBtn.click();
});

refreshStartScreen();
