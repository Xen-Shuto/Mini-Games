"use strict";
(() => {
  const D=globalThis.Daisakusen,C=D.config,A=D.art,{rect:r,poly,disk,star}=A;
  class Renderer {
    constructor(canvas){
      this.canvas=canvas;canvas.width=C.screen.width;canvas.height=C.screen.height;this.c=canvas.getContext("2d");
      this.sprites={};for(const kind of ["ghost","normal","fast","reverse","wander","deep","smart"]){const s=document.createElement("canvas");s.width=kind==="ghost"?32:64;s.height=32;const c=s.getContext("2d");if(kind==="ghost")A.ghost(c);else this.enemy(c,kind);this.sprites[kind]=s;}
      this.yura=new Image();this.yura.src="assets/yura.png";
      this.background=document.createElement("canvas");this.background.width=640;this.background.height=480;this.backdrop(this.background.getContext("2d"));
    }
    enemy(c,kind){
      // 前作の赤・緑・青の輪郭／顔を横長に再構成し、固有シルエットを追加。
      if(["normal","fast","reverse"].includes(kind)){
        c.save();c.scale(2,1);A.enemy(c,{normal:"patrol",fast:"chase",reverse:"random"}[kind]);c.restore();
        if(kind==="fast"){poly(c,"#aaf2d6",[[4,12],[0,6],[15,10],[19,13]]);r(c,"#30213f",21,13,11,2);}
        if(kind==="reverse"){poly(c,"#c0b7f4",[[27,6],[32,0],[37,6]]);r(c,"#30213f",26,20,12,3);r(c,"#fff2dc",28,20,2,2);}
      } else {
        const color={wander:"#f2c86f",deep:"#b792de",smart:"#e6e2d5"}[kind],shade={wander:"#a47d55",deep:"#695384",smart:"#88979f"}[kind];
        poly(c,"#201a30",[[3,18],[8,10],[20,8],[25,4],[40,5],[47,10],[57,12],[63,21],[54,28],[12,28]]);
        poly(c,shade,[[6,18],[12,12],[22,10],[27,7],[39,8],[48,14],[56,15],[59,22],[51,26],[14,26]]);
        r(c,color,16,12,33,11);
        if(kind==="wander"){star(c,color?10:0,9,color,3);r(c,"#30213f",23,16,3,2);r(c,"#30213f",39,18,3,2);poly(c,"#30213f",[[29,20],[32,23],[35,20]]);}
        if(kind==="deep"){poly(c,color,[[5,18],[0,29],[16,24]]);poly(c,color,[[49,24],[63,31],[57,19]]);r(c,"#201a30",21,15,23,4);r(c,"#ffacb7",24,16,6,2);r(c,"#ffacb7",36,16,6,2);r(c,"#fff2dc",29,22,8,2);}
        if(kind==="smart"){r(c,"#2c3c53",20,12,28,8);r(c,"#87f6ef",22,14,9,4);r(c,"#87f6ef",36,14,9,4);r(c,"#2c3c53",30,15,6,2);poly(c,color,[[24,7],[31,0],[36,7]]);r(c,"#30213f",33,22,9,1);}
      }
    }
    blit(kind,x,y,w,h,mirror=false){const c=this.c;c.save();c.translate(Math.round(x),Math.round(y));if(mirror){c.translate(w,0);c.scale(-1,1);}c.drawImage(this.sprites[kind],0,0,w,h);c.restore();}
    backdrop(c){
      const sky=c.createLinearGradient(0,32,0,96);sky.addColorStop(0,"#191b37");sky.addColorStop(1,"#61506f");c.fillStyle=sky;c.fillRect(0,0,640,96);
      disk(c,"#b59a9d",436,48,13);disk(c,"#ffe2a5",435,47,11);r(c,"#eac98e",434,42,6,2);
      for(let i=0;i<34;i++)star(c,12+(i*97)%620,36+(i*13)%34,i%3?"#a89bb9":"#dfc2b1",1);
      poly(c,"#36324f",[[0,85],[110,41],[155,65],[219,38],[294,83],[373,57],[448,82],[531,48],[640,84],[640,96],[0,96]]);
      r(c,"#78687e",0,88,640,8);r(c,"#bd9d9a",0,91,640,2);
      // 地上の左右は画面外に続く建築を見切れさせ、中央だけを開ける。
      for(const x of [-38,512]){
        r(c,"#30263c",x,56,166,34);r(c,"#69515b",x,64,166,23);r(c,"#453342",x,65,166,3);
        for(let i=0;i<5;i++){r(c,"#a97e78",x+i*35,62,5,26);r(c,"#785863",x+i*35+3,62,3,26);}
        poly(c,"#242337",[[x-16,58],[x+2,39],[x+166,39],[x+180,58]]);r(c,"#716679",x-12,57,190,3);
        for(let k=0;k<9;k++){r(c,"#807083",x+k*21,42,14,2);r(c,"#52475f",x+k*21-3,50,18,2);}
      }
      for(const x of [165,476]){r(c,"#383247",x-3,72,6,18);poly(c,"#aca0b0",[[x-10,73],[x,66],[x+10,73]]);r(c,"#7e738b",x-7,74,14,7);r(c,"#ffda8f",x-4,75,8,4);r(c,"#55445e",x-9,88,18,3);}
      for(const x of [206,400]){r(c,"#82788c",x,77,12,13);r(c,"#b5a5af",x+2,75,8,3);r(c,"#5e516c",x+4,80,4,6);}
      const underground=c.createLinearGradient(0,96,0,480);underground.addColorStop(0,"#393044");underground.addColorStop(1,"#171522");c.fillStyle=underground;c.fillRect(0,96,640,384);
      r(c,"#090b1745",0,96,128,384);r(c,"#090b1745",512,96,128,384);
      for(let i=0;i<220;i++){const x=(i*137+29)%640,y=102+(i*71)%376;r(c,i%3?"#66536a18":"#93728618",x,y,1+i%4,1);}
      r(c,"#e4bfa3",128,94,384,2);
    }
    text(text,x,y,size=12,color="#fff1e2",align="left") {const c=this.c;c.font=`bold ${size}px monospace`;c.textAlign=align;c.textBaseline="middle";c.fillStyle="#161321";c.fillText(text,x+1,y+1);c.fillStyle=color;c.fillText(text,x,y);}
    flame(x,y,color="#8af3d7"){const c=this.c;poly(c,"#182330",[[x,y-6],[x+4,y-1],[x+3,y+5],[x-3,y+5],[x-4,y]]);poly(c,color,[[x,y-5],[x+3,y],[x+2,y+4],[x-2,y+4],[x-2,y]]);r(c,"#fff4d0",x-1,y+1,2,3);}
    item(kind,x,y,size=16){const c=this.c;c.save();c.translate(Math.round(x-size/2),Math.round(y-size/2));c.scale(size/16,size/16);
      if(kind==="life"){c.drawImage(this.sprites.ghost,0,0,16,16);}
      else if(kind==="weight"){poly(c,"#c5c2d4",[[6,1],[10,1],[10,5],[13,5],[16,15],[0,15],[3,5],[6,5]]);r(c,"#595467",4,8,8,2);r(c,"#888699",2,13,12,2);}
      else if(kind==="invincible"){disk(c,"#7ccde0",8,8,7);star(c,8,8,"#fff7ba",5);}
      else if(kind==="firework"){star(c,8,8,"#ffbf80",6);star(c,8,8,"#ff799a",3);r(c,"#fff4d0",7,7,3,3);}
      else {for(const x of [2,7,12]){poly(c,"#b9f8e8",[[x+1,1],[x+3,6],[x+3,13],[x,15],[x-1,11],[x-1,7]]);r(c,"#6aacb8",x,8,1,4);}}
      c.restore();
    }
    draw(g,scene="play",ambient=0){
      const c=this.c;c.imageSmoothingEnabled=false;c.globalAlpha=1;c.drawImage(this.background,0,0);
      if(!g){
        if(scene==="help")return;
        for(let i=0;i<6;i++)this.blit(["normal","fast","reverse","wander","deep","smart"][i],50+i*101,360+Math.sin(ambient+i)*18,64,32,i%2===0);
        this.blit("ghost",273,73+Math.sin(ambient*2)*3,64,64,true);
        if(this.yura.complete&&this.yura.naturalWidth)c.drawImage(this.yura,350,64,64,64);
        this.text("HIGH SCORE  "+String(D.savedHigh||0).padStart(7,"0"),320,447,14,"#b9eadd","center");
        this.text("お化けちゃん × 夜の境内 × 人魂大連鎖",320,420,12,"#baa8c9","center");return;
      }
      for(const a of g.shots){
        if(a.state==="explode"){
          const max=a.kind==="firework"?C.special.firework.duration:C.shot.duration;
          c.globalAlpha=.16+.15*a.remaining/max;disk(c,a.kind==="firework"?"#ffac7e":"#8af3d7",Math.round(a.x),Math.round(a.y),a.radius);c.globalAlpha=1;
          c.strokeStyle=a.kind==="firework"?"#ffd493":"#b4ffee";c.lineWidth=1;c.beginPath();c.arc(a.x,a.y,a.radius,0,Math.PI*2);c.stroke();
          for(let i=0;i<7;i++){const p=i*Math.PI*2/7+g.time*2;star(c,Math.round(a.x+Math.cos(p)*a.radius*.7),Math.round(a.y+Math.sin(p)*a.radius*.7),i%2?"#fff0bc":"#b6eddd",2);}
        } else if(a.kind==="weight")this.item("weight",a.x,a.y,C.special.weight.size);
        else this.flame(Math.round(a.x),Math.round(a.y),a.kind==="firework"?"#ffae8a":"#8af3d7");
      }
      // 所持敵を手前に。予告は頭上の朱色の照準と「!」、所持は金色の星。
      for(const e of [...g.enemies].sort((a,b)=>Number(a.carrier)-Number(b.carrier)||a.id-b.id)){
        this.blit(e.type,e.x-32,e.y-16,64,32,e.dir<0);
        if(e.carrier){c.strokeStyle="#ffdb8b";c.strokeRect(Math.round(e.x-30),Math.round(e.y-15),60,30);star(c,Math.round(e.x-25),Math.round(e.y-15),"#ffe8a6",3);}
        if(e.warning){this.text("!",e.x,e.y-24,15,"#ff8877","center");c.strokeStyle="#ff8877";c.beginPath();c.arc(e.x,e.y,10+3*Math.sin(g.time*28),0,Math.PI*2);c.stroke();}
      }
      for(const it of g.items){if(!it.ground||it.left>C.item.blink||Math.floor(it.left*8)%2)this.item(it.kind,it.x,it.y);}
      for(const t of g.texts){c.globalAlpha=Math.min(1,t.left/.25);this.text(`${t.points}${t.combo>1?" ×"+t.combo:""}`,t.x,t.y-(C.score.textSeconds-t.left)*24,12,t.combo>1?"#ffe48a":"#ffffff","center");}c.globalAlpha=1;
      const p=g.player;
      const barrierVisible=g.itemInv>0&&(g.itemInv>C.item.invWarningSeconds||Math.floor(g.itemInv*C.item.invBlinkRate)%2!==0);
      if(barrierVisible){c.strokeStyle="#97f9ea";c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y,23,20,0,0,Math.PI*2);c.stroke();for(let i=0;i<4;i++)star(c,Math.round(p.x+Math.cos(g.time*3+i*Math.PI/2)*23),Math.round(p.y+Math.sin(g.time*3+i*Math.PI/2)*20),"#f9e5ac",2);}
      if(g.respawnInv<=0||Math.floor(g.time*12)%2)this.blit("ghost",p.x-16,p.y-16+Math.sin(g.time*5)*2,32,32,p.dir>0);
      // 明るい芯＋暗い縁取りの敵弾を、得点文字より必ず前に描く。
      for(const b of g.bullets){r(c,"#100d1c",b.x-4,b.y-5,8,10);r(c,"#ff709a",b.x-3,b.y-4,6,8);r(c,"#fff6c5",b.x-1,b.y-3,2,6);}
      r(c,"#111321",0,0,640,32);r(c,"#6f577a",0,31,640,1);
      this.text("SCORE "+String(g.score).padStart(7,"0"),9,10,11);this.text("HIGH "+String(g.high).padStart(7,"0"),9,23,10,"#a7c9c6");
      this.blit("ghost",151,7,16,16);this.text("×"+g.lives,171,17,14);
      this.text("ITEM",218,10,9,"#ae9ebf");if(g.held)this.item(g.held,252,18);this.text(g.held?C.item.labels[g.held]:"なし",269,19,11,g.held?"#ffe099":"#ae9ebf");
      if(barrierVisible)this.text(C.item.labels.invincible+" "+g.itemInv.toFixed(1)+"s",414,17,12,"#9bf6df");
      else if(g.respawnInv>0)this.text("復帰 "+g.respawnInv.toFixed(1)+"s",414,17,12,"#d1b8ed");
      const d=D.difficulty(g.time);this.text("Lv"+d.level+" "+d.phase,630,10,10,"#c7b0dd","right");this.text("ESC : PAUSE",630,24,9,"#ae9ebf","right");
    }
  }
  D.Renderer=Renderer;
})();
