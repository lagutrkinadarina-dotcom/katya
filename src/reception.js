import * as THREE from 'three';
import {receptionSurface} from './reception-surfaces.js';
import {createOfficer} from './officer.js';
import {furnishReception} from './reception-interior.js';
import {createWallStrip,alignFloorTiles} from './architecture.js';

export function createReception(scene,{box,pipe,plaque,plaster,paint,floor,wood,iron,dark}){
  const ground=-3.365;
  // Local materials keep the upper corridor and its tile grid unchanged.
  plaster=plaster.clone();plaster.color.set('#999b88');plaster.map=receptionSurface('wall');plaster.bumpMap=plaster.map;plaster.bumpScale=.007;
  paint=paint.clone();paint.color.set('#334a40');paint.map=plaster.map;paint.roughness=.84;
  wood=wood.clone();wood.color.set('#988067');wood.roughness=.73;
  floor=floor.clone();floor.color.set('#c2bba7');floor.map=receptionSurface('tile');floor.bumpMap=floor.map;floor.bumpScale=.012;floor.roughness=.39;

  const frame=new THREE.MeshStandardMaterial({color:'#cbcfc7',roughness:.6});

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
  const faceLight=new THREE.SpotLight(0xf5e5cc,4,4,Math.PI/3,.8,2);faceLight.position.set(-.9,ground+2.45,-3.8);faceLight.target.position.set(.25,ground+1.5,-4.65);scene.add(faceLight,faceLight.target);
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
  // Save telephone replaces the tray on the public counter.
  const phoneGroup=new THREE.Group();phoneGroup.position.set(.95,ground+1.0625,front+.25);scene.add(phoneGroup);
  const ivory=new THREE.MeshStandardMaterial({color:'#f1eee3',roughness:.4});
  box(.42,.085,.48,0,0,0,ivory,phoneGroup);
  box(.34,.04,.16,0,.08,-.12,ivory,phoneGroup);
  for(const x of [-.16,.16])box(.09,.095,.16,x,.105,-.12,ivory,phoneGroup);
  box(.36,.055,.07,0,.147,-.12,ivory,phoneGroup);
  for(let row=0;row<4;row++)for(let col=0;col<3;col++)box(.06,.018,.042,(col-1)*.085,.058,.015+row*.052,iron,phoneGroup);
  const cordPoints=[];
  for(let i=0;i<=160;i++){const t=i/160,a=t*Math.PI*32;cordPoints.push(new THREE.Vector3(.205+Math.cos(a)*.012,.025+t*.13+Math.sin(a)*.012,.13-t*.25));}
  phoneGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cordPoints),180,.004,6,false),ivory));
  const phoneTarget=new THREE.Mesh(new THREE.BoxGeometry(.46,.26,.5),new THREE.MeshBasicMaterial({visible:false}));
  phoneTarget.position.set(.95,ground+1.13,front+.25);phoneTarget.userData.type='savePhone';scene.add(phoneTarget);phoneGroup.attach(phoneTarget);phoneGroup.scale.setScalar(.72);phoneGroup.position.y=ground+1.0506;phoneGroup.userData.editor={id:'save-phone',label:'Телефон сохранения',revision:2};
  box(.11,.06,.09,-.9,ground+1.05,front+.27,dark);pipe([-.9,ground+1.08,front+.27],[-.9,ground+1.18,front+.22],.009,dark);
  // The working desktop meets the back edge of the public sill at z=-3.76,
  // at the same height, with no detached table or overlapping top faces.
  const deskZ=-4.085;
  box(2.8,.08,.65,0,ground+.98,deskZ,wood);
  for(const x of [-1.22,1.22])for(const z of [deskZ-.24,deskZ+.24])box(.07,.94,.07,x,ground+.47,z,dark);
  box(2.55,.82,.05,0,ground+.52,deskZ+.30,wood);
  // Complete workstation: the screen faces the officer, with a detailed rear shell.
  const workstationStart=scene.children.length;
  const computer=new THREE.Group();computer.position.set(.45,ground+1.02,deskZ+.09);computer.rotation.y=-2.38;scene.add(computer);
  const casing=new THREE.MeshStandardMaterial({color:'#252b30',roughness:.48});
  const keysMaterial=new THREE.MeshStandardMaterial({color:'#a9b0ac',roughness:.65});
  box(.34,.025,.20,0,.013,0,casing,computer);box(.055,.16,.045,0,.10,0,casing,computer);
  box(.51,.34,.045,0,.30,0,casing,computer);
  const screenCanvas=document.createElement('canvas');screenCanvas.width=768;screenCanvas.height=480;
  const ctx=screenCanvas.getContext('2d');ctx.fillStyle='#152c39';ctx.fillRect(0,0,768,480);
  ctx.fillStyle='#2f5362';ctx.fillRect(0,0,768,62);ctx.fillStyle='#d6e6dd';ctx.font='24px Arial';ctx.fillText('ДЕЖУРНАЯ ЧАСТЬ / ЖУРНАЛ',28,40);
  ctx.fillStyle='#1d3945';ctx.fillRect(20,84,150,365);ctx.fillStyle='#b3c9c5';ctx.font='20px Arial';
  ['Сводка','Обращения','Патрули','Архив'].forEach((text,i)=>ctx.fillText(text,34,120+i*46));
  for(let i=0;i<6;i++){ctx.fillStyle=i%2?'#264652':'#213d48';ctx.fillRect(194,91+i*54,550,43);ctx.fillStyle='#91b1b5';ctx.fillRect(212,105+i*54,220+i%3*40,6);ctx.fillStyle='#66a88a';ctx.fillRect(610,103+i*54,104,14);}
  const screenMap=new THREE.CanvasTexture(screenCanvas);screenMap.colorSpace=THREE.SRGBColorSpace;
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(.455,.282),new THREE.MeshStandardMaterial({map:screenMap,emissive:'#9bbfcd',emissiveMap:screenMap,emissiveIntensity:.45,roughness:.35}));screen.position.set(0,.30,.0235);computer.add(screen);
  for(let i=0;i<9;i++)box(.025,.003,.002,-.16+i*.04,.37,-.0235,dark,computer);
  box(.055,.025,.003,0,.29,-.024,iron,computer);box(.01,.003,.003,.207,.143,.024,'#73b595',computer);
  const keyboard=new THREE.Group();keyboard.position.set(-.24,ground+1.039,deskZ-.13);keyboard.rotation.y=.25;scene.add(keyboard);
  box(.43,.025,.15,0,0,0,casing,keyboard);
  for(let row=0;row<4;row++)for(let col=0;col<11;col++)box(.029,.009,.024,-.185+col*.037,.017,-.052+row*.03,keysMaterial,keyboard);
  box(.15,.009,.022,-.03,.018,.053,keysMaterial,keyboard);
  box(.21,.008,.20,.11,ground+1.026,deskZ-.13,dark);
  const mouse=new THREE.Group();mouse.position.set(.11,ground+1.034,deskZ-.13);mouse.rotation.y=.25;scene.add(mouse);
  const shell=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),casing);shell.scale.set(.032,.025,.047);shell.position.y=.015;mouse.add(shell);
  const wheel=box(.007,.006,.016,0,.039,.018,iron,mouse);
  mouse.updateMatrixWorld(true);computer.updateMatrixWorld(true);
  const cableStart=mouse.localToWorld(new THREE.Vector3(0,.007,.050));
  const cableEnd=computer.localToWorld(new THREE.Vector3(.18,.165,-.026));
  box(.027,.014,.013,.18,.165,-.026,dark,computer);
  const cablePoints=[cableStart,new THREE.Vector3(.16,ground+1.027,deskZ-.27),new THREE.Vector3(.30,ground+1.027,deskZ-.21),new THREE.Vector3(.35,ground+1.027,deskZ+.05),new THREE.Vector3(cableEnd.x,ground+1.05,cableEnd.z),cableEnd];
  const cable=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePoints),64,.003,8,false),dark);scene.add(cable);
  const workstation=new THREE.Group();workstation.position.set(.1,ground+1.02,deskZ);scene.add(workstation);workstation.userData.editor={id:'workstation',label:'Компьютер, клавиатура и мышь'};
  for(const object of scene.children.slice(workstationStart,-1))workstation.attach(object);
  const board=box(.88,.85,.03,2.76,ground+1.8,-4.7,wood);board.rotation.y=Math.PI/2;
  // Forms inside the booth and a waiting bench outside it.
  for(let i=0;i<3;i++)box(.018,.36,.22,2.735,ground+1.9-i*.16,-4.7,'#d5d0bd');
  const interior=furnishReception(scene,{ground,wood,frame,dark,pipe,plaque});
  const officer=createOfficer();officer.position.set(-.35,ground,-4.75);officer.rotation.y=.25;scene.add(officer);
  // Interaction belongs to the reception window, so the player can speak through the glass.
  const target=new THREE.Mesh(new THREE.BoxGeometry(3.4,1.46,.06),new THREE.MeshBasicMaterial({visible:false}));target.position.set(0,ground+1.72,front+.06);target.userData.type='dutyOfficer';scene.add(target);
  return {npcTarget:target,passageDoor,phoneTarget,updateOfficer:time=>{officer.userData.update(time);interior.update(time);}};
}
