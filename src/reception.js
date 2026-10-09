import * as THREE from 'three';
import {createOfficer} from './officer.js';

export function createReception(scene,{box,pipe,plaque,plaster,paint,floor,wood,iron,dark}){
  const ground=-3.365;
  const frame=new THREE.MeshStandardMaterial({color:'#cbcfc7',roughness:.6});
  const glow=new THREE.MeshStandardMaterial({color:'#e5e6d4',emissive:'#dce9da',emissiveIntensity:.65});
  box(5.8,.15,13,0,ground-.075,.3,floor);
  box(5.8,.12,13,0,-.12,.3,plaster);
  box(.16,3.2,13,-2.9,ground+1.6,.3,plaster);
  box(.2,1.2,13,-2.87,ground+.6,.3,paint);
  // Right wall ends at the actual return passage: there is no overlapping wall or trim.
  box(.16,3.2,11.62,2.9,ground+1.6,-.39,plaster);
  box(.2,1.2,11.62,2.87,ground+.6,-.39,paint);
  box(5.8,3.2,.16,0,ground+1.6,-6.2,plaster);
  box(5.8,3.2,.16,0,ground+1.6,6.83,plaster);
  for(const [x,length,z]of [[-2.76,12.9,.3],[2.76,11.62,-.39]]){
    box(.07,.055,length,x,ground+1.24,z,frame);box(.07,.11,length,x,ground+.055,z,dark);
  }
  plaque('ЛЕСТНИЦА НА 2 ЭТАЖ →',1.8,.26,0,ground+1.8,6.72).rotation.y=Math.PI;
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
  box(.36,.25,.055,1,ground+1.12,-4.57,dark);box(.29,.18,.006,1,ground+1.12,-4.533,'#607477');
  for(let i=0;i<3;i++)box(.3,.024,.35,-1+i*.018,ground+.865+i*.025,-4.44,'#c5bda3');
  const board=box(.88,.85,.03,2.76,ground+1.8,-4.7,wood);board.rotation.y=Math.PI/2;
  // Forms inside the booth and a waiting bench outside it.
  for(let i=0;i<3;i++)box(.018,.36,.22,2.735,ground+1.9-i*.16,-4.7,'#d5d0bd');
  box(.4,.09,1.8,-2.58,ground+.46,.8,wood);box(.06,.45,1.8,-2.76,ground+.72,.8,wood);
  for(const z of [.15,1.45])pipe([-2.58,ground+.43,z],[-2.58,ground+.03,z],.035,dark);
  const officer=createOfficer();officer.position.set(-.35,ground,-4.55);scene.add(officer);
  // Interaction belongs to the reception window, so the player can speak through the glass.
  const target=new THREE.Mesh(new THREE.BoxGeometry(3.4,1.46,.06),new THREE.MeshBasicMaterial({visible:false}));target.position.set(0,ground+1.72,front+.06);target.userData.type='dutyOfficer';scene.add(target);
  return target;
}
