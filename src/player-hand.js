import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const assets={
  cup:new URL('./assets/hand-cup.glb',import.meta.url).href,
  payment:new URL('./assets/hand-payment.glb',import.meta.url).href,
};
const prototypes=new Map();

// Posed copies of the MIT-licensed WebXR hand. Arm length never depends on camera distance.
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
