import * as THREE from 'three';

const cachedMaps=new Map();
let woodMap;
function internetWoodMap(){
  if(woodMap)return woodMap;
  // CC0 source and local copy are documented in docs/station-asset-sources.md.
  woodMap=new THREE.TextureLoader().load(import.meta.env.BASE_URL+'assets/station-kit/wood-grain.jpg');
  woodMap.colorSpace=THREE.SRGBColorSpace;woodMap.wrapS=woodMap.wrapT=THREE.RepeatWrapping;woodMap.anisotropy=8;
  return woodMap;
}
const palettes={
  1:{wall:'#c8c2ad',paint:'#455c50',floor:'#929085',trim:'#626c5b',ceiling:'#c4c5b7'},
  2:{wall:'#c8c4ad',paint:'#657467',floor:'#adae9e',trim:'#877658',ceiling:'#bfc2b5'},
  3:{wall:'#d0d8d5',paint:'#728e92',floor:'#a8b3b3',trim:'#8a999a',ceiling:'#d1d8d5'}
};

// Tile joints, aggregate and a few edge chips are placed at architectural scale.
// Albedo stays quiet, so wear does not turn every flat surface into visual noise.
export function stationSurface(kind,floorNumber=2){
  const key=`${kind}-${floorNumber}`;if(cachedMaps.has(key))return cachedMaps.get(key);
  const palette=palettes[floorNumber]??palettes[2],canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');let seed=781+floorNumber*47+(kind==='floor'?133:0);
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  ctx.fillStyle=kind==='floor'?palette.floor:palette.wall;ctx.fillRect(0,0,512,512);
  if(kind==='floor'){
    // The investigation floor is poured terrazzo; clinical and public floors
    // have different tile sizes and actual thin dark grout, not broad black grids.
    const tiles=floorNumber===1?2:floorNumber===3?2:1,cell=512/tiles;
    for(let row=0;row<tiles;row++)for(let col=0;col<tiles;col++){
      ctx.fillStyle=`rgba(255,255,238,${.015+random()*.04})`;ctx.fillRect(col*cell,row*cell,cell,cell);
      ctx.strokeStyle=floorNumber===3?'#899896':'#797d70';ctx.lineWidth=floorNumber===2?1.1:2.2;ctx.strokeRect(col*cell,row*cell,cell,cell);
      ctx.strokeStyle='rgba(238,239,220,.30)';ctx.lineWidth=1;ctx.strokeRect(col*cell+2,row*cell+2,cell-4,cell-4);
    }
    for(let i=0;i<(floorNumber===2?1700:350);i++){
      const x=random()*512,y=random()*512,s=1+random()*2;
      ctx.fillStyle=`rgba(${i%3?'65,81,74':'245,241,221'},${floorNumber===2?.16:.055})`;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+s,y+.3);ctx.lineTo(x+s*.6,y+s);ctx.closePath();ctx.fill();
    }
    if(floorNumber===1)for(let i=0;i<8;i++){
      const edge=random()>.5?256:0,y=random()*512;
      ctx.strokeStyle='rgba(61,63,53,.23)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(edge,y);ctx.lineTo(edge+6+random()*12,y+3+random()*10);ctx.stroke();
    }
  }else{
    // A subtle roller finish, with broad low-contrast age marks and sparse cracks.
    for(let i=0;i<95;i++){
      const x=random()*512,y=random()*512,r=12+random()*58,gradient=ctx.createRadialGradient(x,y,1,x,y,r);
      gradient.addColorStop(0,`rgba(63,65,51,${floorNumber===3?.014:.022})`);gradient.addColorStop(1,'rgba(63,65,51,0)');ctx.fillStyle=gradient;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    for(let i=0;i<1300;i++){
      ctx.fillStyle=`rgba(${i%2?'255,253,235':'50,58,49'},.025)`;ctx.fillRect(random()*512,random()*512,1,1);
    }
    if(floorNumber!==3)for(let i=0;i<2;i++){
      const x=random()*512,y=random()*512;ctx.strokeStyle='rgba(68,70,57,.09)';ctx.lineWidth=.65;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2,y+9);ctx.lineTo(x-3,y+17);ctx.stroke();
    }
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;
  map.anisotropy=8;cachedMaps.set(key,map);return map;
}

export function createStationMaterials(floorNumber=2){
  const palette=palettes[floorNumber]??palettes[2],wallMap=stationSurface('wall',floorNumber),floorMap=stationSurface('floor',floorNumber);
  const materials={
    plaster:new THREE.MeshStandardMaterial({map:wallMap,roughness:.94}),
    paint:new THREE.MeshStandardMaterial({color:palette.paint,map:wallMap,roughness:floorNumber===3?.57:.72}),
    floor:new THREE.MeshStandardMaterial({map:floorMap,roughness:floorNumber===3?.44:.62}),
    trim:new THREE.MeshStandardMaterial({color:palette.trim,roughness:.65}),
    wood:new THREE.MeshStandardMaterial({map:internetWoodMap(),color:'#8c7358',roughness:.68}),
    dark:new THREE.MeshStandardMaterial({color:'#364841',roughness:.77}),
    ceiling:new THREE.MeshStandardMaterial({color:palette.ceiling,roughness:.96,side:THREE.DoubleSide}),
    metal:new THREE.MeshStandardMaterial({color:'#9fa9a5',metalness:.55,roughness:.5})
  };
  materials.plaster.userData.stationWall=true;materials.paint.userData.stationWall=true;
  return materials;
}
