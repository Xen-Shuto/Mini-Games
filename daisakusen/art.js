"use strict";
// Original pixel artwork. Render to low-resolution canvases, then scale with nearest neighbour.
(() => {
  const O = globalThis.Daisakusen;
  const ink="#30213f", paper="#fff2dc", mint="#8af3d7", rose="#ff9ca8", gold="#ffce82";
  function rect(c,color,x,y,w,h) { c.fillStyle=color; c.fillRect(Math.round(x),Math.round(y),w,h); }
  // Pixel-centre scanlines keep diagonal edges crisp at every scale.
  function poly(c,color,points) {
    const ys=points.map(p=>p[1]); c.fillStyle=color;
    for(let y=Math.floor(Math.min(...ys));y<Math.max(...ys);y++){
      const cross=[];
      for(let i=0,j=points.length-1;i<points.length;j=i++){
        const [x1,y1]=points[j],[x2,y2]=points[i],scan=y+0.5;
        if((y1>scan)!==(y2>scan))cross.push(x1+(scan-y1)*(x2-x1)/(y2-y1));
      }
      cross.sort((a,b)=>a-b);
      for(let i=0;i<cross.length;i+=2){
        const x=Math.ceil(cross[i]-0.5); c.fillRect(x,y,Math.ceil(cross[i+1]-0.5)-x,1);
      }
    }
  }
  function disk(c,color,cx,cy,r) {
    for(let y=-r;y<=r;y++){const n=Math.floor(Math.sqrt(r*r-y*y));rect(c,color,cx-n,cy+y,2*n+1,1);}
  }
  function star(c,x,y,color,size=2) {
    rect(c,color,x-size,y,2*size+1,1); rect(c,color,x,y-size,1,2*size+1);
    if(size>=4)rect(c,color,x-1,y-1,3,3);
  }
  function ghost(c, type) {
    const body = O.config.player.color;
    const shadow = O.config.player.shadow;
    const cloth = type === "power" ? gold : "#f6e4ea";

    // 左向きの丸い身体と後方に流れる尻尾
    poly(c, ink, [
      [20,4],[10,4],[10,6],[6,6],
      [6,9],[3,9],[3,13],[1,13],
      [1,20],[3,20],[3,25],[6,25],
      [6,28],[9,28],[9,30],[13,30],
      [13,28],[17,28],[17,30],[22,30],
      [22,28],[27,28],[27,26],[24,26],
      [24,22],[27,22],[27,18],[25,18],
      [25,11],[23,11],[23,7],[20,7]
    ]);

    // 身体の影
    poly(c, shadow, [
      [20,6],[10,6],[10,8],[6,8],
      [6,11],[4,11],[4,14],[3,14],
      [3,20],[5,20],[5,24],[8,24],
      [8,27],[10,27],[10,28],[13,28],
      [13,26],[17,26],[17,28],[21,28],
      [21,26],[24,26],[24,25],[22,25],
      [22,21],[25,21],[25,18],[23,18],
      [23,11],[21,11],[21,8],[20,8]
    ]);

    // 白くふっくらした身体
    poly(c, body, [
      [19,6],[10,6],[10,8],[7,8],
      [7,11],[4,11],[4,14],[3,14],
      [3,19],[5,19],[5,23],[8,23],
      [8,26],[11,26],[11,24],[16,24],
      [16,26],[20,26],[20,24],[22,24],
      [22,21],[24,21],[24,18],[22,18],
      [22,11],[20,11],[20,8],[19,8]
    ]);

    // 三角布
    poly(c, ink, [
      [19,6],[12,3],[5,9],[12,12],[20,9]
    ]);
    poly(c, cloth, [
      [17,7],[12,5],[8,9],[12,10]
    ]);

    // 手前側の小さな手
    poly(c, shadow, [
      [22,18],[18,18],[18,19],[16,19],
      [16,22],[19,22],[19,23],[22,23],
      [22,22],[19,22],[17,21],[17,20],
      [19,19],[22,19]
    ]);

    // 進行方向に寄せた目
    rect(c, ink, 11, 13, 3, 4);
    rect(c, ink, 4, 13, 2, 4);

    // ハイライト
    rect(c, "#ffffff", 13, 13, 1, 1);
    rect(c, "#ffffff", 5, 13, 1, 1);

    // 頬
    rect(c, rose, 13, 18, 4, 2);
    rect(c, rose, 3, 18, 2, 2);

    // 小さな口
    rect(c, ink, 7, 18, 3, 1);
    rect(c, ink, 8, 19, 1, 1);
  }
  function flame(c,type) {
    const p=type==="power", base=p?"#cf6583":"#4f99a1", mid=p?"#ffab75":mint;
    poly(c,ink,[[17,1],[22,8],[20,13],[25,10],[28,17],[27,24],[22,29],[13,31],[6,26],[4,20],[7,14],[12,10],[10,16],[15,12]]);
    poly(c,base,[[17,3],[20,9],[18,16],[24,13],[26,18],[25,23],[21,27],[14,29],[8,25],[6,20],[10,15],[9,20],[16,14]]);
    poly(c,mid,[[17,10],[17,18],[23,16],[24,22],[20,26],[14,27],[9,24],[9,20],[13,21]]);
    poly(c,paper,[[17,18],[20,21],[19,24],[15,25],[13,22]]);
  }
  function enemy(c,type) {
    const colors={patrol:["#bc6393","#ffb0b4"],random:["#7981b8","#c0b7f4"],chase:["#5aa4a3","#aaf2d6"]};
    const [low,hi]=colors[type];
    poly(c,ink,[[3,13],[7,14],[8,7],[13,9],[20,8],[25,4],[25,12],[29,11],[27,18],[29,22],[25,26],[22,25],[19,28],[15,25],[11,28],[8,24],[5,24],[6,19]]);
    poly(c,low,[[5,15],[9,16],[9,9],[14,11],[20,10],[24,7],[23,15],[27,13],[25,18],[27,22],[24,24],[21,23],[19,26],[15,23],[11,26],[9,22],[7,22],[8,18]]);
    poly(c,hi,[[10,13],[15,12],[20,12],[23,14],[22,19],[18,22],[12,21],[9,18]]);
    rect(c,ink,11,15,3,2);rect(c,ink,18,15,3,2);rect(c,ink,15,19,2,1);
    if(type==="random"){rect(c,hi,13,4,4,3);rect(c,low,15,7,2,4);}
    if(type==="chase"){poly(c,ink,[[11,14],[15,16],[15,17],[11,16]]);rect(c,paper,17,20,1,2);}
  }
  O.art={rect,poly,disk,star,ghost,flame,enemy};
})();
