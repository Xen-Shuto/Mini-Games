"use strict";
(() => {
  const O = globalThis.Obake;
  const types = ["patrol", "random", "chase"];
  function spawnEnemies(g, floor) {
    const c = g.c.enemies, rng = g.enemyRng;
    const climb = Math.max(0, floor - c.scalingStartFloor);
    const chance = Math.min(c.maxChance, c.chance * (1 + climb * c.chanceGainPerFloor));
    if (floor < c.firstFloor || rng.next() >= chance) return;
    const extraChance = Math.min(c.maxExtraChance, c.extraChance * (1 + climb * c.extraChanceGainPerFloor));
    const factor = Math.min(c.maxSpeedMultiplier, 1 + climb * c.speedGainPerFloor);
    const holes = g.world.floors.get(floor);
    const cells = Array.from({length:g.c.world.columns}, (_, i) => i).filter(x => !holes.has(x));
    for (let n = 0; cells.length && n < c.maxPerFloor; n++) {
      if (n > 0 && rng.next() >= extraChance) break;
      const [x] = cells.splice(rng.int(0,cells.length-1),1);
      g.enemies.push({...O.actor(x,floor), type:types[rng.int(0,2)], dir:rng.next()<0.5?-1:1,
        seconds:rng.range(c.seconds) / factor});
    }
  }
  function moveEnemy(g, e, dt) {
    const holes = g.world.floors.get(e.y);
    const patrol = e.type === "patrol";
    const blocked = x => x < 0 || x >= g.c.world.columns || (patrol && holes?.has(x));
    const m = e.motion;
    // 横移動先がPOWERで穴になった場合は、進入をやめて元のセルへ戻る。
    if (patrol && m && m.y === m.y0 && g.world.floors.get(m.y)?.has(m.x) && m.x !== m.x0) {
      e.dir *= -1;
      e.motion = null;
      const distance = Math.abs(e.x - m.x0);
      if (distance > 0) O.begin(e,m.x0,m.y0,e.seconds*distance);
    }
    if (!e.motion) {
      if (!patrol && holes?.has(e.x)) O.begin(e,e.x,e.y-1,g.c.enemies.fallSeconds);
      else {
        if (e.type === "random" && g.enemyRng.next() < g.c.enemies.turnChance)
          e.dir = g.enemyRng.next() < 0.5 ? -1 : 1;
        if (e.type === "chase" && e.y === Math.round(g.player.y))
          e.dir = Math.sign(g.player.x - e.x) || e.dir;
        if (blocked(e.x + e.dir)) e.dir *= -1;
        if (!blocked(e.x + e.dir)) O.begin(e,e.x+e.dir,e.y,e.seconds);
      }
    }
    O.advance(e,dt);
  }
  // 相対移動の線分と接触矩形が重なる時間区間を2軸で交差させる。
  function touches(a,b,radius) {
    let enter = 0, leave = 1;
    for (const [pos,prev] of [["x","px"],["y","py"]]) {
      const start = a[prev] - b[prev], change = a[pos] - b[pos] - start;
      // Contact distances are in cells; actor Y is in floors.
      const reach = pos === "y" ? radius.y / O.rowsPerFloor : radius.x;
      if (change === 0) {
        if (Math.abs(start) > reach) return false;
      } else {
        const t1 = (-reach-start)/change, t2 = (reach-start)/change;
        enter = Math.max(enter, Math.min(t1,t2)); leave = Math.min(leave, Math.max(t1,t2));
        if (enter > leave) return false;
      }
    }
    return true;
  }
  function enemyContact(g) {
    for (let i = g.enemies.length-1; i >= 0; i--) {
      if (!touches(g.player,g.enemies[i],g.c.contact)) continue;
      if (g.power?.type === "super") {
        g.enemies.splice(i,1); g.addScore(g.c.score.defeat); g.emit("defeat");
      } else { g.miss(); return; }
    }
  }
  Object.assign(O, { spawnEnemies, moveEnemy, touches, enemyContact });
})();
