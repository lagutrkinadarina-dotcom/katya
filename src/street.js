import * as THREE from 'three';

// A real opening and outdoor geometry give the street perspective when viewed sideways.
export function createStreetWindow(scene, z, facing, materials) {
  const root=new THREE.Group();root.position.z=z;root.rotation.y=facing===1?Math.PI:0;scene.add(root);
  const pedestrians=[];
  const mat=(color,lit=false)=>lit?new THREE.MeshBasicMaterial({color,fog:false}):new THREE.MeshStandardMaterial({color,roughness:.8});
  function box(w,h,d,x,y,z,m,parent=root){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
  const {plaster,paint}=materials,frame=mat('#c0baa1'),metal=mat('#3d4a47');
  // The local front faces the corridor; the exterior extends towards negative Z.
  for(const x of [-2.48,2.48]){box(1.04,3.3,.2,x,1.65,0,plaster);box(1.04,1.05,.23,x,.525,.015,paint);}
  box(4,1.04,.2,0,.52,0,paint);box(4,.38,.2,0,3.11,0,plaster);
  box(4.18,.12,.4,0,1.03,.1,frame);box(4.18,.12,.18,0,2.97,.07,frame);
  for(const x of [-2,0,2])box(.09,1.92,.16,x,2,.06,frame);
  box(4,.055,.14,0,2.35,.08,frame);
  for(const x of [-1.93,1.93])box(.025,1.8,.04,x,2,.16,metal);
  const glass=new THREE.MeshBasicMaterial({color:'#7897ab',transparent:true,opacity:.07,depthWrite:false,side:THREE.DoubleSide});
  box(3.9,1.8,.012,0,2,.04,glass);
  // Night sky, opposite pavement, road, and a row of apartment buildings.
  box(36,18,.1,0,6,-20,mat('#142b40',true));
  box(32,.1,19,0,-.11,-10,mat('#263137'));
  box(32,.12,3,0,-.02,-2,mat('#737b77'));box(32,.12,3,0,-.02,-11,mat('#65706c'));
  box(32,.19,.15,0,-.015,-3.45,mat('#a8aa98'));box(32,.19,.15,0,-.015,-9.45,mat('#a8aa98'));
  for(let x=-14;x<15;x+=3)box(1.6,.005,.09,x,-.052,-6.4,mat('#b9b6a0'));
  for(let i=0;i<7;i++){
    const x=(i-3)*4.1,h=7+(i%3)*1.2;
    box(3.95,h,3,x,h/2,-15,mat(i%2?'#3c4851':'#465052'));
    box(4.05,.17,3.1,x,h,-15,mat('#273640'));
    for(let row=0;row<4;row++)for(let col=0;col<3;col++){
      const lit=(i+row*3+col)%4!==0;
      box(.61,.85,.035,x+(col-1)*1.05,1.45+row*1.55,-13.47,mat(lit?'#ac9463':'#1c303c',true));
      box(.025,.86,.045,x+(col-1)*1.05,1.45+row*1.55,-13.44,metal);
    }
  }
  for(const x of [-5,5]){
    box(.09,3.9,.09,x,1.9,-2.7,metal);box(.8,.08,.22,x+.3,3.8,-2.7,metal);
    box(.55,.035,.2,x+.3,3.75,-2.7,mat('#ffe0a2',true));
    const light=new THREE.PointLight(0xffd39b,9,8,2);light.position.set(x+.3,3.5,-2.7);root.add(light);
  }
  // Stylised people with independently swinging arms and legs.
  for(let i=0;i<5;i++){
    const person=new THREE.Group();root.add(person);
    const coat=mat(['#534a48','#3c5462','#685d4d','#42494d','#64515a'][i]);
    const shoes=mat('#202829'),skin=mat('#b09b81');
    box(.33,.56,.22,0,1.06,0,coat,person);box(.29,.18,.2,0,.71,0,coat,person);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),skin);head.position.y=1.52;person.add(head);
    box(.24,.075,.23,0,1.63,0,shoes,person);
    const limbs=[];
    for(const side of [-1,1]){
      const leg=new THREE.Group();leg.position.set(side*.095,.68,0);person.add(leg);
      box(.115,.52,.13,0,-.26,0,shoes,leg);box(.13,.09,.23,0,-.55,.035,shoes,leg);
      const arm=new THREE.Group();arm.position.set(side*.22,1.3,0);person.add(arm);
      box(.1,.48,.13,0,-.24,0,coat,arm);box(.09,.12,.1,0,-.5,0,skin,arm);
      limbs.push({leg,arm,side});
    }
    const walker={person,limbs,offset:i*4.4,speed:.38+i*.065,direction:i%2?1:-1,lane:i%2?-2:-10.3};
    pedestrians.push(walker);person.userData.pedestrian=true;
  }
  function update(time){
    for(const w of pedestrians){
      const cycle=((time*w.speed+w.offset)%24+24)%24;
      w.person.position.set((cycle-12)*w.direction,0,w.lane);
      w.person.rotation.y=w.direction>0?Math.PI/2:-Math.PI/2;
      const stride=Math.sin(time*(3.7+w.speed)+w.offset)*.36;
      for(const limb of w.limbs){limb.leg.rotation.x=stride*limb.side;limb.arm.rotation.x=-stride*limb.side;}
      w.person.position.y=Math.abs(Math.sin(time*4+w.offset))*.018;
    }
  }
  update(0);
  return update;
}
