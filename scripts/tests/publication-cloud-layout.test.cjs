const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pack } = require('../../assets/js/publication-cloud-layout.js');
function verify(layout, items, width, gap) {
  assert.ok(layout);
  assert.equal(layout.words.length, items.length);
  assert.equal(new Set(layout.words.map(word => word.id)).size, items.length);
  for (const a of layout.words) {
    assert.ok(a.x >= 0 && a.x + a.width <= width);
    assert.ok(a.y >= 0 && a.y + a.height <= layout.height);
    for (const b of layout.words) {
      if (a.id === b.id) continue;
      assert.ok(a.x + a.width + gap <= b.x || b.x + b.width + gap <= a.x ||
        a.y + a.height + gap <= b.y || b.y + b.height + gap <= a.y, `${a.id} overlaps ${b.id}`);
    }
  }
}
for (const width of [280, 360, 720, 1000]) {
  test(`all topics fit without overlap at ${width}px`, () => {
    const words = Array.from({length: 36}, (_, id) => ({id, width: Math.min(width - 24, 65 + (id * 37) % 190), height: width < 600 ? 44 : 32 + (id % 3) * 10, weight: 1 + id % 14}));
    const result = pack(words, width, 5);
    verify(result, words, width, 5);
    assert.deepEqual(result, pack(words, width, 5));
  });
}
test('oversized words return a readable-layout fallback signal', () => {
  assert.equal(pack([{id: 1, width: 400, height: 40, weight: 1}], 300), null);
});
test('empty and invalid surfaces are safe', () => {
  assert.equal(pack([], 300).words.length, 0);
  assert.equal(pack([{id: 1, width: 40, height: 20, weight: 1}], 0), null);
});
