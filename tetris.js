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
  // Goal: *one concept per tetromino*, printed once across the piece (more readable).
  const BELTS = [
    {
      name: 'Green Belt',
      fromLevel: 1,
      toLevel: 3,
      concepts: [
        { code: 'DMAIC', desc: 'Define–Measure–Analyze–Improve–Control improvement cycle.' },
        { code: 'SIPOC', desc: 'Suppliers–Inputs–Process–Outputs–Customers high-level map.' },
        { code: 'VOC', desc: 'Voice of Customer: needs, pain points, expectations.' },
        { code: 'CTQ', desc: 'Critical-to-Quality requirements that drive specs.' },
        { code: '5S', desc: 'Sort, Set in order, Shine, Standardize, Sustain.' },
        { code: 'VSM', desc: 'Value Stream Map to see flow, waste, bottlenecks.' },
        { code: 'KAIZEN', desc: 'Continuous improvement through small frequent changes.' },
        { code: 'GEMBA', desc: 'Go to the place of work to understand reality.' },
        { code: 'TAKT', desc: 'Production pace needed to meet customer demand.' },
        { code: 'KANBAN', desc: 'Pull system to control WIP and signal replenishment.' },
        { code: 'POKAY', desc: 'Poka‑yoke: mistake-proofing to prevent defects.' },
        { code: 'ANDON', desc: 'Visual alert to surface abnormalities immediately.' },
        { code: 'OEE', desc: 'Overall Equipment Effectiveness: availability×performance×quality.' },
        { code: 'SMED', desc: 'Single-Minute Exchange of Dies: reduce changeover time.' },
        { code: 'TPM', desc: 'Total Productive Maintenance to improve equipment reliability.' },
        { code: 'SPC', desc: 'Statistical Process Control: charts to monitor stability.' },
        { code: 'MSA', desc: 'Measurement System Analysis: ensure measurement trust.' },
        { code: 'FMEA', desc: 'Failure Modes & Effects Analysis: anticipate and mitigate risk.' },
        { code: 'PARETO', desc: '80/20 prioritization: focus on the vital few causes.' },
        { code: '5WHY', desc: 'Ask “why” five times to reach root cause.' }
      ]
    },
    {
      name: 'Black Belt (Mfg)',
      fromLevel: 4,
      toLevel: 99,
      concepts: [
        { code: 'DOE', desc: 'Design of Experiments to learn cause→effect efficiently.' },
        { code: 'ANOVA', desc: 'Analysis of Variance: compare means across groups.' },
        { code: 'REG', desc: 'Regression: model Y as a function of Xs.' },
        { code: 'HYP', desc: 'Hypothesis testing: decide with statistical confidence.' },
        { code: 'Cp', desc: 'Process capability vs spec width (centering ignored).' },
        { code: 'Cpk', desc: 'Process capability considering centering.' },
        { code: 'CTRL', desc: 'Control plan: sustain gains with monitoring & reaction.' },
        { code: 'DFSS', desc: 'Design for Six Sigma: build capability into design.' },
        { code: 'CT', desc: 'Cycle time: end-to-end time through the process.' },
        { code: 'Y=fX', desc: 'Core model: output Y is a function of inputs X.' },
        { code: 'HEIJ', desc: 'Heijunka: level scheduling to reduce variability.' },
        { code: 'WIP', desc: 'Work-in-progress: control it to improve flow.' },
        { code: 'FLOW', desc: 'Make work flow smoothly; remove queues & handoffs.' },
        { code: 'VAR', desc: 'Variation reduction: stabilize before optimizing.' },
        { code: 'RTY', desc: 'Rolled Throughput Yield: yield across all steps.' }
      ]
    }
  ];

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
  const elNextConceptCode = document.getElementById('nextConceptCode');
  const elNextConceptDesc = document.getElementById('nextConceptDesc');

  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnAuto = document.getElementById('btnAuto');

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
    // cell = null | { type: 'I'|'O'|..., pieceId: 'p1', concept: {code, desc} }
    return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));
  }

  function drawCell(x, y, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;

    const px = x * BLOCK;
    const py = y * BLOCK;

    ctx.fillStyle = color;
    ctx.fillRect(px, py, BLOCK, BLOCK);

    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.strokeRect(px + 0.5, py + 0.5, BLOCK - 1, BLOCK - 1);

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
  let autopilot;
  // Autopilot pacing (ms). Higher = slower.
  const AUTOPILOT_DELAY_MS = 650;
  let autopilotNextAt = 0;
  let autopilotNeedsPlan = false;

  let conceptIdx = 0;
  let pieceSeq = 0;

  function nextConcept() {
    const belt = beltForLevel(level);
    const arr = belt.concepts;
    const concept = arr[conceptIdx % arr.length];
    conceptIdx++;
    return concept;
  }

  function peekNextConcept() {
    const belt = beltForLevel(level);
    const arr = belt.concepts;
    return arr[conceptIdx % arr.length];
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
    // Assign ONE concept per tetromino (piece), not per cell.
    const concept = nextConcept();
    const pieceId = `p${++pieceSeq}`;

    // Update "Concept" card in the UI
    const elCode = document.getElementById('conceptCode');
    const elDesc = document.getElementById('conceptDesc');
    if (elCode) elCode.textContent = concept.code;
    if (elDesc) elDesc.textContent = concept.desc;

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
        board[by][bx] = { type: current.type, pieceId, concept };
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
    updateNextConcept();

    // Trigger autopilot planning for the newly spawned piece.
    if (autopilot) autopilotNeedsPlan = true;

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
    pieceSeq = 0;

    // reset concept card
    const elCode = document.getElementById('conceptCode');
    const elDesc = document.getElementById('conceptDesc');
    if (elCode) elCode.textContent = '—';
    if (elDesc) elDesc.textContent = '—';
    if (elNextConceptCode) elNextConceptCode.textContent = '—';
    if (elNextConceptDesc) elNextConceptDesc.textContent = '—';

    dropIntervalMs = 800;
    lastTime = undefined;
    acc = 0;
    running = true;
    paused = false;

    current = newPiece(takeFromBag());
    next = newPiece(takeFromBag());
    updateNextConcept();

    autopilotNextAt = 0;
    autopilotNeedsPlan = autopilot;

    syncHUD();
    render();
  }

  function syncHUD() {
    const belt = beltForLevel(level);
    elScore.textContent = String(score);
    elLines.textContent = String(lines);
    elLevel.textContent = `${level} · ${belt.name}`;
  }

  function updateNextConcept() {
    const upcoming = peekNextConcept();
    if (!upcoming) return;
    if (elNextConceptCode) elNextConceptCode.textContent = upcoming.code;
    if (elNextConceptDesc) elNextConceptDesc.textContent = upcoming.desc;
  }

  function drawNext() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    const size = 20;
    const offsetX = 14;
    const offsetY = 8;
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

  function drawPieceLabels() {
    // Find unique pieceIds and draw the concept code centered across their bounding box.
    const pieces = new Map();

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = board[y][x];
        if (!cell) continue;
        const key = cell.pieceId;
        if (!pieces.has(key)) {
          pieces.set(key, {
            pieceId: key,
            concept: cell.concept,
            minX: x,
            maxX: x,
            minY: y,
            maxY: y,
          });
        } else {
          const p = pieces.get(key);
          p.minX = Math.min(p.minX, x);
          p.maxX = Math.max(p.maxX, x);
          p.minY = Math.min(p.minY, y);
          p.maxY = Math.max(p.maxY, y);
        }
      }
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const p of pieces.values()) {
      if (!p.concept?.code) continue;

      const widthCells = (p.maxX - p.minX + 1);
      const heightCells = (p.maxY - p.minY + 1);

      // Prefer wider surfaces (readability). Skip very tiny bounding boxes.
      if (widthCells < 3 && heightCells < 2) continue;

      const x0 = p.minX * BLOCK;
      const y0 = p.minY * BLOCK;
      const w = widthCells * BLOCK;
      const h = heightCells * BLOCK;

      // Background strip for contrast
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      const stripH = 14;
      const sy = y0 + Math.max(6, (h - stripH) / 2);
      ctx.fillRect(x0 + 2, sy, w - 4, stripH);

      // Font size adapts to width
      const maxChars = Math.max(3, String(p.concept.code).length);
      const base = Math.floor((w / maxChars) * 0.9);
      const fontSize = Math.max(10, Math.min(16, base));
      ctx.font = `900 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillText(String(p.concept.code), x0 + w / 2, sy + stripH / 2 + 0.5);
    }

    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // board
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = board[y][x];
        if (cell) drawCell(x, y, COLORS[cell.type]);
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
          if (py >= 0) drawCell(px, py, COLORS.GHOST, 1);
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
          if (py >= 0) drawCell(px, py, COLORS[current.type]);
        }
      }
    }

    // piece labels (draw once per tetromino on the stack)
    drawPieceLabels();

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

    // Autopilot: pace decisions so it doesn't insta-play at full frame rate.
    if (autopilot) {
      if (autopilotNeedsPlan) {
        autopilotNeedsPlan = false;
        autopilotNextAt = time + AUTOPILOT_DELAY_MS;
      }
      if (time >= autopilotNextAt) {
        // After acting, wait for the next piece spawn to schedule again.
        autopilotNextAt = Infinity;
        runAutopilotTurn();
      }
    }

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

  function updateAutopilotButton() {
    if (!btnAuto) return;
    btnAuto.textContent = autopilot ? 'Autopilot: On' : 'Autopilot: Off';
    btnAuto.setAttribute('aria-pressed', String(autopilot));
  }

  function toggleAutopilot() {
    autopilot = !autopilot;
    updateAutopilotButton();
    if (autopilot) {
      autopilotNeedsPlan = true;
      autopilotNextAt = 0;
    }
  }

  function canPlaceAt(x, y, matrix) {
    return canPlace({ x, y, m: matrix }, 0, 0, matrix);
  }

  function simulatePlacement(matrix, x, y) {
    const clone = board.map(row => row.slice());
    for (let py = 0; py < 4; py++) {
      for (let px = 0; px < 4; px++) {
        if (!matrix[py][px]) continue;
        const bx = x + px;
        const by = y + py;
        if (by >= 0) clone[by][bx] = { type: current.type };
      }
    }

    let cleared = 0;
    for (let row = ROWS - 1; row >= 0; row--) {
      if (clone[row].every(cell => cell)) {
        clone.splice(row, 1);
        clone.unshift(Array.from({ length: COLS }, () => null));
        cleared++;
        row++;
      }
    }

    return { board: clone, cleared };
  }

  function evaluateBoard(testBoard, cleared) {
    const heights = [];
    let holes = 0;

    for (let x = 0; x < COLS; x++) {
      let y = 0;
      while (y < ROWS && !testBoard[y][x]) y++;
      const height = ROWS - y;
      heights.push(height);

      let foundBlock = false;
      for (let yy = 0; yy < ROWS; yy++) {
        if (testBoard[yy][x]) foundBlock = true;
        else if (foundBlock) holes++;
      }
    }

    let bumpiness = 0;
    for (let i = 0; i < heights.length - 1; i++) {
      bumpiness += Math.abs(heights[i] - heights[i + 1]);
    }

    const aggregateHeight = heights.reduce((sum, h) => sum + h, 0);
    return cleared * 12 - aggregateHeight * 0.6 - holes * 6 - bumpiness * 0.8;
  }

  function planAutopilotMove() {
    let best = null;
    let matrix = current.m.map(r => r.slice());

    for (let r = 0; r < 4; r++) {
      for (let x = -2; x < COLS; x++) {
        let y = -1;
        if (!canPlaceAt(x, y, matrix)) continue;
        while (canPlaceAt(x, y + 1, matrix)) y++;
        const { board: testBoard, cleared } = simulatePlacement(matrix, x, y);
        const score = evaluateBoard(testBoard, cleared);
        if (!best || score > best.score) {
          best = { score, x, matrix: matrix.map(row => row.slice()) };
        }
      }
      matrix = rotateMatrixCW(matrix);
    }

    return best;
  }

  function runAutopilotTurn() {
    if (!running || paused || !current) return;
    const plan = planAutopilotMove();
    if (!plan) return;
    current.m = plan.matrix;
    current.x = plan.x;
    current.y = -1;
    hardDrop();
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
  btnAuto.addEventListener('click', toggleAutopilot);

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
  autopilot = false;
  updateAutopilotButton();
  updateNextConcept();
  syncHUD();
  render();
})();
