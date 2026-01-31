(() => {
  'use strict';

  // --- Config ---
  const COLS = 10;
  const ROWS = 20;
  const BLOCK = 30; // px; canvas is 300x600

  // Score system: classic-ish
  const LINE_SCORES = [0, 100, 300, 500, 800];

  const COLORS = {
    I: '#45d7ff',
    O: '#ffd166',
    T: '#c77dff',
    S: '#80ed99',
    Z: '#ff6b6b',
    J: '#4aa3ff',
    L: '#ff9f1c',
    GHOST: 'rgba(255,255,255,0.15)',
    GRID: 'rgba(255,255,255,0.06)'
  };

  // Lean Six Sigma progression (Green Belt → Black Belt manufacturing)
  // Note: labels are kept short to fit in bricks.
  const BELTS = [
    {
      name: 'Green Belt',
      fromLevel: 1,
      toLevel: 3,
      concepts: [
        'DMAIC', 'SIPOC', 'VOC', 'CTQ', '5S', 'VSM', 'KAIZEN', 'GEMBA',
        'TAKT', 'KANBAN', 'POKAY', 'ANDON', 'OEE', 'SMED', 'TPM',
        'SPC', 'MSA', 'FMEA', 'PARETO', '5WHY'
      ]
    },
    {
      name: 'Black Belt (Mfg)',
      fromLevel: 4,
      toLevel: 99,
      concepts: [
        'DOE', 'ANOVA', 'REG', 'HYP', 'Cpk', 'Cp', 'CONTROL', 'DFSS',
        'CT', 'Y=F(X)', 'SPC', 'MSA', 'FMEA', 'OEE', 'TPM', 'SMED',
        'VSM', 'TAKT', 'KANBAN', 'HEIJ'
      ]
    }
  ];

  const labelFor = (s) => {
    const t = String(s || '').trim();
    if (!t) return '';
    // Max ~6 chars for readability in a 30px cell
    return t.length > 6 ? t.slice(0, 6) : t;
  };

  function beltForLevel(level) {
    return BELTS.find(b => level >= b.fromLevel && level <= b.toLevel) || BELTS[0];
  }

  // 4x4 rotation matrices for each piece
  const SHAPES = {
    I: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    O: [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    T: [
      [0, 1, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    S: [
      [0, 1, 1, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    Z: [
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    J: [
      [1, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    L: [
      [0, 0, 1, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]
  };

  const PIECES = Object.keys(SHAPES);

  // --- DOM ---
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const nextCanvas = document.getElementById('next');
  const nextCtx = nextCanvas.getContext('2d');

  const elScore = document.getElementById('score');
  const elLines = document.getElementById('lines');
  const elLevel = document.getElementById('level');

  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');

  const tLeft = document.getElementById('tLeft');
  const tRight = document.getElementById('tRight');
  const tRot = document.getElementById('tRot');
  const tDown = document.getElementById('tDown');
  const tDrop = document.getElementById('tDrop');

  // --- Helpers ---
  function rotateMatrixCW(m) {
    const out = m.map(row => row.slice());
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        out[x][3 - y] = m[y][x];
      }
    }
    return out;
  }

  function makeBoard() {
    // cell = null | { type: 'I'|'O'|..., label: 'DMAIC' }
    return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));
  }

  function drawCell(x, y, color, label, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;

    const px = x * BLOCK;
    const py = y * BLOCK;

    ctx.fillStyle = color;
    ctx.fillRect(px, py, BLOCK, BLOCK);

    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.strokeRect(px + 0.5, py + 0.5, BLOCK - 1, BLOCK - 1);

    if (label) {
      ctx.globalAlpha = Math.min(1, alpha + 0.2);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(px + 2, py + 2, BLOCK - 4, 11);

      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = 'bold 8px system-ui, -apple-system, Segoe UI, Roboto, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(labelFor(label), px + BLOCK / 2, py + 3);
    }

    ctx.restore();
  }

  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = COLORS.GRID;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * BLOCK + 0.5, 0);
      ctx.lineTo(x * BLOCK + 0.5, ROWS * BLOCK);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * BLOCK + 0.5);
      ctx.lineTo(COLS * BLOCK, y * BLOCK + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function randomBag() {
    const bag = PIECES.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
  }

  // --- Game state ---
  let board;
  let bag;
  let current;
  let next;
  let score;
  let lines;
  let level;
  let dropIntervalMs;
  let lastTime;
  let acc;
  let running;
  let paused;

  let conceptIdx = 0;

  function nextConceptLabel() {
    const belt = beltForLevel(level);
    const arr = belt.concepts;
    const label = arr[conceptIdx % arr.length];
    conceptIdx++;
    return label;
  }

  function newPiece(type) {
    return {
      type,
      m: SHAPES[type].map(r => r.slice()),
      x: 3,
      y: -1
    };
  }

  function refillBagIfNeeded() {
    if (!bag || bag.length === 0) bag = randomBag();
  }

  function takeFromBag() {
    refillBagIfNeeded();
    return bag.shift();
  }

  function canPlace(piece, dx = 0, dy = 0, matrix = piece.m) {
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (!matrix[y][x]) continue;
        const nx = piece.x + x + dx;
        const ny = piece.y + y + dy;

        if (nx < 0 || nx >= COLS) return false;
        if (ny >= ROWS) return false;
        if (ny >= 0 && board[ny][nx]) return false;
      }
    }
    return true;
  }

  function lockPiece() {
    // Assign lean concept labels to each brick as it becomes part of the stack.
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (!current.m[y][x]) continue;
        const bx = current.x + x;
        const by = current.y + y;
        if (by < 0) {
          running = false;
          paused = false;
          render();
          alert('Game Over');
          return;
        }
        board[by][bx] = { type: current.type, label: nextConceptLabel() };
      }
    }

    clearLines();
    spawnNext();
  }

  function clearLines() {
    let cleared = 0;
    outer: for (let y = ROWS - 1; y >= 0; y--) {
      for (let x = 0; x < COLS; x++) {
        if (!board[y][x]) continue outer;
      }
      board.splice(y, 1);
      board.unshift(Array.from({ length: COLS }, () => null));
      cleared++;
      y++;
    }

    if (cleared > 0) {
      lines += cleared;
      score += LINE_SCORES[cleared] * level;

      const newLevel = 1 + Math.floor(lines / 10);
      if (newLevel !== level) {
        level = newLevel;
        dropIntervalMs = Math.max(80, 800 - (level - 1) * 60);
      }
      syncHUD();
    }
  }

  function ghostY() {
    let gy = current.y;
    while (canPlace(current, 0, gy - current.y + 1)) {
      gy++;
    }
    return gy;
  }

  function hardDrop() {
    current.y = ghostY();
    lockPiece();
  }

  function rotate() {
    const rotated = rotateMatrixCW(current.m);
    const kicks = [0, -1, 1, -2, 2];
    for (const k of kicks) {
      if (canPlace(current, k, 0, rotated)) {
        current.m = rotated;
        current.x += k;
        return;
      }
    }
  }

  function spawnNext() {
    current = next;
    next = newPiece(takeFromBag());
    current.x = 3;
    current.y = -1;

    if (!canPlace(current, 0, 0)) {
      running = false;
      paused = false;
      render();
      alert('Game Over');
    }
  }

  function resetGame() {
    board = makeBoard();
    bag = randomBag();
    score = 0;
    lines = 0;
    level = 1;
    conceptIdx = 0;

    dropIntervalMs = 800;
    lastTime = undefined;
    acc = 0;
    running = true;
    paused = false;

    current = newPiece(takeFromBag());
    next = newPiece(takeFromBag());
    syncHUD();
    render();
  }

  function syncHUD() {
    const belt = beltForLevel(level);
    elScore.textContent = String(score);
    elLines.textContent = String(lines);
    elLevel.textContent = `${level} · ${belt.name}`;
  }

  function drawNext() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    const size = 24;
    const offsetX = 12;
    const offsetY = 12;
    const color = COLORS[next.type];

    nextCtx.fillStyle = '#070a10';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    nextCtx.strokeStyle = 'rgba(255,255,255,0.08)';
    nextCtx.strokeRect(0.5, 0.5, nextCanvas.width - 1, nextCanvas.height - 1);

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (!next.m[y][x]) continue;
        nextCtx.fillStyle = color;
        nextCtx.fillRect(offsetX + x * size, offsetY + y * size, size, size);
        nextCtx.strokeStyle = 'rgba(0,0,0,0.25)';
        nextCtx.strokeRect(offsetX + x * size + 0.5, offsetY + y * size + 0.5, size - 1, size - 1);
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // board
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = board[y][x];
        if (cell) drawCell(x, y, COLORS[cell.type], cell.label);
      }
    }

    // ghost (no labels)
    if (running && !paused) {
      const gy = ghostY();
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          if (!current.m[y][x]) continue;
          const px = current.x + x;
          const py = gy + y;
          if (py >= 0) drawCell(px, py, COLORS.GHOST, '', 1);
        }
      }
    }

    // current (no labels)
    if (current) {
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          if (!current.m[y][x]) continue;
          const px = current.x + x;
          const py = current.y + y;
          if (py >= 0) drawCell(px, py, COLORS[current.type], '');
        }
      }
    }

    drawGrid();
    drawNext();

    // overlay: belt/progression hint
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, canvas.width, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Lean Six Sigma — ${beltForLevel(level).name}`, 8, 11);
    ctx.restore();

    if (!running) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 26px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
      ctx.restore();
    }

    if (paused && running) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 26px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Paused', canvas.width / 2, canvas.height / 2);
      ctx.restore();
    }
  }

  function tick(time) {
    if (!running) return;
    if (paused) {
      requestAnimationFrame(tick);
      return;
    }

    if (lastTime == null) lastTime = time;
    const dt = time - lastTime;
    lastTime = time;
    acc += dt;

    if (acc > dropIntervalMs) {
      acc = 0;
      if (canPlace(current, 0, 1)) {
        current.y += 1;
      } else {
        lockPiece();
      }
    }

    render();
    requestAnimationFrame(tick);
  }

  // --- Controls ---
  function startOrRestart() {
    resetGame();
    requestAnimationFrame(tick);
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    render();
  }

  function move(dx) {
    if (!running || paused) return;
    if (canPlace(current, dx, 0)) current.x += dx;
    render();
  }

  function softDrop() {
    if (!running || paused) return;
    if (canPlace(current, 0, 1)) {
      current.y += 1;
      score += 1;
      syncHUD();
    } else {
      lockPiece();
    }
    render();
  }

  // Keyboard
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowLeft') { e.preventDefault(); move(-1); }
    else if (k === 'ArrowRight') { e.preventDefault(); move(1); }
    else if (k === 'ArrowUp') { e.preventDefault(); if (!paused) rotate(); render(); }
    else if (k === 'ArrowDown') { e.preventDefault(); softDrop(); }
    else if (k === ' ') { e.preventDefault(); if (!paused && running) hardDrop(); }
    else if (k.toLowerCase() === 'p') { e.preventDefault(); togglePause(); }
  });

  // Buttons
  btnStart.addEventListener('click', startOrRestart);
  btnPause.addEventListener('click', togglePause);

  // Touch buttons
  tLeft.addEventListener('click', () => move(-1));
  tRight.addEventListener('click', () => move(1));
  tRot.addEventListener('click', () => { if (!paused) rotate(); render(); });
  tDown.addEventListener('click', () => softDrop());
  tDrop.addEventListener('click', () => { if (!paused && running) hardDrop(); });

  // Touch gestures on canvas
  let touchStartX = null;
  let touchStartY = null;
  let lastMoveAt = 0;

  canvas.addEventListener('touchstart', (e) => {
    if (!running) return;
    const t = e.changedTouches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    lastMoveAt = performance.now();
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (!running || paused || touchStartX == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const now = performance.now();
    if (now - lastMoveAt < 70) return;

    if (dx > 18) {
      move(1);
      touchStartX = t.clientX;
      lastMoveAt = now;
    } else if (dx < -18) {
      move(-1);
      touchStartX = t.clientX;
      lastMoveAt = now;
    }
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    if (!running || paused) return;
    if (touchStartX == null || touchStartY == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;

    // Tap = rotate
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      rotate();
      render();
    }

    // Swipe down = hard drop
    if (dy > 60) {
      hardDrop();
    }

    touchStartX = null;
    touchStartY = null;
  }, { passive: true });

  // Initial screen
  board = makeBoard();
  bag = randomBag();
  current = newPiece(takeFromBag());
  next = newPiece(takeFromBag());
  score = 0;
  lines = 0;
  level = 1;
  dropIntervalMs = 800;
  conceptIdx = 0;
  running = false;
  paused = false;
  syncHUD();
  render();
})();
