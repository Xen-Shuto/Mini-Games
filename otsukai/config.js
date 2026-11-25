"use strict";
// 秒・セル・階を単位とする。seed が null の場合はプレイごとに抽選。
globalThis.Obake = {
  config: {
    seed: null, tickRate: 60,
    // normal は従来の通常モード（現在の「簡単」）の識別子。
    courses: {
      normal: { label: "簡単", goal: 50 },
      standard: { label: "普通", goal: 250 },
      hard: { label: "困難", goal: 999 },
      endless: { label: "無限回廊", goal: Infinity }
    },
    keys: { left: ["ArrowLeft","KeyA","Numpad4"], right: ["ArrowRight","KeyD","Numpad6"],
      up: ["ArrowUp","KeyW","Numpad8"], pause: ["Escape"] },
    world: { columns: 20, visible: 7, holesMin: 2, holesMax: 6, holeZones: 3,
      ahead: 9, retainBelow: 8, cameraBelow: 1.35 },
    player: { horizontal: 0.14, ascend: 0.23 },
    enemies: { chance: 0.36, extraChance: 0.08, seconds: [0.42, 0.64], turnChance: 0.32,
      fallSeconds: 0.26, firstFloor: 4, maxPerFloor: 2, despawnBelow: 5,
      // 全コース共通。10階までは基準値、以降は階数に応じて上昇。
      scalingStartFloor: 10, chanceGainPerFloor: 0.006, maxChance: 0.85,
      extraChanceGainPerFloor: 0.001, maxExtraChance: 0.4,
      speedGainPerFloor: 0.003, maxSpeedMultiplier: 2.2 },
    items: { interval: [5, 9], superChance: 0.46, fallSpeed: 1.6, horizontalSpeed: 3,
      despawnMargin: 0.8, maxActive: 128 },
    power: { uses: 5, superSeconds: 10, warningSeconds: 2, consumeOnOpenHole: false, refreshSame: true },
    resource: { label: "霊力", max: 512, initial: 512, perSecond: 1.00, recovery: 31 },
    lives: { initial: 3, extendEvery: 20000, missSeconds: 1, safeRadius: 1.5, respawnAtHighest: true },
    score: { step: 50, power: 500, super: 1000, defeat: 200, clearPerUnit: 30 },
    contact: { x: 0.56, y: 0.55 },
    // 相対パス例 "assets/ghost.png", "assets/pickup.wav"。空欄では内蔵素材。
    images: { ghost: "", powerGhost: "", superGhost: "", patrol: "", random: "", chase: "",
      power: "", super: "", yura: "" },
    sounds: { start: "", step: "", break: "", power: "", super: "", superLoop: "", superWarning: "",
      defeat: "", miss: "", extend: "", clear: "" }
  }
};
