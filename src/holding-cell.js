import * as THREE from 'three';

export function createHoldingCell(scene,{ground,wood,plaque}){
  const root=new THREE.Group();scene.add(root);root.name='holding-cell';root.userData.editor={id:'holding-cell',label:'Камера временного содержания',solid:true,revision:2};
  const steel=new THREE.MeshStandardMaterial({color:'#454d47',roughness:.64,metalness:.65});
  const cloths=['#655a4c','#47565b'],skinTones=['#b6957a','#bda087'];
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
  // Visible gate frame, hinges and a recessed lock, all contained in the grille.
  for(const z of [4.02,4.69])rod([front+.012,ground+.07,z],[front+.012,ground+2.23,z],.025);
  for(const y of [.07,2.23])rod([front+.012,ground+y,4.02],[front+.012,ground+y,4.69],.025);
  for(const y of [.4,1.85])box(.045,.085,.05,front+.018,ground+y,4.02);
  box(.042,.13,.095,front+.025,ground+1.08,4.69);rod([front+.053,ground+1.08,4.66],[front+.053,ground+1.08,4.74],.01);
  const sign=plaque('КПЗ · ВРЕМЕННОЕ СОДЕРЖАНИЕ',1.82,.16,front+.04,ground+2.61,4.96,root);sign.rotation.y=Math.PI/2;
  // Two wooden benches and rounded, seated civilian models.
  box(.36,.065,1.72,-2.48,ground+.46,5.02,wood);
  box(.035,.27,1.72,-2.69,ground+.72,5.02,wood);
  for(const z of [4.40,5.65])for(const x of [-2.6,-2.37])box(.035,.43,.035,x,ground+.215,z);
  const people=[];
  for(let i=0;i<2;i++){
    const person=new THREE.Group();person.position.set(-2.48,ground,4.6+i*.86);person.rotation.y=Math.PI/2;root.add(person);people.push(person);
    const skin=new THREE.MeshStandardMaterial({color:skinTones[i],roughness:.86});
    const cloth=new THREE.MeshStandardMaterial({color:cloths[i],roughness:.93});
    const trousers=new THREE.MeshStandardMaterial({color:i?'#333a36':'#343d46',roughness:.9});
    const hair=new THREE.MeshStandardMaterial({color:i?'#69645a':'#3d332b',roughness:.9});
    const dark=new THREE.MeshStandardMaterial({color:'#242924',roughness:.82});
    const oval=(mat,x,y,z,sx,sy,sz,parent=person)=>{const m=add(new THREE.SphereGeometry(1,16,12),mat,x,y,z,parent);m.scale.set(sx,sy,sz);return m;};
    const limb=(a,b,r1,r2,mat)=>{const delta=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),m=add(new THREE.CylinderGeometry(r2,r1,delta.length(),12),mat,0,0,0,person);m.position.copy(new THREE.Vector3(...a).addScaledVector(delta,.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());oval(mat,...a,r1,r1,r1);oval(mat,...b,r2,r2,r2);};
    const torso=oval(cloth,0,.81,0,.22,.28,.135),armRigs=[],legRigs=[],eyes=[];oval(trousers,0,.54,.025,.19,.085,.15);
    for(const side of [-1,1]){
      limb([side*.11,.55,.03],[side*.11,.48,.35],.084,.076,trousers);
      const legStart=person.children.length;limb([side*.11,.48,.35],[side*.11,.09,.39],.076,.055,trousers);
      oval(dark,side*.11,.055,.46,.075,.053,.14);
      const leg=new THREE.Group();leg.position.set(side*.11,.48,.35);const legParts=person.children.slice(legStart);person.add(leg);for(const part of legParts)leg.attach(part);legRigs.push(leg);
      const armStart=person.children.length;
      limb([side*.19,.97,0],[side*.25,.74,.14],.076,.066,cloth);limb([side*.25,.74,.14],[side*.12,.59,.31],.066,.04,cloth);oval(skin,side*.12,.586,.32,.043,.025,.054);
      const arm=new THREE.Group();arm.position.set(side*.19,.97,0);const armParts=person.children.slice(armStart);person.add(arm);for(const part of armParts)arm.attach(part);armRigs.push(arm);
    }
    const neck=oval(skin,0,1.09,0,.063,.067,.058);
    const head=new THREE.Group();head.position.set(0,1.13,0);person.add(head);person.userData.head=head;
    const profile=[[0,0],[.06,.005],[.09,.035],[.115,.10],[.124,.18],[.114,.25],[.078,.29],[0,.31]];
    add(new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),20),skin,0,0,0,head).scale.z=.84;
    oval(hair,0,.255,-.02,.117,.06,.09,head);
    for(const side of [-1,1]){oval(skin,side*.119,.16,0,.018,.03,.018,head);eyes.push(oval(dark,side*.047,.193,.094,.01,.004,.003,head));oval(hair,side*.048,.213,.09,.019,.003,.005,head);}
    oval(skin,0,.163,.10,.014,.028,.017,head);oval(dark,0,.095,.093,.024,.002,.002,head);
    const upper=new THREE.Group();upper.position.y=.54;person.add(upper);for(const part of [torso,neck,head,...armRigs])upper.attach(part);
    person.userData.rig={upper,head,arms:armRigs,legs:legRigs,eyes};

  }
  root.userData.update=time=>people.forEach((person,i)=>{
    const {upper,head,arms,legs,eyes}=person.userData.rig,phase=time+i*3.7;
    // Independent slow shifts, breaths, glances and brief blinks; hips stay on the seat.
    upper.rotation.x=.035+Math.sin(phase*.34)*.04;upper.rotation.z=Math.sin(phase*.27)*.022;
    upper.position.y=.54+Math.sin(phase*1.5)*.003;
    head.rotation.set(.08+Math.sin(phase*.65)*.055,Math.sin(phase*.38)*.28,Math.sin(phase*.41)*.025);
    const blinkPhase=(phase+.4)%(4.1+i*.7),blink=blinkPhase<.16?Math.max(.08,Math.abs(blinkPhase-.08)/.08):1;
    eyes.forEach(eye=>eye.scale.y=.004*blink);
    arms.forEach((arm,j)=>{arm.rotation.x=Math.sin(phase*.6+j)*.045;arm.rotation.z=Math.sin(phase*.47+j*2)*.055;});
    legs.forEach((leg,j)=>{const tap=THREE.MathUtils.smoothstep(Math.sin(phase*.23+j),.3,.85);leg.rotation.x=Math.sin(phase*2.4+j)*.025*tap;});
  });
  return {root,update:root.userData.update};
}
