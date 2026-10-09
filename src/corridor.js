import * as THREE from 'three';
import {createStreetWindow} from './street.js';
import {createReception} from './reception.js';
import {createWallStrip,alignFloorTiles} from './architecture.js';
import {surfaceMaterial,alignWallSurface} from './materials.js';

// Both storeys share the same worn materials and world-space floor grid.
export function createCorridor(scene, renderer) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMappingExposure = 1.1;
  const skyCanvas=document.createElement('canvas');skyCanvas.width=512;skyCanvas.height=256;
  const skyContext=skyCanvas.getContext('2d'),skyGradient=skyContext.createLinearGradient(0,0,0,256);
  skyGradient.addColorStop(0,'#071322');skyGradient.addColorStop(.5,'#203746');skyGradient.addColorStop(1,'#182329');
  skyContext.fillStyle=skyGradient;skyContext.fillRect(0,0,512,256);
  const sky=new THREE.CanvasTexture(skyCanvas);sky.mapping=THREE.EquirectangularReflectionMapping;sky.colorSpace=THREE.SRGBColorSpace;scene.background=sky;
  scene.fog = new THREE.Fog('#182329', 13, 34);
  const ambient=new THREE.HemisphereLight(0xe8dfcf,0x45463b,.65);ambient.name='stationAmbient';scene.add(ambient);
  let seed = 41;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const plaster=surfaceMaterial('plaster',{},renderer);
  const paint=surfaceMaterial('paint',{},renderer);
  const floor=surfaceMaterial('floor',{color:'#c6bca5',roughness:.48,metalness:.06,envMapIntensity:.85,normalScale:new THREE.Vector2(.3,.3)},renderer);
  const wood=surfaceMaterial('wood',{},renderer);
  const trim=surfaceMaterial('wood',{color:'#c3b594'},renderer);
  const brass = new THREE.MeshStandardMaterial({color:'#b9ac81',metalness:.72,roughness:.3});
  const iron=surfaceMaterial('steel',{color:'#ccc8b9',metalness:.45,roughness:.55},renderer);
  const dark=surfaceMaterial('steel',{color:'#4d5952',metalness:.35,roughness:.62},renderer);
  function box(w,h,d,x,y,z,mat,parent=scene) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), typeof mat === 'string' ? new THREE.MeshStandardMaterial({color:mat,roughness:.8}) : mat);
    mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh);
    if(mat?.normalMap===plaster.normalMap||mat?.normalMap===paint.normalMap)alignWallSurface(mesh);
    return mesh;
  }
  function pipe(a,b,r,mat,parent=scene) {
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),dir=end.clone().sub(start);
    const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,dir.length(),12),mat);
    m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());m.castShadow=true;parent.add(m);return m;
  }
  function plaque(text,w,h,x,y,z,parent=scene) {
    const c=document.createElement('canvas');c.width=1024;c.height=256;
    const ctx=c.getContext('2d');ctx.fillStyle='#20352f';ctx.fillRect(0,0,1024,256);
    ctx.strokeStyle='#b5aa81';ctx.lineWidth=8;ctx.strokeRect(15,15,994,226);
    ctx.fillStyle='#eee5c8';ctx.font='bold 54px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,128);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,roughness:.65}));m.position.set(x,y,z);parent.add(m);return m;
  }
  alignFloorTiles(box(6,.15,24,0,-.07,-5,floor));
  box(6,.12,24,0,3.36,-5,plaster);
  for(const x of [-3,3]) {
    if(x<0){box(.15,3.3,24,x,1.65,-5,plaster);box(.19,1.2,24,x,.6,-5,paint);}else{
      for(const [length,z]of [[19.48,-7.26],[1.48,6.26]])box(.19,1.2,length,x,.6,z,paint);
      box(.15,.55,2.8,x,3.025,4,plaster);
    }
    if(x<0){box(.23,.07,24,x,1.24,-5,'#acac94');box(.24,.13,24,x,.07,-5,dark);}else for(const [length,z]of [[19.48,-7.26],[1.48,6.26]]){box(.23,.07,length,x,1.24,z,'#acac94');box(.24,.13,length,x,.07,z,dark);}
    box(.23,.12,24,x,3.18,-5,'#a5aa99');
  }
  const streetUpdates=[createStreetWindow(scene,-17,-1,{plaster,paint}),createStreetWindow(scene,7,1,{plaster,paint})];
  // The open entrance overlooks a staircase with a real lower landing and left turn.
  const concrete=surfaceMaterial('floor',{color:'#a4a293',roughness:.95});
  // One continuous shell joins the corridor to both sides of the stair opening.
  // Separate corridor boxes previously overlapped the stair end caps and flickered.
  createWallStrip(scene,[[3,-17],[3,2.56],[12.3,2.56],[12.3,5.44],[3,5.44],[3,7]],0,[[3.3,plaster]]);
  box(9.48,.12,3.04,7.64,3.3,4,plaster);
  alignFloorTiles(box(2.2,.16,2.8,4,-.075,4,floor));
  for(let i=0;i<16;i++){
    const x=5.2+i*.29,y=-.21-i*.21;
    box(.3,.21,2.4,x,y-.105,4,concrete);box(.045,.025,2.4,x-.125,y+.012,4,brass);
    if(i%2===0)for(const z of [2.8,5.2])pipe([x,y,z],[x,y+1,z],.025,dark);
  }
  for(const z of [2.8,5.2]){
    pipe([3.1,1,z],[5.05,1,z],.04,trim);
    pipe([5.05,1,z],[9.6,-2.36,z],.04,trim);
  }

  // The lower shell is built once by createReception, including the left-hand return.
  const downstairsSign=plaque('← 1 ЭТАЖ',1.3,.26,12.19,-1.05,3.6);downstairsSign.rotation.y=-Math.PI/2;
  const lowerLight=new THREE.PointLight(0xd2decd,8,6,2);lowerLight.position.set(11.3,-.65,1.95);scene.add(lowerLight);
  const stairSign=plaque('2 ЭТАЖ · ЛЕСТНИЦА →',2.2,.28,2.83,2.96,4);stairSign.rotation.y=-Math.PI/2;
  const arrowSign=plaque('↓  1 ЭТАЖ',1.3,.28,7,1.15,2.67);
  const landingLight=new THREE.PointLight(0xd2decd,13,6,2);landingLight.position.set(4,2.6,4);scene.add(landingLight);
  const stairLight=new THREE.PointLight(0xd2decd,12,8,2);stairLight.position.set(7,-.5,4);scene.add(stairLight);
  const doors=[];
  function door(x,z,type,label) {
    const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=x<0?Math.PI/2:-Math.PI/2;scene.add(group);
    box(1.64,2.59,.14,0,1.295,0,dark,group);
    for(const u of [-.79,.79])box(.12,2.58,.21,u,1.29,.16,trim,group);
    box(1.7,.12,.21,0,2.55,.16,trim,group);box(1.48,.03,.34,0,.018,.15,brass,group);
    const hinge=new THREE.Group();hinge.position.set(-.69,0,.13);group.add(hinge);
    const leaf=box(1.38,2.42,.09,.69,1.23,0,wood,hinge);leaf.userData={type,hinge};doors.push(leaf);
    for(const [y,h] of [[.61,.65],[1.65,1.04]]) {
      box(1.03,h,.025,.69,y,.055,trim,hinge);
      box(.91,h-.12,.027,.69,y,.072,wood,hinge);
      for(const u of [.19,1.19])box(.022,h,.035,u,y,.07,brass,hinge);
    }
    box(.085,.25,.025,1.23,1.12,.075,brass,hinge);
    pipe([1.23,1.18,.09],[1.23,1.18,.17],.025,brass,hinge);
    pipe([1.23,1.18,.17],[1.04,1.18,.17],.022,brass,hinge);
    box(.025,.05,.008,1.23,1.03,.091,dark,hinge);
    for(const y of [.35,1.25,2.12])pipe([0,y-.06,.02],[0,y+.06,.02],.028,brass,hinge);
    plaque(label,1.6,.28,0,2.83,.13,group);
    if(type==='locked'){const tape=box(1.45,.07,.012,.69,1.5,.1,'#b8a75b',hinge);tape.rotation.z=.24;}
  }
  door(-2.84,1,'office','01 · СЛЕДОВАТЕЛЬ');door(2.84,-3,'interrogation','02 · ДОПРОС');door(-2.84,-9,'locked','03 · АРХИВ');
  function radiator(side,z) {
    const group=new THREE.Group();group.position.set(side*2.77,0,z);scene.add(group);
    for(let i=0;i<12;i++) {
      const u=(i-5.5)*.105;
      box(.22,.58,.072,0,.51,u,iron,group);
      pipe([-.08,.24,u],[-.08,.78,u],.036,iron,group);
      pipe([.08,.24,u],[.08,.78,u],.036,iron,group);
      box(.21,.04,.095,0,.25,u,iron,group);box(.21,.04,.095,0,.77,u,iron,group);
    }
    for(const y of [.27,.75])pipe([0,y,-.73],[0,y,.73],.035,iron,group);
    pipe([0,.75,.73],[0,.75,.9],.025,brass,group);
    pipe([0,.75,.9],[side*.13,.75,.9],.026,iron,group);
    pipe([side*.13,.75,.9],[side*.13,.13,.9],.023,iron,group);
    pipe([side*.13,.13,-1.6],[side*.13,.13,1.6],.024,iron,group);
    pipe([0,.27,-.73],[side*.13,.27,-.73],.025,iron,group);
    const valve=new THREE.Mesh(new THREE.TorusGeometry(.065,.012,8,16),brass);valve.position.set(-side*.1,.75,.86);valve.rotation.y=Math.PI/2;group.add(valve);
    for(const u of [-.45,.45])box(.16,.12,.05,side*.1,.35,u,dark,group);
  }
  radiator(-1,4);radiator(1,.7);radiator(-1,-5);radiator(1,-11);
  for(const z of [3,-3,-9,-15]) {
    box(1.55,.1,.53,0,3.21,z,dark);
    const glow=new THREE.MeshStandardMaterial({color:'#ebecd8',emissive:'#e6e8ce',emissiveIntensity:2});
    for(const x of [-.29,.29])box(.1,.035,.42,x,3.14,z,glow);
    const light=new THREE.PointLight(0xffedcf,12,8,2);light.position.set(0,2.95,z);scene.add(light);
    const spot=new THREE.SpotLight(0xffebc7,24,8,Math.PI/2.6,.85,2);spot.position.set(0,3.04,z);spot.target.position.set(0,0,z);scene.add(spot,spot.target);
    if(z===3||z===-9){spot.castShadow=true;spot.shadow.mapSize.set(1024,1024);spot.shadow.bias=-.00015;spot.shadow.normalBias=.025;spot.shadow.camera.near=.15;spot.shadow.camera.far=8;}
    box(6,.08,.1,0,3.19,z-1.1,'#6e786d');
  }
  // Waiting bench and a noticeboard, kept outside the player's walkable strip.
  box(.42,.11,2.2,2.69,.49,-7,wood);box(.09,.56,2.2,2.9,.79,-7,wood);
  for(const z of [-7.8,-6.2]){box(.06,.43,.08,2.49,.25,z,dark);box(.06,.43,.08,2.83,.25,z,dark);}
  const board=new THREE.Group();board.position.set(-2.87,1.99,-13);board.rotation.y=Math.PI/2;scene.add(board);
  box(1.7,1.02,.06,0,0,0,trim,board);box(1.56,.88,.015,0,0,.04,'#74694e',board);
  for(const [x,y]of [[-.46,.15],[-.02,.12],[.45,.13],[-.3,-.25],[.3,-.23]]){
    const paper=box(.32,.35,.005,x,y,.055,'#d3ceb4',board);paper.rotation.z=(random()-.5)*.14;
    for(let i=0;i<4;i++)box(.23,.008,.006,x,y+.08-i*.045,.06,'#858879',board);
    box(.02,.02,.01,x,y+.15,.065,'#974e3f',board);
  }
  const red=new THREE.MeshStandardMaterial({color:'#873b2e',roughness:.55});
  pipe([2.8,.32,-15],[2.8,.88,-15],.12,red);box(.1,.12,.14,2.8,.97,-15,dark);
  pipe([2.66,.84,-15],[2.66,1,-15],.025,dark);
  const {npcTarget,passageDoor,phoneTarget,noticeTargets,updateOfficer}=createReception(scene,{box,pipe,plaque,plaster,paint,floor,wood,iron,dark});
  return {doors,passageDoor,interactables:[...doors,...noticeTargets,phoneTarget,npcTarget,passageDoor,passageDoor.userData.target],updateStreet:time=>{streetUpdates.forEach(update=>update(time));updateOfficer(time);}};
}
