// =====================================================
// Sudoku — 3 tingkat kesulitan × 10 level
// Alur: Menu → pilih tingkat → pilih level → main → level berikutnya
// Medium terbuka setelah Easy level 10, Hard setelah Medium level 10.
// =====================================================

const DIFFS = [
  { id: "easy",   label: "Easy",   icon: "🌱", desc: "Santai untuk pemanasan",    baseHoles: 30 },
  { id: "medium", label: "Medium", icon: "🔥", desc: "Butuh sedikit strategi",     baseHoles: 42 },
  { id: "hard",   label: "Hard",   icon: "🧠", desc: "Tantangan untuk para ahli",  baseHoles: 52 },
];
const LEVELS_PER_DIFF = 10;
const MAX_MISTAKES = 3;
const MAX_HINTS = 3;
const STORAGE_KEY = "sudoku-progress-v1";

// Jumlah kotak kosong naik sedikit di tiap level
const holesFor = (diff, level) => diff.baseHoles + (level - 1);

// ---------- Random dengan seed (supaya tiap level selalu puzzle yang sama) ----------
let rand = Math.random;
function seededRandom(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Generator puzzle ----------
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function canPlace(grid, idx, n) {
  const r = Math.floor(idx / 9), c = idx % 9;
  const br = r - (r % 3), bc = c - (c % 3);
  for (let i = 0; i < 9; i++) {
    if (grid[r * 9 + i] === n) return false;
    if (grid[i * 9 + c] === n) return false;
    if (grid[(br + Math.floor(i / 3)) * 9 + bc + (i % 3)] === n) return false;
  }
  return true;
}

function fillGrid(grid) {
  const idx = grid.indexOf(0);
  if (idx === -1) return true;
  for (const n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (canPlace(grid, idx, n)) {
      grid[idx] = n;
      if (fillGrid(grid)) return true;
      grid[idx] = 0;
    }
  }
  return false;
}

// Hitung jumlah solusi (berhenti di `limit`) agar puzzle punya satu jawaban pasti
function countSolutions(grid, limit = 2) {
  let best = -1, bestCount = 10;
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) continue;
    let count = 0;
    for (let n = 1; n <= 9; n++) if (canPlace(grid, i, n)) count++;
    if (count < bestCount) { best = i; bestCount = count; if (count <= 1) break; }
  }
  if (best === -1) return 1;
  if (bestCount === 0) return 0;
  let total = 0;
  for (let n = 1; n <= 9; n++) {
    if (canPlace(grid, best, n)) {
      grid[best] = n;
      total += countSolutions(grid, limit - total);
      grid[best] = 0;
      if (total >= limit) break;
    }
  }
  return total;
}

function generatePuzzle(holes, seed) {
  rand = seededRandom(seed);
  const solution = new Array(81).fill(0);
  fillGrid(solution);
  const puzzle = solution.slice();
  let removed = 0;
  for (const idx of shuffle([...Array(81).keys()])) {
    if (removed >= holes) break;
    const backup = puzzle[idx];
    puzzle[idx] = 0;
    if (countSolutions(puzzle.slice()) !== 1) puzzle[idx] = backup;
    else removed++;
  }
  rand = Math.random;
  return { puzzle, solution };
}

// ---------- Progres (disimpan di browser) ----------
// progress[diffId] = { done: jumlah level selesai, best: { level: detik } }
function loadProgress() {
  const empty = Object.fromEntries(DIFFS.map(d => [d.id, { done: 0, best: {} }]));
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) DIFFS.forEach(d => { if (saved[d.id]) empty[d.id] = saved[d.id]; });
  } catch (e) { /* storage tidak tersedia, pakai progres kosong */ }
  return empty;
}
function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch (e) {}
}
let progress = loadProgress();

const diffIndex = id => DIFFS.findIndex(d => d.id === id);
function isDiffUnlocked(id) {
  const i = diffIndex(id);
  return i === 0 || progress[DIFFS[i - 1].id].done >= LEVELS_PER_DIFF;
}
const isLevelUnlocked = (id, level) => isDiffUnlocked(id) && level <= progress[id].done + 1;

// ---------- Navigasi layar ----------
const screens = {
  home: document.getElementById("screen-home"),
  levels: document.getElementById("screen-levels"),
  game: document.getElementById("screen-game"),
};
let currentScreen = "home";

function show(name) {
  Object.entries(screens).forEach(([k, el]) => el.classList.toggle("hidden", k !== name));
  currentScreen = name;
  if (name !== "game") clearInterval(state.timer);
  if (name === "home") renderHome();
  if (name === "levels") renderLevels();
  window.scrollTo(0, 0);
}

document.querySelectorAll("[data-go]").forEach(btn =>
  btn.addEventListener("click", () => show(btn.dataset.go)));

// ---------- Menu utama ----------
function renderHome() {
  const list = document.getElementById("diff-list");
  list.innerHTML = "";
  DIFFS.forEach((d, i) => {
    const unlocked = isDiffUnlocked(d.id);
    const done = progress[d.id].done;
    const card = document.createElement("button");
    card.className = "diff-card" + (unlocked ? "" : " locked");
    card.innerHTML = `
      <div class="diff-icon">${unlocked ? d.icon : "🔒"}</div>
      <div class="diff-body">
        <h3>${d.label}</h3>
        <p>${unlocked ? d.desc : `Tamatkan ${DIFFS[i - 1].label} level 10 untuk membuka`}</p>
        <div class="progress"><div style="width:${done * 10}%"></div></div>
      </div>
      <div class="diff-count">${done}/${LEVELS_PER_DIFF}</div>`;
    if (unlocked) card.addEventListener("click", () => { state.diff = d.id; show("levels"); });
    list.appendChild(card);
  });
}

document.getElementById("reset-progress").addEventListener("click", () => {
  if (!confirm("Hapus semua progres dan mulai dari awal?")) return;
  progress = Object.fromEntries(DIFFS.map(d => [d.id, { done: 0, best: {} }]));
  saveProgress();
  renderHome();
});

// ---------- Pilih level ----------
function renderLevels() {
  const d = DIFFS[diffIndex(state.diff)];
  const p = progress[d.id];
  document.getElementById("levels-title").textContent = d.label;
  document.getElementById("levels-progress").textContent = `${p.done}/${LEVELS_PER_DIFF}`;
  const grid = document.getElementById("level-grid");
  grid.innerHTML = "";
  for (let lv = 1; lv <= LEVELS_PER_DIFF; lv++) {
    const btn = document.createElement("button");
    const done = lv <= p.done;
    const unlocked = isLevelUnlocked(d.id, lv);
    btn.className = "level-btn" + (done ? " done" : unlocked ? " current" : " locked");
    btn.innerHTML = unlocked
      ? `${lv}<small>${done ? "✓ " + formatTime(p.best[lv] || 0) : "Main"}</small>`
      : "🔒";
    if (unlocked) btn.addEventListener("click", () => startLevel(d.id, lv));
    grid.appendChild(btn);
  }
}

// ---------- State permainan ----------
const state = {
  diff: "easy", level: 1,
  puzzle: [], solution: [], values: [], notes: [],
  selected: -1, notesMode: false, mistakes: 0, hints: MAX_HINTS,
  history: [], seconds: 0, timer: null, over: false,
};

const boardEl = document.getElementById("board");
const numpadEl = document.getElementById("numpad");
const timerEl = document.getElementById("timer");
const mistakesEl = document.getElementById("mistakes");
const hintCountEl = document.getElementById("hint-count");
const notesBtn = document.getElementById("notes");
const notesStateEl = document.getElementById("notes-state");
const hintBtn = document.getElementById("hint");
const overlay = document.getElementById("overlay");

const cells = [];
for (let i = 0; i < 81; i++) {
  const cell = document.createElement("div");
  cell.className = "cell";
  cell.addEventListener("click", () => select(i));
  boardEl.appendChild(cell);
  cells.push(cell);
}

const numButtons = [];
for (let n = 1; n <= 9; n++) {
  const btn = document.createElement("button");
  btn.className = "num";
  btn.innerHTML = `${n}<small></small>`;
  btn.addEventListener("click", () => input(n));
  numpadEl.appendChild(btn);
  numButtons.push(btn);
}

function startLevel(diffId, level) {
  const d = DIFFS[diffIndex(diffId)];
  const seed = (diffIndex(diffId) + 1) * 1000 + level;
  const { puzzle, solution } = generatePuzzle(holesFor(d, level), seed);
  Object.assign(state, {
    diff: diffId, level, puzzle, solution,
    values: puzzle.slice(),
    notes: Array.from({ length: 81 }, () => new Set()),
    selected: -1, mistakes: 0, hints: MAX_HINTS,
    history: [], seconds: 0, over: false,
  });
  document.getElementById("game-title").textContent = `${d.label} · Level ${level}`;
  overlay.classList.add("hidden");
  show("game");
  startTimer();
  render();
}

function startTimer() {
  clearInterval(state.timer);
  timerEl.textContent = "00:00";
  state.timer = setInterval(() => {
    state.seconds++;
    timerEl.textContent = formatTime(state.seconds);
  }, 1000);
}

function formatTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function select(i) {
  if (state.over) return;
  state.selected = i;
  render();
}

function input(n) {
  const i = state.selected;
  if (state.over || i < 0 || state.puzzle[i] !== 0) return;
  if (state.values[i] === state.solution[i]) return;

  state.history.push({ i, value: state.values[i], notes: new Set(state.notes[i]) });

  if (state.notesMode) {
    if (state.values[i] !== 0) { state.history.pop(); return; }
    const set = state.notes[i];
    set.has(n) ? set.delete(n) : set.add(n);
    return render();
  }

  state.values[i] = n;
  state.notes[i].clear();

  if (n !== state.solution[i]) {
    state.mistakes++;
    if (state.mistakes >= MAX_MISTAKES) { render(); return lose(); }
  } else {
    clearPeerNotes(i, n);
    cells[i].classList.remove("pop");
    void cells[i].offsetWidth;
    cells[i].classList.add("pop");
  }
  render();
  checkWin();
}

function clearPeerNotes(i, n) {
  const r = Math.floor(i / 9), c = i % 9;
  for (let j = 0; j < 81; j++) {
    const rj = Math.floor(j / 9), cj = j % 9;
    const sameBox = Math.floor(rj / 3) === Math.floor(r / 3) && Math.floor(cj / 3) === Math.floor(c / 3);
    if (rj === r || cj === c || sameBox) state.notes[j].delete(n);
  }
}

function erase() {
  const i = state.selected;
  if (state.over || i < 0 || state.puzzle[i] !== 0) return;
  if (state.values[i] === state.solution[i]) return;
  state.history.push({ i, value: state.values[i], notes: new Set(state.notes[i]) });
  state.values[i] = 0;
  state.notes[i].clear();
  render();
}

function undo() {
  if (state.over) return;
  const last = state.history.pop();
  if (!last) return;
  state.values[last.i] = last.value;
  state.notes[last.i] = last.notes;
  state.selected = last.i;
  render();
}

function hint() {
  if (state.over || state.hints <= 0) return;
  let i = state.selected;
  if (i < 0 || state.values[i] === state.solution[i]) {
    const empty = [];
    for (let j = 0; j < 81; j++) if (state.values[j] !== state.solution[j]) empty.push(j);
    if (!empty.length) return;
    i = empty[Math.floor(Math.random() * empty.length)];
  }
  state.hints--;
  state.values[i] = state.solution[i];
  state.notes[i].clear();
  clearPeerNotes(i, state.solution[i]);
  state.selected = i;
  render();
  checkWin();
}

// ---------- Menang / kalah ----------
function checkWin() {
  if (state.values.every((v, i) => v === state.solution[i])) win();
}

function showOverlay(title, text, buttons) {
  document.getElementById("overlay-title").textContent = title;
  document.getElementById("overlay-text").textContent = text;
  const box = document.getElementById("overlay-actions");
  box.innerHTML = "";
  buttons.forEach(({ label, primary, onClick }) => {
    const b = document.createElement("button");
    b.className = primary ? "primary" : "secondary";
    b.textContent = label;
    b.addEventListener("click", onClick);
    box.appendChild(b);
  });
  overlay.classList.remove("hidden");
}

function win() {
  state.over = true;
  clearInterval(state.timer);
  render();

  const { diff, level, seconds } = state;
  const p = progress[diff];
  const idx = diffIndex(diff);
  const d = DIFFS[idx];
  const nextDiff = DIFFS[idx + 1];
  const firstClear = level > p.done;
  if (firstClear) p.done = level;
  if (!p.best[level] || seconds < p.best[level]) p.best[level] = seconds;
  saveProgress();

  const timeText = `Waktu kamu ${formatTime(seconds)}.`;

  if (level < LEVELS_PER_DIFF) {
    showOverlay(`Level ${level} selesai! 🎉`, timeText, [
      { label: `Lanjut ke Level ${level + 1}`, primary: true, onClick: () => startLevel(diff, level + 1) },
      { label: "Pilih level", onClick: () => show("levels") },
    ]);
  } else if (nextDiff) {
    showOverlay(`${d.label} tamat! 🏆`,
      `${timeText} ${firstClear ? `Tingkat ${nextDiff.label} sekarang terbuka.` : ""}`, [
      { label: `Main ${nextDiff.label}`, primary: true, onClick: () => { state.diff = nextDiff.id; startLevel(nextDiff.id, Math.min(progress[nextDiff.id].done + 1, LEVELS_PER_DIFF)); } },
      { label: "Menu utama", onClick: () => show("home") },
    ]);
  } else {
    showOverlay("Kamu juara Sudoku! 👑", `${timeText} Semua level di Easy, Medium, dan Hard sudah kamu tamatkan.`, [
      { label: "Menu utama", primary: true, onClick: () => show("home") },
    ]);
  }
}

function lose() {
  state.over = true;
  clearInterval(state.timer);
  showOverlay("Game over", `Kamu sudah salah ${MAX_MISTAKES} kali. Coba lagi level ini?`, [
    { label: "Ulangi level", primary: true, onClick: () => startLevel(state.diff, state.level) },
    { label: "Pilih level", onClick: () => show("levels") },
  ]);
}

// ---------- Tampilan papan ----------
function render() {
  const sel = state.selected;
  const selVal = sel >= 0 ? state.values[sel] : 0;
  const sr = Math.floor(sel / 9), sc = sel % 9;

  cells.forEach((cell, i) => {
    const v = state.values[i];
    const r = Math.floor(i / 9), c = i % 9;
    const isPeer = sel >= 0 && (r === sr || c === sc ||
      (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3)));

    cell.className = "cell" + (cell.classList.contains("pop") ? " pop" : "");
    if (state.puzzle[i] !== 0) cell.classList.add("given");
    if (isPeer) cell.classList.add("peer");
    if (selVal && v === selVal) cell.classList.add("same");
    if (i === sel) cell.classList.add("selected");
    if (v && v !== state.solution[i]) cell.classList.add("wrong");

    if (v) cell.textContent = v;
    else if (state.notes[i].size) {
      cell.innerHTML = `<div class="notes-grid">${
        [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<span>${state.notes[i].has(n) ? n : ""}</span>`).join("")
      }</div>`;
    } else cell.textContent = "";
  });

  numButtons.forEach((btn, k) => {
    const n = k + 1;
    const placed = state.values.filter((v, i) => v === n && v === state.solution[i]).length;
    btn.querySelector("small").textContent = 9 - placed || "";
    btn.classList.toggle("done", placed === 9);
  });

  mistakesEl.textContent = `Salah ${state.mistakes}/${MAX_MISTAKES}`;
  hintCountEl.textContent = state.hints;
  hintBtn.disabled = state.hints <= 0 || state.over;
  notesBtn.classList.toggle("on", state.notesMode);
  notesStateEl.textContent = state.notesMode ? "On" : "Off";
}

// ---------- Tombol & keyboard ----------
document.getElementById("erase").addEventListener("click", erase);
document.getElementById("undo").addEventListener("click", undo);
document.getElementById("restart").addEventListener("click", () => startLevel(state.diff, state.level));
hintBtn.addEventListener("click", hint);
notesBtn.addEventListener("click", () => { state.notesMode = !state.notesMode; render(); });

document.addEventListener("keydown", e => {
  if (currentScreen !== "game") return;
  if (e.key >= "1" && e.key <= "9") return input(Number(e.key));
  if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") return erase();
  if (e.key.toLowerCase() === "n") { state.notesMode = !state.notesMode; return render(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") return undo();
  const moves = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
  if (moves[e.key] !== undefined) {
    e.preventDefault();
    const next = state.selected < 0 ? 0 : state.selected + moves[e.key];
    if (next >= 0 && next < 81) select(next);
  }
});

show("home");
