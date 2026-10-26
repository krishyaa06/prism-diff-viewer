/* Prism Diff Viewer · core logic (browser + Node) */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Core = api;
})(typeof self !== "undefined" ? self : this, function () {
  /** Myers O(ND) diff over arrays. Returns ops: {type:'eq'|'del'|'ins', a, b, value} */
  function diffArrays(a, b, eq = (x, y) => x === y) {
    const n = a.length, m = b.length, max = n + m, v = new Map([[1, 0]]), trace = [];
    for (let d = 0; d <= max; d++) {
      trace.push(new Map(v));
      for (let k = -d; k <= d; k += 2) {
        let x = k === -d || (k !== d && (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1)) ? v.get(k + 1) : v.get(k - 1) + 1;
        let y = x - k;
        while (x < n && y < m && eq(a[x], b[y])) { x++; y++; }
        v.set(k, x);
        if (x >= n && y >= m) return backtrack(trace, a, b, d);
      }
    }
    return [];
  }
  function backtrack(trace, a, b, D) {
    let x = a.length, y = b.length; const ops = [];
    for (let d = D; d >= 0; d--) {
      const v = trace[d], k = x - y;
      const prevK = k === -d || (k !== d && (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1)) ? k + 1 : k - 1;
      const px = v.get(prevK) ?? 0, py = px - prevK;
      while (x > px && y > py) { x--; y--; ops.push({ type: "eq", a: x, b: y, value: a[x] }); }
      if (d > 0) { if (x === px) { y--; ops.push({ type: "ins", b: y, value: b[y] }); } else { x--; ops.push({ type: "del", a: x, value: a[x] }); } }
    }
    return ops.reverse();
  }
  function lines(s, opts = {}) {
    let L = s.replace(/\r\n/g, "\n").split("\n");
    if (L.length && L[L.length - 1] === "") L.pop();
    return L;
  }
  function norm(opts) { return (s) => { let t = s; if (opts.ignoreWs) t = t.replace(/\s+/g, " ").trim(); if (opts.ignoreCase) t = t.toLowerCase(); return t; }; }
  function diffLines(left, right, opts = {}) {
    const a = lines(left), b = lines(right), f = norm(opts);
    const ops = diffArrays(a, b, (x, y) => f(x) === f(y));
    return ops.map((o) => ({ ...o, value: o.type === "ins" ? b[o.b] : a[o.a] }));
  }
  function diffWords(a, b) {
    const ta = a.match(/\s+|[\w$]+|[^\s\w$]/g) || [], tb = b.match(/\s+|[\w$]+|[^\s\w$]/g) || [];
    return diffArrays(ta, tb);
  }
  /** Pair up deletions/insertions into side-by-side rows. */
  function rows(ops) {
    const out = []; let i = 0;
    while (i < ops.length) {
      if (ops[i].type === "eq") { out.push({ kind: "eq", l: ops[i].a + 1, r: ops[i].b + 1, left: ops[i].value, right: ops[i].value }); i++; continue; }
      const dels = [], ins = [];
      while (i < ops.length && ops[i].type !== "eq") (ops[i].type === "del" ? dels : ins).push(ops[i++]);
      for (let j = 0; j < Math.max(dels.length, ins.length); j++) {
        const d = dels[j], s = ins[j];
        out.push({ kind: d && s ? "mod" : d ? "del" : "ins", l: d ? d.a + 1 : null, r: s ? s.b + 1 : null, left: d ? d.value : null, right: s ? s.value : null });
      }
    }
    return out;
  }
  function stats(ops) { return { added: ops.filter((o) => o.type === "ins").length, removed: ops.filter((o) => o.type === "del").length, same: ops.filter((o) => o.type === "eq").length }; }
  function unified(ops, nameA = "a", nameB = "b", ctx = 3) {
    const out = [`--- ${nameA}`, `+++ ${nameB}`];
    const idx = ops.map((o, i) => (o.type !== "eq" ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) return out.join("\n") + "\n";
    let groups = [], g = [idx[0], idx[0]];
    for (const i of idx.slice(1)) { if (i - g[1] <= ctx * 2) g[1] = i; else { groups.push(g); g = [i, i]; } }
    groups.push(g);
    for (const [s, e] of groups) {
      const from = Math.max(0, s - ctx), to = Math.min(ops.length - 1, e + ctx), slice = ops.slice(from, to + 1);
      const aStart = (ops.slice(0, from).filter((o) => o.type !== "ins").length) + 1, bStart = (ops.slice(0, from).filter((o) => o.type !== "del").length) + 1;
      const aLen = slice.filter((o) => o.type !== "ins").length, bLen = slice.filter((o) => o.type !== "del").length;
      out.push(`@@ -${aLen ? aStart : aStart - 1},${aLen} +${bLen ? bStart : bStart - 1},${bLen} @@`);
      for (const o of slice) out.push((o.type === "eq" ? " " : o.type === "del" ? "-" : "+") + o.value);
    }
    return out.join("\n") + "\n";
  }
  return { diffArrays, diffLines, diffWords, rows, stats, unified };
});
