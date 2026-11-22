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
| `test/dbscan.test.js` | Unit tests for DBSCAN and the point parser |

## Run and test
Open `index.html` in a browser. To run the tests (Node 18+):

```
node test/dbscan.test.js
```

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