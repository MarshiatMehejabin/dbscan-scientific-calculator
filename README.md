# DBSCAN Scientific Calculator

![tests](https://github.com/MarshiatMehejabin/dbscan-scientific-calculator/actions/workflows/test.yml/badge.svg)

A browser-based scientific calculator (fx-991ES style) with a built-in
step-by-step **DBSCAN clustering** mode. Built with vanilla HTML, CSS and
JavaScript: no libraries, no frameworks, no `eval()`.

**Live demo:** https://marshiatmehejabin.github.io/dbscan-scientific-calculator/

<!-- Add a screenshot: ![screenshot](docs/screenshot.png) -->

## Features
- Custom recursive-descent expression parser: operator precedence, implicit
  multiplication (`2pi`), `Ans`, memory variables, DEG/RAD/GRAD, S⇔D fractions
- Extra modes: Complex, Statistics, Base-N, Equations, Matrix, Table, Vector
- Calculus and solver keys: `Σ`, `∫`, `d/dx`, `CALC`, `SOLVE` (Newton's method)
- Also: `ˣ√`, `logₐ`, `Pol`/`Rec`, `Rnd`, `° ′ ″`, `ENG`, `CONST`, `CONV`, `DRG▸`, mixed fractions
- The `∠` key (complex polar input) is still a placeholder and shows "Coming soon"
- **DBSCAN mode** with Manhattan or Euclidean distance. It shows every
  distance calculation, the distance table, neighbour lists, core/border/noise
  labels and the final clusters, one screen at a time

## What is DBSCAN?
DBSCAN (Density-Based Spatial Clustering of Applications with Noise) groups
points that are packed closely together and marks points in sparse regions as
noise. It needs two settings: `eps` (how close points must be to count as
neighbours) and `MinPts` (how many neighbours make a region dense).

- **Core point:** has at least `MinPts` points (itself included) within distance `eps`
- **Border point:** not a core point, but within `eps` of a core point
- **Noise:** neither of the above

Unlike k-means, it does not need the number of clusters in advance, it can find
clusters of any shape, and it flags outliers. It is commonly used for grouping
geographic locations, spotting anomalies and exploring unlabeled data.

## Try it
Click **Load sample dataset** on the demo page (8 points, Euclidean distance,
`eps = 1.5`, `MinPts = 3`). Expected result: Cluster 1 = A B C H, Cluster 2 =
D E F, Noise = G, and H is a border point. For 2-D data a scatter plot of the
clusters appears next to the calculator.

## Using DBSCAN mode
1. Press `MODE`, then `9` (DBSCAN)
2. Choose the distance method (1 Manhattan, 2 Euclidean)
3. Enter points one by one. Names (A, B, C, ...) are added automatically:
   type `x,y` and press `=`, or type `x`, press `=`, type `y`, press `=`.
   `▲` undoes the last point. Press `=` on an empty line when done.
   (Pasting the old `A(1,1),B(2,1)` format still works.)
4. Enter `eps`, then `MinPts`
5. Press `▼` or `=` to step through the working, `▲` to go back

## Project structure
| File | Purpose |
|------|---------|
| `js/parser.js` | Expression parser and evaluator |
| `js/dbscan.js` | DBSCAN algorithm and its calculator mode (also runs in Node) |
| `js/modes.js` | Step-by-step wizard modes (STAT, MATRIX, EQN, ...) |
| `js/keys.js` | Keyboard layout |
| `js/app.js` | State, key handling and rendering |
| `js/plot.js` | SVG scatter plot of the clusters |
| `test/dbscan.test.js` | Unit tests for DBSCAN and the point parser |
| `test/compare_sklearn.py` | Cross-check against scikit-learn |

## Run and test
Open `index.html` in a browser. To run the tests (Node 18+):

```
node test/dbscan.test.js
```

## Verification
- `node test/dbscan.test.js` runs the unit tests: distances, a hand-checked
  example, border and noise points, `MinPts = 1`, duplicate points, the `eps`
  boundary, Euclidean vs Manhattan, 3-D points and input handling.
- `python test/compare_sklearn.py` compares the results with scikit-learn on
  300 random datasets (both distance metrics). It checks core points, noise
  points and how the core points are grouped. Border points are not compared,
  because a border point can legitimately join either neighbouring cluster.

## Notes
- MinPts counts the point itself (the standard DBSCAN definition).
- A border point joins the first cluster that reaches it.
- Not affiliated with Casio.

## Author

**Marshiat Mehejabin**
BSc in Computer Science and Engineering, East Delta University
Aspiring Data Analyst

- LinkedIn: [Marshiat Mehejabin](https://www.linkedin.com/in/marshiat-mehejabin)
- GitHub: [@MarshiatMehejabin](https://github.com/MarshiatMehejabin)