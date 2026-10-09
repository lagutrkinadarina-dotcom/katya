import * as THREE from 'three';
import {createOfficer} from './officer.js';

export function createReception(scene,{box,pipe,plaque,plaster,paint,floor,wood,iron,dark}){
  const ground=-3.365;
  const frame=new THREE.MeshStandardMaterial({color:'#cbcfc7',roughness:.6});
  const glow=new THREE.MeshStandardMaterial({color:'#e5e6d4',emissive:'#dce9da',emissiveIntensity:.65});
  // One continuous floor and ceiling follow the lobby, left stair return and new wing.
  const outline=[[-2.9,-6.2],[2.9,-6.2],[2.9,1.25],[12.3,1.25],[12.3,5.44],[9.3,5.44],[9.3,2.56],[2.9,2.56],[2.9,6.83],[-2.9,6.83],[-2.9,.55],[-7.8,.55],[-7.8,-3.05],[-2.9,-3.05]];
  const shape=new THREE.Shape();outline.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  const geometry=new THREE.ShapeGeometry(shape);
  for(const [y,material]of [[ground,floor],[-.18,plaster]]){
    const surface=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:material.map,color:material.color,roughness:material.roughness,side:THREE.DoubleSide}));surface.rotation.x=-Math.PI/2;surface.position.y=y;surface.receiveShadow=true;scene.add(surface);
  }
  // Mitered wall strips share one footprint at every bend. Box end caps cannot leave
  // the former narrow columns or overlapping faces at the lobby/passage corners.
  function wallStrip(points){
    const offsets=points.map(([x,z],i)=>{const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];const before=new THREE.Vector2(x-prev[0],z-prev[1]),after=new THREE.Vector2(next[0]-x,next[1]-z);if(before.lengthSq()===0)before.copy(after);if(after.lengthSq()===0)after.copy(before);before.normalize();after.normalize();const n1=new THREE.Vector2(-before.y,before.x),n2=new THREE.Vector2(-after.y,after.x),m=n1.clone().add(n2).normalize().multiplyScalar(.08/Math.max(.2,n1.dot(n1.clone().add(n2).normalize())));return [[x+m.x,z+m.y],[x-m.x,z-m.y]];});
    const boundary=[...offsets.map(pair=>pair[0]),...offsets.map(pair=>pair[1]).reverse()],footprint=new THREE.Shape();boundary.forEach(([x,z],i)=>i?footprint.lineTo(x,-z):footprint.moveTo(x,-z));footprint.closePath();
    for(const [base,height,material]of [[0,1.2,paint],[1.2,2.165,plaster]]){const wall=new THREE.Mesh(new THREE.ExtrudeGeometry(footprint,{depth:height,steps:1,bevelEnabled:false}),material);wall.rotation.x=-Math.PI/2;wall.position.y=ground+base;wall.castShadow=true;wall.receiveShadow=true;scene.add(wall);}
  }
  wallStrip([[9.3,2.56],[2.9,2.56],[2.9,6.83],[-2.9,6.83],[-2.9,.55],[-7.8,.55],[-7.8,-3.05],[-2.9,-3.05],[-2.9,-6.2],[2.9,-6.2],[2.9,1.25],[12.3,1.25],[12.3,5.44],[2.98,5.44]]);
  // The two jamb walls inside the larger side-wing opening stop at the door frame.
  wallStrip([[-2.9,-2.97],[-2.9,-2]]);wallStrip([[-2.9,-.5],[-2.9,.47]]);
  box(.16,1.045,1.5,-2.9,ground+2.8425,-1.25,plaster);
  const routeSign=plaque('← ЛЕСТНИЦА · 2 ЭТАЖ',1.8,.26,2.805,ground+1.85,.15);routeSign.rotation.y=-Math.PI/2;
  // A genuine doorway into the next wing. Its leaf is animated by the game, not a room overlay.
  const doorway=new THREE.Group();doorway.position.set(-2.9,ground,-1.25);doorway.rotation.y=Math.PI/2;scene.add(doorway);
  for(const x of [-.72,.72])box(.085,2.34,.2,x,1.17,0,frame,doorway);
  box(1.52,.085,.2,0,2.34,0,frame,doorway);
  const hinge=new THREE.Group();hinge.position.set(-.66,0,0);doorway.add(hinge);
  const passageDoor=box(1.32,2.27,.065,.66,1.135,0,wood,hinge);passageDoor.userData={type:'passageDoor',hinge};
  for(const y of [.65,1.64]){box(1.1,.76,.022,.66,y,.043,frame,hinge);box(1.02,.68,.022,.66,y,.06,wood,hinge);}
  pipe([1.22,1.09,.09],[1.08,1.09,.09],.017,iron,hinge);
  plaque('СЛУЖЕБНЫЙ КОРИДОР',1.45,.22,0,2.63,.095,doorway);
  const wingLight=new THREE.PointLight(0xe5e2d4,8,6,2);wingLight.position.set(-5.3,ground+2.75,-1.2);scene.add(wingLight);
  box(1.1,.05,.34,-5.3,ground+3.08,-1.2,frame);box(.95,.015,.26,-5.3,ground+3.043,-1.2,glow);
  box(.42,1.95,2,-7.45,ground+.975,-1.2,wood);
  for(const z of [-1.85,-1.2,-.55])for(const y of [.6,1.18,1.72])box(.25,.18,.35,-7.2,ground+y,z,'#b3a58b');
  plaque('СЛУЖЕБНОЕ КРЫЛО',1.6,.25,-7.14,ground+2.35,-1.2).rotation.y=Math.PI/2;
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
