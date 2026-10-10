import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const assets={
  cup:new URL('./assets/hand-cup.glb',import.meta.url).href,
  payment:new URL('./assets/hand-payment.glb',import.meta.url).href,
};
const prototypes=new Map();

// Both poses share the same authored anatomy; their fingers fit different objects.
export function createPlayerHand(pose='cup'){
  const root=new THREE.Group();root.name='player-hand';
  if(!prototypes.has(pose))prototypes.set(pose,new GLTFLoader().loadAsync(assets[pose]));
  root.ready=prototypes.get(pose).then(gltf=>{
    const model=gltf.scene.clone(true);
    model.traverse(object=>{if(object.isMesh){object.castShadow=false;object.receiveShadow=false;}});
    root.add(model);return root;
  });
  return root;
}

// The paying forearm connects the authored wrist to the player's off-screen arm.
export function createPaymentSleeve(hand,camera){
  const segments=28,sides=20,positions=new Float32Array((segments+1)*(sides+1)*3),indices=[];
  for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){
    const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,b,a+1,b,b+1,a+1);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(indices);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:'#34414a',roughness:.93}));mesh.name='payment-forearm';mesh.frustumCulled=false;mesh.visible=false;
  hand.ready.then(()=>hand.traverse(object=>{
    if(object.isMesh&&object.name.startsWith('tailored-sleeve')){object.visible=false;mesh.material=object.material;}
  }),()=>{});
  const start=new THREE.Vector3(),collar=new THREE.Vector3(),elbow=new THREE.Vector3(),end=new THREE.Vector3(),vertex=new THREE.Vector3();
  return {mesh,update(){
    hand.updateWorldMatrix(true,false);camera.updateWorldMatrix(true,false);
    start.set(.085,-.056,.026);hand.localToWorld(start);
    collar.set(.091,-.103,.012);hand.localToWorld(collar);
    end.set(.32,-.53,-.15);camera.localToWorld(end);
    elbow.lerpVectors(collar,end,.58);elbow.y-=.035;
    const curve=new THREE.CatmullRomCurve3([start.clone(),collar.clone(),elbow.clone(),end.clone()]);
    const frames=curve.computeFrenetFrames(segments,false);
    for(let i=0;i<=segments;i++){
      const t=i/segments,point=curve.getPointAt(t),radius=.025+.018*t;
      for(let j=0;j<=sides;j++){
        const angle=j/sides*Math.PI*2,fold=1+.025*Math.sin(t*45+angle*3);
        vertex.copy(point).addScaledVector(frames.normals[i],Math.cos(angle)*radius*fold).addScaledVector(frames.binormals[i],Math.sin(angle)*radius*fold);
        vertex.toArray(positions,(i*(sides+1)+j)*3);
      }
    }
    geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();
  }};
}
