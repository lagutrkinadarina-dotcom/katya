import * as THREE from 'three';

// A real opening and outdoor geometry give the street perspective when viewed sideways.
export function createStreetWindow(scene, z, facing, materials) {
  let root=new THREE.Group();root.position.z=z;root.rotation.y=facing===1?Math.PI:0;scene.add(root);
  const pedestrians=[];
  const materialCache=new Map(), batches=new Map();
  const mat=(color,lit=false)=>{
    const key=color+lit;if(materialCache.has(key))return materialCache.get(key);
    const m=lit?new THREE.MeshBasicMaterial({color,fog:false}):new THREE.MeshStandardMaterial({color,roughness:.8});
    m.onBeforeCompile=shader=>{
      shader.vertexShader='varying float vStreetX;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvStreetX = (modelMatrix *\n#ifdef USE_INSTANCING\ninstanceMatrix *\n#endif\nvec4(transformed, 1.0)).x;');
      shader.fragmentShader='varying float vStreetX;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>','#include <fog_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.095,0.137,0.16), smoothstep(13.0,34.0,abs(vStreetX)));');
    };
    m.customProgramCacheKey=()=> 'street-edge-fog-v1';materialCache.set(key,m);return m;
  };
  function box(w,h,d,x,y,z,m,parent=root){
    if(parent===root){
      if(!batches.has(parent))batches.set(parent,new Map());const batch=batches.get(parent);
      if(!batch.has(m))batch.set(m,[]);
      const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion(),new THREE.Vector3(w,h,d));batch.get(m).push(matrix);return;
    }
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
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
  // The outdoor ground is 3.5 metres below the second-floor corridor.
  const exterior=new THREE.Group();exterior.position.y=-3.5;root.add(exterior);root=exterior;
  // Night sky, opposite pavement, road, and a row of apartment buildings.
  // The scene background supplies an endless sky rather than a finite backdrop.
  box(120,.1,19,0,-.11,-10,mat('#263137'));
  box(120,.12,3,0,-.02,-2,mat('#737b77'));box(120,.12,3,0,-.02,-11,mat('#65706c'));
  box(120,.19,.15,0,-.015,-3.45,mat('#a8aa98'));box(120,.19,.15,0,-.015,-9.45,mat('#a8aa98'));
  for(let x=-58;x<59;x+=3)box(1.6,.005,.09,x,-.052,-6.4,mat('#b9b6a0'));
  for(let i=0;i<27;i++){
    const x=(i-13)*4.1,h=7+(i%3)*1.2;
    box(3.95,h,3,x,h/2,-15,mat(i%2?'#3c4851':'#465052'));
    box(4.05,.17,3.1,x,h,-15,mat('#273640'));
    for(let row=0;row<4;row++)for(let col=0;col<3;col++){
      const lit=(i+row*3+col)%4!==0;
      box(.61,.85,.035,x+(col-1)*1.05,1.45+row*1.55,-13.47,mat(lit?'#ac9463':'#1c303c',true));
      box(.025,.86,.045,x+(col-1)*1.05,1.45+row*1.55,-13.44,metal);
    }
  }
  for(const x of [-21,-13,-5,5,13,21]){
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
    const walker={person,limbs,offset:i*11.4,speed:.38+i*.065,direction:i%2?1:-1,lane:i%2?-2:-10.3};
    pedestrians.push(walker);person.userData.pedestrian=true;
  }
  const cars=[];
  for(let i=0;i<3;i++){
    const car=new THREE.Group();root.add(car);car.userData.car=true;
    const body=mat(['#526673','#643f3b','#858578'][i]),rubber=mat('#161e22'),windows=mat('#223c4b');
    box(3.8,.55,1.65,0,.65,0,body,car);box(2,.62,1.48,-.15,1.18,0,body,car);
    for(const side of [-1,1]){
      box(1.72,.42,.025,-.15,1.22,side*.755,windows,car);
      for(const x of [-1.15,1.15]){
        const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.19,16),rubber);wheel.rotation.x=Math.PI/2;wheel.position.set(x,.33,side*.84);car.add(wheel);
        const hub=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.2,12),metal);hub.rotation.x=Math.PI/2;hub.position.copy(wheel.position);car.add(hub);
      }
      box(.05,.16,.4,1.92,.77,side*.5,mat('#fff1bc',true),car);
      box(.05,.13,.38,-1.92,.77,side*.5,mat('#b54735',true),car);
    }
    box(.08,.4,1.32,.87,1.22,0,windows,car);
    box(.08,.37,1.32,-1.17,1.2,0,windows,car);
    cars.push({car,direction:i%2?-1:1,offset:i*15,period:48+i*9});
  }
  function update(time){
    for(const c of cars){
      const t=(time+c.offset)%c.period;
      c.car.visible=t<23;
      c.car.position.set((t*3.2-36)*c.direction,0,c.direction>0?-5:-7.9);
      c.car.rotation.y=c.direction>0?0:Math.PI;
    }
    for(const w of pedestrians){
      const cycle=((time*w.speed+w.offset)%70+70)%70;
      w.person.position.set((cycle-35)*w.direction,0,w.lane);
      w.person.rotation.y=w.direction>0?Math.PI/2:-Math.PI/2;
      const stride=Math.sin(time*(3.7+w.speed)+w.offset)*.36;
      for(const limb of w.limbs){limb.leg.rotation.x=stride*limb.side;limb.arm.rotation.x=-stride*limb.side;}
      w.person.position.y=Math.abs(Math.sin(time*4+w.offset))*.018;
    }
  }
  for(const [parent,batch]of batches)for(const [material,matrices]of batch){
    const instances=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,matrices.length);
    matrices.forEach((matrix,i)=>instances.setMatrixAt(i,matrix));instances.instanceMatrix.needsUpdate=true;instances.computeBoundingSphere();parent.add(instances);
  }
  update(0);
  return update;
}
