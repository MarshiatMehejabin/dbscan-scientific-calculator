/* Scatter plot of a DBSCAN result as inline SVG (2-D points only).
 *   core point   = filled circle
 *   border point = hollow circle
 *   noise        = grey cross
 * Each cluster gets its own colour. Pure function: returns an HTML string.
 */
const PLOT_COLORS = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#17becf"];

function plotClusters(points, res) {
  const W = 380, H = 300, M = 34;
  const num = (v) => +v.toFixed(2);
  const safe = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const xs = points.map((p) => p.c[0]), ys = points.map((p) => p.c[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pw = W - 2 * M, ph = H - 2 * M;
  // same scale on both axes, so distances (and eps) look right
  const k = Math.min(pw / (x1 - x0 || 1), ph / (y1 - y0 || 1));
  const sx = (x) => M + (pw - (x1 - x0) * k) / 2 + (x - x0) * k;
  const sy = (y) => H - M - (ph - (y1 - y0) * k) / 2 - (y - y0) * k;

  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="DBSCAN cluster plot">`;
  s += `<rect x="${M}" y="${M}" width="${W - 2 * M}" height="${H - 2 * M}" fill="#fafafa" stroke="#bbb"/>`;
  s += `<g font-size="10" fill="#555">` +
    `<text x="${sx(x0)}" y="${H - M + 14}" text-anchor="middle">${num(x0)}</text>` +
    `<text x="${sx(x1)}" y="${H - M + 14}" text-anchor="middle">${num(x1)}</text>` +
    `<text x="${M - 6}" y="${sy(y0) + 3}" text-anchor="end">${num(y0)}</text>` +
    `<text x="${M - 6}" y="${sy(y1) + 3}" text-anchor="end">${num(y1)}</text></g>`;

  points.forEach((p, i) => {
    const x = sx(p.c[0]), y = sy(p.c[1]), lab = res.labels[i], t = res.type[i];
    const color = lab ? PLOT_COLORS[(lab - 1) % PLOT_COLORS.length] : "#666";
    if (t === "C*") s += `<circle cx="${x}" cy="${y}" r="6" fill="${color}"/>`;
    else if (t === "B") s += `<circle cx="${x}" cy="${y}" r="6" fill="#fff" stroke="${color}" stroke-width="2"/>`;
    else s += `<path d="M${x - 5} ${y - 5}L${x + 5} ${y + 5}M${x + 5} ${y - 5}L${x - 5} ${y + 5}" stroke="${color}" stroke-width="2"/>`;
    s += `<text x="${x + 8}" y="${y - 8}" font-size="10" fill="#222">${safe(p.name)}</text>`;
  });
  s += "</svg>";

  const legend = [];
  for (let c = 1; c <= res.clusters; c++)
    legend.push(`<span style="color:${PLOT_COLORS[(c - 1) % PLOT_COLORS.length]}">&#9679;</span> Cluster ${c}`);
  legend.push(`<span style="color:#666">&times;</span> Noise`);
  return `<div class="plot-title">Cluster plot</div>${s}` +
    `<div class="plot-legend">${legend.join(" &nbsp; ")}<br>&#9679; core &nbsp; &#9675; border &nbsp; &times; noise</div>`;
}