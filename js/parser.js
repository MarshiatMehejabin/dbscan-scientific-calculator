const Calc = {
  angle: "DEG",
  ans: 0,
  vars: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, X: 0, Y: 0, M: 0 }
};

const TOKEN_RE = /\d+\.?\d*|\.\d+|nPr|nCr|asin|acos|atan|sinh|cosh|tanh|sin|cos|tan|logb|log|ln|sqrt|cbrt|abs|Ans|pi|Rnd|Pol|Rec|Sum|Int|dydx|root|[A-Za-z]|\S/g;
const MATH_ERR = () => new Error("Math ERROR");
const SYNTAX_ERR = () => new Error("Syntax ERROR");

function evaluate(src) {
  // degrees-minutes-seconds input: 12°30′15″  ->  (12+30/60+15/3600)
  src = src.replace(/(\d+\.?\d*|\.\d+)°(?:(\d+\.?\d*)′)?(?:(\d+\.?\d*)″)?/g,
    (m, d, mi, s) => `(${d}+${mi || 0}/60+${s || 0}/3600)`);

  const t = src.match(TOKEN_RE) || [];
  let i = 0;
  const peek = () => t[i];
  const next = () => t[i++];

  const toRad = x => Calc.angle === "DEG" ? x * Math.PI / 180
                   : Calc.angle === "GRAD" ? x * Math.PI / 200 : x;
  const fromRad = x => Calc.angle === "DEG" ? x * 180 / Math.PI
                     : Calc.angle === "GRAD" ? x * 200 / Math.PI : x;
  const snap = v => Math.abs(v) < 1e-14 ? 0 : v;

  const fns = {
    sin: x => snap(Math.sin(toRad(x))),
    cos: x => snap(Math.cos(toRad(x))),
    tan: x => {
      const full = Calc.angle === "DEG" ? 180 : Calc.angle === "GRAD" ? 200 : Math.PI;
      const q = Math.abs(x % full);
      if (Math.abs(q - full / 2) < 1e-12) throw MATH_ERR();
      return snap(Math.tan(toRad(x)));
    },
    asin: x => fromRad(Math.asin(x)),
    acos: x => fromRad(Math.acos(x)),
    atan: x => fromRad(Math.atan(x)),
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    log: Math.log10, ln: Math.log,
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
    Rnd: x => Number(x.toPrecision(10))
  };

  // two-argument functions: name(a,b)
  const fns2 = {
    logb: (a, b) => { if (a <= 0 || a === 1 || b <= 0) throw MATH_ERR(); return Math.log(b) / Math.log(a); },
    Pol: (x, y) => {                       // result r, angle goes to Y
      const r = Math.hypot(x, y);
      Calc.vars.X = r; Calc.vars.Y = fromRad(Math.atan2(y, x));
      return r;
    },
    Rec: (r, th) => {                      // result x, y goes to Y
      const a = toRad(th);
      Calc.vars.X = snap(r * Math.cos(a)); Calc.vars.Y = snap(r * Math.sin(a));
      return Calc.vars.X;
    }
  };

  const isInt = n => Number.isInteger(n);
  const fact = n => {
    if (n < 0 || !isInt(n) || n > 170) throw MATH_ERR();
    let r = 1; for (let k = 2; k <= n; k++) r *= k; return r;
  };
  const nPr = (n, r) => {
    if (!isInt(n) || !isInt(r) || r < 0 || r > n) throw MATH_ERR();
    let v = 1; for (let k = 0; k < r; k++) v *= (n - k); return v;
  };
  const nCr = (n, r) => {
    if (!isInt(n) || !isInt(r) || r < 0 || r > n) throw MATH_ERR();
    r = Math.min(r, n - r);
    let v = 1; for (let k = 1; k <= r; k++) v = v * (n - r + k) / k; return Math.round(v);
  };
  const nthRoot = (n, x) => {              // n root x
    if (n === 0) throw MATH_ERR();
    if (x < 0) {
      if (isInt(n) && n % 2 !== 0) return -Math.pow(-x, 1 / n);
      throw MATH_ERR();
    }
    return Math.pow(x, 1 / n);
  };

  // --- Sum / Int / dydx: the first argument is a formula in X, so we keep it as text ---
  const lazyArg = () => {                  // source text up to a top-level "," or ")"
    let d = 0; const s = [];
    while (i < t.length) {
      const p = t[i];
      if (p === "(") d++;
      else if (p === ")") { if (d === 0) break; d--; }
      else if (p === "," && d === 0) break;
      s.push(next());
    }
    return s.join("");
  };
  const withX = (f, x) => {
    const keep = Calc.vars.X; Calc.vars.X = x;
    try { return evaluate(f); } finally { Calc.vars.X = keep; }
  };
  const calculus = (kind, f, a, b) => {
    if (kind === "Sum") {                  // Sum(f, from, to), f uses X
      if (!isInt(a) || !isInt(b) || b < a || b - a > 100000) throw MATH_ERR();
      let s = 0; for (let k = a; k <= b; k++) s += withX(f, k);
      return s;
    }
    if (kind === "Int") {                  // Int(f, a, b): Simpson's rule
      if (a === b) return 0;
      const n = 2000, h = (b - a) / n;
      let s = withX(f, a) + withX(f, b);
      for (let k = 1; k < n; k++) s += withX(f, a + k * h) * (k % 2 ? 4 : 2);
      return s * h / 3;
    }
    const h = 1e-3 * Math.max(1, Math.abs(a));   // dydx(f, x0): 5-point derivative
    return (-withX(f, a + 2 * h) + 8 * withX(f, a + h) - 8 * withX(f, a - h) + withX(f, a - 2 * h)) / (12 * h);
  };

  function expr() {
    let v = term();
    while (peek() === "+" || peek() === "-") {
      const op = next(), r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  function term() {
    let v = perm();
    while (true) {
      const p = peek();
      if (p === "*" || p === "/") {
        next(); const r = perm();
        if (p === "/" && r === 0) throw MATH_ERR();
        v = p === "*" ? v * r : v / r;
      } else if (p && /^[\d.A-Za-z(]/.test(p)) {   // implicit multiplication: 2pi, 3(4), 2A
        v *= perm();
      } else break;
    }
    return v;
  }
  function perm() {
    let v = unary();
    while (peek() === "nPr" || peek() === "nCr") {
      const op = next(), r = unary();
      v = op === "nPr" ? nPr(v, r) : nCr(v, r);
    }
    return v;
  }
  function unary() {
    if (peek() === "-") { next(); return -unary(); }
    if (peek() === "+") { next(); return unary(); }
    return power();
  }
  function power() {
    const b = postfix();
    if (peek() === "^") { next(); return Math.pow(b, unary()); }
    if (peek() === "root") { next(); return nthRoot(b, unary()); }
    return b;
  }
  function postfix() {
    let v = atom();
    while (peek() === "!" || peek() === "%") {
      v = next() === "!" ? fact(v) : v / 100;
    }
    return v;
  }
  function atom() {
    const x = next();
    if (x === undefined) throw SYNTAX_ERR();
    if (x === "(") { const v = expr(); if (peek() === ")") next(); return v; }
    if (/^[\d.]/.test(x)) return parseFloat(x);
    if (x === "pi") return Math.PI;
    if (x === "e") return Math.E;
    if (x === "Ans") return Calc.ans;
    if (/^[A-Z]$/.test(x) && x in Calc.vars) return Calc.vars[x];
    if (x === "Sum" || x === "Int" || x === "dydx") {
      if (next() !== "(") throw SYNTAX_ERR();
      const f = lazyArg();
      if (next() !== ",") throw SYNTAX_ERR();
      const a = expr();
      let b = null;
      if (x !== "dydx") { if (next() !== ",") throw SYNTAX_ERR(); b = expr(); }
      if (peek() === ")") next();
      return calculus(x, f, a, b);
    }
    if (fns2[x]) {
      if (next() !== "(") throw SYNTAX_ERR();
      const p = expr();
      if (next() !== ",") throw SYNTAX_ERR();
      const q = expr();
      if (peek() === ")") next();
      return fns2[x](p, q);
    }
    if (fns[x]) {
      if (next() !== "(") throw SYNTAX_ERR();
      const v = expr(); if (peek() === ")") next();
      return fns[x](v);
    }
    throw SYNTAX_ERR();
  }

  const result = expr();
  if (i < t.length) throw SYNTAX_ERR();
  if (!Number.isFinite(result)) throw MATH_ERR();
  return Number(result.toPrecision(12));
}

// Decimal -> fraction (for the S<=>D key). Returns "a/b" or null.
function toFraction(x) {
  if (!Number.isFinite(x) || Number.isInteger(x)) return null;
  const sign = x < 0 ? -1 : 1, ax = Math.abs(x);
  let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = ax;
  for (let n = 0; n < 40; n++) {
    const a = Math.floor(b);
    [h1, h0] = [a * h1 + h0, h1];
    [k1, k0] = [a * k1 + k0, k1];
    if (k1 > 9999) return null;
    if (Math.abs(ax - h1 / k1) < 1e-10 * Math.max(1, ax)) break;
    b = 1 / (b - a);
    if (!Number.isFinite(b)) break;
  }
  return (sign * h1) + "/" + k1;
}

// Decimal -> mixed fraction "2 1/3" (for the a b/c key). Returns string or null.
function toMixed(x) {
  const f = toFraction(x);
  if (!f) return null;
  const [n, d] = f.split("/").map(Number);
  const w = Math.trunc(Math.abs(n) / d);
  if (!w) return f;
  return (n < 0 ? "-" : "") + w + " " + (Math.abs(n) - w * d) + "/" + d;
}

// Decimal degrees -> 12°30′15″
function toDMS(x) {
  const s = Math.abs(x) * 3600;
  const d = Math.floor(s / 3600 + 1e-9);
  const m = Math.floor((s - d * 3600) / 60 + 1e-9);
  const sec = +(s - d * 3600 - m * 60).toFixed(2);
  return (x < 0 ? "-" : "") + d + "°" + m + "′" + sec + "″";
}

// Engineering notation: x shown as m×10^e (e is a multiple of 3)
function toEng(x, e) {
  return +(x / Math.pow(10, e)).toPrecision(10) + "×10^" + e;
}