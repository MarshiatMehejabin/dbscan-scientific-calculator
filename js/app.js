const exprEl = document.getElementById("expr");
const resEl = document.getElementById("result");
const statEl = document.getElementById("status");
const displayEl = document.querySelector(".display");
const plotEl = document.getElementById("plot");

// scatter plot under the calculator, only on the DBSCAN result screens (2-D data)
function updatePlot() {
  const show = modeName === "DBSCAN" && wiz && wiz.state === "RESULT" && !inMenu && wiz.points[0].c.length === 2;
  plotEl.innerHTML = show ? plotClusters(wiz.points, wiz.result) : "";
}

// sample data so visitors can try the DBSCAN mode immediately
const SAMPLE = { points: "A(1,1),B(2,1),C(2,2),D(8,8),E(8,9),F(9,8),G(13,3),H(3.4,2)", eps: "1.5", minPts: "3" };
function loadSample() {
  if (off) turnOn();
  inMenu = false; popup = null; ask = null; items = []; cur = 0; wizError = "";
  switchMode("DBSCAN");
  wiz.ac();                                   // start from the method menu
  wiz.submit("2");                            // Euclidean
  wiz.submit(SAMPLE.points);
  wiz.submit(SAMPLE.eps);
  wiz.submit(SAMPLE.minPts);
  render();
}
document.getElementById("sample").onclick = loadSample;

// ---------- state ----------
let items = [];          // expression pieces: ["sin(", "3", "0", ")"]
let cur = 0;             // cursor position
let shift = false, alpha = false, hyp = false;
let pending = null;      // "STO" | "RCL"
let justEval = false;
let lastResult = null;
let fracMode = false;
let history = [], hIdx = 0;
let flashTimer = null;

// modes
const MODE_LIST = ["COMP", "CMPLX", "STAT", "BASE-N", "EQN", "MATRIX", "TABLE", "VECTOR", "DBSCAN"];
let modeName = "COMP";   // current mode
let inMenu = false;      // MODE menu is open
let wiz = null;          // DbscanMode or Wizard instance (null in COMP)
let wizError = "";
let popup = null;        // small pick-a-number menu (CONST, CONV, DRG▸)
let ask = null;          // CALC / SOLVE waiting for a value of X
let off = false;         // SHIFT + AC turns the calculator off, ON turns it on
let overwrite = false;   // INS key toggles insert / overwrite
let engExp = null;       // current exponent for the ENG key

const makeMode = n => n === "DBSCAN" ? new DbscanMode() : new Wizard(MODE_DEFS[n]);
const kindOf = s => s === "RESULT" ? "RESULT" : (s === "METHOD" || s === "MENU") ? "MENU" : "TYPING";

const BINARY_OPS = ["+", "*", "/", "^", "^2", "^3", "^(-1)", "!", "%", "nPr", "nCr", "*10^", "root"];
const PRETTY = {
  "*": "×", "/": "÷", "root": "ˣ√", "Int(": "∫(", "dydx(": "d/dx(", "Sum(": "Σ(", "logb(": "logₐ(", "sqrt(": "√(", "cbrt(": "∛(", "asin(": "sin⁻¹(", "acos(": "cos⁻¹(",
  "atan(": "tan⁻¹(", "pi": "π", "^2": "²", "^3": "³", "^(-1)": "⁻¹", "*10^": "×10^", "abs(": "Abs("
};
const pretty = s => PRETTY[s] || s;
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

// ---------- build keyboard ----------
function makeKey(k) {
  const cell = document.createElement("div");
  cell.className = "cell";
  const legend = document.createElement("div");
  legend.className = "legend";
  legend.innerHTML = `<span class="sh">${k.sl || ""}</span><span class="al">${k.al || ""}</span>`;
  const btn = document.createElement("button");
  btn.className = k.cls;
  btn.textContent = k.l;
  btn.onclick = () => press(k);
  if (k.l === "SHIFT") btn.id = "btnShift";
  if (k.l === "ALPHA") btn.id = "btnAlpha";
  cell.append(legend, btn);
  return cell;
}
function makePad() {
  const pad = document.createElement("div");
  pad.className = "pad";
  [["▲", "@UP", "u"], ["◀", "@LEFT", "l"], ["▶", "@RIGHT", "r"], ["▼", "@DOWN", "d"]].forEach(([s, cmd, pos]) => {
    const b = document.createElement("button");
    b.textContent = s; b.className = "arrow " + pos;
    b.onclick = () => press({ c: cmd });
    pad.appendChild(b);
  });
  return pad;
}
const topEl = document.getElementById("top");
TOP_KEYS.forEach(k => topEl.appendChild(k ? makeKey(k) : makePad()));
BOTTOM_KEYS.forEach(k => document.getElementById("bottom").appendChild(makeKey(k)));

// ---------- helpers ----------
function insert(text) {
  if (overwrite && cur < items.length) items[cur] = text;
  else items.splice(cur, 0, text);
  cur++;
}
function flash(msg) {
  const keep = resEl.textContent;
  resEl.textContent = msg;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { resEl.textContent = keep; }, 1200);
}
function formatNumber(r) {
  if (r !== 0 && (Math.abs(r) >= 1e10 || Math.abs(r) < 1e-9))
    return r.toExponential().replace("e+", "×10^").replace("e-", "×10^-");
  return String(r);
}
function currentValue() {
  if (items.length) return evaluate(items.join(""));
  return lastResult ?? 0;
}
function startNewIfNeeded(cmd, key) {
  if (!justEval) return;
  justEval = false;
  const isOp = BINARY_OPS.includes(cmd) || (cmd === "-" && key.l === "−");
  items = isOp ? ["Ans"] : [];
  cur = items.length;
}
function leaveResultMode() {
  if (justEval) { justEval = false; cur = items.length; }
}

// ---------- main key handler ----------
function press(key) {
  if (off) { if (key.c === "@ON") turnOn(); return; }   // switched off: only ON works
  let cmd = key.c;
  if (cmd === "@ON") return turnOn();

  // 1. SHIFT / ALPHA toggles
  if (cmd === "@SHIFT") { shift = !shift; alpha = false; return render(); }
  if (cmd === "@ALPHA") { alpha = !alpha; shift = false; return render(); }

  // 2. STO / RCL waiting for a variable key (COMP only)
  if (pending) {
    const v = key.ac;
    const mode = pending;
    pending = null; shift = alpha = false;
    if (v && /^[A-Z]$/.test(v) && v in Calc.vars) {
      if (mode === "STO") { Calc.vars[v] = lastResult ?? Calc.ans; flash(v + " = " + formatNumber(Calc.vars[v])); }
      else { startNewIfNeeded(v, key); insert(v); }
    }
    return render();
  }

  // 3. pick the layer (normal / shift / alpha)
  if (shift) cmd = key.sc;
  else if (alpha) cmd = key.ac;
  shift = alpha = false;
  if (cmd == null || cmd === "") return render();
  if (cmd === "@OFF") return turnOff();

  // 4. MODE key and mode-specific handlers
  if (cmd === "@MODE") { inMenu = true; pending = null; hyp = false; ask = null; popup = null; return render(); }
  if (cmd.startsWith("@GO:")) return goMode(cmd.slice(4));
  if (inMenu) return menuKey(cmd);
  if (popup) return popupKey(cmd);
  if (ask) return askKey(cmd);
  if (modeName !== "COMP") return wizKey(cmd);

  // 5. COMP: actions
  if (cmd[0] === "@") { action(cmd, key); return render(); }

  // 6. COMP: text insertion
  if (hyp && ["sin(", "cos(", "tan("].includes(cmd)) cmd = cmd.replace("(", "h(");
  hyp = false;
  startNewIfNeeded(cmd, key);
  insert(cmd);
  render();
}

// ---------- MODE menu ----------
function menuKey(cmd) {
  const n = /^[1-9]$/.test(cmd) ? MODE_LIST[parseInt(cmd) - 1] : null;
  if (n) {
    switchMode(n);
    inMenu = false;
  } else if (cmd === "@AC") {
    inMenu = false;                       // cancel
  }
  render();
}

// SHIFT + AC: screen goes blank and every key is dead except ON
function turnOff() {
  off = true;
  shift = alpha = hyp = false; pending = null; popup = null; ask = null; inMenu = false;
  clearTimeout(flashTimer);
  render();
}
// ON: wake up with everything cleared: expression, history, memory, Ans, and back to COMP mode
function turnOn() {
  off = false;
  items = []; cur = 0; justEval = false; lastResult = null; fracMode = false; engExp = null;
  history = []; hIdx = 0; overwrite = false; wizError = "";
  shift = alpha = hyp = false; pending = null; popup = null; ask = null; inMenu = false;
  Object.keys(Calc.vars).forEach(k => Calc.vars[k] = 0);
  Calc.ans = 0;
  wiz = null; modeName = "COMP";
  resEl.textContent = "0";
  render();
}

function switchMode(n) {
  if (n === modeName) return;
  items = []; cur = 0; justEval = false; wizError = ""; ask = null; popup = null;
  resEl.textContent = "0";
  wiz = n === "COMP" ? null : makeMode(n);
  modeName = n;
}
function goMode(n) { inMenu = false; switchMode(n); render(); }

// ---------- small pick-a-number menus: CONST, CONV, DRG▸ ----------
const CONSTS = ["299792458", "9.80665", "6.62607015*10^(-34)", "1.602176634*10^(-19)", "1.380649*10^(-23)",
  "6.02214076*10^23", "8.314462618", "6.6743*10^(-11)", "9.1093837015*10^(-31)"];
const CONVS = [v => v * 2.54, v => v / 2.54, v => v * 0.3048, v => v / 0.3048, v => v * 0.45359237,
  v => v / 0.45359237, v => v * 9 / 5 + 32, v => (v - 32) * 5 / 9, v => v * 1.609344];
const RADS = [null, Math.PI / 180, 1, Math.PI / 200];   // 1:degree 2:radian 3:gradian

function popupKey(cmd) {
  try {
    if (/^[1-9]$/.test(cmd) && popup.pick(parseInt(cmd))) popup = null;
    else if (cmd === "@AC") popup = null;
  } catch (e) { popup = null; flash(e.message); }
  render();
}
function setResultValue(r) {              // put a number in the expression and evaluate it
  items = [String(Number(r.toPrecision(12)))]; cur = 1; equals();
}

// ---------- CALC / SOLVE: ask for X ----------
function askKey(cmd) {
  if (cmd === "@AC") { items = ask.expr; cur = items.length; ask = null; return render(); }
  if (cmd === "@EQ") {
    try { runAsk(items.length ? evaluate(items.join("")) : 0); }
    catch (e) { flash(e.message); }
    return render();
  }
  if (cmd === "@DEL") { if (cur > 0) { items.splice(cur - 1, 1); cur--; } }
  else if (cmd === "@LEFT") { if (cur > 0) cur--; }
  else if (cmd === "@RIGHT") { if (cur < items.length) cur++; }
  else if (cmd[0] !== "@") insert(cmd);
  render();
}
function runAsk(v) {
  const kind = ask.kind, expr = ask.expr, src = expr.join("");
  const keep = Calc.vars.X;
  let r;
  try {
    if (kind === "@CALC") { Calc.vars.X = v; r = evaluate(src); }
    else r = solveFor(src, v);
  } finally { Calc.vars.X = keep; }
  if (kind === "@SOLVE") Calc.vars.X = r;          // the root is stored in X
  items = expr; cur = items.length; ask = null;
  Calc.ans = lastResult = r;
  resEl.textContent = (kind === "@SOLVE" ? "X=" : "") + formatNumber(r);
  justEval = true; fracMode = false; engExp = null;
}
// solve  expression = 0  for X (Newton's method, start value x0)
function solveFor(src, x0) {
  const f = x => { Calc.vars.X = x; return evaluate(src); };
  let x = x0;
  for (let k = 0; k < 100; k++) {
    const fx = f(x);
    if (Math.abs(fx) < 1e-12) return Number(x.toPrecision(12));
    const h = 1e-6 * Math.max(1, Math.abs(x));
    const d = (f(x + h) - f(x - h)) / (2 * h);
    if (!d || !Number.isFinite(d)) break;
    const nx = x - fx / d;
    if (!Number.isFinite(nx)) break;
    if (Math.abs(nx - x) < 1e-13 * Math.max(1, Math.abs(x))) {
      if (Math.abs(f(nx)) < 1e-9) return Number(nx.toPrecision(12));
      break;
    }
    x = nx;
  }
  throw new Error("Can't Solve");
}

// ENG key: show the result with an exponent that is a multiple of 3
function engStep(d) {
  if (!justEval || !lastResult) return;
  if (engExp === null) engExp = Math.floor(Math.log10(Math.abs(lastResult)) / 3) * 3 + (d < 0 ? d : 0);
  else engExp += d;
  resEl.textContent = toEng(lastResult, engExp);
}

// ---------- wizard modes (CMPLX ... DBSCAN) ----------
function wizKey(cmd) {
  try {
    const kind = kindOf(wiz.state);
    if (cmd === "@AC") {
      wiz.ac(); items = []; cur = 0;
    } else if (kind === "RESULT") {
      if (cmd === "@DOWN" || cmd === "@RIGHT" || cmd === "@EQ") wiz.next();
      else if (cmd === "@UP" || cmd === "@LEFT") wiz.prev();
    } else if (kind === "MENU") {
      if (/^\d$/.test(cmd)) wiz.submit(cmd);
    } else {                              // typing
      if (cmd === "@EQ") {
        // DBSCAN allows an empty "=" while entering points (it means "finished")
        if (items.length || wiz.allowEmpty) { wiz.submit(items.join("")); items = []; cur = 0; }
      } else if (cmd === "@DEL") { if (cur > 0) { items.splice(cur - 1, 1); cur--; } }
      else if (cmd === "@LEFT") { if (cur > 0) cur--; }
      else if (cmd === "@RIGHT") { if (cur < items.length) cur++; }
      else if (cmd === "@UP") { if (wiz.undo) wiz.undo(); }   // DBSCAN: remove last point
      else if (cmd[0] !== "@") insert(cmd);
    }
    wizError = "";
  } catch (e) {
    wizError = e.message;                 // keep typed text so it can be fixed
  }
  render();
}

function renderWiz() {
  const d = wiz.display();
  let html = `<b>${esc(d.title)}</b>\n` + d.lines.map(esc).join("\n");
  const typing = kindOf(wiz.state) === "TYPING";
  if (typing) {
    const pre = items.slice(0, cur).map(pretty).join(""), post = items.slice(cur).map(pretty).join("");
    html += "\n" + esc(pre) + '<span class="cur"></span>' + esc(post);
  }
  if (wizError) html += `\n<span class="err">${esc(wizError)}</span>`;
  exprEl.innerHTML = html;
  exprEl.scrollTop = typing ? exprEl.scrollHeight : 0;
  statEl.textContent = [shift ? "S" : "", alpha ? "A" : "", modeName, d.page || ""].filter(Boolean).join(" ");
}

// ---------- COMP actions ----------
function action(cmd, key) {
  switch (cmd) {
    case "@AC": items = []; cur = 0; justEval = false; fracMode = false; hyp = false; pending = null; engExp = null;
                resEl.textContent = "0"; break;
    case "@DEL": leaveResultMode(); if (cur > 0) { items.splice(cur - 1, 1); cur--; } break;
    case "@LEFT": leaveResultMode(); if (cur > 0) cur--; break;
    case "@RIGHT": leaveResultMode(); if (cur < items.length) cur++; break;
    case "@UP": if (history.length && hIdx > 0) { hIdx--; items = history[hIdx].slice(); cur = items.length; justEval = false; } break;
    case "@DOWN": if (hIdx < history.length - 1) { hIdx++; items = history[hIdx].slice(); cur = items.length; justEval = false; } break;
    case "@HYP": hyp = !hyp; break;
    case "@STO": pending = "STO"; break;
    case "@RCL": pending = "RCL"; break;
    case "@ANGLE": { const m = ["DEG", "RAD", "GRAD"]; Calc.angle = m[(m.indexOf(Calc.angle) + 1) % 3]; break; }
    case "@CLR": Object.keys(Calc.vars).forEach(k => Calc.vars[k] = 0); history = []; hIdx = 0; flash("Memory cleared"); break;
    case "@RAN": startNewIfNeeded("0", key); insert((Math.floor(Math.random() * 1000) / 1000).toString()); break;
    case "@M+": case "@M-": try {
        const v = currentValue();
        Calc.vars.M += cmd === "@M+" ? v : -v;
        flash("M = " + formatNumber(Number(Calc.vars.M.toPrecision(12))));
      } catch (e) { flash(e.message); } break;
    case "@SD":
      if (justEval && lastResult !== null) {
        const f = toFraction(lastResult);
        if (f) { fracMode = !fracMode; resEl.textContent = fracMode ? f : formatNumber(lastResult); }
      } break;
    case "@EQ": equals(); break;
    case "@CALC": case "@SOLVE":
      if (items.length) { ask = { kind: cmd, expr: items.slice() }; items = []; cur = 0; justEval = false; }
      break;
    case "@ABC":                          // result -> mixed fraction, otherwise a plain "/"
      if (justEval && lastResult !== null && toMixed(lastResult)) resEl.textContent = toMixed(lastResult);
      else { startNewIfNeeded("/", key); insert("/"); }
      break;
    case "@DMS": {                        // ° then ′ then ″ on repeated presses
      if (justEval) break;
      let seen = "", k = items.length - 1;
      for (; k >= 0 && /^[\d.°′″]$/.test(items[k]); k--) seen += items[k];
      if (k < items.length - 1) insert(!seen.includes("°") ? "°" : !seen.includes("′") ? "′" : "″");
      break;
    }
    case "@TODMS": if (justEval && lastResult !== null) resEl.textContent = toDMS(lastResult); break;
    case "@ENG": engStep(3); break;
    case "@ENGL": engStep(-3); break;
    case "@INS": overwrite = !overwrite; flash(overwrite ? "Overwrite" : "Insert"); break;
    case "@CONST":
      popup = { title: "CONST", lines: ["1:c  2:g  3:h", "4:e  5:kB 6:NA", "7:R  8:G  9:me"],
        pick: n => { startNewIfNeeded("0", {}); CONSTS[n - 1].split(/(\*10\^)/).forEach(p => insert(p)); return true; } };
      break;
    case "@CONV":
      popup = { title: "CONV", lines: ["1:in→cm 2:cm→in 3:ft→m", "4:m→ft  5:lb→kg 6:kg→lb", "7:°C→°F 8:°F→°C 9:mi→km"],
        pick: n => { setResultValue(CONVS[n - 1](currentValue())); return true; } };
      break;
    case "@DRG":
      popup = { title: "DRG▸ from", lines: ["1:° (degrees)", "2:r (radians)", "3:g (grads)"],
        pick: n => {
          if (n > 3) return false;
          const to = { DEG: 1, RAD: 2, GRAD: 3 }[Calc.angle];
          setResultValue(currentValue() * RADS[n] / RADS[to]);
          return true;
        } };
      break;
    case "@TODO": flash("Coming soon"); break;
  }
}

function equals() {
  if (!items.length) return;
  try {
    const r = evaluate(items.join(""));
    Calc.ans = lastResult = r;
    resEl.textContent = formatNumber(r);
    history.push(items.slice()); hIdx = history.length;
    justEval = true; fracMode = false; engExp = null;
  } catch (e) {
    resEl.textContent = e.message;
  }
}

// ---------- render ----------
function render() {
  updatePlot();
  document.getElementById("btnShift").classList.toggle("on", shift);
  document.getElementById("btnAlpha").classList.toggle("on", alpha);
  displayEl.classList.toggle("off", off);
  if (off) {                              // switched off: blank screen
    exprEl.textContent = ""; resEl.textContent = ""; statEl.textContent = ""; plotEl.innerHTML = "";
    return;
  }
  displayEl.classList.toggle("mini", inMenu || modeName !== "COMP" || !!popup || !!ask);

  if (inMenu) {
    statEl.textContent = "MODE";
    exprEl.textContent = "1:COMP    2:CMPLX\n3:STAT    4:BASE-N\n5:EQN     6:MATRIX\n7:TABLE   8:VECTOR\n9:DBSCAN";
    exprEl.scrollTop = 0;
    return;
  }
  if (popup) {
    statEl.textContent = popup.title;
    exprEl.textContent = popup.lines.join("\n");
    exprEl.scrollTop = 0;
    return;
  }
  if (ask) {
    const pre = items.slice(0, cur).map(pretty).join(""), post = items.slice(cur).map(pretty).join("");
    statEl.textContent = ask.kind === "@CALC" ? "CALC" : "SOLVE";
    exprEl.innerHTML = esc(ask.kind === "@CALC" ? "X = ?" : "Start X = ?") + "\n" + esc(pre) + '<span class="cur"></span>' + esc(post);
    exprEl.scrollTop = 0;
    return;
  }
  if (modeName !== "COMP") return renderWiz();

  const pre = items.slice(0, cur).map(pretty).join("");
  const post = items.slice(cur).map(pretty).join("");
  exprEl.innerHTML = esc(pre) + '<span class="cur"></span>' + esc(post);
  exprEl.scrollLeft = exprEl.scrollWidth;
  statEl.textContent = [shift ? "S" : "", alpha ? "A" : "", hyp ? "hyp" : "",
    pending ? pending + "▸" : "", overwrite ? "OVR" : "", Calc.vars.M ? "M" : "", Calc.angle[0]].filter(Boolean).join(" ");
}

// ---------- computer keyboard ----------
document.addEventListener("keydown", e => {
  const map = { Enter: "@EQ", "=": "@EQ", Backspace: "@DEL", Escape: "@AC",
    ArrowLeft: "@LEFT", ArrowRight: "@RIGHT", ArrowUp: "@UP", ArrowDown: "@DOWN" };
  let cmd = map[e.key];
  if (!cmd && /^[0-9.+\-*/^()!%]$/.test(e.key)) cmd = e.key;
  // letters, commas and spaces are allowed in the typing modes (names, i, hex, "1 1" ...)
  if (!cmd && modeName !== "COMP" && !inMenu && !e.ctrlKey && !e.metaKey && /^[A-Za-z, ]$/.test(e.key)) cmd = e.key;
  if (!cmd) return;
  e.preventDefault();
  press({ c: cmd, l: e.key === "-" ? "−" : e.key });
});

render();