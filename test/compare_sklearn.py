"""Cross-check js/dbscan.js against scikit-learn on random datasets.

Setup (once):  pip install scikit-learn numpy
Run from the repo root:  python test/compare_sklearn.py

What is compared for every dataset (both Manhattan and Euclidean):
  * which points are core points
  * which points are noise
  * how the core points are grouped into clusters
Border points are not compared: a border point can legitimately belong to
either neighbouring cluster, so implementations may differ there.
"""
import json
import os
import random
import subprocess
import tempfile

import numpy as np
from sklearn.cluster import DBSCAN

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N_CASES = 300

NODE_SCRIPT = r"""
const { solveDBSCAN } = require('./js/dbscan.js');
const cases = JSON.parse(require('fs').readFileSync(process.argv[1]));
console.log(JSON.stringify(cases.map((c) => {
  const P = c.pts.map((p, i) => ({ name: 'P' + i, c: p }));
  const r = solveDBSCAN({ points: P, eps: c.eps, minPts: c.minPts, method: c.metric });
  return { labels: r.labels, type: r.type };
})));
"""


def groups(labels, idx):
    g = {}
    for i in idx:
        g.setdefault(labels[i], set()).add(i)
    return sorted(sorted(v) for v in g.values())


def main():
    random.seed(1)
    cases = []
    for _ in range(N_CASES):
        n = random.randint(2, 25)
        cases.append({
            "pts": [[random.randint(0, 12), random.randint(0, 12)] for _ in range(n)],
            "eps": random.choice([1, 1.5, 2, 2.5, 3]),
            "minPts": random.randint(1, 5),
            "metric": random.choice([1, 2]),  # 1 = Manhattan, 2 = Euclidean
        })

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(cases, f)
        path = f.name
    try:
        out = json.loads(subprocess.check_output(["node", "-e", NODE_SCRIPT, path], cwd=ROOT))
    finally:
        os.remove(path)

    bad = 0
    for c, o in zip(cases, out):
        model = DBSCAN(eps=c["eps"], min_samples=c["minPts"],
                       metric="manhattan" if c["metric"] == 1 else "euclidean")
        model.fit(np.array(c["pts"], dtype=float))
        s_core = set(model.core_sample_indices_.tolist())
        j_core = {i for i, t in enumerate(o["type"]) if t == "C*"}
        s_noise = {i for i, v in enumerate(model.labels_) if v == -1}
        j_noise = {i for i, t in enumerate(o["type"]) if t == "N"}
        same = (s_core == j_core and s_noise == j_noise
                and groups(model.labels_, s_core) == groups(o["labels"], j_core))
        bad += not same
    print(f"{len(cases)} datasets compared, {bad} mismatches")


if __name__ == "__main__":
    main()