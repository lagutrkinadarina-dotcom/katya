import * as THREE from 'three';
import {createOfficer} from './officer.js';
import {createWallStrip,alignFloorTiles} from './architecture.js';

export function createReception(scene,{box,pipe,plaque,plaster,paint,floor,wood,iron,dark}){
  const ground=-3.365;
  const frame=new THREE.MeshStandardMaterial({color:'#cbcfc7',roughness:.6});
  const glow=new THREE.MeshStandardMaterial({color:'#e5e6d4',emissive:'#dce9da',emissiveIntensity:.65});
  // One continuous floor and ceiling follow the lobby and left stair return.
  const outline=[[-2.9,-6.2],[2.9,-6.2],[2.9,1.25],[12.3,1.25],[12.3,5.44],[9.3,5.44],[9.3,2.56],[2.9,2.56],[2.9,6.83],[-2.9,6.83]];
  const shape=new THREE.Shape();outline.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  const floorSurface=new THREE.Mesh(new THREE.ShapeGeometry(shape),floor);
  floorSurface.rotation.x=-Math.PI/2;floorSurface.position.y=ground;floorSurface.receiveShadow=true;alignFloorTiles(floorSurface);scene.add(floorSurface);
  // Keep the landing inside the open, full-height stair shaft. The lower ceiling
  // belongs only to the lobby/return hall, so it cannot jut across the stair opening.
  const ceilingOutline=[[-2.9,-6.2],[2.9,-6.2],[2.9,1.25],[12.3,1.25],[12.3,2.64],[2.9,2.64],[2.9,6.83],[-2.9,6.83]],ceilingShape=new THREE.Shape();
  ceilingOutline.forEach(([x,z],i)=>i?ceilingShape.lineTo(x,-z):ceilingShape.moveTo(x,-z));ceilingShape.closePath();
  // Fill the header up to the upper wall at y=0; tiles remain above it at y=0.005.
  const ceiling=new THREE.Mesh(new THREE.ExtrudeGeometry(ceilingShape,{depth:.335,steps:1,bevelEnabled:false}),plaster);
  ceiling.rotation.x=-Math.PI/2;ceiling.position.y=-.335;ceiling.castShadow=true;ceiling.receiveShadow=true;scene.add(ceiling);
  // Mitered wall strips share one footprint at every bend. Box end caps cannot leave
  // the former narrow columns or overlapping faces at the lobby/passage corners.
  const wallStrip=points=>createWallStrip(scene,points,ground,[[1.2,paint],[2.165,plaster]]);
  wallStrip([[9.3,2.56],[2.9,2.56],[2.9,6.83],[-2.9,6.83],[-2.9,-6.2],[2.9,-6.2],[2.9,1.25],[12.3,1.25],[12.3,5.44],[2.98,5.44]]);
  const routeSign=plaque('ЛЕСТНИЦА · 2 ЭТАЖ →',1.8,.26,2.805,ground+1.85,.15);routeSign.rotation.y=-Math.PI/2;
  // The access door belongs to the existing stair passage, facing the reception lobby.
  const doorway=new THREE.Group();doorway.position.set(2.9,ground,1.905);doorway.rotation.y=-Math.PI/2;scene.add(doorway);
  for(const x of [-.59,.59])box(.085,2.34,.2,x,1.17,0,frame,doorway);
  box(1.27,.085,.2,0,2.34,0,frame,doorway);
  box(.16,.865,1.15,2.9,ground+2.7575,1.905,plaster);
  const hinge=new THREE.Group();hinge.position.set(-.535,0,0);doorway.add(hinge);
  const passageDoor=box(1.07,2.31,.065,.535,1.155,0,wood,hinge);passageDoor.userData={type:'passageDoor',hinge};
  for(const y of [.65,1.64]){box(.88,.76,.022,.535,y,.043,frame,hinge);box(.8,.68,.022,.535,y,.06,wood,hinge);}
  for(const side of [-1,1])pipe([.97,1.09,side*.09],[.83,1.09,side*.09],.017,iron,hinge);
  plaque('ЛЕСТНИЦА · 2 ЭТАЖ',1.18,.2,0,2.63,.095,doorway);
  // The doorway can be clicked from either side, even when its leaf is fully open.
  const doorTarget=new THREE.Mesh(new THREE.BoxGeometry(1.13,2.3,.15),new THREE.MeshBasicMaterial({visible:false}));doorTarget.position.set(0,1.15,0);doorTarget.userData={type:'passageDoor',hinge};doorway.add(doorTarget);passageDoor.userData.target=doorTarget;
  // Closed exterior double doors mark the station entrance seen at the start of a new game.
  const exit=new THREE.Group();exit.position.set(0,ground,6.69);exit.rotation.y=Math.PI;scene.add(exit);
  const exitMetal=new THREE.MeshStandardMaterial({color:'#354745',metalness:.35,roughness:.55});
  const exitGlass=new THREE.MeshStandardMaterial({color:'#607375',metalness:.16,roughness:.45});
  for(const x of [-1.08,1.08])box(.1,2.44,.18,x,1.22,0,frame,exit);
  box(2.25,.1,.18,0,2.44,0,frame,exit);box(2.18,.025,.3,0,.015,.04,iron,exit);
  for(const side of [-1,1]){
    box(1.01,2.36,.07,side*.52,1.205,0,exitMetal,exit);
    box(.77,1.18,.024,side*.52,1.56,.05,frame,exit);box(.66,1.07,.024,side*.52,1.56,.07,exitGlass,exit);
    box(.78,.56,.02,side*.52,.43,.05,exitMetal,exit);
    pipe([side*.16,.87,.1],[side*.16,1.32,.1],.025,iron,exit);
    for(const y of [.35,1.95])pipe([side*.99,y,0],[side*.99,y+.12,0],.02,iron,exit);
  }
  box(.026,2.36,.05,0,1.205,.01,exitMetal,exit);
  plaque('ВЫХОД',1.42,.28,0,2.75,.08,exit);
  // Warm waiting area, neutral light behind the glass. Light sources are visible fixtures.
  for(const z of [1,5]){
    box(1.15,.06,.42,0,ground+3.08,z,frame);box(1,.012,.31,0,ground+3.04,z,glow);
    const light=new THREE.PointLight(0xe4dfcf,9,6,2);light.position.set(0,ground+2.8,z);scene.add(light);
  }
  const boothLight=new THREE.PointLight(0xd7e4df,12,4.5,2);boothLight.position.set(.2,ground+2.65,-4.8);scene.add(boothLight);
  box(1.2,.06,.4,0,ground+3.08,-4.8,frame);box(1.05,.012,.3,0,ground+3.04,-4.8,glow);
  const faceLight=new THREE.SpotLight(0xf5e5cc,9,4,Math.PI/3,.8,2);faceLight.position.set(-.9,ground+2.45,-3.8);faceLight.target.position.set(.25,ground+1.5,-4.65);scene.add(faceLight,faceLight.target);
  // Full wall around a real reception opening, with the same plaster as the lobby.
  const front=-3.65;
  box(1.15,3.2,.18,-2.325,ground+1.6,front,plaster);
  box(1.15,3.2,.18,2.325,ground+1.6,front,plaster);
  box(3.5,.96,.18,0,ground+.48,front,paint);
  box(3.5,.75,.18,0,ground+2.825,front,plaster);
  for(const x of [-1.76,1.76])box(.1,1.57,.16,x,ground+1.72,front+.03,frame);
  for(const y of [.97,2.47])box(3.62,.09,.16,0,ground+y,front+.03,frame);
  box(.06,1.5,.12,.68,ground+1.72,front+.025,frame);
  const glass=new THREE.MeshPhysicalMaterial({color:'#abc6c2',transparent:true,opacity:.14,roughness:.18,metalness:.04,side:THREE.DoubleSide,depthWrite:false});
  // Two large panes and a small open speaking slot above the counter.
  const addGlass=(w,h,x,y)=>{const pane=new THREE.Mesh(new THREE.PlaneGeometry(w,h),glass);pane.position.set(x,ground+y,front+.028);pane.renderOrder=2;scene.add(pane);};
  const reflectionMaterial=new THREE.MeshBasicMaterial({color:'#d6e3df',transparent:true,opacity:.045,depthWrite:false,side:THREE.DoubleSide});
  for(const x of [-1.2,1.2]){const reflection=new THREE.Mesh(new THREE.PlaneGeometry(.09,1.3),reflectionMaterial);reflection.position.set(x,ground+1.77,front+.037);reflection.rotation.z=-.22;reflection.renderOrder=3;scene.add(reflection);}
  addGlass(1.11,1.43,1.23,1.72);addGlass(2.4,1.12,-.54,1.89);addGlass(.91,.31,-1.285,1.16);addGlass(.91,.31,.225,1.16);
  for(const x of [-.8,-.28])box(.035,.32,.04,x,ground+1.16,front+.06,frame);
  box(.56,.035,.07,-.54,ground+1.32,front+.06,frame);
  box(3.65,.08,.58,0,ground+.98,front+.18,wood);
  plaque('ДЕЖУРНАЯ ЧАСТЬ',3.3,.34,0,ground+2.76,front+.105);
  plaque('ДЕЖУРНЫЙ · ЛЕБЕДЕВ',1.2,.16,0,ground+.74,front+.103);
  // Document tray, intercom and paperwork on the public sill.
  box(.6,.1,.31,.95,ground+1.07,front+.19,frame);box(.5,.016,.24,.95,ground+1.13,front+.19,'#bcb69f');
  box(.11,.06,.09,-.9,ground+1.05,front+.27,dark);pipe([-.9,ground+1.08,front+.27],[-.9,ground+1.18,front+.22],.009,dark);
  box(2.8,.08,.65,0,ground+.8,-4.45,wood);
  for(const x of [-1.22,1.22])for(const z of [-4.69,-4.21])box(.07,.76,.07,x,ground+.38,z,dark);
  box(2.55,.64,.05,0,ground+.43,-4.15,wood);
  box(.2,.035,.16,1,ground+.86,-4.57,dark);box(.035,.16,.035,1,ground+.95,-4.57,dark);
  box(.36,.25,.055,1,ground+1.12,-4.57,dark);box(.29,.18,.006,1,ground+1.12,-4.533,'#607477');
  for(let i=0;i<3;i++)box(.3,.024,.35,-1+i*.018,ground+.852+i*.025,-4.44,'#c5bda3');
  const board=box(.88,.85,.03,2.76,ground+1.8,-4.7,wood);board.rotation.y=Math.PI/2;
  // Forms inside the booth and a waiting bench outside it.
  for(let i=0;i<3;i++)box(.018,.36,.22,2.735,ground+1.9-i*.16,-4.7,'#d5d0bd');
  box(.4,.09,1.8,-2.58,ground+.46,.8,wood);box(.06,.45,1.8,-2.76,ground+.72,.8,wood);
  for(const z of [.15,1.45])pipe([-2.58,ground+.43,z],[-2.58,ground+.03,z],.035,dark);
  const officer=createOfficer();officer.position.set(-.35,ground,-5.25);scene.add(officer);
  // Interaction belongs to the reception window, so the player can speak through the glass.
  const target=new THREE.Mesh(new THREE.BoxGeometry(3.4,1.46,.06),new THREE.MeshBasicMaterial({visible:false}));target.position.set(0,ground+1.72,front+.06);target.userData.type='dutyOfficer';scene.add(target);
  return {npcTarget:target,passageDoor};
}
