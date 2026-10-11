import * as THREE from 'three';
import {alignFloorTiles,createWallStrip} from './architecture.js';
import {FLOOR_BASES,STAIR_START,STAIR_END} from './building-layout.js';
import {createWindowBlinds} from './window-blinds.js';
import {createStationMaterials} from './station-materials.js';
import {createCorridorDetails} from './station-details.js';

export function createUpperFloor(scene,{box,pipe,plaque,door,plaster,paint,floor,trim,brass,dark,concrete}){
  const materials=createStationMaterials(3);
  ({plaster,paint,floor,trim,dark}=materials);
  const windowBlinds=[];
  const base=FLOOR_BASES[2],center=.7;
  const upSign=plaque('↑ ЛЕСТНИЦА · 3 ЭТАЖ',2.2,.28,2.83,2.96,center);upSign.rotation.y=-Math.PI/2;
  alignFloorTiles(box(2.15,.15,2.8,3.975,-.07,center,floor));
  const run=(STAIR_END-STAIR_START)/16,rise=base/16;
  for(let i=0;i<16;i++){
    const x=STAIR_START+(i+.5)*run,y=(i+1)*rise;
    box(run+.003,rise,2.74,x,y-rise/2,center,concrete);
    box(.035,.022,2.74,x-run/2+.02,y+.012,center,brass);
    if(i%2===0)for(const z of [-.6,2])pipe([x,y,z],[x,y+1,z],.025,dark);
  }
  for(const z of [-.6,2]){
    pipe([3.12,1,z],[STAIR_START,1,z],.04,trim);
    pipe([STAIR_START,1,z],[STAIR_END,base+1,z],.04,trim);
  }
  // One slab below the treads, without blocking the open landings.
  const ramp=box(Math.hypot(STAIR_END-STAIR_START,base),.14,2.74,(STAIR_START+STAIR_END)/2,base/2-.18,center,concrete);
  ramp.rotation.z=Math.atan2(base,STAIR_END-STAIR_START);
  createWallStrip(scene,[[3,-.74],[12.3,-.74],[12.3,2.14],[3,2.14]],3.3,[[base-3.3,plaster]]);

  function surface(points,y,material){
    const shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
    const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),material);mesh.rotation.x=-Math.PI/2;mesh.position.y=y;mesh.receiveShadow=true;scene.add(mesh);return mesh;
  }
  // A single floor follows the return and top landing, leaving the flight open.
  alignFloorTiles(surface([[-3,-17],[3,-17],[3,-3.24],[12.3,-3.24],[12.3,2.14],[9.3,2.14],[9.3,-.74],[3,-.74],[3,7],[-3,7]],base+.005,floor));
  const ceilingMaterial=materials.ceiling;
  surface([[-3,-17],[3,-17],[3,-3.24],[12.3,-3.24],[12.3,2.14],[3,2.14],[3,7],[-3,7]],base+3.3,ceilingMaterial);
  createWallStrip(scene,[[-3,-17],[-3,7]],base,[[1.2,paint],[2.1,plaster]]);
  createWallStrip(scene,[[3,-17],[3,-3.24],[12.3,-3.24],[12.3,2.14],[3,2.14],[3,-.74],[9.3,-.74]],base,[[1.2,paint],[2.1,plaster]]);
  // End above the shared shaft wall, so the corner has no overlapping end caps.
  createWallStrip(scene,[[3,2.22],[3,7]],base,[[1.2,paint],[2.1,plaster]]);
  for(const [length,z] of [[13.68,-10.16],[3.04,.74],[4.78,4.61]]){
    box(.23,.07,length,3,base+1.24,z,'#acac94');box(.24,.13,length,3,base+.07,z,dark);
  }
  box(.23,.07,24,-3,base+1.24,-5,'#acac94');box(.24,.13,24,-3,base+.07,-5,dark);
  for(const x of [-3,3])box(.23,.12,24,x,base+3.18,-5,'#a5aa99');
  box(.16,.55,2.5,3,base+3.025,-1.99,plaster);
  const landingSign=plaque('3 ЭТАЖ · К КАБИНЕТАМ ←',2.2,.28,12.19,base+2.3,-1.8);landingSign.rotation.y=-Math.PI/2;
  const downSign=plaque('↓ ЛЕСТНИЦА · 2 ЭТАЖ',2.2,.28,2.83,base+2.96,-1.99);downSign.rotation.y=-Math.PI/2;
  const returnSign=plaque('↓ СПУСК НА 2 ЭТАЖ',1.8,.28,10.7,base+1.95,2.045);returnSign.rotation.y=Math.PI;
  const floorSign=plaque('3 ЭТАЖ · ЭКСПЕРТНЫЙ ОТДЕЛ',3,.28,0,base+2.98,6.9);floorSign.rotation.y=Math.PI;

  for(const z of [-17,7]){
    box(6,3.3,.15,0,base+1.65,z,plaster);
    box(6,1.2,.19,0,base+.6,z,paint);
    box(6,.07,.23,0,base+1.24,z,'#acac94');box(6,.13,.24,0,base+.07,z,dark);
    box(6,.12,.23,0,base+3.18,z,'#a5aa99');
    const window=new THREE.Group();window.position.set(0,base+1.94,z===7?6.91:-16.91);if(z===7)window.rotation.y=Math.PI;scene.add(window);
    const glass=new THREE.MeshStandardMaterial({color:'#1c343f',roughness:.4,metalness:.18,emissive:'#101e29',emissiveIntensity:.3});
    box(2.7,1.54,.03,0,0,0,glass,window);
    for(const x of [-1.4,0,1.4])box(.075,1.7,.08,x,0,.045,trim,window);
    for(const y of [-.81,0,.81])box(2.85,.065,.08,0,y,.045,trim,window);
    box(3,.09,.24,0,-.89,.1,trim,window);
    windowBlinds.push(createWindowBlinds(window,{width:2.74,height:1.61,floor:3,position:[0,.015,.15]}));
  }
  const glow=new THREE.MeshStandardMaterial({color:'#e8f0ed',emissive:'#dbe9ec',emissiveIntensity:1.7});
  for(const [x,z] of [[0,3],[0,-3],[0,-9],[0,-15],[7,-1.99],[10.6,.6]]){
    box(1.55,.1,.53,x,base+3.21,z,dark);
    for(const offset of [-.29,.29])box(.1,.035,.42,x+offset,base+3.14,z,glow);
    const light=new THREE.PointLight(0xd7e7ec,18,10,2);light.position.set(x,base+2.95,z);scene.add(light);
  }
  const flightLight=new THREE.PointLight(0xd2decd,15,9,2);flightLight.position.set(7.5,4.4,.7);scene.add(flightLight);
  door(-2.84,1,'laboratory','КРИМИНАЛИСТИЧЕСКАЯ ЛАБОРАТОРИЯ',base,3);
  // The morgue is downstairs. This is a sealed maintenance enclosure rather
  // than a second room or interactive door with a misleading morgue label.
  const service=new THREE.Group();service.name='third-floor-maintenance-cabinet';service.position.set(2.88,base,-7);service.rotation.y=-Math.PI/2;scene.add(service);
  box(1.0,1.72,.08,0,1.28,0,materials.metal,service);
  for(const side of [-1,1]){
    box(.455,1.64,.018,side*.242,1.28,.048,trim,service);
    for(let row=0;row<5;row++)box(.28,.014,.008,side*.242,1.89+row*.035,.062,dark,service);
    box(.025,.12,.028,side*.062,1.24,.072,materials.metal,service);
  }
  plaque('ТЕХНИЧЕСКИЙ ШКАФ',1.18,.17,0,2.28,.049,service);
  door(-2.84,-11,'evidenceStorage','КАМЕРА ХРАНЕНИЯ УЛИК',base,3);
  createCorridorDetails(scene,{floorNumber:3,base,leftGaps:[[.14,1.86],[-11.86,-10.14]],rightGaps:[[-3.32,2.30]],materials});
  return {windowBlinds};
}
