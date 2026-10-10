import * as THREE from 'three';
import {createDetainee} from './detainee.js';

export function createHoldingCell(scene,{ground,wood,plaque}){
  const root=new THREE.Group();scene.add(root);root.name='holding-cell';root.userData.editor={id:'holding-cell',label:'Камера временного содержания',solid:true,revision:2};
  const steel=new THREE.MeshStandardMaterial({color:'#454d47',roughness:.64,metalness:.65});
  const add=(geometry,material,x,y,z,parent=root)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const box=(w,h,d,x,y,z,material=steel,parent=root)=>add(new THREE.BoxGeometry(w,h,d),material,x,y,z,parent);
  const rod=(a,b,r=.013,parent=root)=>{const delta=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const m=add(new THREE.CylinderGeometry(r,r,delta.length(),10),steel,0,0,0,parent);m.position.copy(new THREE.Vector3(...a).addScaledVector(delta,.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;};
  // The cage occupies the empty corner beyond the cooler and leaves the exit route clear.
  const front=-1.64,back=-2.83,start=3.83,end=6.76;
  for(let z=start;z<=end+.01;z+=.115)rod([front,ground+.04,z],[front,ground+2.38,z],.014);
  for(let x=back;x<=front+.01;x+=.115)rod([x,ground+.04,start],[x,ground+2.38,start],.014);
  for(const y of [.045,.79,1.43,2.38]){rod([front,ground+y,start],[front,ground+y,end],.021);rod([back,ground+y,start],[front,ground+y,start],.021);}
  for(const z of [start,end])rod([front,ground,z],[front,ground+2.45,z],.032);
  // A welded roof lattice connects the front grille to both enclosing walls.
  for(let z=start;z<end;z+=.115)rod([back,ground+2.38,z],[front,ground+2.38,z],.014);
  for(let x=back;x<=front+.01;x+=.115)rod([x,ground+2.38,start],[x,ground+2.38,end],.014);
  for(const x of [back,front])rod([x,ground+2.38,start],[x,ground+2.38,end],.025);
  for(const z of [start,end])rod([back,ground+2.38,z],[front,ground+2.38,z],.025);
  // End plates sink slightly into the plaster instead of leaving floating joints.
  for(const y of [.045,.79,1.43,2.38]){box(.035,.065,.07,back,ground+y,start);box(.07,.065,.035,front,ground+y,end);}
  const gate=new THREE.Group();gate.name='holding-cell-gate';root.add(gate);
  const gateSteel=steel.clone();gateSteel.emissive.set('#e1c985');gateSteel.emissiveIntensity=0;
  // Give the actual gate bars their own material, leaving the rest of the cage dark.
  for(const mesh of [...root.children])if(mesh.isMesh&&mesh.position.x>front-.03&&mesh.position.z>=4.02&&mesh.position.z<=4.69){gate.attach(mesh);mesh.material=gateSteel;}
  // Visible gate frame, hinges and a recessed lock, all contained in the grille.
  for(const z of [4.02,4.69])rod([front+.012,ground+.07,z],[front+.012,ground+2.23,z],.025);
  for(const y of [.07,2.23])rod([front+.012,ground+y,4.02],[front+.012,ground+y,4.69],.025);
  for(const y of [.4,1.85])box(.045,.085,.05,front+.018,ground+y,4.02);
  box(.042,.13,.095,front+.025,ground+1.08,4.69);rod([front+.053,ground+1.08,4.66],[front+.053,ground+1.08,4.74],.01);
  for(const mesh of [...root.children])if(mesh.isMesh&&mesh.position.x>front-.03&&mesh.position.z>=4.02&&mesh.position.z<=4.75){gate.attach(mesh);mesh.material=gateSteel;}
  const target=box(.10,2.16,.67,front+.045,ground+1.15,4.355,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),gate);
  target.name='holding-cell-door-target';target.userData={type:'cellDoor',floor:1,setHighlighted(on){gateSteel.emissiveIntensity=on?.65:0;}};
  // Keep the bench and grille layout; replace only the two civilian models.
  box(.36,.065,1.72,-2.48,ground+.46,5.02,wood);
  box(.035,.27,1.72,-2.69,ground+.72,5.02,wood);
  for(const z of [4.40,5.65])for(const x of [-2.6,-2.37])box(.035,.43,.035,x,ground+.215,z);
  const people=['man','woman'].map((kind,i)=>{
    const person=createDetainee(kind,kind==='woman'?0:1);person.position.set(-2.48,ground,4.6+i*.86);person.rotation.y=Math.PI/2;root.add(person);return person;
  });
  root.userData.people=people;
  root.ready=Promise.all(people.map(person=>person.ready));
  root.userData.update=time=>people.forEach(person=>person.userData.update(time));
  return {root,target,update:root.userData.update};
}
