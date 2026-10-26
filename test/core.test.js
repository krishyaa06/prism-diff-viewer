const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../js/core.js");

test("myers diff on arrays", () => {
  const ops = C.diffArrays([..."ABCABBA"], [..."CBABAC"]);
  const a = ops.filter((o) => o.type !== "ins").map((o) => o.value).join("");
  const b = ops.filter((o) => o.type !== "del").map((o) => o.value).join("");
  assert.equal(a, "ABCABBA"); assert.equal(b, "CBABAC");
  assert.equal(ops.filter((o) => o.type !== "eq").length, 5); // shortest edit script
});
test("line diff stats", () => {
  const ops = C.diffLines("a\nb\nc\n", "a\nB\nc\nd\n");
  assert.deepEqual(C.stats(ops), { added: 2, removed: 1, same: 2 });
});
test("ignore whitespace and case", () => {
  assert.equal(C.stats(C.diffLines("Foo  bar", "foo bar", { ignoreWs: true, ignoreCase: true })).added, 0);
});
test("rows pair modifications", () => {
  const r = C.rows(C.diffLines("x\ny", "x\nz"));
  assert.deepEqual(r[1], { kind: "mod", l: 2, r: 2, left: "y", right: "z" });
});
test("unified patch", () => {
  const p = C.unified(C.diffLines("1\n2\n3\n", "1\n2\nthree\n"), "a/f", "b/f");
  assert.equal(p, "--- a/f\n+++ b/f\n@@ -1,3 +1,3 @@\n 1\n 2\n-3\n+three\n");
});
test("identical input", () => {
  assert.equal(C.stats(C.diffLines("same", "same")).added, 0);
});
