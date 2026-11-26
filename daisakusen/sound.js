"use strict";
(() => {
  const D=globalThis.Daisakusen;
  const cues={shot:[740],enemyShot:[180],explosion:[100,65],collect:[523,659,784],weight:[130,87],firework:[440,880,1320],barrage:[392,523,659],invStart:[523,659,784,1046],invEnd:[659,523,392],extend:[523,784,1046],miss:[330,220,110],over:[392,370,330,262]};
  class Sound {
    constructor(settings){this.settings=settings;this.ctx=null;this.nodes=new Set();this.mode=null;this.beat=0;this.nextBeat=0;}
    unlock(){try{this.ctx??=new(window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==="suspended")this.ctx.resume().catch(()=>{});}catch{}}
    tone(hz,length=.1,volume=.04,delay=0,type="square"){
      const ctx=this.ctx;if(!ctx||ctx.state!=="running")return;
      const o=ctx.createOscillator(),a=ctx.createGain(),t=ctx.currentTime+delay;o.type=type;o.frequency.setValueAtTime(hz,t);a.gain.setValueAtTime(.0001,t);a.gain.exponentialRampToValueAtTime(volume,t+.008);a.gain.exponentialRampToValueAtTime(.0001,t+length);o.connect(a);a.connect(ctx.destination);this.nodes.add(o);o.onended=()=>{this.nodes.delete(o);o.disconnect();a.disconnect();};o.start(t);o.stop(t+length+.01);
    }
    play(event){if(!this.settings.sfx)return;const notes=event.type==="defeat"?[440*Math.pow(1.25,event.combo-1),660*Math.pow(1.25,event.combo-1)]:cues[event.type]||[];notes.forEach((n,i)=>this.tone(n,event.type==="over"?.22:.08,.035,i*.075,event.type==="explosion"?"sawtooth":"square"));}
    stop(){for(const o of this.nodes){try{o.stop();}catch{}}this.nodes.clear();this.mode=null;}
    sync(mode){
      if(!mode){if(this.mode)this.stop();return;}
      if(this.mode!==mode){this.stop();this.mode=mode;this.beat=0;this.nextBeat=0;}
      const ctx=this.ctx;if(!this.settings.bgm||!ctx||ctx.state!=="running")return;
      const length=mode==="title"?.25:.18;if(ctx.currentTime<this.nextBeat)return;
      const title=[60,63,67,66,67,63,58,55,60,67,70,67,66,63,58,59],play=[60,67,72,67,63,70,75,70,65,72,77,72,67,74,79,74,68,75,80,75,67,74,79,74,65,72,77,72,62,69,74,71];
      const melody=mode==="title"?title:play,n=melody[this.beat%melody.length],hz=440*Math.pow(2,(n-69)/12);this.tone(hz,length*.7,.018,0,"triangle");if(this.beat%2===0)this.tone(hz/4,length*.9,.018,0,"square");this.beat++;this.nextBeat=ctx.currentTime+length;
    }
  }
  D.Sound=Sound;
})();
