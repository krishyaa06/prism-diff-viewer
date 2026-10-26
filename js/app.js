(() => {
  const { $, copy, store, esc, debounce, tabs, toast } = Prism;
  let view = "split";
  const A = `import { fetchUser } from "./api";\n\nexport async function greet(id) {\n  const user = await fetchUser(id);\n  console.log("Hello " + user.name);\n  return user;\n}\n\nexport const VERSION = "1.0.0";\n`;
  const B = `import { fetchUser, track } from "./api";\n\nexport async function greet(id, { loud = false } = {}) {\n  const user = await fetchUser(id);\n  const msg = \`Hello \${user.name}\`;\n  track("greet", { id });\n  return loud ? msg.toUpperCase() : msg;\n}\n\nexport const VERSION = "1.1.0";\n`;
  const s = store.get("diff:state");
  $("#a").value = s?.a ?? A; $("#b").value = s?.b ?? B;
  function words(l, r) {
    const ops = Core.diffWords(l, r);
    let L = "", R = "";
    for (const o of ops) { const v = esc(o.value); if (o.type === "eq") { L += v; R += v; } else if (o.type === "del") L += `<del>${v}</del>`; else R += `<ins>${v}</ins>`; }
    return [L, R];
  }
  function render() {
    store.set("diff:state", { a: $("#a").value, b: $("#b").value });
    const opts = { ignoreWs: $("#ws").checked, ignoreCase: $("#case").checked };
    const ops = Core.diffLines($("#a").value, $("#b").value, opts);
    const st = Core.stats(ops);
    $("#add").textContent = `+${st.added}`; $("#del").textContent = `−${st.removed}`;
    const el = $("#diff");
    if (!st.added && !st.removed) { el.innerHTML = '<div class="same">✓ No differences</div>'; return; }
    if (view === "patch") {
      const p = Core.unified(ops, "a/" + $("#nameA").value, "b/" + $("#nameB").value);
      el.innerHTML = `<pre>${p.split("\n").map((l) => `<span class="${l.startsWith("@@") ? "h" : l.startsWith("+") ? "a" : l.startsWith("-") ? "d" : ""}">${esc(l)}</span>`).join("\n")}</pre>`;
      return;
    }
    const rows = Core.rows(ops);
    if (view === "split") {
      el.innerHTML = "<table>" + rows.map((r) => {
        let [L, R] = r.kind === "mod" ? words(r.left, r.right) : [r.left != null ? esc(r.left) : "", r.right != null ? esc(r.right) : ""];
        const lc = r.kind === "eq" ? "" : r.left != null ? "del" : "empty-cell", rc = r.kind === "eq" ? "" : r.right != null ? "ins" : "empty-cell";
        return `<tr><td class="n ${lc}">${r.l ?? ""}</td><td class="s ${lc}">${r.left != null && r.kind !== "eq" ? "−" : ""}</td><td class="${lc}">${L}</td><td class="n ${rc} sepl" style="border-left:1px solid var(--line)">${r.r ?? ""}</td><td class="s ${rc}">${r.right != null && r.kind !== "eq" ? "+" : ""}</td><td class="${rc}">${R}</td></tr>`;
      }).join("") + "</table>";
    } else {
      const out = [];
      for (const r of rows) {
        if (r.kind === "eq") { out.push(`<tr><td class="n">${r.l}</td><td class="n">${r.r}</td><td class="s"></td><td>${esc(r.left)}</td></tr>`); continue; }
        const [L, R] = r.kind === "mod" ? words(r.left, r.right) : [esc(r.left ?? ""), esc(r.right ?? "")];
        if (r.left != null) out.push(`<tr class="del"><td class="n">${r.l}</td><td class="n"></td><td class="s">−</td><td>${L}</td></tr>`);
        if (r.right != null) out.push(`<tr class="ins"><td class="n"></td><td class="n">${r.r}</td><td class="s">+</td><td>${R}</td></tr>`);
      }
      el.innerHTML = "<table>" + out.join("") + "</table>";
    }
  }
  const run = debounce(render, 150);
  ["#a", "#b", "#nameA", "#nameB"].forEach((id) => $(id).addEventListener("input", run));
  ["#ws", "#case"].forEach((id) => $(id).addEventListener("change", render));
  tabs($("#view"), (v) => { view = v; render(); });
  $("#swap").onclick = () => { [$("#a").value, $("#b").value] = [$("#b").value, $("#a").value]; [$("#nameA").value, $("#nameB").value] = [$("#nameB").value, $("#nameA").value]; render(); };
  $("#copy").onclick = () => copy(Core.unified(Core.diffLines($("#a").value, $("#b").value, { ignoreWs: $("#ws").checked, ignoreCase: $("#case").checked }), "a/" + $("#nameA").value, "b/" + $("#nameB").value), "Patch copied");
  for (const [inp, ta, nm] of [["#fa", "#a", "#nameA"], ["#fb", "#b", "#nameB"]]) $(inp).onchange = async (e) => { const f = e.target.files[0]; if (f) { $(ta).value = await f.text(); $(nm).value = f.name; render(); toast(`Loaded ${f.name}`); } };
  render();
})();
