// Run with:  node test/dbscan.test.js   (no dependencies needed)
const assert = require('assert');
const { solveDBSCAN, parsePoints, distance, DbscanMode } = require('../js/dbscan.js');

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('ok -', name); };

const DATA = 'A(1,1),B(2,1),C(2,2),D(8,8),E(8,9),F(9,8),G(25,25),H(3.4,2)';

test('Euclidean and Manhattan distance', () => {
  const [a, , c] = parsePoints('A(1,1),B(2,1),C(2,2)');
  assert.strictEqual(distance(a, c, 1).value, 2);
  assert.ok(Math.abs(distance(a, c, 2).value - Math.SQRT2) < 1e-9);
});

test('two clusters, one border point, one noise point', () => {
  const r = solveDBSCAN({ points: parsePoints(DATA), eps: 1.5, minPts: 3, method: 2 });
  assert.strictEqual(r.clusters, 2);
  assert.deepStrictEqual(r.labels, [1, 1, 1, 2, 2, 2, 0, 1]);
  assert.deepStrictEqual(r.type, ['C*', 'C*', 'C*', 'C*', 'C*', 'C*', 'N', 'B']);
});

test('larger MinPts turns everything into noise', () => {
  const r = solveDBSCAN({ points: parsePoints(DATA), eps: 1.5, minPts: 10, method: 2 });
  assert.strictEqual(r.clusters, 0);
  assert.ok(r.type.every((t) => t === 'N'));
});

test('auto names never repeat', () => {
  const names = parsePoints('A(1,1),(2,2),(3,3)').map((p) => p.name);
  assert.deepStrictEqual(names, ['A', 'B', 'C']);
});

test('point-by-point entry: "x y", x then y, "x,y", empty = finish', () => {
  const m = new DbscanMode();
  m.submit('2');                  // Euclidean
  m.submit('1 1');                // A
  m.submit('2'); m.submit('1');   // B (x, then y)
  m.submit('2,2');                // C
  m.submit('');                   // finish points
  m.submit('1.5'); m.submit('2'); // eps, MinPts
  assert.strictEqual(m.state, 'RESULT');
  assert.deepStrictEqual(m.points.map((p) => p.name), ['A', 'B', 'C']);
  assert.strictEqual(m.result.clusters, 1);
});

test('undo removes the last point; finishing needs 2 points', () => {
  const m = new DbscanMode();
  m.submit('1'); m.submit('5,5'); m.submit('6,6');
  m.undo();
  assert.strictEqual(m.points.length, 1);
  assert.throws(() => m.submit(''), /at least 2/);
});

test('MinPts = 1 makes every point a core point', () => {
  const r = solveDBSCAN({ points: parsePoints(DATA), eps: 1.5, minPts: 1, method: 2 });
  assert.strictEqual(r.clusters, 3);
  assert.ok(r.type.every((t) => t === 'C*'));
});

test('duplicate points with eps = 0', () => {
  const r = solveDBSCAN({ points: parsePoints('A(1,1),B(1,1),C(5,5)'), eps: 0, minPts: 2, method: 2 });
  assert.deepStrictEqual(r.labels, [1, 1, 0]);
});

test('a point exactly eps away counts as a neighbour', () => {
  const r = solveDBSCAN({ points: parsePoints('A(0,0),B(1,0)'), eps: 1, minPts: 2, method: 2 });
  assert.strictEqual(r.clusters, 1);
});

test('Manhattan and Euclidean can disagree', () => {
  const P = parsePoints('A(0,0),B(1,1)');
  assert.strictEqual(solveDBSCAN({ points: P, eps: 1.5, minPts: 2, method: 2 }).clusters, 1);
  assert.strictEqual(solveDBSCAN({ points: P, eps: 1.5, minPts: 2, method: 1 }).clusters, 0);
});

test('3-D points work too', () => {
  const r = solveDBSCAN({ points: parsePoints('A(0,0,0),B(1,1,1),C(9,9,9)'), eps: 2, minPts: 2, method: 2 });
  assert.deepStrictEqual(r.type, ['C*', 'C*', 'N']);
});

test('bad input is rejected, not silently skipped', () => {
  assert.throws(() => parsePoints('A(1,1),B(2,x)'), /Bad point/);
  assert.throws(() => parsePoints('A(1,1),A(2,2)'), /Duplicate/);
  assert.throws(() => parsePoints('A(1,1)'), /at least 2/);
  assert.throws(() => parsePoints('A(1,1),B(2,2,2)'), /same dimensions/);
});

console.log(`\n${passed} tests passed`);