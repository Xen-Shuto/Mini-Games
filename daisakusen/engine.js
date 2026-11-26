"use strict";
(() => {
  const D=globalThis.Daisakusen, C=D.config, S=C.screen;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  class Random {
    constructor(seed=Date.now()){this.state=seed>>>0;}
    next(){let t=this.state+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
    range(a,b){return a+(b-a)*this.next();}
    int(a,b){return Math.floor(this.range(a,b+1));}
    weighted(values,weights){let n=this.next()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<values.length;i++){n-=weights[i];if(n<0)return values[i];}return values.at(-1);}
  }
  function difficulty(time){
    const d=C.difficulty, level=Math.min(d.levelMax,1+Math.floor(time/d.cycle)), p=clamp((level-1)/(d.levelMax-1),0,1), t=time%d.cycle;
    const frequency=t<d.rampStart?1:t<d.rampEnd?1+(d.peakFrequency-1)*(t-d.rampStart)/(d.rampEnd-d.rampStart):t<d.peakEnd?d.peakFrequency:d.restFrequency;
    const v={level,frequency,phase:t<d.rampStart?"通常":t<d.rampEnd?"上昇":t<d.peakEnd?"ピーク":"休息"};
    for(const key of ["spawn","enemyCap","speed","attackMin","attackMax","bulletSpeed","bulletCap","formation","smart"]){v[key]=d[key][0]+(d[key][1]-d[key][0])*p;}
    v.enemyCap=Math.floor(v.enemyCap);v.bulletCap=Math.floor(v.bulletCap);return v;
  }
  const combat=x=>x>=S.left&&x<S.right;
  const box=(a,b)=>Math.abs(a.x-b.x)*2<=a.hit[0]+b.hit[0]&&Math.abs(a.y-b.y)*2<=a.hit[1]+b.hit[1];
  const circle=(a,b)=>{const x=Math.max(0,Math.abs(a.x-b.x)-b.hit[0]/2),y=Math.max(0,Math.abs(a.y-b.y)-b.hit[1]/2);return x*x+y*y<=a.radius*a.radius;};
  const order=(a,b)=>a.y-b.y||a.x-b.x||a.id-b.id;
  class Game {
    constructor(seed,high=0){
      this.rng=new Random(seed);this.id=0;this.phase="play";this.time=0;this.score=0;this.high=high;this.initialHigh=high;this.newRecord=false;
      this.lives=C.player.initialLives;this.extended=new Set();this.player={x:S.width/2,y:C.player.y,hit:C.player.hit,dir:-1};
      this.enemies=[];this.bullets=[];this.shots=[];this.items=[];this.texts=[];this.events=[];this.formations=[];
      this.held=null;this.itemInv=0;this.respawnInv=0;this.spawnTimer=C.difficulty.spawn[0];this.cooldowns={z:0,x:0};this.was={z:false,x:false};this.accumulator=0;
    }
    event(type,data={}){this.events.push({type,...data});}
    resetInput(){this.was={z:false,x:false};this.accumulator=0;}
    pause(){if(this.phase==="play"){this.phase="pause";this.resetInput();}}
    resume(){if(this.phase==="pause"){this.phase="play";this.resetInput();}}
    advance(dt,input={}){if(this.phase!=="play")return;this.accumulator+=Math.min(C.simulation.maxFrame,Math.max(0,dt));while(this.accumulator+1e-10>=C.simulation.step&&this.phase==="play"){this.step(C.simulation.step,input);this.accumulator-=C.simulation.step;}}
    interval(){const d=difficulty(this.time);return this.rng.range(d.attackMin,d.attackMax);}
    chooseType(){const names=Object.keys(C.enemy.types).filter(k=>k!=="smart");return this.rng.next()<difficulty(this.time).smart?"smart":this.rng.weighted(names,names.map(k=>C.enemy.types[k].weight));}
    spawn(type=this.chooseType(),dir=this.rng.next()<.5?1:-1,depth){
      if(this.enemies.filter(e=>!e.dead).length>=difficulty(this.time).enemyCap)return null;
      const def=C.enemy.types[type], amp=type==="wander"?C.enemy.wander.amplitude:0;
      const base=clamp(depth??S.ground+(S.height-S.ground)*this.rng.range(...def.depth),S.ground+C.enemy.size[1]/2+amp,S.height-C.enemy.size[1]/2-amp);
      const e={id:++this.id,type,x:dir>0?-C.enemy.size[0]/2:S.width+C.enemy.size[0]/2,y:base,base,dir,exitDir:dir,hit:C.enemy.hit,age:0,entryAge:0,inCombat:false,battleAge:0,attackTimer:this.interval(),warning:null,carrier:this.rng.next()<C.enemy.carrierChance,phase:this.rng.range(0,Math.PI*2),turns:type==="reverse"?this.rng.int(...C.enemy.reverse.count):0,evadeTimer:0,chaseLeft:0,chased:false,exiting:false};
      e.turnX=this.rng.range(C.enemy.reverse.targets[0]+C.enemy.reverse.minTravel,C.enemy.reverse.targets[1]-C.enemy.reverse.minTravel);
      this.enemies.push(e);return e;
    }
    occupancy(owner){return this.bullets.filter(b=>!b.dead&&(owner===undefined||b.owner===owner)).length+this.enemies.filter(e=>!e.dead&&e.warning&&(owner===undefined||e.id===owner)).length;}
    warn(e){
      if(e.dead||!combat(e.x)||!C.enemy.types[e.type].attack||this.occupancy()>=difficulty(this.time).bulletCap||this.occupancy(e.id)>=C.enemy.perOwner)return false;
      let mode=C.enemy.types[e.type].attack;if(mode==="random")mode=this.rng.weighted(C.enemy.smart.attacks,C.enemy.smart.weights);
      e.warning={left:C.enemy.warning,mode};return true;
    }
    fireEnemy(e,mode){
      const speed=C.bullet.speed*difficulty(this.time).bulletSpeed;let vx=0,vy=-speed;
      if(mode==="aim"){const dx=this.player.x-e.x,dy=this.player.y-e.y,len=Math.hypot(dx,dy);vx=dx/len*speed;vy=dy/len*speed;}
      this.bullets.push({id:++this.id,owner:e.id,x:e.x,y:e.y,baseX:e.x,age:0,hit:C.bullet.hit,vx,vy,mode});this.event("enemyShot");
    }
    normal(side){
      const x=this.player.x+(side==="z"?-1:1)*C.shot.offset;
      if(!combat(x)||this.shots.filter(a=>!a.dead&&a.slot===side).length>=C.shot.slots)return false;
      this.soul(x,side,"normal");this.event("shot");return true;
    }
    soul(x,slot=null,kind="normal"){
      if(!combat(x))return null;
      const a={id:++this.id,x,baseX:x,y:S.ground,age:0,phase:C.shot.phase,slot,kind,hit:C.shot.hit,kills:0,state:"fall",radius:kind==="firework"?C.special.firework.radius:C.shot.radius};
      this.shots.push(a);return a;
    }
    special(){
      const kind=this.held;this.held=null;this.event(kind);
      if(kind==="weight")this.shots.push({id:++this.id,x:this.player.x,y:S.ground,hit:C.special.weight.hit,kind,state:"fall",kills:0,age:0,slot:null});
      else if(kind==="firework")this.soul(this.player.x,null,kind);
      else if(kind==="barrage")for(let i=0;i<C.special.barrage.count;i++)this.soul(this.player.x+(i-(C.special.barrage.count-1)/2)*C.special.barrage.spacing,null,"barrage");
    }
    attacks(dt,input){
      const due=[];
      for(const side of ["z","x"]){this.cooldowns[side]=Math.max(0,this.cooldowns[side]-dt);if(input[side]&&!this.was[side])this.cooldowns[side]=0;if(input[side]&&this.cooldowns[side]<=1e-9)due.push(side);this.was[side]=!!input[side];}
      if(due.length&&this.held){this.special();for(const side of due)this.cooldowns[side]=C.shot.interval;return;}
      for(const side of due)if(this.normal(side))this.cooldowns[side]=C.shot.interval;
    }
    moveEnemy(e,dt){
      const conf=C.enemy, speed=conf.types[e.type].speed*difficulty(this.time).speed, before=combat(e.x);e.age+=dt;
      if(before){e.battleAge+=dt;e.evadeTimer=Math.max(0,e.evadeTimer-dt);}
      if(e.type==="smart"&&before){
        const s=conf.smart;
        if(e.battleAge>=s.maxStay){e.exiting=true;e.dir=e.exitDir;}
        else {
          const threat=this.shots.some(a=>!a.dead&&a.state==="fall"&&a.kind!=="weight"&&a.y<e.y&&a.y>=e.y-s.height&&Math.abs(a.x-(e.x+e.dir*s.lookahead))<=s.width/2);
          e.evadeLeft=Math.max(0,(e.evadeLeft||0)-dt);
          if(threat&&e.evadeTimer===0){e.evadeTimer=s.evadeInterval;if(this.rng.next()<s.evadeChance){e.evadeDir=-(e.dir||e.exitDir);e.evadeLeft=s.evadeSeconds;}}
          if(!e.chased&&Math.abs(this.player.x-e.x)<=s.chaseRange){e.chased=true;e.chaseLeft=s.chaseSeconds;}
          if(e.chaseLeft>0){e.chaseLeft=Math.max(0,e.chaseLeft-dt);if(e.evadeLeft<=0){const dx=this.player.x-e.x;e.dir=Math.abs(dx)<s.aimDeadZone?0:Math.sign(dx);}if(e.chaseLeft===0)e.dir=e.exitDir;}
          if(e.evadeLeft>0)e.dir=e.evadeDir;
        }
      }else if(e.type==="smart")e.dir=e.exitDir;
      let nx=e.x+e.dir*speed*dt;
      if(e.type==="reverse"&&e.turns>0&&((e.dir>0&&nx>=e.turnX)||(e.dir<0&&nx<=e.turnX))){nx=e.turnX;e.dir*=-1;e.turns--;const r=conf.reverse;e.turnX=e.dir>0?this.rng.range(nx+r.minTravel,r.targets[1]):this.rng.range(r.targets[0],nx-r.minTravel);}
      e.x=nx;if(e.type==="wander")e.y=e.base+conf.wander.amplitude*Math.sin(e.phase+e.age*2*Math.PI/conf.wander.period);
      const inside=combat(e.x);
      if(!inside){e.entryAge=0;if(e.warning){e.warning=null;e.attackTimer=this.interval();}}
      else {
        if(!e.inCombat)e.entryAge=0;e.entryAge+=dt;
        if(e.warning){e.warning.left-=dt;if(e.warning.left<=1e-9){const mode=e.warning.mode;e.warning=null;this.fireEnemy(e,mode);e.attackTimer=this.interval();}}
        else {e.attackTimer-=dt*difficulty(this.time).frequency;if(e.entryAge>=conf.enterGrace&&e.attackTimer<=0)this.warn(e);}
      }
      e.inCombat=inside;
      if(e.x<-conf.size[0]/2-1||e.x>S.width+conf.size[0]/2+1){e.dead=true;e.warning=null;}
    }
    explode(a){a.state="explode";a.remaining=a.kind==="firework"?C.special.firework.duration:C.shot.duration;this.event("explosion",{big:a.kind==="firework"});}
    defeat(e,a){
      if(e.dead)return;e.dead=true;e.warning=null;a.kills++;
      const combo=Math.min(C.score.comboMax,a.kills),depth=(C.score.bands.find(b=>e.y<b[0])||C.score.bands.at(-1))[1],points=C.enemy.types[e.type].score*depth*combo;
      this.addScore(points);this.texts.push({x:e.x,y:e.y,points,combo,left:C.score.textSeconds});this.event("defeat",{combo});if(e.carrier)this.drop(e);
    }
    addScore(points){this.score+=points;if(this.score>this.high){this.high=this.score;this.newRecord=true;}for(const n of C.score.extends)if(this.score>=n&&!this.extended.has(n)){this.extended.add(n);this.lives=Math.min(C.player.maxLives,this.lives+1);this.event("extend");}}
    drop(e,kind=this.rng.weighted(C.item.kinds,C.item.weights)){
      const targetX=clamp(e.x,S.left+C.player.size/2,S.right-C.player.size/2);
      const it={id:++this.id,kind,x:e.x,y:e.y,fromX:e.x,fromY:e.y,targetX,travel:0,length:Math.hypot(targetX-e.x,e.y-C.item.y),ground:false,left:C.item.lifetime,hit:C.item.hit};this.items.push(it);return it;
    }
    collect(kind){
      if(kind==="invincible"){this.itemInv=C.item.invSeconds;this.event("invStart");}
      else if(kind==="life"){this.lives=Math.min(C.player.maxLives,this.lives+1);this.event("extend");}
      else this.held=kind;this.event("collect");
    }
    miss(){
      this.lives--;this.shots=[];this.bullets=[];this.held=null;this.itemInv=0;
      for(const e of this.enemies)if(e.warning){e.warning=null;e.attackTimer=this.interval();}
      this.player.x=S.width/2;this.respawnInv=C.player.respawnInv;this.event("miss");
      if(this.lives<=0){this.phase="over";this.event("over");}
    }
    step(dt,input={}){
      if(this.phase!=="play")return;
      this.time+=dt;this.respawnInv=Math.max(0,this.respawnInv-dt);const oldInv=this.itemInv;this.itemInv=Math.max(0,this.itemInv-dt);if(oldInv>0&&this.itemInv===0)this.event("invEnd");
      const move=Number(!!input.right)-Number(!!input.left);if(move)this.player.dir=move;
      this.player.x=clamp(this.player.x+move*C.player.speed*dt,S.left+C.player.size/2,S.right-C.player.size/2);
      this.attacks(dt,input);
      this.spawnTimer-=dt*difficulty(this.time).frequency;
      if(this.spawnTimer<=0){this.spawnTimer=difficulty(this.time).spawn;const type=this.chooseType(),dir=this.rng.next()<.5?1:-1,e=this.spawn(type,dir);if(this.rng.next()<difficulty(this.time).formation)this.formations.push({type,dir,depth:e?.base,next:C.enemy.formation.interval,left:C.enemy.formation.count-1});}
      for(const f of this.formations){f.next-=dt;if(f.next<=1e-9){this.spawn(f.type,f.dir,f.depth);f.left--;f.next=C.enemy.formation.interval;}}
      this.formations=this.formations.filter(f=>f.left>0);
      for(const e of this.enemies)this.moveEnemy(e,dt);
      for(const b of this.bullets){b.age+=dt;b.baseX+=b.vx*dt;b.y+=b.vy*dt;b.x=b.baseX+(b.mode==="wave"?C.bullet.amplitude*Math.sin(b.age*2*Math.PI/C.bullet.period):0);if(b.y<-C.bullet.size[1]||b.x<-C.bullet.size[0]||b.x>S.width+C.bullet.size[0])b.dead=true;}
      // Attack creation order determines attribution; victims are shallow→deep, left→right, then stable ID.
      for(const a of this.shots){
        if(a.state==="explode"){a.remaining-=dt;if(a.remaining<=1e-9){a.dead=true;continue;}}
        else {a.age+=dt;a.y+=(a.kind==="weight"?C.special.weight.speed:C.shot.speed)*dt;if(a.kind!=="weight")a.x=a.baseX+C.shot.amplitude*Math.sin(a.phase+a.age*2*Math.PI/C.shot.period);}
        if(a.state==="fall"&&a.kind!=="weight"&&(this.enemies.some(e=>!e.dead&&box(a,e))||this.bullets.some(b=>!b.dead&&box(a,b))))this.explode(a);
        const hit=a.state==="explode"?circle:box;
        for(const e of this.enemies.filter(e=>!e.dead&&hit(a,e)).sort(order))this.defeat(e,a);
        for(const b of this.bullets)if(!b.dead&&hit(a,b))b.dead=true;
        if(a.state==="fall"&&a.y>S.height+(a.kind==="weight"?C.special.weight.size:C.shot.size[1])/2)a.dead=true;
      }
      for(const it of this.items){
        if(!it.ground){it.travel+=C.item.speed*dt;const p=Math.min(1,it.travel/(it.length||1));it.x=it.fromX+(it.targetX-it.fromX)*p;it.y=it.fromY+(C.item.y-it.fromY)*p;if(p===1)it.ground=true;}
        else {it.left-=dt;if(it.left<=1e-9)it.dead=true;}
        if(!it.dead&&box(it,this.player)){it.dead=true;this.collect(it.kind);}
      }
      for(const b of this.bullets)if(!b.dead&&box(b,this.player)){b.dead=true;if(this.itemInv<=0&&this.respawnInv<=0){this.miss();break;}}
      this.enemies=this.enemies.filter(e=>!e.dead);this.bullets=this.bullets.filter(b=>!b.dead);this.shots=this.shots.filter(a=>!a.dead);this.items=this.items.filter(it=>!it.dead);
      for(const t of this.texts)t.left-=dt;this.texts=this.texts.filter(t=>t.left>0);
    }
  }
  Object.assign(D,{Game,Random,difficulty,combat,box,circle,clamp});
  if(typeof module!=="undefined")module.exports=D;
})();
