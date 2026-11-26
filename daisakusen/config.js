"use strict";
// ゲームバランス値の唯一の定義元。時間=秒、距離=内部640×480座標。
globalThis.Daisakusen = { config: {
  screen: { width:640, height:480, hud:32, ground:96, left:128, right:512 },
  simulation: { step:1/120, maxFrame:.25 },
  player: { speed:240, y:72, size:32, hit:[20,24], color:"#ffffff", shadow:"#d9d9d9", initialLives:3, maxLives:9, respawnInv:3 },
  shot: { slots:3, interval:.2, offset:24, phase:0, size:[8,12], hit:[8,10], speed:180, amplitude:8, period:1.2, radius:24, duration:.5 },
  enemy: { size:[64,32], hit:[56,24], enterGrace:1, warning:.3, perOwner:2, carrierChance:.05,
    types: {
      normal:{speed:80, score:100, depth:[.1,.9], attack:"up", weight:30},
      fast:{speed:160, score:150, depth:[.1,.9], attack:null, weight:20},
      reverse:{speed:100, score:200, depth:[.1,.9], attack:"up", weight:20},
      wander:{speed:60, score:150, depth:[.2,.8], attack:"wave", weight:15},
      deep:{speed:60, score:100, depth:[.75,.95], attack:"aim", weight:15},
      smart:{speed:120, score:300, depth:[.1,.9], attack:"random", weight:0}
    },
    reverse:{count:[1,3], minTravel:64, targets:[160,480]},
    wander:{amplitude:32, period:3},
    smart:{height:96, width:48, lookahead:48, evadeChance:.6, evadeInterval:1.5, evadeSeconds:.35, chaseRange:160, chaseSeconds:3, maxStay:15, aimDeadZone:4, attacks:["up","aim","wave"], weights:[1,1,1]},
    formation:{count:3, interval:.55}
  },
  bullet:{size:[6,8], hit:[4,6], speed:150, amplitude:16, period:1.6},
  difficulty:{cycle:60, levelMax:10, rampEnd:35, peakEnd:50, rampStart:20, peakFrequency:1.5, restFrequency:.5,
    spawn:[1.5,.4], enemyCap:[8,24], speed:[1,1.5], attackMin:[3,1.5], attackMax:[6,3], bulletSpeed:[1,1.5], bulletCap:[6,16], formation:[.05,.15], smart:[0,.05]},
  score:{bands:[[192,1],[288,1.5],[384,2],[480,3]], comboMax:4, extends:[10000,30000,60000,100000], textSeconds:.8},
  item:{size:16, hit:[16,16], speed:120, y:72, lifetime:10, blink:3, invSeconds:10, invWarningSeconds:2, invBlinkRate:8,
    kinds:["weight","firework","barrage","invincible","life"], weights:[27,26,26,20,1],
    labels:{weight:"てつのおもり",firework:"はなび！",barrage:"だんまく！",invincible:"ばりあー",life:"お化けちゃん"}},
  special:{weight:{size:32,hit:[30,30],speed:360},firework:{radius:96,duration:1},barrage:{count:7,spacing:32}},
  storage:{high:"obake-daisakusen.high.v1",audio:"obake-daisakusen.audio.v1"}
} };
if(typeof module!=="undefined")module.exports=globalThis.Daisakusen;

