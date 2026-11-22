/* DBSCAN mode for a Casio fx-991ES style calculator clone.
 * No dependencies. Works in browser (<script>) and Node (require).
 *
 * FLOW (state machine):
 *   METHOD -> 1: Manhattan  2: Euclidean
 *   POINTS -> points are added one by one, names A, B, C... come automatically:
 *             type "x,y" and "="   or   type x, "=", type y, "="
 *             "=" on an empty line finishes; ▲ undoes the last point
 *   EPS    -> eps
 *   MINPTS -> MinPts
 *   RESULT -> screens shown one by one; ▼ / = next, ▲ previous
 */

const DBSCAN_METHODS = {
  1: { name: 'Manhattan', formula: '|x1-x2|+|y1-y2|' },
  2: { name: 'Euclidean', formula: '√((x2-x1)²+(y2-y1)²)' },
};

const TOL = 1e-9;
const fmt = (x) => (Number.isInteger(x) ? String(x) : String(+x.toFixed(4)));
// 0 -> A, 1 -> B ... 25 -> Z, 26 -> A1, 27 -> B1 ...
const autoName = (i) => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '');

/* ---------- 1. bulk format "A(1,1),B(2,1)..." (still supported) ---------- */
function parsePoints(text) {
  const used = new Set();
  const raw = [];
  const re = /([A-Za-z][A-Za-z0-9_]*)?\s*\(([^)]*)\)/g;
  let m;
  while ((m = re.exec(text))) {
    const c = m[2].split(/[,\s]+/).filter(Boolean).map(Number);
    if (!c.length || c.some(isNaN)) throw new Error('Bad point: ' + m[0].trim());
    if (m[1]) {
      if (used.has(m[1])) throw new Error('Duplicate name ' + m[1]);
      used.add(m[1]);
    }
    raw.push({ name: m[1], c });
  }
  if (!raw.length) {
    text.split(/\n/).forEach((line) => {
      const c = line.split(/[,\s]+/).filter(Boolean).map(Number);
      if (c.length >= 2 && c.every((v) => !isNaN(v))) raw.push({ name: null, c });
    });
  }
  let auto = 0;
  const pts = raw.map((p) => {
    if (p.name) return p;
    let n;
    do { n = autoName(auto++); } while (used.has(n));
    return { name: n, c: p.c };
  });
  if (pts.length < 2) throw new Error('Need at least 2 points');
  if (new Set(pts.map((p) => p.c.length)).size > 1) throw new Error('All points need same dimensions');
  return pts;
}

/* ---------- 2. distance with step-by-step working ---------- */
function distance(a, b, method) {
  if (method === 1) {
    const terms = a.c.map((v, k) => `|${v}-${b.c[k]}|`).join('+');
    const value = a.c.reduce((s, v, k) => s + Math.abs(v - b.c[k]), 0);
    return { value, working: `${terms}=${fmt(value)}` };
  }
  const sq = a.c.map((v, k) => `(${b.c[k]}-${v})²`).join('+');
  const sum = a.c.reduce((s, v, k) => s + (b.c[k] - v) ** 2, 0);
  const value = Math.sqrt(sum);
  return { value, working: `√(${sq})=√${fmt(sum)}=${fmt(value)}` };
}

/* ---------- 3. full solve -> ordered list of screens ---------- */
function solveDBSCAN({ points: P, eps, minPts, method, countSelf = true }) {
  const n = P.length;
  const M = DBSCAN_METHODS[method].name;
  const D = Array.from({ length: n }, () => Array(n).fill(0));
  const screens = [];

  // (a) every pair, one by one: A to A, A to B, A to C ...
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const r = distance(P[i], P[j], method);
      D[i][j] = D[j][i] = r.value;
      screens.push({
        kind: 'distance',
        title: `${P[i].name} to ${P[j].name}  (${M})`,
        lines: [r.working],
        value: r.value,
      });
    }
  }

  // (b) distance table, one row per screen (lower triangle)
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j <= i; j++) row.push(`${P[j].name}:${fmt(D[i][j])}`);
    screens.push({
      kind: 'matrix',
      title: `Row ${P[i].name} (${P[i].c.join(',')})`,
      lines: [row.join('  ')],
    });
  }

  // (c) neighbours within eps (self excluded in the list)
  const nb = P.map((_, i) =>
    P.map((_, j) => j).filter((j) => j !== i && D[i][j] <= eps + TOL)
  );
  nb.forEach((list, i) =>
    screens.push({
      kind: 'neighbors',
      title: `Neighbors of ${P[i].name} (d≤${fmt(eps)})`,
      lines: [
        `${P[i].name}: ${list.map((j) => P[j].name).join(' ') || '-'}`,
        `Count=${list.length + (countSelf ? 1 : 0)}  MinPts=${minPts}`,
      ],
    })
  );

  // (d) core / border / noise
  const core = nb.map((l) => l.length + (countSelf ? 1 : 0) >= minPts);
  const label = Array(n).fill(0);
  let cid = 0;
  for (let i = 0; i < n; i++) {
    if (label[i] || !core[i]) continue;
    label[i] = ++cid;
    const stack = [i];
    while (stack.length) {
      const x = stack.pop();
      for (const j of nb[x]) {
        if (!label[j]) {
          label[j] = cid;
          if (core[j]) stack.push(j);
        }
      }
    }
  }
  const type = P.map((_, i) => (core[i] ? 'C*' : label[i] ? 'B' : 'N'));
  P.forEach((p, i) =>
    screens.push({
      kind: 'type',
      title: `Point ${p.name}`,
      lines: [
        `${p.name}: ${nb[i].map((j) => P[j].name).join(' ') || '-'}  →  ${type[i]}`,
        type[i] === 'C*' ? 'Core point' : type[i] === 'B' ? 'Border point' : 'Noise',
      ],
    })
  );

  // (e) final
  const lines = [];
  for (let c = 1; c <= cid; c++)
    lines.push(`Cluster ${c}: ${P.filter((_, i) => label[i] === c).map((p) => p.name).join(' ')}`);
  lines.push(`Noise: ${P.filter((_, i) => !label[i]).map((p) => p.name).join(' ') || 'none'}`);
  screens.push({ kind: 'final', title: 'RESULT', lines });

  return { screens, D, neighbors: nb, type, labels: label, clusters: cid };
}

/* ---------- 4. calculator mode controller ---------- */
class DbscanMode {
  constructor() { this.reset(); }

  reset() {
    this.state = 'METHOD';
    this.method = null;
    this.points = [];
    this.px = null;          // x typed alone, waiting for y
    this.eps = null;
    this.minPts = null;
    this.result = null;
    this.idx = 0;
  }

  /** In POINTS state an empty "=" is allowed (it means "finished"). */
  get allowEmpty() { return this.state === 'POINTS'; }

  display() {
    switch (this.state) {
      case 'METHOD':
        return { title: 'DBSCAN', lines: ['1:Manhattan', '2:Euclidean'] };
      case 'POINTS': {
        const n = this.points.length, name = autoName(n), last = this.points[n - 1];
        return {
          title: `${DBSCAN_METHODS[this.method].name}  |  ${n} points`,
          lines: [
            this.px === null ? `${name}: x = ?   (or x,y)` : `${name}: x=${fmt(this.px)}   y = ?`,
            last ? `Last: ${last.name}(${last.c.map(fmt).join(',')})   ▲ undo` : 'Type a number, press =',
            '= on empty line: finish',
          ],
        };
      }
      case 'EPS': return { title: 'DBSCAN', lines: ['Eps (ε) = ?'] };
      case 'MINPTS': return { title: 'DBSCAN', lines: ['MinPts = ?'] };
      case 'RESULT': {
        const s = this.result.screens[this.idx];
        return { title: s.title, lines: s.lines, page: `${this.idx + 1}/${this.result.screens.length}` };
      }
    }
  }

  /** Add one entry in the POINTS state. */
  addPoint(t) {
    if (t.includes('(')) {                       // bulk format A(1,1),B(2,2)
      this.points = parsePoints(t); this.px = null; this.state = 'EPS'; return;
    }
    if (t === '') {                              // finished
      if (this.px !== null) throw new Error('Enter y first');
      if (this.points.length < 2) throw new Error('Need at least 2 points');
      this.state = 'EPS'; return;
    }
    const nums = t.split(/[,\s]+/).filter(Boolean).map(Number);
    if (nums.some((v) => !Number.isFinite(v))) throw new Error('Not a number');
    const dim = this.points.length ? this.points[0].c.length : null;
    if (this.px !== null) {                      // second half of a 2-D point
      if (nums.length !== 1) throw new Error('Enter only y');
      this.points.push({ name: autoName(this.points.length), c: [this.px, nums[0]] });
      this.px = null; return;
    }
    if (nums.length === 1) {                     // x alone, y comes next
      if (dim !== null && dim !== 2) throw new Error('Need ' + dim + ' values');
      this.px = nums[0]; return;
    }
    if (dim !== null && nums.length !== dim) throw new Error('Need ' + dim + ' values');
    this.points.push({ name: autoName(this.points.length), c: nums });
  }

  /** ▲ in POINTS state: remove the last half-typed or complete point. */
  undo() {
    if (this.state === 'POINTS') { if (this.px !== null) this.px = null; else this.points.pop(); }
    return this.display();
  }

  /** Call with the user's typed value when they press "=". */
  submit(value) {
    switch (this.state) {
      case 'METHOD': {
        const m = parseInt(value);
        if (!DBSCAN_METHODS[m]) throw new Error('Choose 1 or 2');
        this.method = m; this.state = 'POINTS'; break;
      }
      case 'POINTS': this.addPoint(String(value).trim()); break;
      case 'EPS': {
        const t = String(value).trim(), e = Number(t);
        if (t === '' || !Number.isFinite(e) || e < 0) throw new Error('Invalid eps');
        this.eps = e; this.state = 'MINPTS'; break;
      }
      case 'MINPTS': {
        const t = String(value).trim(), k = Number(t);
        if (t === '' || !Number.isInteger(k) || k < 1) throw new Error('Invalid MinPts');
        this.minPts = k;
        this.result = solveDBSCAN({
          points: this.points, eps: this.eps, minPts: k, method: this.method,
        });
        this.idx = 0; this.state = 'RESULT'; break;
      }
      case 'RESULT': this.next(); break;
    }
    return this.display();
  }

  next() {
    if (this.state === 'RESULT' && this.idx < this.result.screens.length - 1) this.idx++;
    return this.display();
  }
  prev() {
    if (this.state === 'RESULT' && this.idx > 0) this.idx--;
    return this.display();
  }
  /** AC key: back to the DBSCAN method menu. */
  ac() { this.reset(); return this.display(); }
}

if (typeof module !== 'undefined') module.exports = { DbscanMode, solveDBSCAN, parsePoints, distance, DBSCAN_METHODS };