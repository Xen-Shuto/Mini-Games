"use strict";
(() => {
  const O = globalThis.Obake;
  class Progress {
    constructor(c, emit = () => {}) {
      this.c = c; this.emit = emit; this.phase = "play";
      this.power = O.normalPower(); this.resource = c.resource.initial;
      this.score = 0; this.lives = c.lives.initial; this.highest = 1; this.bonus = 0;
    }
    addScore(points) {
      const every = this.c.lives.extendEvery;
      const before = Math.floor(this.score / every);
      this.score += points;
      const extra = Math.floor(this.score / every) - before;
      if (extra) { this.lives += extra; this.emit("extend"); }
    }
    arrive(floor) {
      if (floor <= this.highest) return;
      this.addScore((floor-this.highest) * this.c.score.step);
      this.highest = floor; this.emit("step");
    }
    miss() {
      if (this.phase !== "play") return;
      this.lives--; this.phase = "miss"; this.missRemaining = this.c.lives.missSeconds;
      this.emit("miss");
    }
    drain(dt) {
      if (this.phase !== "play") return;
      this.resource = Math.max(0,this.resource - this.c.resource.perSecond * dt);
      if (this.resource < 1e-9) { this.resource = 0; this.miss(); }
    }
    restore() { this.resource = this.c.resource.max; this.power = O.normalPower(); }
  }
  O.Progress = Progress;
})();
