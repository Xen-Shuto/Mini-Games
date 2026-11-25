"use strict";
(() => {
  const O = globalThis.Obake;
  const normalPower = () => ({ type: "normal", uses: 0, remaining: 0 });
  function collect(g, type) {
    const c = g.c;
    if (type !== g.power.type || c.power.refreshSame) {
      g.power = type === "power" ? {type, uses:c.power.uses, remaining:0}
        : {type, uses:0, remaining:c.power.superSeconds};
    }
    if (type === "super") g.resource = Math.min(c.resource.max, g.resource + c.resource.recovery);
    g.addScore(c.score[type]); g.emit(type);
  }
  function openCeiling(g, holes, x) {
    if (g.power.type !== "power") return;
    const intact = !holes.has(x);
    if (intact) { holes.add(x); g.emit("break"); }
    if ((intact || g.c.power.consumeOnOpenHole) && --g.power.uses === 0) g.power = normalPower();
  }
  function planItemMove(g, item) {
    const { x, y } = item, c = g.c.items;
    const floor = g.world.floors.get(y);
    if (!floor || floor.has(Math.round(x))) {
      const below = Math.ceil(y) - 1;
      if (c.fallSpeed > 0) O.begin(item,x,below,(y-below)/c.fallSpeed);
      return;
    }
    const rightWall = g.c.world.columns-1;
    if (rightWall === 0 || c.horizontalSpeed <= 0) return;
    if ((item.dir < 0 && x === 0) || (item.dir > 0 && x === rightWall)) item.dir *= -1;
    const next = item.dir > 0 ? Math.floor(x)+1 : Math.ceil(x)-1;
    O.begin(item,next,y,Math.abs(next-x)/c.horizontalSpeed);
  }
  function moveItem(g,item,dt) {
    const startX = item.x, startY = item.y, p = g.player;
    const m = item.motion;
    // 乗っているセルが移動途中で破壊された場合も、その位置から落ちる。
    if (m && m.y === m.y0 && Math.round(item.x) === Math.round(m.x0) &&
        g.world.floors.get(item.y)?.has(Math.round(item.x))) item.motion = null;
    let elapsed = 0;
    do {
      if (!item.motion) planItemMove(g,item);
      const remaining = dt-elapsed;
      const step = item.motion ? Math.min(remaining,item.motion.duration-item.motion.time) : remaining;
      O.advance(item,step);
      // 着地・反転をまたぐ場合、各区間で同時刻のプレイヤーと接触判定する。
      let player = p;
      if (elapsed > 0 || step < dt) {
        const from = elapsed/dt, to = (elapsed+step)/dt;
        player = {px:p.px+(p.x-p.px)*from, py:p.py+(p.y-p.py)*from,
          x:p.px+(p.x-p.px)*to, y:p.py+(p.y-p.py)*to};
      }
      if (O.touches(player,item,g.c.contact)) return true;
      elapsed += step;
    } while (elapsed < dt-1e-10);
    item.px = startX; item.py = startY;
    return false;
  }
  function updateItems(g, dt) {
    const c = g.c.items, rng = g.itemRng, bottom = g.camera();
    g.untilItem -= dt;
    if (g.untilItem <= 0 && g.items.length < c.maxActive) {
      // Start in a passage above the viewport, even while the camera is between floors.
      const y = Math.ceil(bottom + g.c.world.visible + c.despawnMargin);
      g.items.push({...O.actor(rng.int(0,g.c.world.columns-1),y),type:rng.next()<c.superChance?"super":"power",
        dir:rng.next()<0.5?-1:1});
      g.untilItem = rng.range(c.interval);
    }
    // 古い順に処理し、同一更新内の最後の取得も後勝ちにする。
    g.items = g.items.filter(item => {
      if (moveItem(g,item,dt)) { collect(g,item.type); return false; }
      return item.y >= bottom - c.despawnMargin;
    });
  }
  Object.assign(O,{normalPower,collect,openCeiling,updateItems});
})();
