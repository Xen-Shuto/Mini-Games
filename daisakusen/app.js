"use strict";
(() => {
  const D=globalThis.Daisakusen,C=D.config,$=id=>document.getElementById(id);
  const storage={read(key,fallback){try{const v=localStorage.getItem(key);return v===null?fallback:JSON.parse(v);}catch{return fallback;}},write(key,v){try{localStorage.setItem(key,JSON.stringify(v));}catch{}}};
  const high=storage.read(C.storage.high,0);D.savedHigh=Number.isFinite(high)&&high>=0?Math.floor(high):0;
  const stored=storage.read(C.storage.audio,{}),audio={bgm:typeof stored?.bgm==="boolean"?stored.bgm:true,sfx:typeof stored?.sfx==="boolean"?stored.sfx:true};
  const sound=new D.Sound(audio),renderer=new D.Renderer($("game"));let game=null,scene="title",input={},last=0,ambient=0;
  function clearInput(){input={};game?.resetInput();}
  function resize(){const scale=Math.min(innerWidth/C.screen.width,innerHeight/C.screen.height);$("stage").style.width=C.screen.width+"px";$("stage").style.height=C.screen.height+"px";$("stage").style.transform=`scale(${scale})`;}
  // 固定640×480の親のレイアウト寸法も縮小し、縦長・極小画面で横スクロールを作らない。
  function fit(){const scale=Math.min(innerWidth/640,innerHeight/480);document.body.style.display="block";const stage=$("stage");stage.style.position="absolute";stage.style.left=(innerWidth-640*scale)/2+"px";stage.style.top=(innerHeight-480*scale)/2+"px";stage.style.transformOrigin="top left";resize();}
  function show(next){
    scene=next;$("stage").dataset.scene=scene;$("overlay").hidden=scene==="play";$("help").hidden=scene!=="help";$("pause").hidden=scene!=="play";
    for(const id of ["start","how","resume","retry","title","help-back"])$(id).hidden=true;
    $("eyebrow").hidden=scene!=="title";
    if(scene==="title"){$("heading").innerHTML="お化けちゃんの<br><strong>大作戦！</strong>";$("message").textContent="地下から来る悪いヤツらを、人魂で迎え撃とう。";$("start").hidden=false;$("how").hidden=false;}
    if(scene==="help"){$("heading").textContent="HOW TO PLAY";$("help-back").hidden=false;}
    if(scene==="pause"){$("heading").textContent="PAUSE";$("message").textContent="ひと休み。再開するまで時間は止まっているよ。";$("resume").hidden=false;$("title").hidden=false;}
    if(scene==="over"){$("heading").textContent="GAME OVER";$("message").textContent=`SCORE  ${game.score}\nHIGH SCORE  ${game.high}${game.newRecord?"\nNEW RECORD!":""}`;$("retry").hidden=false;$("title").hidden=false;}
    sound.stop();clearInput();const first=$("menu").querySelector("button:not([hidden])");if(scene!=="play")first?.focus({preventScroll:true});
  }
  function start(){sound.unlock();const raw=new URLSearchParams(location.search).get("seed");game=new D.Game(raw===null?undefined:Number(raw),D.savedHigh);show("play");}
  function pause(){if(game?.phase==="play"){game.pause();show("pause");}}
  function resume(){sound.unlock();game.resume();show("play");last=performance.now();}
  $("start").onclick=start;$("retry").onclick=start;$("resume").onclick=resume;$("pause").onclick=pause;
  $("how").onclick=()=>{sound.unlock();show("help");};$("help-back").onclick=()=>show("title");$("title").onclick=()=>{game=null;show("title");};
  function audioButtons(){for(const key of ["bgm","sfx"]){$(key).textContent=`${key==="bgm"?"BGM":"SE"} ${audio[key]?"ON":"OFF"}`;$(key).setAttribute("aria-pressed",String(audio[key]));}}
  for(const key of ["bgm","sfx"])$(key).onclick=()=>{sound.unlock();audio[key]=!audio[key];storage.write(C.storage.audio,audio);sound.stop();audioButtons();};
  const keys={ArrowLeft:"left",ArrowRight:"right",KeyZ:"z",KeyX:"x"};
  window.addEventListener("keydown",e=>{
    if(e.code==="Escape"){e.preventDefault();if(e.repeat)return;if(scene==="play")pause();else if(scene==="pause")resume();else if(scene==="help")show("title");return;}
    if(keys[e.code]){e.preventDefault();if(scene==="play"){sound.unlock();input[keys[e.code]]=true;}}
  });
  window.addEventListener("keyup",e=>{if(keys[e.code]){e.preventDefault();input[keys[e.code]]=false;}});
  for(const button of document.querySelectorAll("[data-key]")){
    button.addEventListener("pointerdown",e=>{e.preventDefault();if(scene!=="play")return;sound.unlock();button.setPointerCapture(e.pointerId);input[button.dataset.key]=true;});
    for(const event of ["pointerup","pointercancel","lostpointercapture"])button.addEventListener(event,()=>{input[button.dataset.key]=false;});
  }
  window.addEventListener("blur",()=>{pause();clearInput();sound.stop();});document.addEventListener("visibilitychange",()=>{if(document.hidden){pause();clearInput();sound.stop();}});
  window.addEventListener("resize",fit);
  function frame(now){
    const dt=last?Math.max(0,(now-last)/1000):0;last=now;
    if(scene==="play"){
      game.advance(dt,input);
      if(game.high>D.savedHigh){D.savedHigh=game.high;storage.write(C.storage.high,D.savedHigh);}
      for(const e of game.events)sound.play(e);game.events=[];
      if(game.phase==="over"){show("over");sound.play({type:"over"});}
    }
    if(!document.hidden&&(scene==="title"||scene==="help")){ambient+=Math.min(dt,.1);sound.sync("title");}else if(scene==="play")sound.sync("play");
    renderer.draw(game,scene,ambient);requestAnimationFrame(frame);
  }
  audioButtons();fit();show("title");requestAnimationFrame(frame);
})();
