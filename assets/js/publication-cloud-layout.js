/* Deterministic rectangle packing. Pure geometry, shared by the browser and tests. */
(function (root) {
  'use strict';
  function pack(items, width, gap = 7) {
    if (!items.length) return { width, height: 0, words: [] };
    if (!(width > 0) || items.some(item => item.width > width || item.width <= 0 || item.height <= 0)) return null;
    const ordered = items.map((item, index) => ({ ...item, index })).sort((a, b) =>
      b.weight - a.weight || b.width * b.height - a.width * a.height || a.index - b.index);
    const area = items.reduce((sum, item) => sum + (item.width + gap) * (item.height + gap), 0);
    const initialHeight = Math.max(300, Math.ceil(area / (width * .58)), ...items.map(item => item.height + gap * 2));
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let attempt = 0; attempt < 7; attempt++) {
      const height = Math.ceil(initialHeight * (1 + attempt * .18));
      const placed = [];
      const aspect = width / height;
      const maxSteps = Math.min(200000, Math.max(12000, Math.ceil((height / 2 + 80) ** 2 / 16)));
      for (const item of ordered) {
        let position = null;
        // A repeatable phase avoids spokes while keeping the largest word central.
        const phase = item.index * goldenAngle;
        for (let step = 0; step < maxSteps; step++) {
          const radius = Math.sqrt(step) * 4;
          const angle = step * goldenAngle + phase;
          const x = Math.round(width / 2 + Math.cos(angle) * radius * aspect - item.width / 2);
          const y = Math.round(height / 2 + Math.sin(angle) * radius - item.height / 2);
          if (x < gap || y < gap || x + item.width > width - gap || y + item.height > height - gap) continue;
          const collision = placed.some(other =>
            x < other.x + other.width + gap && x + item.width + gap > other.x &&
            y < other.y + other.height + gap && y + item.height + gap > other.y);
          if (!collision) { position = { ...item, x, y }; break; }
        }
        if (!position) break;
        placed.push(position);
      }
      if (placed.length === items.length) {
        // Crop unused vertical space, retaining a small breathing margin.
        const top = Math.min(...placed.map(item => item.y));
        const bottom = Math.max(...placed.map(item => item.y + item.height));
        const margin = 22;
        return { width, height: bottom - top + margin * 2,
          words: placed.map(item => ({ ...item, y: item.y - top + margin })) };
      }
    }
    return null; // The caller retains a readable wrapping layout if packing cannot fit.
  }
  if (typeof module === 'object' && module.exports) module.exports = { pack };
  else root.PublicationCloudLayout = { pack };
})(typeof window === 'undefined' ? globalThis : window);
