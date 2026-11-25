"use strict";
(() => {
  const O=globalThis.Obake,c=O.config,$=id=>document.getElementById(id);
  const field=new O.Renderer($("field")), sound=new O.Sound(), clock=new O.FixedClock(c.tickRate);
  const down=new Set(), fingers=new Map();
  let game=null,last=null,shownPhase="",best={floor:0,score:0},saved="",failedSave=false;
  const recordKey="otsukai.endless.v1";
  try{
    const stored=JSON.parse(localStorage.getItem(recordKey)||"null");
    if(stored&&Number.isSafeInteger(stored.floor)&&Number.isSafeInteger(stored.score))best=stored;
  }catch{}
  function record(){
    if(game?.mode!=="endless")return;
    best={floor:Math.max(best.floor,game.highest),score:Math.max(best.score,game.score)};
    const value=JSON.stringify(best);if(saved===value)return;
    try{localStorage.setItem(recordKey,value);failedSave=false;}catch{failedSave=true;}
    saved=value;
  }
  function bestText(){
    $("best").textContent=best.floor?best.floor+" 階 ／ "+best.score.toLocaleString()+" 点"+(failedSave?"（今回のみ）":""):"― 階 ／ ― 点";
  }
  const label=k=>({ArrowLeft:"←",ArrowRight:"→",ArrowUp:"↑",Escape:"Esc"}[k]||k.replace("Key","").replace("Numpad","テンキー"));
  const keyNames=k=>c.keys[k].map(label);
  for (const [id,course] of Object.entries(c.courses)) {
    const button=$("course-button").content.firstElementChild.cloneNode(true);
    button.id=id;
    button.classList.add(id==="normal"?"primary":"secondary");
    const icon=button.firstElementChild;
    const finite=Number.isFinite(course.goal);
    icon.className=finite?"pixel-symbol":"infinity";
    icon.textContent=finite?"▶":"∞";
    button.querySelector("b").textContent=course.label;
    button.querySelector("small").textContent=finite?course.goal+"階でクリア":"どこまで登れるか挑戦";
    button.onclick=()=>start(id);
    $("courses").append(button);
  }
  const actions=["left","right","up"];
  for(const action of actions)$(action+"-key").textContent=keyNames(action)[0];
  const alternate=keyNames("left").slice(1).map((_,i)=>actions.map(a=>keyNames(a)[i+1]).join("・"));
  $("key-guide").textContent=alternate.join(" ／ ")+" にも対応。"+keyNames("pause").join(" / ")+" でポーズ。";
  $("power-desc").textContent="頭上の床を最大"+c.power.uses+"回壊せる";
  $("super-desc").textContent=c.power.superSeconds+"秒間、無敵。"+c.resource.label+"＋"+c.resource.recovery;
  $("resource-label").textContent=c.resource.label;$("gauge").max=c.resource.max;
  $("play-keys").textContent=keyNames("left")[0]+" "+keyNames("right")[0]+" 左右移動　"+keyNames("up")[0]+" 上昇　"+keyNames("pause")[0]+" ポーズ";
  function titleArt(){
    const p=$("poster");O.art.titleScene(p.getContext("2d"),p.width,p.height);
    for(const canvas of document.querySelectorAll("[data-icon]"))O.art.blit(canvas.getContext("2d"),canvas.dataset.icon,0,0,32);
  }
  window.addEventListener("obake-art-loaded",()=>{if(!game)titleArt();});
  const resetInputs=()=>{down.clear();fingers.clear();};
  function showTitle(){
    record();game=null;sound.syncSuper(game);resetInputs();$("title-screen").hidden=false;$("game-screen").hidden=true;
    bestText();titleArt();$("normal").focus({preventScroll:true});
  }
  function start(mode){
    record();sound.unlock();
    const param=new URLSearchParams(location.search).get("seed");
    const seed=param!==null&&/^\d{1,10}$/.test(param)?Number(param):c.seed??crypto.getRandomValues(new Uint32Array(1))[0];
    game=new O.Game(mode,seed,c,event=>sound.play(event));
    resetInputs();shownPhase="";last=null;clock.remainder=0;
    $("title-screen").hidden=true;$("game-screen").hidden=false;$("pause").focus({preventScroll:true});
    $("mode-name").textContent=c.courses[mode].label;
    $("goal").textContent=Number.isFinite(game.goal)?"ゴール "+game.goal+" 階":"ゴールなし";
    sound.play("start");hud();field.draw(game,1);record();
  }
  function modal(){
    if(shownPhase===game.phase)return;shownPhase=game.phase;
    const phase=game.phase;
    $("overlay").hidden=phase==="play";$("pause").disabled=phase!=="play"&&phase!=="paused";
    $("ending-art").hidden=phase!=="clear";$("actions").hidden=phase==="miss";
    if(phase==="play")return;
    resetInputs();
    $("dialog-title").textContent={paused:"ひとやすみ",miss:game.lives?"ミス！":"最後のミス",over:"ゲームオーバー",clear:"おかえり、お化けちゃん！"}[phase];
    $("dialog-info").textContent={paused:"ポーズ中",miss:game.lives?game.highest+"階から再開するよ。":"残機がなくなったよ。",
      over:"得点 "+game.score.toLocaleString()+" 点　／　最高到達 "+game.highest+" 階",
      clear:"由良ちゃんがお出迎え。おつかい、お疲れさま！\n得点 "+game.score.toLocaleString()+" 点　／　"+c.resource.label+"ボーナス ＋"+game.bonus.toLocaleString()+" 点"}[phase];
    if(phase==="clear"){
      const ctx=$("ending-art").getContext("2d");ctx.clearRect(0,0,96,40);
      O.art.blit(ctx,"ghost",7,1,37,37,true);
      O.art.blit(ctx,"yura",49,0,40);O.art.star(ctx,46,10,"#ffcd93",2);
    }
    $("continue").textContent=phase==="paused"?"ゲームに戻る":"リトライ";
    if(phase!=="miss")$("continue").focus({preventScroll:true});
  }
  function hud(){
    const current=Math.floor(game.player.y);
    $("floor").textContent=current+" F";$("highest").textContent=game.highest+" F";
    $("score").textContent=game.score.toLocaleString();$("lives").textContent="× "+game.lives;
    $("resource").textContent=Math.ceil(game.resource)+" / "+c.resource.max;$("gauge").value=game.resource;
    const pow=game.power;
    $("power-state").textContent=pow.type==="power"?"POWER × "+pow.uses:pow.type==="super"?"SUPER　"+Math.ceil(pow.remaining)+" 秒":"通常状態";
    sound.syncSuper(game);modal();record();
  }
  function pause(){
    if(!game)return;
    game.togglePause();resetInputs();last=null;clock.remainder=0;hud();
    if(game.phase==="play")$("pause").focus({preventScroll:true});
  }
  function frame(now){
    if(game){
      const dt=last===null?0:(now-last)/1000;
      const input={};
      for(const action of ["left","right","up"])input[action]=c.keys[action].some(key=>down.has(key))||[...fingers.values()].includes(action);
      const alpha=clock.run(dt,t=>game.tick(input,t));
      field.draw(game,game.phase==="play"?alpha:1);hud();
    }
    last=now;requestAnimationFrame(frame);
  }
  $("continue").onclick=()=>{if(game.phase==="paused")pause();else start(game.mode);};
  $("back").onclick=showTitle;$("pause").onclick=pause;
  $("sound").onclick=()=>{
    sound.enabled=!sound.enabled;$("sound").setAttribute("aria-pressed",String(sound.enabled));
    $("sound").innerHTML='<span class="speaker" aria-hidden="true">◖))</span> 音声 '+(sound.enabled?"ON":"OFF");
    if(sound.enabled)sound.unlock();else for(const audio of sound.files.values())audio.pause();
    sound.syncSuper(game);
  };
  window.addEventListener("keydown",e=>{
    if(!game||e.ctrlKey||e.altKey||e.metaKey)return;
    if(c.keys.pause.includes(e.code)){e.preventDefault();if(!e.repeat)pause();return;}
    if(Object.values(c.keys).some(keys=>keys.includes(e.code))){
      e.preventDefault();if(game.phase==="play")down.add(e.code);
    }
  });
  window.addEventListener("keyup",e=>down.delete(e.code));
  for(const el of document.querySelectorAll("[data-move]")){
    el.onpointerdown=e=>{if(game?.phase!=="play")return;e.preventDefault();el.setPointerCapture(e.pointerId);fingers.set(e.pointerId,el.dataset.move);};
    el.onlostpointercapture=el.onpointercancel=el.onpointerup=e=>fingers.delete(e.pointerId);
  }
  function inactive(){resetInputs();last=null;if(game?.phase==="play")pause();}
  window.addEventListener("blur",inactive);
  document.addEventListener("visibilitychange",()=>{last=null;if(document.hidden)inactive();});
  for(const event of ["pagehide","beforeunload"])window.addEventListener(event,record);
  bestText();titleArt();requestAnimationFrame(frame);
})();
