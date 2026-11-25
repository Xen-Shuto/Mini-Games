"use strict";
(() => {
  const O=globalThis.Obake, art=O.art;
  const mix=(a,b,t)=>a+(b-a)*t;
  class Renderer {
    constructor(canvas){
      const tile=32, world=O.config.world;
      canvas.width=32+world.columns*tile;
      canvas.height=Math.round(world.visible*O.rowsPerFloor*tile);
      this.canvas=canvas;this.c=canvas.getContext("2d");
      this.sky=document.createElement("canvas");this.sky.width=canvas.width;this.sky.height=canvas.height;
      art.landscape(this.sky.getContext("2d"),canvas.width,canvas.height,false);
    }
    draw(g,alpha){
      const c=this.c,w=this.canvas.width,h=this.canvas.height,conf=g.c.world;
      c.imageSmoothingEnabled=false;c.drawImage(this.sky,0,0);art.rect(c,"#221d3385",0,0,w,h);
      const colWidth=(w-32)/conf.columns, height=h/conf.visible;
      const px=x=>16+(x+.5)*colWidth;
      const floor=g.camera(mix(g.player.py,g.player.y,alpha));
      const py=y=>Math.round(h-(y-floor)*height);
      const size=Math.min(32,Math.floor(height/O.rowsPerFloor),Math.floor(colWidth));
      for(let f=Math.max(1,Math.floor(floor));f<=floor+conf.visible+1;f++){
        const holes=g.world.floors.get(f);if(!holes)continue;
        const y=py(f), bottom=py(f-1/O.rowsPerFloor), depth=bottom-y, goal=f===g.goal;
        for(let x=0;x<conf.columns;x++){
          if(holes.has(x))continue;
          const left=Math.round(16+colWidth*x),right=Math.round(16+colWidth*(x+1));
          art.rect(c,"#493f51",left,y,right-left,depth);
          art.rect(c,goal?"#f6d294":"#b6a09f",left,y,right-left,2);
          art.rect(c,goal?"#a88165":"#736274",left,y+2,right-left,4);
          if((x+f)%3!==1)art.rect(c,"#927c86",left+3,y+3,Math.max(2,(right-left)*.36|0),1);
          const seam=y+Math.floor(depth/2);
          art.rect(c,"#3c3346",left,y+6,1,seam-y-6);
          art.rect(c,"#3c3346",left,seam,right-left,1);
          art.rect(c,"#3c3346",Math.floor((left+right)/2),seam+1,1,bottom-seam-1);
          art.rect(c,"#302a3c",left,bottom-2,right-left,2);
          if(holes.has(x-1))art.rect(c,"#897685",left,y+2,2,depth-4);
          if(holes.has(x+1))art.rect(c,"#897685",right-2,y+2,2,depth-4);
        }
        c.font="bold 9px monospace";c.fillStyle="#e5d3d2";c.fillText(String(f),1,y+2);
      }
      function entity(a,type,actorSize,mirror=false) {
        art.blit(c,type,px(mix(a.px,a.x,alpha))-actorSize/2,py(mix(a.py,a.y,alpha))-actorSize,actorSize,actorSize,mirror);
      }
      for(const it of g.items)entity(it,it.type,Math.round(size*.82));
      for(const e of g.enemies)entity(e,e.type,size,e.dir>0);
      const p=g.player,x=px(mix(p.px,p.x,alpha)),y=py(mix(p.py,p.y,alpha));
      if(g.power.type!=="normal"){
        const color=g.power.type==="super"?"#93f9d8":"#ffbc85";
        const phase=g.time*3;
        for(let i=0;i<4;i++){const a=phase+i*Math.PI/2;art.star(c,Math.round(x+Math.cos(a)*size*.48),Math.round(y-size*.52+Math.sin(a)*size*.45),color,1+i%2);}
      }
      entity(p,{normal:"ghost",power:"powerGhost",super:"superGhost"}[g.power.type],size,p.dir>0);
    }
  }
  const melodies={start:[392,494,587],step:[610,760],break:[160,95],power:[392,523,659],
    super:[523,659,784,1046],defeat:[660,880],miss:[349,262,175],extend:[523,784,1046],clear:[523,659,784,1046,988,1046]};
  const superLoops={
    superLoop:{period:.72, spacing:.13, length:.12, notes:[523.25,659.25,783.99]},
    superWarning:{period:.25, spacing:.09, length:.075, notes:[987.77,739.99]}
  };
  function makeLoopBuffer(ctx,pattern){
    const rate=ctx.sampleRate;
    const buffer=ctx.createBuffer(1,Math.round(rate*pattern.period),rate);
    const samples=buffer.getChannelData(0);
    pattern.notes.forEach((hz,i)=>{
      const offset=Math.round(i*pattern.spacing*rate);
      for(let n=0;n<Math.floor(pattern.length*rate);n++){
        const t=n/rate, angle=2*Math.PI*hz*t;
        const envelope=Math.min(1,t/.008)*(1-t/pattern.length)**2;
        samples[offset+n]=.055*envelope*(Math.sin(angle)+.2*Math.sin(2*angle));
      }
    });
    return buffer;
  }
  class Sound {
    constructor(){
      this.enabled=true;this.ctx=null;this.files=new Map();
      this.loopBuffers=new Map();this.superCue=null;this.stopSuperLoop=null;
    }
    unlock(){
      if(!this.enabled)return;
      try{this.ctx??=new AudioContext();if(this.ctx.state==="suspended")this.ctx.resume().catch(()=>{});}catch{}
    }
    syncSuper(game){
      let cue=null;
      if(this.enabled && game?.phase==="play" && game.power.type==="super" && game.power.remaining>0)
        cue=game.power.remaining<=O.config.power.warningSeconds+1e-9?"superWarning":"superLoop";
      if(cue===this.superCue)return;
      this.stopSuperLoop?.();
      this.stopSuperLoop=null;this.superCue=null;
      if(!cue)return;
      const path=O.config.sounds[cue];
      if(path){
        if(!this.files.has(cue))this.files.set(cue,new Audio(path));
        const audio=this.files.get(cue);
        audio.loop=true;audio.currentTime=0;audio.play().catch(()=>{});
        this.stopSuperLoop=()=>audio.pause();
      } else {
        if(this.ctx?.state!=="running")return;
        if(!this.loopBuffers.has(cue))this.loopBuffers.set(cue,makeLoopBuffer(this.ctx,superLoops[cue]));
        const source=this.ctx.createBufferSource();
        source.buffer=this.loopBuffers.get(cue);source.loop=true;
        source.connect(this.ctx.destination);source.start();
        this.stopSuperLoop=()=>{source.stop();source.disconnect();};
      }
      this.superCue=cue;
    }
    play(key){
      if(!this.enabled)return;
      const path=O.config.sounds[key];
      if(path){
        if(!this.files.has(key))this.files.set(key,new Audio(path));
        const a=this.files.get(key);a.currentTime=0;a.play().catch(()=>{});return;
      }
      if(this.ctx?.state!=="running")return;
      const ctx=this.ctx, notes=melodies[key]||[], length=key==="step"?.045:.09;
      notes.forEach((hz,i)=>{
        const osc=ctx.createOscillator(),amp=ctx.createGain(),t=ctx.currentTime+i*length;
        osc.type=key==="break"?"triangle":"sine";osc.frequency.value=hz;
        amp.gain.setValueAtTime(.001,t);amp.gain.exponentialRampToValueAtTime(.08,t+.009);
        amp.gain.exponentialRampToValueAtTime(.001,t+length);
        osc.connect(amp);amp.connect(ctx.destination);osc.start(t);osc.stop(t+length+.005);
        osc.onended=()=>{osc.disconnect();amp.disconnect();};
      });
    }
  }
  Object.assign(O,{Renderer,Sound});
})();
