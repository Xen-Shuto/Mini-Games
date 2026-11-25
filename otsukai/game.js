"use strict";
(() => {
  const O = globalThis.Obake;
  class Game extends O.Progress {
    constructor(mode, seed, c = O.config, emit) {
      super(c,emit);
      this.mode = mode; this.seed = seed >>> 0;
      this.world = new O.World(this.seed,c.world);
      this.enemyRng = new O.Random(this.seed ^ 0x355278ef);
      this.itemRng = new O.Random(this.seed ^ 0x77beef11);
      this.enemies = []; this.items = []; this.untilItem = this.itemRng.range(c.items.interval);
      this.player = O.actor(Math.floor(c.world.columns/2),1); this.time = 0;
      this.extendWorld();
    }
    get goal() { return this.c.courses[this.mode].goal; }
    camera(y = this.player.y) { return O.camera(y,this.c.world,this.goal); }
    canBreak() { return this.power.type === "power"; }
    openCeiling(holes,x) { O.openCeiling(this,holes,x); }
    extendWorld() {
      const c = this.c.world;
      const ahead = Math.max(c.ahead, Math.ceil(c.visible)+1);
      this.world.ensure(Math.min(this.goal,this.highest+ahead), f => O.spawnEnemies(this,f));
      if (this.mode === "endless") this.world.prune(this.highest - Math.max(c.retainBelow,Math.ceil(c.cameraBelow)+1));
    }
    respawn() {
      const floor = this.c.lives.respawnAtHighest ? this.highest : Math.max(1,Math.floor(this.player.y));
      const columns = Array.from({length:this.c.world.columns},(_,i)=>i)
        .sort((a,b)=>Math.abs(a-this.player.x)-Math.abs(b-this.player.x));
      const near = (e,x) => {
        const tx = e.motion?.x ?? e.x, ty = e.motion?.y ?? e.y, r = this.c.lives.safeRadius;
        return x+r >= Math.min(tx,e.x) && x-r <= Math.max(tx,e.x) &&
          floor+r >= Math.min(ty,e.y) && floor-r <= Math.max(ty,e.y);
      };
      let cell = columns.find(x=>!this.enemies.some(e=>near(e,x)));
      if (cell === undefined) {
        cell = columns[0]; this.enemies = this.enemies.filter(e=>!near(e,cell));
      }
      this.player = O.actor(cell,floor); this.restore(); this.phase = "play";
    }
    togglePause() {
      if (this.phase === "play") this.phase = "paused";
      else if (this.phase === "paused") this.phase = "play";
    }
    tick(input,dt) {
      if (this.phase === "miss") {
        this.missRemaining -= dt;
        if (this.missRemaining <= 1e-9) {
          if (this.lives === 0) this.phase = "over"; else this.respawn();
        }
        return;
      }
      if (this.phase !== "play") return;
      this.time += dt;
      O.movePlayer(this,input,dt);
      if (!this.player.motion && Number.isInteger(this.player.y) && this.player.y > this.highest) {
        this.arrive(this.player.y); this.extendWorld();
      }
      for (const e of this.enemies) O.moveEnemy(this,e,dt);
      this.enemies = this.enemies.filter(e=>e.y >= this.camera() - this.c.enemies.despawnBelow);
      O.updateItems(this,dt);
      O.enemyContact(this);
      this.drain(dt);
      if (this.phase !== "play") return;
      if (this.power.type === "super") {
        this.power.remaining -= dt;
        if (this.power.remaining <= 1e-9) this.power = O.normalPower();
      }
      if (this.highest >= this.goal) {
        this.bonus = Math.floor(this.resource) * this.c.score.clearPerUnit;
        this.addScore(this.bonus); this.phase = "clear"; this.emit("clear");
      }
    }
  }
  class FixedClock {
    constructor(rate) { this.dt = 1/rate; this.remainder = 0; }
    run(seconds,step) {
      this.remainder += seconds;
      while (this.remainder + 1e-10 >= this.dt) {
        step(this.dt); this.remainder = Math.max(0,this.remainder-this.dt);
      }
      return this.remainder/this.dt;
    }
  }
  Object.assign(O,{Game,FixedClock});
})();
