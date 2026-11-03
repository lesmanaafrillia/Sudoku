// ===== Sudoku: generator + game =====

const LEVELS = {
  easy:   { label: "Easy",   holes: 38 },
  medium: { label: "Medium", holes: 48 },
  hard:   { label: "Hard",   holes: 56 },
};
const MAX_MISTAKES = 3;
const MAX_HINTS = 3;

// ---------- Generator ----------
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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

// Count solutions, stopping at `limit` (used to ensure a unique solution)
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

function generatePuzzle(holes) {
  const solution = new Array(81).fill(0);
  fillGrid(solution);
  const puzzle = solution.slice();
  let removed = 0;
  for (const idx of shuffle([...Array(81).keys()])) {
    if (removed >= holes) break;
    const backup = puzzle[idx];
    puzzle[idx] = 0;
    if (countSolutions(puzzle.slice()) !== 1) {
      puzzle[idx] = backup; // removing this breaks uniqueness
    } else {
      removed++;
    }
  }
  return { puzzle, solution };
}

// ---------- State ----------
const state = {
  level: "easy",
  puzzle: [],
  solution: [],
  values: [],
  notes: [],
  selected: -1,
  notesMode: false,
  mistakes: 0,
  hints: MAX_HINTS,
  history: [],
  seconds: 0,
  timer: null,
  over: false,
};

// ---------- DOM ----------
const boardEl = document.getElementById("board");
const numpadEl = document.getElementById("numpad");
const timerEl = document.getElementById("timer");
const mistakesEl = document.getElementById("mistakes");
const hintCountEl = document.getElementById("hint-count");
const notesBtn = document.getElementById("notes");
const notesStateEl = document.getElementById("notes-state");
const hintBtn = document.getElementById("hint");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");

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

// ---------- Game flow ----------
function newGame(level = state.level) {
  state.level = level;
  const { puzzle, solution } = generatePuzzle(LEVELS[level].holes);
  Object.assign(state, {
    puzzle,
    solution,
    values: puzzle.slice(),
    notes: Array.from({ length: 81 }, () => new Set()),
    selected: -1,
    mistakes: 0,
    hints: MAX_HINTS,
    history: [],
    seconds: 0,
    over: false,
  });
  document.querySelectorAll(".level").forEach(b =>
    b.classList.toggle("active", b.dataset.level === level));
  overlay.classList.add("hidden");
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
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function select(i) {
  if (state.over) return;
  state.selected = i;
  render();
}

function input(n) {
  const i = state.selected;
  if (state.over || i < 0 || state.puzzle[i] !== 0) return;
  if (state.values[i] === state.solution[i]) return; // already correct

  if (state.notesMode) {
    if (state.values[i] !== 0) return;
    state.history.push({ i, value: state.values[i], notes: new Set(state.notes[i]) });
    const set = state.notes[i];
    set.has(n) ? set.delete(n) : set.add(n);
    render();
    return;
  }

  state.history.push({ i, value: state.values[i], notes: new Set(state.notes[i]) });
  state.values[i] = n;
  state.notes[i].clear();

  if (n !== state.solution[i]) {
    state.mistakes++;
    if (state.mistakes >= MAX_MISTAKES) return endGame(false);
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

function checkWin() {
  if (state.values.every((v, i) => v === state.solution[i])) endGame(true);
}

function endGame(won) {
  state.over = true;
  clearInterval(state.timer);
  render();
  overlayTitle.textContent = won ? "Selamat! 🎉" : "Game over";
  overlayText.textContent = won
    ? `Kamu menyelesaikan level ${LEVELS[state.level].label} dalam ${formatTime(state.seconds)}.`
    : `Kamu sudah salah ${MAX_MISTAKES} kali. Coba lagi?`;
  overlay.classList.remove("hidden");
}

// ---------- Render ----------
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

    if (v) {
      cell.textContent = v;
    } else if (state.notes[i].size) {
      cell.innerHTML = `<div class="notes-grid">${
        [1,2,3,4,5,6,7,8,9].map(n => `<span>${state.notes[i].has(n) ? n : ""}</span>`).join("")
      }</div>`;
    } else {
      cell.textContent = "";
    }
  });

  // Numpad: show how many of each number remain
  numButtons.forEach((btn, k) => {
    const n = k + 1;
    const placed = state.values.filter((v, i) => v === n && v === state.solution[i]).length;
    btn.querySelector("small").textContent = 9 - placed || "";
    btn.classList.toggle("done", placed === 9);
  });

  mistakesEl.textContent = `Salah: ${state.mistakes}/${MAX_MISTAKES}`;
  hintCountEl.textContent = state.hints;
  hintBtn.disabled = state.hints <= 0;
  notesBtn.classList.toggle("on", state.notesMode);
  notesStateEl.textContent = state.notesMode ? "On" : "Off";
}

// ---------- Events ----------
document.querySelectorAll(".level").forEach(btn =>
  btn.addEventListener("click", () => newGame(btn.dataset.level)));
document.getElementById("new-game").addEventListener("click", () => newGame());
document.getElementById("overlay-btn").addEventListener("click", () => newGame());
document.getElementById("erase").addEventListener("click", erase);
document.getElementById("undo").addEventListener("click", undo);
hintBtn.addEventListener("click", hint);
notesBtn.addEventListener("click", () => {
  state.notesMode = !state.notesMode;
  render();
});

document.addEventListener("keydown", e => {
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

newGame("easy");
