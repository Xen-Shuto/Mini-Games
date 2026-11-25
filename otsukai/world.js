"use strict";
(() => {
  const O = globalThis.Obake;
  // Actors use continuous floor coordinates: half a floor is one grid row.
  const rowsPerFloor = 2;
  class Random {
    constructor(seed) { this.state = seed >>> 0; }
    next() {
      this.state = (this.state + 0x6d2b79f5) >>> 0;
      let n = Math.imul(this.state ^ this.state >>> 15, this.state | 1);
      n ^= n + Math.imul(n ^ n >>> 7, n | 61);
      return ((n ^ n >>> 14) >>> 0) / 4294967296;
    }
    int(min, max) { return min + Math.floor(this.next() * (1 + max - min)); }
    range([min, max]) { return min + this.next() * (max - min); }
  }
  class World {
    constructor(seed, config) { this.seed = seed; this.c = config; this.floors = new Map(); this.top = 0; }
    ensure(top, onCreate) {
      while (this.top < top) {
        const f = ++this.top, holes = new Set();
        const rng = new Random(this.seed ^ Math.imul(f, 0x9e3779b1));
        if (f > 1) {
          const width = this.c.columns;
          const min = Math.min(width, Math.max(1, this.c.holesMin));
          const count = rng.int(min, Math.max(min, Math.min(width, this.c.holesMax)));
          const zones = Math.min(count, this.c.holeZones);
          // 各区画の中央寄りに入口を1つ確保し、残りの穴は端も含めて自由に置く。
          for (let i = 0; i < zones; i++) {
            const start = Math.floor(i * width / zones);
            const end = Math.floor((i + 1) * width / zones);
            const inset = Math.floor((end - start + 1) / 4);
            holes.add(rng.int(start + inset, end - 1 - inset));
          }
          while (holes.size < count) holes.add(rng.int(0, width - 1));
        }
        this.floors.set(f, holes);
        onCreate?.(f);
      }
    }
    prune(minFloor) { for (const f of this.floors.keys()) if (f < minFloor) this.floors.delete(f); }
  }
  function actor(x, y) { return { x, y, px: x, py: y, dir: -1, motion: null }; }
  function begin(a, x, y, duration) {
    a.motion = { x0: a.x, y0: a.y, x, y, time: 0, duration };
  }
  function advance(a, dt) {
    a.px = a.x; a.py = a.y;
    const m = a.motion;
    if (!m) return;
    m.time += dt;
    const t = m.time + 1e-10 >= m.duration ? 1 : m.time / m.duration;
    a.x = m.x0 + (m.x - m.x0) * t;
    a.y = m.y0 + (m.y - m.y0) * t;
    if (t === 1) a.motion = null;
  }
  function movePlayer(g, input, dt) {
    const p = g.player, c = g.c;
    if (!p.motion) {
      const inHole = !Number.isInteger(p.y);
      const upper = g.world.floors.get(Math.floor(p.y) + 1);
      if (input.up && upper && (inHole || upper.has(p.x) || g.canBreak?.())) {
        if (!inHole) g.openCeiling?.(upper, p.x);
        begin(p, p.x, p.y + 1/rowsPerFloor, c.player.ascend/rowsPerFloor);
      } else {
        const dx = Number(!!input.right) - Number(!!input.left);
        if (dx) p.dir = dx;
        if (dx && p.x + dx >= 0 && p.x + dx < c.world.columns &&
            (!inHole || upper.has(p.x + dx)))
          begin(p, p.x + dx, p.y, c.player.horizontal);
      }
    }
    advance(p, dt);
  }
  function camera(y, c, goal = Infinity) {
    return Math.max(0.4, Math.min(y - c.cameraBelow, goal - c.visible + 1));
  }
  Object.assign(O, { rowsPerFloor, Random, World, actor, begin, advance, movePlayer, camera });
})();
