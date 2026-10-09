import * as THREE from 'three';

// Locally generated worn surfaces, tiled in world metres only on the first floor.
export function receptionSurface(kind){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const ctx=canvas.getContext('2d');
  let seed=173;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  ctx.fillStyle=kind==='tile'?'#77776a':'#d1d0c4';ctx.fillRect(0,0,1024,1024);
  for(let i=0;i<1800;i++){
    const x=random()*1024,y=random()*1024,r=3+random()*38;
    ctx.fillStyle=`rgba(${random()>.5?'218,211,183':'46,48,39'},${random()*(kind==='tile'?.10:.035)})`;
    ctx.beginPath();ctx.ellipse(x,y,r,r*(.3+random()),random()*Math.PI,0,Math.PI*2);ctx.fill();
  }
  for(let i=0;i<40000;i++){ctx.fillStyle=`rgba(${random()>.5?'240,235,211':'20,25,20'},${random()*.09})`;ctx.fillRect(random()*1024,random()*1024,1+random()*2,1+random()*2);}
  if(kind==='tile'){
    for(let x=0;x<4;x++)for(let y=0;y<4;y++){
      ctx.fillStyle=`rgba(192,183,160,${random()*.1})`;ctx.fillRect(x*256,y*256,256,256);
      ctx.strokeStyle='#42473c';ctx.lineWidth=3;ctx.strokeRect(x*256,y*256,256,256);
      ctx.strokeStyle='#a2a28a';ctx.lineWidth=1;ctx.strokeRect(x*256+3,y*256+3,250,250);
    }
    for(let i=0;i<240;i++){ctx.strokeStyle='rgba(39,42,33,.16)';ctx.lineWidth=.5+random();ctx.beginPath();const x=random()*1024,y=random()*1024;ctx.moveTo(x,y);ctx.lineTo(x+random()*45,y+random()*5);ctx.stroke();}
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.setScalar(kind==='tile'?.25:.5);map.anisotropy=8;return map;
}
