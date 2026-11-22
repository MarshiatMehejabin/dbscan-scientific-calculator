// Step-by-step text modes: CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE, VECTOR
class Wizard {
  constructor(def) { this.def = def; this.reset(); }
  reset() { this.vals = []; this.result = null; this.idx = 0; }
  step() { return this.def.steps(this.vals)[this.vals.length]; }
  get state() { return this.result ? "RESULT" : this.step().menu ? "MENU" : "TYPING"; }
  display() {
    if (this.result) {
      const s = this.result[this.idx];
      return { title: s.title, lines: s.lines, page: `${this.idx + 1}/${this.result.length}` };
    }
    return { title: this.def.name, lines: this.step().p };
  }
  submit(v) {
    const s = this.step();
    let val;
    if (s.menu) { val = parseInt(v); if (!(val >= 1 && val <= s.menu)) throw new Error("Choose 1-" + s.menu); }
    else val = s.parse(String(v));
    const vals = [...this.vals, val];
    if (vals.length >= this.def.steps(vals).length) this.result = this.def.solve(vals);
    this.vals = vals; this.idx = 0;
    return this.display();
  }
  next() { if (this.result && this.idx < this.result.length - 1) this.idx++; return this.display(); }
  prev() { if (this.result && this.idx > 0) this.idx--; return this.display(); }
  ac() { this.reset(); return this.display(); }
}

const MODE_DEFS = (() => {
  const R = x => String(+x.toPrecision(10));
  const list = s => s.split(/[,;\s]+/).filter(Boolean).map(evaluate);
  const need = n => s => { const a = list(s); if (a.length !== n) throw new Error("Need " + n + " values"); return a; };
  const MENU = (p, n) => ({ menu: n, p });
  const ASK = (p, parse) => ({ p, parse });
  const ERR = m => new Error(m);

  const cx = s => {
    s = s.replace(/\s/g, "");
    const m = s.match(/^([+-]?\d*\.?\d+(?![\d.]*i))?(?:([+-]?\d*\.?\d*)i)?$/);
    if (!s || !m) throw ERR("Syntax ERROR");
    const re = m[1] ? +m[1] : 0;
    const im = m[2] === undefined ? 0 : (m[2] === "" || m[2] === "+") ? 1 : m[2] === "-" ? -1 : +m[2];
    return [re, im];
  };
  const cstr = ([a, b]) => `${R(a)}${b < 0 ? "-" : "+"}${R(Math.abs(b))}i`;

  const BASES = [10, 16, 2, 8], BN = ["DEC", "HEX", "BIN", "OCT"];
  const OK = [/^-?\d+$/, /^-?[0-9A-F]+$/i, /^-?[01]+$/, /^-?[0-7]+$/];

  const detM = M => M.length === 1 ? M[0][0]
    : M[0].reduce((s, v, j) => s + (j % 2 ? -1 : 1) * v * detM(M.slice(1).map(r => r.filter((_, k) => k !== j))), 0);
  const invM = M => {
    const d = detM(M);
    if (Math.abs(d) < 1e-12) throw ERR("Math ERROR");
    return M.map((_, i) => M.map((_, j) => {
      const m = M.filter((_, r) => r !== j).map(r => r.filter((_, c) => c !== i));
      return ((i + j) % 2 ? -1 : 1) * detM(m) / d;
    }));
  };
  const rows = M => M.map(r => r.map(R).join("  "));
  const dot = (p, q) => p.reduce((s, x, i) => s + x * q[i], 0);
  const mag = p => Math.sqrt(dot(p, p));
  const vec = s => { const a = list(s); if (a.length < 2 || a.length > 3) throw ERR("Need 2 or 3 values"); return a; };

  return {
    CMPLX: {
      name: "CMPLX",
      steps: () => [MENU(["1:+  2:-", "3:×  4:÷"], 4), ASK(["Z1 = ? (3+4i)"], cx), ASK(["Z2 = ?"], cx)],
      solve([op, z1, z2]) {
        const [a, b] = z1, [c, d] = z2; let z;
        if (op === 1) z = [a + c, b + d];
        else if (op === 2) z = [a - c, b - d];
        else if (op === 3) z = [a * c - b * d, a * d + b * c];
        else { const q = c * c + d * d; if (!q) throw ERR("Math ERROR"); z = [(a * c + b * d) / q, (b * c - a * d) / q]; }
        return [
          { title: `${cstr(z1)} ${"+-×÷"[op - 1]} ${cstr(z2)}`, lines: ["= " + cstr(z)] },
          { title: "Polar form", lines: ["|z|=" + R(Math.hypot(z[0], z[1])), "arg=" + R(Math.atan2(z[1], z[0]) * 180 / Math.PI) + "°"] }
        ];
      }
    },
    STAT: {
      name: "STAT 1-VAR",
      steps: () => [ASK(["Data x1,x2,..."], s => { const a = list(s); if (!a.length) throw ERR("No data"); return a; })],
      solve([x]) {
        const n = x.length, S = x.reduce((s, v) => s + v, 0), S2 = x.reduce((s, v) => s + v * v, 0), m = S / n;
        const ss = x.reduce((s, v) => s + (v - m) ** 2, 0), t = [...x].sort((p, q) => p - q);
        const med = n % 2 ? t[(n - 1) / 2] : (t[n / 2 - 1] + t[n / 2]) / 2;
        return [
          { title: "STAT 1-VAR", lines: [`n=${n}  Σx=${R(S)}`, `Σx²=${R(S2)}`, `x̄=${R(m)}`] },
          { title: "Deviation", lines: [`σx=${R(Math.sqrt(ss / n))}`, `sx=${n > 1 ? R(Math.sqrt(ss / (n - 1))) : "-"}`] },
          { title: "Range", lines: [`min=${R(t[0])}  max=${R(t[n - 1])}`, `median=${R(med)}`] }
        ];
      }
    },
    "BASE-N": {
      name: "BASE-N",
      steps: v => [MENU(["1:DEC  2:HEX", "3:BIN  4:OCT"], 4), ASK(["Enter " + BN[v[0] - 1] + " number"], s => {
        s = s.trim(); const k = v[0] - 1;
        if (!OK[k].test(s)) throw ERR("Syntax ERROR");
        return parseInt(s, BASES[k]);
      })],
      solve([, n]) {
        return [{ title: "BASE-N", lines: [`DEC ${n}`, `HEX ${n.toString(16).toUpperCase()}`, `BIN ${n.toString(2)}`, `OCT ${n.toString(8)}`] }];
      }
    },
    EQN: {
      name: "EQN",
      steps: v => [MENU(["1:aX²+bX+c=0", "2:aX+bY=c (2 eq)"], 2),
        v[0] === 2 ? ASK(["a1,b1,c1,a2,b2,c2"], need(6)) : ASK(["a,b,c"], need(3))],
      solve([op, k]) {
        if (op === 1) {
          const [a, b, c] = k; if (!a) throw ERR("Math ERROR");
          const D = b * b - 4 * a * c; let l;
          if (D >= 0) { const s = Math.sqrt(D); l = ["X1=" + R((-b + s) / (2 * a)), "X2=" + R((-b - s) / (2 * a))]; }
          else { const re = -b / (2 * a), im = Math.abs(Math.sqrt(-D) / (2 * a)); l = ["X1=" + cstr([re, im]), "X2=" + cstr([re, -im])]; }
          return [{ title: "Quadratic", lines: l }, { title: "Discriminant", lines: ["Δ=" + R(D)] }];
        }
        const [a1, b1, c1, a2, b2, c2] = k, D = a1 * b2 - a2 * b1;
        if (!D) throw ERR("Math ERROR");
        return [{ title: "2 unknowns", lines: ["X=" + R((c1 * b2 - c2 * b1) / D), "Y=" + R((a1 * c2 - a2 * c1) / D)] }];
      }
    },
    MATRIX: {
      name: "MATRIX",
      steps: v => [MENU(["1:Det  2:Inverse", "3:Transpose"], 3), MENU(["1:2x2  2:3x3"], 2),
        ...(v.length > 1 ? [ASK([`${(v[1] + 1) ** 2} values, row by row`], need((v[1] + 1) ** 2))] : [])],
      solve([op, sz, d]) {
        const n = sz + 1, M = Array.from({ length: n }, (_, i) => d.slice(i * n, i * n + n));
        if (op === 1) return [{ title: `Det ${n}x${n}`, lines: ["= " + R(detM(M))] }];
        if (op === 2) return [{ title: `Inverse ${n}x${n}`, lines: rows(invM(M)) }];
        return [{ title: "Transpose", lines: rows(M[0].map((_, j) => M.map(r => r[j]))) }];
      }
    },
    TABLE: {
      name: "TABLE",
      steps: () => [ASK(["f(X) = ?"], s => s), ASK(["Start?"], evaluate), ASK(["End?"], evaluate), ASK(["Step?"], evaluate)],
      solve([f, a, b, st]) {
        if (st <= 0 || b < a) throw ERR("Math ERROR");
        const out = [], keep = Calc.vars.X;
        try {
          for (let k = 0; k < 30; k++) {
            const x = a + k * st; if (x > b + 1e-9) break;
            Calc.vars.X = x; let y;
            try { y = R(evaluate(f.replace(/x/g, "X"))); } catch (e) { y = "ERR"; }
            out.push(`X=${R(x)}  f=${y}`);
          }
        } finally { Calc.vars.X = keep; }
        const sc = [];
        for (let i = 0; i < out.length; i += 4) sc.push({ title: "TABLE", lines: out.slice(i, i + 4) });
        return sc;
      }
    },
    VECTOR: {
      name: "VECTOR",
      steps: v => [MENU(["1:Dot  2:Cross", "3:|A|  4:Angle"], 4), ASK(["Vector A (x,y,z)"], vec),
        ...(v[0] === 3 ? [] : [ASK(["Vector B (x,y,z)"], vec)])],
      solve([op, a, b]) {
        if (op === 3) return [{ title: "|A|", lines: ["= " + R(mag(a))] }];
        if (a.length !== b.length) throw ERR("Dim ERROR");
        if (op === 1) return [{ title: "A·B", lines: ["= " + R(dot(a, b))] }];
        if (op === 2) {
          if (a.length !== 3) throw ERR("Dim ERROR");
          const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
          return [{ title: "A×B", lines: ["(" + c.map(R).join(", ") + ")"] }];
        }
        const m = mag(a) * mag(b); if (!m) throw ERR("Math ERROR");
        return [{ title: "Angle", lines: ["θ=" + R(Math.acos(Math.max(-1, Math.min(1, dot(a, b) / m))) * 180 / Math.PI) + "°"] }];
      }
    }
  };
})();